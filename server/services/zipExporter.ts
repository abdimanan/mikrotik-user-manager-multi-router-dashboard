import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export async function generateProjectZip(): Promise<Buffer> {
  const zip = new JSZip();

  // Add detailed README.md
  const readmeContent = `# MikroTik User Manager Multi-Router Web Dashboard

A complete, high-performance Node.js & Web Dashboard for managing **1,000+ MikroTik Routers and User Manager instances** over public IP addresses.

---

## 🌟 Key Features

1. **Multi-Router Architecture**:
   - Manage 1,000+ MikroTik routers from a single central web dashboard.
   - On-demand connection pooling: connections are leased on-demand, execute commands, and cleanly close to avoid socket exhaustion.
   - Strict connection timeout handling with graceful error isolation (an offline router never crashes or slows down other routers).

2. **Security & Password Encryption**:
   - Stored credentials are encrypted using **AES-256-GCM** with unique Initialization Vectors (IV) and authentication tags.
   - Defaults to **API-SSL (TCP port 8729)** with TLS encryption.
   - Passwords are never sent back to or exposed in the frontend.

3. **MikroTik RouterOS API Engine**:
   - Native pure Node.js RouterOS API client.
   - Supports both RouterOS v7 plaintext login and RouterOS v6 MD5 challenge-response authentication.
   - Dynamic field mapper: adapts gracefully to different RouterOS releases and User Manager packages.

4. **User Manager Sub-Modules**:
   - **Users**: List, profile assignment, data limits, uptime, bandwidth counters, enable/disable.
   - **Active Sessions**: Real-time connected clients, IP/MAC addresses, uptime, download/upload rates, kick/terminate session.
   - **Voucher Studio**: Batch voucher generation, customizable prefixes, time/data limits, printable voucher cards with PINs.
   - **Reports**: Daily bandwidth reports per router and global combined multi-router analytics with CSV export.

---

## 🚀 Quick Start (Windows 11 / Windows 10 / Linux / macOS)

### Prerequisites
- Node.js 18+ or 20+ installed ([https://nodejs.org/](https://nodejs.org/))
- npm (included with Node.js)

### Installation & Run

1. Extract the ZIP file:
   \`\`\`bash
   cd MikroTik_MultiRouter_UserManager_NodeJS
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Configure Environment (optional, defaults provided):
   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. Run Development Server:
   \`\`\`bash
   npm run dev
   \`\`\`
   *Or for production:*
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

5. Open your browser:
   \`\`\`text
   http://localhost:3000
   \`\`\`

---

## 🔐 MikroTik Router Configuration Guide

### 1. Enable API-SSL (Port 8729) on MikroTik RouterOS
Run the following commands in the MikroTik Terminal / WinBox:

\`\`\`routeros
# Check and enable api-ssl
/ip service set api-ssl port=8729 disabled=no

# If you need a self-signed SSL certificate for API-SSL:
/certificate add name=api-ssl-cert common-name="MikroTik-API" days-valid=3650 key-size=2048
/certificate sign api-ssl-cert
/ip service set api-ssl certificate=api-ssl-cert
\`\`\`

### 2. Restrict Firewall Access to Dashboard Server IP (Recommended)
Do **NOT** expose API-SSL 8729 to the entire internet without restriction.
Add a firewall filter rule accepting traffic only from your Dashboard Server's Public IP:

\`\`\`routeros
# Replace 203.0.113.100 with your dashboard server's public IP
/ip firewall filter add chain=input protocol=tcp dst-port=8729 src-address=203.0.113.100 action=accept comment="Allow Dashboard Server API-SSL"
/ip firewall filter add chain=input protocol=tcp dst-port=8729 action=drop comment="Drop all other API-SSL attempts"
\`\`\`

### 3. Create a Dedicated API User with Minimal Permissions
\`\`\`routeros
/user group add name=dashboard-api policy=api,read,write,!local,!telnet,!ssh,!ftp,!reboot,!policy,!test,!winbox,!password,!web,!sniff,!sensitive,!romon
/user add name=api_manager group=dashboard-api password="YourSecurePassword2026!"
\`\`\`

---

## 🛠️ Troubleshooting Connection Timeout (WinError 10060 / ETIMEDOUT)

If the dashboard displays \`🔴 OFFLINE - Unable to connect: Connection timeout\`:

1. **Port Reachability**:
   - Verify that your ISP or cloud provider is not blocking inbound TCP 8729 / 8728.
   - Test connectivity from your server using PowerShell:
     \`\`\`powershell
     Test-NetConnection -ComputerName 143.105.216.10 -Port 8729
     \`\`\`
2. **NAT / Port Forwarding**:
   - If the MikroTik router is behind a Carrier-Grade NAT (CGNAT) or another gateway, ensure public IP is assigned or dst-nat port forwarding is configured.
3. **Firewall Drop Rules**:
   - Check if your \`/ip firewall filter\` has a default drop rule placed above the accept rule. Ensure the accept rule is at the top of the input chain.

---

## 🏗️ Architecture for 1,000+ Routers

- **No Permanent Socket Leaks**: Standard architectures create persistent socket connections for each device, quickly crashing Node.js due to file descriptor exhaustion (EMFILE).
- **On-Demand Leased Connections**: This dashboard connects on-demand when inspecting a router or executing batch tasks, pools connections for 15 seconds of active user interaction, and automatically closes them when idle.
- **Resilient Isolation**: If 50 routers are down or experiencing high packet loss, their connection timeouts are isolated and resolve asynchronously without delaying UI responsiveness for the other 950 online routers.

---

## 📜 License
MIT License. Built for production network administrators and ISP operations.
`;

  zip.file('README.md', readmeContent);

  // Add Windows batch starter files
  zip.file(
    'start-windows.bat',
    `@echo off
title MikroTik Multi-Router Dashboard
echo ========================================================
echo   Starting MikroTik User Manager Multi-Router Dashboard
echo ========================================================
echo.
npm install && npm run dev
pause
`
  );

  // Add package.json
  const pkgContent = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8');
  zip.file('package.json', pkgContent);

  // Add .env.example
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf-8');
  zip.file('.env.example', envContent);

  // Add server files
  const serverDir = path.join(process.cwd(), 'server');
  if (fs.existsSync(serverDir)) {
    const readDirRecursive = (dir: string, baseInZip: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const zipPath = `${baseInZip}/${entry.name}`;
        if (entry.isDirectory()) {
          readDirRecursive(fullPath, zipPath);
        } else {
          zip.file(zipPath, fs.readFileSync(fullPath, 'utf-8'));
        }
      }
    };
    readDirRecursive(serverDir, 'server');
  }

  // Add server.ts
  if (fs.existsSync(path.join(process.cwd(), 'server.ts'))) {
    zip.file('server.ts', fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8'));
  }

  // Add tsconfig & vite config
  if (fs.existsSync(path.join(process.cwd(), 'tsconfig.json'))) {
    zip.file('tsconfig.json', fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf-8'));
  }
  if (fs.existsSync(path.join(process.cwd(), 'vite.config.ts'))) {
    zip.file('vite.config.ts', fs.readFileSync(path.join(process.cwd(), 'vite.config.ts'), 'utf-8'));
  }

  // Add src files
  const srcDir = path.join(process.cwd(), 'src');
  if (fs.existsSync(srcDir)) {
    const readSrcRecursive = (dir: string, baseInZip: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const zipPath = `${baseInZip}/${entry.name}`;
        if (entry.isDirectory()) {
          readSrcRecursive(fullPath, zipPath);
        } else {
          zip.file(zipPath, fs.readFileSync(fullPath, 'utf-8'));
        }
      }
    };
    readSrcRecursive(srcDir, 'src');
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
