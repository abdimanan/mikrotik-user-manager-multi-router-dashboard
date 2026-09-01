# User Management & Role-Based Access (RBAC)

Status: **In progress.** Phases 1-5 (SQLite migration, authentication, role
enforcement & router scoping, account management UI, and activity logs) are
done, plus two addenda: a migrations system (between Phases 3 and 4) and
7-day sessions + a fourth role, `scoped-viewer` (after Phase 5) — see §9 for
what shipped in each and the concrete choices that were made where §8 left
things open. §2's role table below reflects the original 3-role design; see
the last addendum in §9 for the 4th role. Phase 6 (hardening) is still planning.

## 1. Why

Today the dashboard has **no login at all** — anyone who can reach the server has full
read/write access to every router, every hotspot user, every voucher, and every
report. This doc introduces three account types so access can be restricted per
person, and lays the groundwork for an activity log (a separate, later feature) by
making sure every action in the system can be attributed to a logged-in account.

## 2. Roles

| Role | Summary |
|---|---|
| **Super-Admin** | Sees and does everything — the full dashboard exactly as it works today, across every router. Only role that can manage other accounts and (later) view the activity log. |
| **Admin** | Scoped to the router(s) assigned to them. Can manage that router's hotspot users, vouchers, sessions, and reports, but cannot see routers not assigned to them, and cannot manage other accounts. |
| **Viewer** | Read-only. Can see dashboard/reports data and export CSV/PDF, but cannot create, edit, or delete anything on any router. |

### 2.1 Permission matrix

Mapped against the current views in `src/components/`:

| Area | Super-Admin | Admin | Viewer |
|---|:---:|:---:|:---:|
| Dashboard (all-routers overview) | Full | Assigned routers only | View only, assigned/all per below |
| Routers list (`RoutersView`) | Full (add/edit/delete any router) | View + edit only assigned router(s); cannot add/delete routers | View only |
| Router terminal (`TerminalModal`) | Full | Assigned routers only | No access |
| Hotspot users (`UsersView`) | Full, any router | Full, assigned router(s) only | View only |
| Sessions (`SessionsView`) | Full, any router | View + kick sessions, assigned router(s) only | View only |
| Vouchers (`VouchersView`) | Full, any router | Full, assigned router(s) only | View only |
| Reports (`ReportsView`) | Full, any router, export | View + export, assigned router(s) only | View + export, assigned or all (open question, §7) |
| Alerts (`AlertsModal`) | Full | Assigned routers only | View only |
| Account management (new) | Full (create/disable/assign) | No access | No access |
| Activity log (future feature, §6) | Full | No access | No access |

Exact wording from the request this maps to: *admin "will be able to see only the
router it's assigned to and edit their users and stuff"*; *viewer "will only be able
to see and export CSV and PDFs for reports."*

## 3. Data model changes

*(Superseded by what actually shipped - kept for history. See Phase 1/§9 for the
real storage layer (SQLite, not one JSON file) and Phase 3/§9 for why the
`RouterRecord.assignedAdminIds` field below was dropped in favor of a single
source of truth on `AppUser`.)*

This feature adds one new collection, additive-only so nothing existing breaks:

```ts
// New: server/types.ts
export type AppRole = 'super-admin' | 'admin' | 'viewer';

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  role: AppRole;
  assignedRouterIds: string[]; // ignored for super-admin/viewer (both see every router); the scope for admin
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}
```

`DatabaseSchema` (`server/db.ts`) gains one key: `appUsers: AppUser[]`. A later phase
(§6) adds `auditLogs: AuditLogEntry[]` for the logs feature.

## 4. Auth mechanism (proposed)

- **Password storage:** `bcrypt` hash (package not yet installed — see Phase 1).
- **Session:** short-lived signed JWT in an `httpOnly` cookie, verified by a new
  Express middleware in front of `apiRouter` (`server.ts`). Chosen over server-side
  session storage because the current "DB" is a flat JSON file with no locking —
  a stateless token avoids adding session-write contention there.
  *(Open decision — confirm before Phase 2, see §7.)*
