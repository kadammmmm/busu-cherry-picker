# Call Selector Widget — Deployment Guide

## Complete Setup Guide

**Estimated Time:** 45–60 minutes  
**Skill Level:** Intermediate (basic familiarity with web hosting and WxCC administration)

---

## Overview

This guide walks you through deploying the Call Selector Widget and configuring your Webex Contact Center to use it. By the end, your agents will be able to view and selectively claim voice calls from the queue in real time.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         YOUR DEPLOYMENT                              │
│                                                                      │
│   ┌─────────────────┐         ┌─────────────────────────────────┐   │
│   │  Call Selector  │         │      Webex Contact Center       │   │
│   │  Web Service    │◄───────►│                                 │   │
│   │  (Render.com)   │         │  • Queue (manuallyAssignable)   │   │
│   └────────┬────────┘         │  • MMP (telephony: 1)           │   │
│            │                  │  • Flow (HTTP Request nodes)    │   │
│            │                  │  • Desktop Layout               │   │
│            ▼                  │                                 │   │
│   ┌─────────────────┐         │                                 │   │
│   │  Agent Desktop  │◄────────│                                 │   │
│   │  (Widget)       │         └─────────────────────────────────┘   │
│   └─────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

1. [Prerequisites](#step-1-prerequisites)
2. [Deploy to Render.com](#step-2-deploy-to-rendercom) *(cloud — quickest)*
3. [Deploy to Windows Server](#step-3-deploy-to-windows-server) *(on-premise alternative)*
4. [Configure WxCC Queue](#step-4-configure-wxcc-queue)
5. [Configure Multimedia Profile](#step-5-configure-multimedia-profile)
6. [Configure the Flow](#step-6-configure-the-flow)
7. [Add Widget to Desktop Layout](#step-7-add-widget-to-desktop-layout)
8. [Test the Widget](#step-8-test-the-widget)
9. [Troubleshooting](#step-9-troubleshooting)
10. [Security](#security)

---

## Step 1: Prerequisites

### Required Accounts

| Account | Purpose | Sign Up |
|---------|---------|---------|
| **GitHub** | To fork the repository | https://github.com/signup |
| **Render.com** | To host the web service (free tier available) | https://render.com |
| **WxCC Admin** | To configure Contact Center | (existing access) |

### Required WxCC Access

- Control Hub administrator access
- Flow Designer access
- Ability to make API calls (for queue/MMP configuration)

### Information You'll Need

| Item | Where to Find It |
|------|------------------|
| **Organization ID** | Control Hub > Account > Org ID |
| **Queue ID** | Control Hub > Contact Center > Queues > select queue > URL |
| **MMP ID** | Control Hub > Contact Center > Multimedia Profiles > select profile |
| **API Access Token** | https://developer.webex.com > Sign In > My Access Token |

### Your WxCC Region

| If your URL contains... | Region value | API Base URL |
|-------------------------|--------------|--------------|
| wxcc-us1 | `us1` | api.wxcc-us1.cisco.com |
| wxcc-eu1 | `eu1` | api.wxcc-eu1.cisco.com |
| wxcc-eu2 | `eu2` | api.wxcc-eu2.cisco.com |
| wxcc-anz1 | `anz1` | api.wxcc-anz1.cisco.com |
| wxcc-ca1 | `ca1` | api.wxcc-ca1.cisco.com |
| wxcc-jp1 | `jp1` | api.wxcc-jp1.cisco.com |
| wxcc-sg1 | `sg1` | api.wxcc-sg1.cisco.com |

---

## Step 2: Deploy to Render.com

### 2.1 Fork the Repository

1. Go to: `https://github.com/kadammmmm/busu-cherry-picker`
2. Click **Fork** > select your GitHub account

### 2.2 Create Render.com Account

1. Go to https://render.com
2. Sign up with GitHub (recommended)

### 2.3 Create New Web Service

1. Click **New +** > **Web Service**
2. Connect your forked `busu-cherry-picker` repository

### 2.4 Configure the Web Service

| Setting | Value |
|---------|-------|
| **Name** | `busu-cherry-picker` (or your preferred name) |
| **Region** | Closest to your agents |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

### 2.5 Select Instance Type

| Environment | Plan | Cost |
|-------------|------|------|
| Testing/Demo | Free | $0/month |
| Production | Starter | $7/month |

> **Note:** Free tier instances spin down after 15 minutes of inactivity. For production, use Starter plan.

### 2.6 Add Environment Variables

Click **Advanced** and add:

| Key | Value |
|-----|-------|
| `PORT` | `5000` |
| `HOST_URI` | `https://[your-app-name].onrender.com` |
| `CORS_ORIGINS` | `https://desktop.wxcc-us1.cisco.com` |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` |
| `API_KEY` | A long random secret string |
| `ADMIN_KEY` | A different long random secret string |

> **Security:** Both keys are optional but **must be set in production**. See the [Security](#security) section for full details on what each key protects and how to generate them.

For multiple WxCC regions in `CORS_ORIGINS`, comma-separate them:
```
https://desktop.wxcc-us1.cisco.com,https://desktop.wxcc-eu1.cisco.com
```

### 2.7 Deploy

1. Click **Create Web Service**
2. Wait for the build to complete (3–5 minutes)
3. Look for the green **Live** indicator

### 2.8 Verify Deployment

Open in browser:
```
https://[your-app-name].onrender.com/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "version": "3.0.0"
}
```

**Save your Render URL — you'll need it for the remaining steps.**

---

## Step 3: Deploy to Windows Server

Use this option if you need to host the service on your own infrastructure rather than a cloud provider.

**Estimated Time:** 15–30 minutes with the installer script, 30–45 minutes manually  
**Requirements:** Windows Server 2016 or later, outbound internet access to WxCC API endpoints, a public hostname or IP accessible by Agent Desktop browsers

---

### 3.0 Automated Install (Recommended)

The distribution ZIP includes `install.ps1` — a PowerShell script that handles the entire setup automatically.

**Steps:**
1. Copy the ZIP to your Windows Server and unzip it
2. Right-click `install.ps1` → **Run as Administrator**
3. Follow the prompts:
   - Checks for Node.js 18+ and offers to install it if missing
   - Asks for install directory (default: `C:\inetpub\call-selector`)
   - Asks for your server URL, WxCC CORS origins, and log level
   - Generates secure API and Admin keys automatically (or lets you supply your own)
   - Installs dependencies, starts the service via PM2, configures Windows auto-start, and opens the firewall port
4. At the end the script prints your API key and the exact header to add to your WxCC flow

**To get the distribution ZIP**, run from the repo root:
```powershell
.\scripts\package.ps1
```
This exports a clean ZIP from the `main` branch (no `node_modules`, no `.env`).

If you prefer to set things up manually, follow the steps below.

---

### 3.1 Install Prerequisites (Manual)

**Node.js 18+**

1. Download the Windows LTS installer from https://nodejs.org
2. Run the installer — accept defaults, ensure **"Add to PATH"** is checked
3. Open a new Command Prompt and verify:
   ```
   node --version
   npm --version
   ```

**Git**

1. Download from https://git-scm.com/download/win
2. Install with defaults
3. Verify: `git --version`

**PM2** (process manager — keeps the app running and restarts it on crash or reboot)

```cmd
npm install -g pm2
npm install -g pm2-windows-startup
```

---

### 3.2 Get the Code

Open Command Prompt or PowerShell as Administrator and run:

```cmd
cd C:\inetpub
git clone https://github.com/kadammmmm/busu-cherry-picker.git call-selector
cd call-selector
```

> You can clone to any directory. `C:\inetpub\call-selector` is a common convention for web services on Windows Server.

---

### 3.3 Install Dependencies and Build

```cmd
npm install
npm run build
```

You should see `webpack compiled successfully` at the end of the build.

---

### 3.4 Configure Environment Variables

Copy the example file and edit it:

```cmd
copy .env.example .env
notepad .env
```

Set these values:

```ini
PORT=5000
HOST_URI=https://your-server-hostname-or-ip
CORS_ORIGINS=https://desktop.wxcc-us1.cisco.com
NODE_ENV=production
LOG_LEVEL=info
API_KEY=your-secret-api-key-here
ADMIN_KEY=your-secret-admin-key-here
```

> Both keys are optional but **must be set in production**. See the [Security](#security) section for what they protect and how to generate them.

> **HOST_URI** must be the public URL that Agent Desktop browsers can reach — either a hostname with DNS or a public IP. If you're using IIS as a reverse proxy (Step 3.6), this will be your IIS site URL.

Save and close Notepad.

---

### 3.5 Run with PM2

Start the app and configure it to launch on Windows startup:

```cmd
pm2 start index.js --name call-selector
pm2 save
pm2-startup install
```

**Useful PM2 commands:**

| Command | Purpose |
|---------|---------|
| `pm2 status` | Check if the app is running |
| `pm2 logs call-selector` | View live logs |
| `pm2 restart call-selector` | Restart the app |
| `pm2 stop call-selector` | Stop the app |

**Verify the app is running:**

```
http://localhost:5000/health
```

You should see `{"status":"healthy",...}`.

---

### 3.6 Open Windows Firewall Port

If agents access the server directly (no reverse proxy), open port 5000:

1. Open **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. Select **Port** → **TCP** → **Specific local ports: 5000**
4. Allow the connection
5. Apply to Domain + Private profiles (add Public if needed)
6. Name it `Call Selector Widget`

---

### 3.7 Set Up IIS as a Reverse Proxy (Recommended)

Using IIS lets you serve the app on standard port 443 (HTTPS) with a proper SSL certificate, which is required for the WxCC Agent Desktop to load the widget securely.

**Install required IIS modules:**

1. Open **Server Manager** → **Manage** → **Add Roles and Features**
2. Install **Web Server (IIS)** if not already installed
3. Download and install:
   - [URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite)
   - [Application Request Routing (ARR)](https://www.iis.net/downloads/microsoft/application-request-routing)

**Enable ARR proxy:**

1. Open **IIS Manager**
2. Click the server node (top level) → **Application Request Routing Cache**
3. Click **Server Proxy Settings** → check **Enable proxy** → **Apply**

**Create the site:**

1. In IIS Manager, right-click **Sites** → **Add Website**
2. Set:
   - Site name: `call-selector`
   - Physical path: `C:\inetpub\call-selector\` (or any folder — IIS won't serve files directly, it just proxies)
   - Binding: HTTPS, port 443, your hostname
   - SSL certificate: select your certificate

**Add URL Rewrite rule** to proxy all traffic to Node.js:

1. Click your new site → **URL Rewrite** → **Add Rule** → **Reverse Proxy**
2. Set **Inbound rule server name**: `localhost:5000`
3. Click **OK**

This creates a `web.config` in the site folder. Your app is now reachable at `https://your-hostname/`.

Update `HOST_URI` in `.env` to match this URL and restart PM2:

```cmd
pm2 restart call-selector
```

---

### 3.8 Verify the Deployment

Open in a browser from a machine on the network:

```
https://your-hostname/health
https://your-hostname/build/bundle.js
```

Both should respond. Use `https://your-hostname` as your server URL in the WxCC flow and desktop layout for the remaining steps.

---

## Step 4: Configure WxCC Queue


### 3.1 Get an API Access Token

1. Go to https://developer.webex.com
2. Sign in with your WxCC admin account
3. Click your profile icon > **My Webex Developer Info**
4. Copy the **Personal Access Token** (valid 12 hours)

### 3.2 Get Your Current Queue Configuration

```bash
curl --request GET \
  --url 'https://api.wxcc-us1.cisco.com/organization/YOUR_ORG_ID/contact-service-queue/YOUR_QUEUE_ID' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

**Save the response** — you'll need the existing properties for the update.

### 3.3 Update Queue to Enable Manual Assignment

```bash
curl --request PUT \
  --url 'https://api.wxcc-us1.cisco.com/organization/YOUR_ORG_ID/contact-service-queue/YOUR_QUEUE_ID' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Your Existing Queue Name",
    "manuallyAssignable": true
  }'
```

> Include all required existing properties from your GET response.

### 3.4 Verify the Change

Run the GET request again and confirm:
```json
"manuallyAssignable": true
```

---

## Step 5: Configure Multimedia Profile

### 4.1 Get Your Current MMP Configuration

```bash
curl --request GET \
  --url 'https://api.wxcc-us1.cisco.com/organization/YOUR_ORG_ID/multimedia-profile/YOUR_MMP_ID' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

### 4.2 Update MMP for Manual Assignment

```bash
curl --request PUT \
  --url 'https://api.wxcc-us1.cisco.com/organization/YOUR_ORG_ID/multimedia-profile/YOUR_MMP_ID' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Your Existing MMP Name",
    "manuallyAssignable": {
      "telephony": 1,
      "chat": 0,
      "email": 0,
      "social": 0
    }
  }'
```

### 4.3 Verify

Confirm `manuallyAssignable.telephony` is `1`.

---

## Step 6: Configure the Flow

Two HTTP Request nodes are needed for full real-time behaviour. Both POST to the same endpoint.

### 5.1 Node 1 — Call Arrival (required)

Triggers when a call enters the flow.

**Placement:** After `NewPhoneContact` (after any Set Variable nodes), before `Queue Contact`. Connect the error output to `Queue Contact` so calls still queue if the service is unavailable.

| Setting | Value |
|---------|-------|
| **Method** | `POST` |
| **URL** | `https://[your-app-name].onrender.com/` |
| **Header** | `x-api-key: YOUR_API_KEY` |
| **Content-Type** | `Application/JSON` |

**Request Body:**
```json
{
  "ANI": "{{NewPhoneContact.ANI}}",
  "DNIS": "{{NewPhoneContact.DNIS}}",
  "InteractionId": "{{NewPhoneContact.InteractionId}}",
  "OrgId": "{{NewPhoneContact.OrgId}}",
  "Headers": "{{NewPhoneContact.Headers}}",
  "EntryPointId": "{{NewPhoneContact.EntryPointId}}",
  "FlowId": "{{NewPhoneContact.FlowId}}",
  "priority": "{{priority}}",
  "customerName": "{{customerName}}",
  "accountNumber": "{{accountNumber}}",
  "callReason": "{{callReason}}"
}
```

> Replace the variable names with your actual flow variable names.

### 5.2 Node 2 — Call Abandoned (optional, recommended)

Without this node, abandoned calls are removed on the next poll cycle (default 5 seconds). With it, they are removed from the widget immediately.

**Placement:** Triggered by the `AgentContactAbandoned` (or equivalent) event in your flow.

| Setting | Value |
|---------|-------|
| **Method** | `POST` |
| **URL** | `https://[your-app-name].onrender.com/` |
| **Header** | `x-api-key: YOUR_API_KEY` |
| **Content-Type** | `Application/JSON` |

**Request Body:**
```json
{
  "InteractionId": "{{NewPhoneContact.InteractionId}}",
  "OrgId": "{{NewPhoneContact.OrgId}}",
  "eventType": "abandoned"
}
```

### 5.3 Flow Structure

```
[New Phone Contact]
        │
        ▼
[HTTP Request: Call Arrival] ── Error ──┐
        │                               │
        │ Success                       │
        ▼                               │
[Queue Contact] ◄───────────────────────┘
        │
        ▼
   (continue...)

[AgentContactAbandoned event]
        │
        ▼
[HTTP Request: Abandon Notification] ── (error output: no-op)
```

### 5.4 Validate and Publish

1. Click **Validate**
2. Fix any issues
3. Click **Publish**

---

## Step 7: Add Widget to Desktop Layout

### 6.1 Desktop Layout Snippet

Replace `[your-app-name]` and `[your-region]` with your values:

```json
{
  "nav": {
    "label": "Call Selector",
    "icon": "call-voicemail",
    "iconType": "momentum",
    "navigateTo": "call-selector",
    "align": "top"
  },
  "page": {
    "id": "call-selector",
    "widgets": {
      "selector-area": {
        "comp": "call-selector-widget",
        "script": "https://[your-app-name].onrender.com/build/bundle.js",
        "attributes": {
          "darkmode": "$STORE.app.darkMode",
          "region": "[your-region]",
          "refreshinterval": "5",
          "maxtaskage": "3600",
          "showstatuses": "queued"
        },
        "properties": {
          "accessToken": "$STORE.auth.accessToken"
        }
      },
      "main-area": {
        "comp": "agentx-wc-interaction-control"
      }
    },
    "layout": {
      "areas": [["selector-area", "main-area"]],
      "size": {
        "cols": ["30%", "70%"],
        "rows": [1]
      }
    }
  }
}
```

**Widget attribute options:**

| Attribute | Default | Notes |
|-----------|---------|-------|
| `region` | `us1` | Match your WxCC portal region |
| `refreshinterval` | `5` | Poll interval in seconds |
| `maxtaskage` | `3600` | How far back (in seconds) to fetch tasks. Calls older than this disappear. Increase if calls can wait longer than 1 hour. |
| `showstatuses` | `queued` | Comma-separated: `queued`, `assigned`, `abandoned`, `completed` |
| `displayfields` | standard set | JSON array of custom field keys to show |

### 6.2 Add to Your Desktop Layout

1. Go to **Control Hub > Contact Center > Desktop Layouts**
2. Open your existing layout
3. Click the **JSON** tab
4. Add the snippet above to the `"navigation"` array
5. Click **Save**

### 6.3 Assign Layout to Team

1. Go to **Control Hub > Contact Center > Teams**
2. Click the team > **Edit**
3. Set **Desktop Layout** to your updated layout
4. Click **Save**

---

## Step 8: Test the Widget

### 7.1 Agent Login

1. Open Agent Desktop for your region (e.g. `https://desktop.wxcc-us1.cisco.com`)
2. Log in with an agent from the team with the Call Selector layout
3. Set status to **Available**

### 7.2 Verify Widget Loads

1. Click **Call Selector** in the left navigation
2. You should see the header with "Call Selector" branding and a live/offline indicator

### 7.3 Test with a Call

1. Call the phone number for your entry point
2. The call should appear in the widget within 1–2 seconds
3. You should see: caller's phone number, queue name, wait time (updating live), and a **Claim** button

### 7.4 Claim the Call

1. Click **Claim**
2. The call is delivered to your agent desktop

### 7.5 Test Abandon (if Node 2 is configured)

1. Place a call to the queue
2. Hang up before it is claimed
3. The call card should disappear immediately (not after the next poll cycle)

---

## Step 9: Troubleshooting

### Widget Not Loading

| Check | Solution |
|-------|----------|
| Browser console (F12) | Look for CORS or 404 errors |
| Script URL | Verify `https://[your-app-name].onrender.com/build/bundle.js` loads |
| CORS_ORIGINS | Must include your exact desktop URL |
| Render service | Check it shows "Live" status |

### Widget Shows Offline

| Check | Solution |
|-------|----------|
| Render logs | Check for errors in Render dashboard > Logs |
| HOST_URI | Must match your actual Render URL exactly |
| Free tier cold start | First request after idle takes 30–60s — wait and refresh |

### Calls Not Appearing

| Check | Solution |
|-------|----------|
| Flow published | Ensure flow is published, not just saved |
| HTTP Request URL | Must match your Render URL exactly (trailing slash required) |
| API_KEY header | Render logs will show `401 Unauthorized` if key is missing/wrong |
| Render logs | Should show POST requests when calls arrive |
| Queue configured | Verify `manuallyAssignable: true` |

### Claim Button Not Working

| Check | Solution |
|-------|----------|
| MMP configured | Verify `manuallyAssignable.telephony: 1` |
| Agent permissions | Agent must have access to the queue |
| Browser console | Look for 401/403 API errors |

### Abandoned Calls Not Disappearing Immediately

| Check | Solution |
|-------|----------|
| Node 2 configured | Add the abandon HTTP Request node to your flow (Step 5.2) |
| Render logs | Should show a POST with `eventType: abandoned` when a call hangs up |
| As fallback | Reduce `refreshinterval` attribute to `2` for faster poll-based removal |

### Dark Mode Not Syncing

| Check | Solution |
|-------|----------|
| Layout JSON | Verify `"darkmode": "$STORE.app.darkMode"` |
| Re-upload layout | Sometimes requires a fresh upload |

---

## Security

### API_KEY — Ingestion Endpoint Protection

The `POST /` endpoint receives call data from your WxCC flow HTTP Request nodes. Without an API key, anyone who knows your server URL can POST arbitrary data to it — injecting fake calls into agents' widgets or spamming the caller ID cache.

**How it works:**
- Set `API_KEY` to any long random string in your `.env`
- The server checks every `POST /` request for the header `x-api-key: <your key>`
- Requests with a missing or incorrect key receive `401 Unauthorized` and are dropped
- Your WxCC flow HTTP Request node must include this header (see Step 6)

**If not set:** The endpoint is open and the server logs a warning at startup:
```
WARN: API_KEY is not set — ingestion endpoint is unauthenticated. Set API_KEY in production.
```
This is acceptable for local development only.

---

### ADMIN_KEY — Admin Endpoint Protection

Three diagnostic endpoints expose internal server state:

| Endpoint | What it exposes |
|----------|----------------|
| `GET /admin/cache` | All cached caller ID data (ANI, custom fields) for recent calls |
| `GET /admin/connections` | List of agents currently connected via WebSocket |
| `POST /admin/cache/clear` | Wipes the entire caller ID cache |

Without an admin key these are open to anyone who knows your server URL.

**How it works:**
- Set `ADMIN_KEY` to a different long random string in your `.env`
- Requests to `/admin/*` must include the header `x-admin-key: <your key>`
- Requests without it receive `401 Unauthorized`

**If not set:** Admin endpoints are open and the server logs a warning at startup:
```
WARN: ADMIN_KEY is not set — admin endpoints are unprotected. Set ADMIN_KEY in production.
```

---

### Generating Secure Keys

Run this command to generate a cryptographically random key:

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it twice — once for `API_KEY`, once for `ADMIN_KEY`. Store both somewhere safe (a password manager or secrets vault). Example output:

```
a3f8c2e1d94b7f0e6a2d5c8b1e4f7a0d3c6b9e2f5a8d1c4b7e0f3a6d9c2b5e8
```

---

## Quick Reference

### Your URLs

| Resource | URL |
|----------|-----|
| Your App | `https://________________.onrender.com` |
| Health Check | `https://________________.onrender.com/health` |
| Widget Bundle | `https://________________.onrender.com/build/bundle.js` |

### Environment Variables

| Variable | Value |
|----------|-------|
| `PORT` | `5000` |
| `HOST_URI` | `https://[your-app-name].onrender.com` |
| `CORS_ORIGINS` | `https://desktop.wxcc-[region].cisco.com` |
| `NODE_ENV` | `production` |
| `API_KEY` | Your secret key (send as `x-api-key` from flow) |
| `ADMIN_KEY` | Your admin key (send as `x-admin-key`) |

### API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/` | POST | `x-api-key` | Receive call events from flow |
| `/health` | GET | none | Health check |
| `/ready` | GET | none | Readiness probe |
| `/callerIds` | POST | none | Retrieve cached caller info |
| `/admin/cache` | GET | `x-admin-key` | Cache statistics |
| `/admin/connections` | GET | `x-admin-key` | Connected agents |
| `/admin/cache/clear` | POST | `x-admin-key` | Clear cache |

---

## Support

- **GitHub Issues**: https://github.com/kadammmmm/busu-cherry-picker/issues

---

**Document Version:** 3.1  
**Last Updated:** April 2026