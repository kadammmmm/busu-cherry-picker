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
2. [Deploy to Render.com](#step-2-deploy-to-rendercom)
3. [Configure WxCC Queue](#step-3-configure-wxcc-queue)
4. [Configure Multimedia Profile](#step-4-configure-multimedia-profile)
5. [Configure the Flow](#step-5-configure-the-flow)
6. [Add Widget to Desktop Layout](#step-6-add-widget-to-desktop-layout)
7. [Test the Widget](#step-7-test-the-widget)
8. [Troubleshooting](#step-8-troubleshooting)

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

> **Security:** `API_KEY` protects the call ingestion endpoint. Your WxCC flow HTTP Request node must send this as the `x-api-key` header. `ADMIN_KEY` protects the `/admin/*` endpoints.

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

## Step 3: Configure WxCC Queue

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

## Step 4: Configure Multimedia Profile

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

## Step 5: Configure the Flow

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

## Step 6: Add Widget to Desktop Layout

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

## Step 7: Test the Widget

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

## Step 8: Troubleshooting

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