- **Bootstrapping:** first run seeds one `super-admin` account (env-var-configured
  username/password, or a `docs`-documented default that must be changed on first
  login) so there's always a way in.

## 5. Planned folder structure

New, additive folders only — nothing existing moves or renames, per "don't break the
system structure":

```
server/
  auth/                      # NEW
    authService.ts           # hashing, token issue/verify, login/logout logic
    authMiddleware.ts         # Express middleware: attaches req.user, rejects if missing
    permissions.ts            # role -> allowed-actions table, router-scoping helpers
  routes/
    auth.ts                  # NEW: POST /api/auth/login, /logout, GET /api/auth/me
    accounts.ts               # NEW: super-admin-only CRUD for AppUser
    api.ts                    # existing routes gain the auth middleware + scoping checks

src/
  context/
    AuthContext.tsx           # NEW: current user + role, login/logout, fetch-wrapped in api.ts
  components/
    auth/
      LoginView.tsx           # NEW: login screen
      AccountsView.tsx        # NEW: super-admin-only "manage users" screen
  App.tsx                     # gains a login gate + role-based nav/route guarding
```

This mirrors the existing pattern (one folder per concern under `server/`, one
component per view under `src/components/`) instead of introducing a new pattern.

## 6. Relationship to the next feature: Activity Logs

