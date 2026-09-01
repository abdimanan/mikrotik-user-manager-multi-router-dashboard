Roles & permission matrix — super-admin (full access, as today), admin (scoped to assigned router(s), can manage that router's users/vouchers/sessions/terminal), viewer (read-only + CSV/PDF export)
- Data model additions — new AppUser type/collection, assignedAdminIds on RouterRecord
- Planned folder structure — new server/auth/ module and src/components/auth/ (additive only, matches existing patterns, nothing existing moves)
- How it sets up the logs feature you mentioned next (every action gets an actor id to attach a log line to)
- SQLite migration plan — swaps the JSON-file Database class for better-sqlite3 internally, keeping the same method signatures so nothing else has to change
- Open questions flagged for you to confirm before coding starts (JWT vs. session, one-router-vs-many-per-admin, viewer's report scope, whether "edit their users and stuff" includes vouchers/terminal)
- 6 phases: (1) SQLite migration, (2) login/auth, (3) role enforcement + router scoping, (4) account management UI, (5) activity logs, (6) hardening