Once accounts exist, every mutating action already has an actor (`req.user.id`) to
attach to a log line. The logs feature (planned right after this one, not part of
this doc's implementation) will add:

- `auditLogs` collection: `{ id, userId, username, role, action, targetType, targetId, timestamp, detail }`.
- A write on every create/update/delete and every login/logout, from the same
  `authMiddleware`/route-handler layer this feature introduces.
- A super-admin-only `LogsView` to browse/filter them.

Phase 3 below (RBAC enforcement) is written to also thread an actor id through each
route handler specifically so that follow-on work is a pure-addition, not a rewrite.

## 7. SQLite migration

Per the request to move off the JSON file "from now on," `server/db.ts`'s
`Database` class will be re-backed by SQLite (`better-sqlite3`) instead of
`fs.writeFileSync` on a single JSON blob. Plan:

- One table per existing top-level `DatabaseSchema` key (`routers`, `alerts`,
  `vouchers`, `users`, `sessions`, `reports`, `settings`) plus new `app_users` and
  (later) `audit_logs` tables.
- A one-time migration step on startup: if `data/database.json` exists and
  `data/database.sqlite` does not, import the JSON into the new tables, then keep
  the JSON file as a `.bak` rather than deleting it (safety net, not a code
  decision to make silently later — will be confirmed before deleting anything).
- The public `Database` method signatures (`getRouters`, `getUsers`, `getReports`,
  etc.) stay the same so `server/routes/api.ts` and every service that calls
  `db.*` needs no changes beyond what RBAC scoping already requires — this is
  intentionally an internal storage swap, not an API change.

## 8. Open questions to confirm before implementation starts

1. **Auth transport:** JWT cookie vs. server-side session token — §4 proposes JWT;
   confirm before Phase 2.
2. **Admin ↔ router assignment:** one admin can be assigned many routers per §3
   (`assignedRouterIds: string[]`) — confirm whether it should instead be
   one-router-per-admin.
3. **Viewer scope:** should a viewer see reports for *all* routers (like
   super-admin, but read-only) or only routers explicitly shared with them? The
   permission matrix in §2.1 leaves this open pending your answer.
4. **Admin + vouchers/terminal:** the request says admin can "edit their users and
   stuff" — §2.1 currently interprets "stuff" as also covering vouchers, sessions,
   and terminal access on their own router(s). Confirm that's the intended scope
   before Phase 3 locks in the permission table.
5. **Default super-admin credentials:** env var vs. one-time setup wizard on first
   launch.

## 9. Phased implementation plan

Each phase should ship as its own reviewable change, in order, and each phase must
leave the app fully working (no half-migrated state left on `main`).

### Phase 1 — Storage foundation (SQLite migration) — ✅ Done
- Added `better-sqlite3`. `server/db.ts`'s `Database` class is now backed by a
  `data/database.sqlite` file with one table per collection, instead of rewriting
  one JSON blob on every write.
- Migration is automatic and one-time: on first boot against a fresh SQLite file,
  if `data/database.json` exists it's imported, then archived to
  `data/database.json.bak`.
- All public `Database` method signatures were kept identical — verified by
  round-tripping every CRUD method (add/update/delete router, add alert, etc.)
  against the migrated data before and after the switch. No other file needed to
  change beyond `server/db.ts`.

### Phase 2 — Authentication — ✅ Done
- Added `bcryptjs` (pure-JS, avoids a second native-compiled dependency
  alongside `better-sqlite3`) for password hashing, `jsonwebtoken` for session
  tokens, `cookie-parser` to read them.
- Added the `app_users` table (`AppUser`/`PublicAppUser` types in
  `server/types.ts` / `src/types.ts`) and its CRUD in `server/db.ts`.
- Auth transport (§8.1): went with the JWT-in-`httpOnly`-cookie design as
  proposed — `server/auth/authService.ts` (hash/verify/sign/verify),
  `server/auth/authMiddleware.ts` (`requireAuth`), `server/routes/auth.ts`
  (`POST /login`, `POST /logout`, `GET /me`). `server.ts` mounts `/api/auth`
  publicly and puts `requireAuth` in front of every other `/api/*` route — so as
  of this phase, being logged in (any role) is required for API access, but no
  route yet distinguishes *which* role is asking (that's Phase 3).
- `server/auth/seedSuperAdmin.ts`: idempotent seeder (only acts if zero
  `app_users` exist) that creates the initial `super-admin` / `123456789`
  account, hashed. *(Superseded - see the Migrations system addendum below:
  this is now a one-time migration, not something that re-runs on every
  startup.)* **The password should be changed after first login — there's no
  "change password" UI yet; that lands in Phase 4.**
- Client: `src/context/AuthContext.tsx` + `src/components/auth/LoginView.tsx`;
  `App.tsx` renders `LoginView` until a session exists, then the dashboard
  exactly as before. `Header.tsx` gained a username/role chip and a sign-out
  button.
- Verified end-to-end against a live instance of the real route/middleware
  stack: unauthenticated requests to protected routes get `401`, wrong password
  is rejected, correct login sets a working session cookie, `/me` reflects the
  session (and updates `lastLoginAt`), and logout revokes access immediately.

### Phase 3 — Role enforcement & router scoping — ✅ Done
- Added `server/auth/permissions.ts` (`canMutate`, `isSuperAdmin`,
  `routerScopeFor`, `hasRouterAccess`) and extended `authMiddleware.ts` with
  `requireRole(...roles)` and `requireRouterAccess(paramName?)`. `requireAuth`
  now re-fetches the account from the DB on every request instead of trusting
  the JWT's claims, so a role change or a disabled account takes effect
  immediately rather than waiting for the token to expire.
- **Scoping decision (§3 revisited):** dropped the planned `assignedAdminIds`
  field on `RouterRecord` - keeping a bidirectional relationship (router →
  admins *and* admin → routers) means every assignment change has to keep two
  places in sync, which is exactly the kind of drift bug this phase should
  avoid introducing. `AppUser.assignedRouterIds` (already in place from Phase 2)
  is the single source of truth; `db.getRouters`, `getGlobalStats`, and
  `getAlerts` all take an optional `restrictToIds` filter derived from it.
- Every route in `server/routes/api.ts` now carries `requireRole(...)` and/or
  `requireRouterAccess()` per the matrix in §2.1: only super-admin can add/
  delete routers, seed bulk routers, or download the project ZIP; super-admin
  and admin (scoped to their assigned routers) can edit routers and manage
  hotspot users/sessions/vouchers; viewer can view everything (including
  reports, with export) but nothing mutates. Also closed a data-layer gap
  while wiring this up: deleting a hotspot user or killing a session now
  verifies the target actually belongs to the router named in the URL, instead
  of trusting the id alone - otherwise the URL's router-access check could be
  satisfied while the id being deleted belonged to a different router entirely.
- **§8.3 (viewer scope) resolved:** viewer sees every router (dashboard,
  reports, and all router-scoped list views), same as super-admin, just
  entirely read-only - there was no "shared with them" mechanism designed for
  viewers, so restricting them to a subset wasn't implementable without
  inventing one. Flag if you actually intended reports-only.
- **§8.4 (admin + vouchers/terminal) resolved:** "edit their users and stuff"
  was read to include vouchers, sessions, and the (client-only) terminal
  button on their own router(s), in addition to the hotspot user list itself.
- Client: added `src/utils/permissions.ts` (mirrors the server helpers, purely
  for hiding controls - the server remains the actual enforcement point).
  Threaded `canMutate`/`isSuperAdmin` into `DashboardView`, `Header`,
  `RoutersView`, `RouterDetailView`, `UsersView`, `SessionsView`, and
  `VouchersView` to hide add/edit/delete/sync/terminal/ZIP-export controls a
  role can't use. `ReportsView` was intentionally left untouched - export stays
  available to every role. Sidebar/BottomNav tabs are unchanged too: viewer
  keeps every tab visible (per the resolved scope above), just read-only inside
  each one.
- Verified against the real route/middleware stack with three logged-in roles
  (super-admin, a test admin scoped to one router, a test viewer): admin's
  router list, `/stats`, and `/reports/global` come back scoped to exactly
  their assigned router only; admin gets `403` on an unassigned router, on
  adding/deleting routers, and on the ZIP download; viewer gets `200` on every
  GET (including reports) and `403` on every mutating call it tried
  (add user, kill session, generate vouchers, edit router, ZIP download).

### Addendum — Migrations system — ✅ Done
Requested before starting Phase 4: formalize the ad-hoc `createSchema()` DDL
(Phase 1) and `seedSuperAdminAccount()` (Phase 2) into a proper versioned
migrations setup, rather than hand-written startup logic.

- `server/db/migrationRunner.ts`: generic runner. Tracks applied migrations in
  a `schema_migrations` table (`id`, `appliedAt`); on every startup, runs
  whichever migrations in the ordered list aren't recorded yet, each in its
  own transaction.
- `server/db/migrations/001_init_schema.ts`: the full baseline schema (all 9
  tables) as one migration - this is what `createSchema()` used to do inline.
- `server/db/migrations/002_seed_super_admin.ts`: creates the default
  `super-admin` account. Runs via `INSERT OR IGNORE` keyed on the `username`
  UNIQUE constraint, since a database from before this migrations system
  existed may already have that row - it must not fail or duplicate there.
- `server/db.ts`'s constructor now calls `runMigrations(...)` instead of
  `createSchema()`. `server.ts` no longer calls `seedSuperAdminAccount()` on
  startup at all - migration 002 owns first-ever seeding now.
- **Behavior change, deliberate:** the account is now seeded exactly once,
  ever (tracked in `schema_migrations`), not "whenever `app_users` is empty."
  Before this change, deleting every dashboard account and restarting the
  server would have silently recreated `super-admin` - a real problem once
  Phase 4 adds account deletion. `server/auth/seedSuperAdmin.ts` still exists
  but is now a manual break-glass tool only (`npm run seed:super-admin`) for
  the case where every account really has been deleted and there's no other
  way back in; it no longer runs automatically.
- **Bug found and fixed while testing this on a truly empty database:**
  `generateInitialData()`'s bulk-router seed loop generates id `RT-8821` at
  `i=21`, colliding with the explicit `Branch-001` router that already uses
  that exact id. This was always a latent duplicate-id bug, silent under the
  old JSON-array storage (Phase 1 never exercised a from-scratch install, only
  imports from an existing `database.json`) - SQLite's `PRIMARY KEY` on
  `routers.id` turned it into a startup crash the first time a truly fresh
  install ran. Fixed by skipping that one colliding iteration.
- Verified: migrations apply cleanly (idempotently) against the current live
  database - `002_seed_super_admin` correctly left the existing `super-admin`
  account (from Phase 2, original creation timestamp) untouched rather than
  duplicating it. Also verified against a fresh, empty database in an isolated
  temp directory: schema creates cleanly, `super-admin`/`123456789` is seeded,
  37 routers seed with zero duplicate ids, and login works end-to-end.
- **Known follow-up, not fixed (out of scope for this addendum):**
  `seedBulkRouters` (the "Test 1,000+ Router Fleet" button) generates ids from
  `this.data.routers.length + 1` upward each time it's called - if routers are
  ever deleted between two bulk-seed calls, a regenerated id could collide
  with a surviving router's id and hit the same `PRIMARY KEY` error. Flag if
  you want this hardened too.

### Phase 4 — Account management UI — ✅ Done
- `server/routes/accounts.ts`: super-admin-only CRUD for `AppUser`, mounted at
  `/api/accounts` (gated by its own `requireRole('super-admin')`, on top of the
  `requireAuth` already in front of `apiRouter`). `GET /` lists accounts,
  `POST /` creates one, `PATCH /:id` handles role change, router
  reassignment, enable/disable, and password reset (all via one endpoint since
  they're all just field updates on the same record - no separate
  "reset password" route).
- **Lockout guard:** a `PATCH` that would leave zero active super-admin
  accounts (disabling the last one, or demoting/deleting it) is rejected with
  `400`. Verified: blocked while only one exists, succeeds once a second
  super-admin exists, and a disabled account's password immediately stops
  working for login.
- Validation: username required and unique (checked before insert, since the
  `UNIQUE` constraint failing inside `saveData()`'s try/catch would otherwise
  fail silently), password minimum 6 characters, role must be one of the three
  valid values.
- Client: `src/components/auth/AccountsView.tsx` - table of accounts (role,
  assigned routers, status, last login) plus a create/edit modal; the same
  modal handles both, with password reset as an optional field on edit.
  `Sidebar.tsx` gained a super-admin-only "Administration" section linking to
  it. Also gated the Sidebar's "Export Complete ZIP" link with `isSuperAdmin`
  while touching this file - it was the one action Phase 3 missed (the
  `Header.tsx` copy of that same button was already gated; this one wasn't).
- Verified end-to-end: non-super-admin gets `403` on every `/api/accounts`
  route; creation validation (short password, invalid role, duplicate
  username) all reject correctly; password reset immediately invalidates the
  old password and the new one works; a newly created account can log in with
  the role and router assignment it was given.

### Phase 5 — Activity logs — ✅ Done
- `audit_logs` table (migration `003_add_audit_logs`, indexed on `timestamp`
  and `userId`). Unlike the other 9 tables, it's read/written directly via SQL
  (`db.addAuditLog` / `db.getAuditLogs`) rather than folded into the in-memory
  `DatabaseSchema` full-snapshot-rewrite pattern - it's write-heavy and
  append-only, so mirroring it into that pattern would make every mutation in
  the app pay to rewrite an ever-growing log table on every single write.
- `server/auth/auditLog.ts`: `logAction(req, action, targetType, targetId?, detail?)`
  for the common case inside an authenticated handler, plus a lower-level
  `recordAuditLog(...)` for login/logout where `req.user` isn't set yet (login)
  or is about to be cleared (logout).
- Logged: `router.create/update/delete/seed_bulk`, `user.create/delete`,
  `session.kill`, `voucher.generate`, `account.create/update`, `auth.login/logout`.
  Each entry captures the actor's id/username/role *at the time of the action*
  (not a live join to the current account state), so a later rename or
  deletion doesn't rewrite history. Read-only actions (router sync, all GETs)
  are deliberately not logged - the log is for consequential changes, not a
  request trace.
- `GET /api/logs` (`server/routes/logs.ts`, super-admin only): filter by
  `userId`/`action`/`targetType`/date range, paginated, newest first.
- Client: `src/components/auth/LogsView.tsx` - table with action/date filters
  and pagination, reachable from the same super-admin-only "Administration"
  Sidebar section as Accounts.
- Verified end-to-end: non-super-admin gets `403` on `/api/logs`; creating and
  deleting a router, updating an account, and logging in/out all produce
  correctly attributed log rows with the right action/target/detail; filtering
  by `action` and by `userId` both return exactly the matching subset.

### Addendum — 7-day sessions & a fourth role, 'scoped-viewer' — ✅ Done
- **Session length:** `TOKEN_TTL` in `server/auth/authService.ts` and the
  cookie's `maxAge` in `server/routes/auth.ts` both changed from 12h to 7d.
- **New role `scoped-viewer`:** read-only, like `viewer`, but limited to
  `assignedRouterIds` like `admin` - the two read-only roles now differ only in
  router visibility, not in mutate permission. `routerScopeFor` (both
  `server/auth/permissions.ts` and its client mirror) treats `admin` and
  `scoped-viewer` identically for scoping purposes; `canMutate` only allows
  `super-admin`/`admin`.
- **Admin can now reach `/api/accounts`, narrowly:** an `admin` may create and
  manage accounts, but only `scoped-viewer` ones, and only ones they
  personally created - never another role, never another admin's account, and
  never a role change on anything (all enforced in
  `server/routes/accounts.ts`, not just hidden client-side). New
  `AppUser.createdBy` field (migration `004_add_app_user_created_by`) records
  who created each account so this can be checked.
- **Auto-assignment:** when an `admin` creates a `scoped-viewer`, the
  client-supplied `role`/`assignedRouterIds` are ignored server-side and
  replaced with `'scoped-viewer'` / the creating admin's own
  `assignedRouterIds` - satisfies "automatically assigns to all the routers of
  that admin" without trusting the client for something security-relevant. An
  admin editing an existing `scoped-viewer` they created can narrow (not
  widen) that assignment - any router id outside the admin's own assignment is
  rejected with `403`.
- Client: `AccountsView.tsx` adapts to the caller - an `admin` sees no role
  picker (implicitly creating `scoped-viewer` only), no router picker on
  create (automatic), and only a "manage your own" account list (server
  already filters `GET /accounts` this way). `Sidebar.tsx`'s "Accounts" entry
  is now visible to `admin` too, while "Activity Logs" stays `super-admin`
  only.
- Verified end-to-end: a `scoped-viewer` sees exactly its assigned router
  (`200`) and gets `403` on any other router or any mutating call; an `admin`
  attempting to create an `'admin'`-role account gets silently downgraded to
  `scoped-viewer` (not an error - matches "this viewer role can be created by
  ... the admin", not "the admin can create arbitrary roles"); an admin's
  attempt to edit a role, touch another account, or assign an out-of-scope
  router all get `403`; disabling a `scoped-viewer` immediately blocks its
  login; the 7-day token TTL was confirmed by decoding a freshly issued token.

### Phase 6 — Hardening
- Login rate limiting, session/token expiry + refresh, password complexity rule,
  audit-log retention policy, and a pass over error messages so they never leak
  whether a username exists (timing/enumeration hardening).

## 10. Explicit non-goals for now

- Multi-tenant organizations (this is roles within one dashboard, not
  multi-company isolation).
- Fine-grained per-field permissions beyond the role matrix in §2.1.
- SSO / OAuth — plain username+password only, for this pass.
