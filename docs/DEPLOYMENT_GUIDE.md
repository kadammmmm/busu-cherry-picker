# WxCC Cherry Picker Widget - Deployment Guide

## Complete Setup Guide

**Estimated Time:** 45-60 minutes  
**Skill Level:** Intermediate (basic familiarity with web hosting and WxCC administration)

---

## Overview

This guide walks you through deploying the Cherry Picker Widget and configuring your Webex Contact Center to use it. By the end, your agents will be able to view and selectively claim voice calls from the queue.

### What You'll Be Setting Up

```
┌─────────────────────────────────────────────────────────────────────┐
│                         YOUR DEPLOYMENT                              │
│                                                                      │
│   ┌─────────────────┐         ┌─────────────────────────────────┐   │
│   │  Cherry Picker  │         │      Webex Contact Center       │   │
│   │  Web Service    │◄───────►│                                 │   │
│   │  (Render.com)   │         │  • Queue (manuallyAssignable)   │   │
│   └────────┬────────┘         │  • MMP (telephony: 1)           │   │
│            │                  │  • Flow (HTTP Request)          │   │
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

Before you begin, ensure you have the following:

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

Gather this information before starting:

| Item | Where to Find It |
|------|------------------|
| **Organization ID** | Control Hub > Account > Org ID |
| **Queue ID** | Control Hub > Contact Center > Queues > (select queue) > URL or details |
| **MMP ID** | Control Hub > Contact Center > Multimedia Profiles > (select profile) |
| **API Access Token** | https://developer.webex.com > Sign In > My Access Token |

### Your WxCC Region

Identify your region from your WxCC portal URL:

| If your URL contains... | Your region is | API Base URL |
|-------------------------|----------------|--------------|
| wxcc-us1 | US | api.wxcc-us1.cisco.com |
| wxcc-eu1 | EU (Frankfurt) | api.wxcc-eu1.cisco.com |
| wxcc-eu2 | EU (London) | api.wxcc-eu2.cisco.com |
| wxcc-anz1 | Australia/NZ | api.wxcc-anz1.cisco.com |
| wxcc-ca1 | Canada | api.wxcc-ca1.cisco.com |
| wxcc-jp1 | Japan | api.wxcc-jp1.cisco.com |
| wxcc-sg1 | Singapore | api.wxcc-sg1.cisco.com |

---

## Step 2: Deploy to Render.com

Render.com provides free hosting with automatic SSL - perfect for getting started.

### 2.1 Fork the Repository

1. Go to the Cherry Picker repository:
   ```
   https://github.com/bsolutions/busu-cherry-picker
   ```

2. Click the **"Fork"** button in the top right

3. Select your GitHub account as the destination

4. Wait for the fork to complete - you now have your own copy

### 2.2 Create Render.com Account

1. Go to https://render.com

2. Click **"Get Started for Free"**

3. Select **"Sign up with GitHub"** (recommended - makes deployment easier)

4. Authorize Render to access your GitHub account

### 2.3 Create New Web Service

1. From your Render dashboard, click **"New +"**

2. Select **"Web Service"**

3. Connect your forked repository:
   - If prompted, click **"Configure account"** to give Render access to your repos
   - Find and select **busu-cherry-picker**
   - Click **"Connect"**

### 2.4 Configure the Web Service

Fill in the following settings:

| Setting | Value |
|---------|-------|
| **Name** | `busu-cherry-picker` (or your preferred name) |
| **Region** | Select the region closest to your agents |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

### 2.5 Select Instance Type

| Environment | Recommended Plan | Cost |
|-------------|------------------|------|
| Testing/Demo | Free | $0/month |
| Production | Starter | $7/month |

> **Note:** Free tier instances spin down after 15 minutes of inactivity. First request after idle takes 30-60 seconds. For production, use Starter plan.

### 2.6 Add Environment Variables

Click **"Advanced"** to expand additional options, then add these environment variables:

| Key | Value |
|-----|-------|
| `PORT` | `5000` |
| `HOST_URI` | `https://[your-app-name].onrender.com` |
| `CORS_ORIGINS` | `https://desktop.wxcc-us1.cisco.com` |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` |

**Important:** 
- Replace `[your-app-name]` with the name you chose in step 2.4
- Replace `wxcc-us1` with your region if different (see Step 1)
- For multiple regions, comma-separate: `https://desktop.wxcc-us1.cisco.com,https://desktop.wxcc-eu1.cisco.com`

### 2.7 Deploy

1. Click **"Create Web Service"**

2. Wait for the build to complete (typically 3-5 minutes)

3. Look for the green **"Live"** indicator

### 2.8 Verify Deployment

1. Copy your Render URL (shown at the top of the service page):
   ```
   https://[your-app-name].onrender.com
   ```

2. Open in browser and add `/health`:
   ```
   https://[your-app-name].onrender.com/health
   ```

3. You should see:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-02-26T12:00:00.000Z",
     "version": "2.0.0"
   }
   ```

**Save your Render URL - you'll need it for the remaining steps!**

---

## Step 3: Configure WxCC Queue

The queue must allow manual task assignment for cherry-picking to work.

### 3.1 Get an API Access Token

1. Go to https://developer.webex.com
2. Sign in with your WxCC admin account
3. Click your profile icon in the top right
4. Click **"My Webex Developer Info"**
5. Copy the **Personal Access Token** (valid for 12 hours)

### 3.2 Get Your Current Queue Configuration

Using Postman, Bruno, or cURL:

```bash
curl --request GET \
  --url 'https://api.wxcc-us1.cisco.com/organization/YOUR_ORG_ID/contact-service-queue/YOUR_QUEUE_ID' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json'
```

**Replace:**
- `YOUR_ORG_ID` - Your organization ID
- `YOUR_QUEUE_ID` - Your queue ID  
- `YOUR_ACCESS_TOKEN` - Token from step 3.1
- `wxcc-us1` - Your region if different

**Save the response** - you'll need the existing properties for the update.

### 3.3 Update Queue to Enable Manual Assignment

Send a PUT request with the existing properties PLUS `"manuallyAssignable": true`:

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

> **Important:** Include all required existing properties from your GET response. The example above is simplified.

### 3.4 Verify the Change

Run the GET request again and confirm the response includes:
```json
"manuallyAssignable": true
```

---

## Step 4: Configure Multimedia Profile

Agents need their Multimedia Profile (MMP) updated to allow manual task pickup.

### 4.1 Get Your Current MMP Configuration

```bash
curl --request GET \
  --url 'https://api.wxcc-us1.cisco.com/organization/YOUR_ORG_ID/multimedia-profile/YOUR_MMP_ID' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json'
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

The `"telephony": 1` setting allows agents to manually pick up 1 voice call at a time.

### 4.3 Verify the Change

Run the GET request again and confirm `manuallyAssignable.telephony` is set to `1`.

---

## Step 5: Configure the Flow

The flow sends caller information to your Cherry Picker service when calls enter the queue.

### 5.1 Open Flow Designer

1. Go to **Control Hub** > **Contact Center** > **Flows**
2. Open your voice flow (or create a new one)

### 5.2 Add HTTP Request Node

1. From the Activity Library, drag **HTTP Request** onto the canvas
2. Place it **AFTER** the "NewPhoneContact" event
3. Place it **BEFORE** the "Queue Contact" node

### 5.3 Configure the HTTP Request

Click on the HTTP Request node and set:

| Setting | Value |
|---------|-------|
| **Request URL** | `https://[your-app-name].onrender.com/` |
| **Method** | `POST` |
| **Content Type** | `Application/JSON` |

**Request Body** (copy exactly):

```json
{"ANI":"{{NewPhoneContact.ANI}}","DNIS":"{{NewPhoneContact.DNIS}}","PSTNRegion":"{{NewPhoneContact.PSTNRegion}}","EntryPointId":"{{NewPhoneContact.EntryPointId}}","FlowId":"{{NewPhoneContact.FlowId}}","InteractionId":"{{NewPhoneContact.InteractionId}}","OrgId":"{{NewPhoneContact.OrgId}}","FlowVersionLabel":"{{NewPhoneContact.FlowVersionLabel}}","Headers":"{{NewPhoneContact.Headers}}","CallbackType":"{{NewPhoneContact.CallbackType}}","CallbackReason":"{{NewPhoneContact.CallbackReason}}"}
```

### 5.4 Connect the Nodes

Your flow should look like:

```
[New Phone Contact] 
        │
        ▼
[HTTP Request] ─── Error ───┐
        │                   │
        │ Success           │
        ▼                   │
[Queue Contact] ◄───────────┘
        │
        ▼
   (continue...)
```

> **Tip:** Connect the HTTP Request error output to Queue Contact so calls still queue even if the widget service is temporarily unavailable.

### 5.5 Validate and Publish

1. Click **Validate** to check for errors
2. Fix any issues
3. Click **Publish** to make the flow live

---

## Step 6: Add Widget to Desktop Layout

### 6.1 Prepare the Navigation Snippet

Copy this JSON snippet and replace `[your-app-name]` with your Render app name:

```json
{
  "nav": {
    "label": "Cherry Picker",
    "icon": "call-voicemail",
    "iconType": "momentum",
    "navigateTo": "cherry-picker",
    "align": "top"
  },
  "page": {
    "id": "cherry-picker",
    "widgets": {
      "comp2": {
        "comp": "div",
        "style": {
          "height": "100%",
          "overflow": "scroll"
        },
        "children": [
          {
            "comp": "sa-ds-voice-sdk",
            "script": "https://[your-app-name].onrender.com/build/bundle.js",
            "wrapper": {
              "title": "Cherry Picker",
              "maximizeAreaName": "app-maximize-area"
            },
            "attributes": {
              "darkmode": "$STORE.app.darkMode"
            },
            "properties": {
              "accessToken": "$STORE.auth.accessToken",
              "outdialEp": "$STORE.agent.outDialEp"
            }
          }
        ]
      }
    },
    "layout": {
      "areas": [["comp2"]],
      "size": {
        "cols": [1],
        "rows": [1]
      }
    }
  }
}
```

### 6.2 Add to Your Desktop Layout

**Option A: Edit Existing Layout**

1. Go to **Control Hub** > **Contact Center** > **Desktop Layouts**
2. Click on your existing layout
3. Click the **JSON** tab
4. Find the `"navigation": [` array
5. Add a comma after the last item in the array
6. Paste the snippet from step 6.1
7. Click **Save**

**Option B: Create New Layout**

1. Go to **Control Hub** > **Contact Center** > **Desktop Layouts**
2. Click **"New Layout"**
3. Enter a name (e.g., "Desktop with Cherry Picker")
4. Click the **JSON** tab
5. Paste a complete layout JSON that includes the navigation snippet
6. Click **Save**

### 6.3 Assign Layout to Team

1. Go to **Control Hub** > **Contact Center** > **Teams**
2. Click on the team that will use Cherry Picker
3. Click **Edit**
4. Set **Desktop Layout** to your updated layout
5. Click **Save**

---

## Step 7: Test the Widget

### 7.1 Agent Login

1. Open Agent Desktop for your region:
   - US: https://desktop.wxcc-us1.cisco.com
   - EU1: https://desktop.wxcc-eu1.cisco.com
   - (etc.)
   
2. Log in with an agent from the team with the Cherry Picker layout

3. Set status to **Available**

### 7.2 Verify Widget Loads

1. Look for **"Cherry Picker"** in the left navigation bar (phone icon)
2. Click on it
3. You should see:
   - Header with "Cherry Picker" title
   - Connection status indicator
   - Filter chips (Queued, Assigned, etc.)
   - Empty state message if no calls

### 7.3 Test with a Call

1. Call the phone number for your entry point
2. The call should appear in the widget within 1-2 seconds
3. You should see:
   - Caller's phone number
   - Queue name
   - Wait time (updating live)
   - Green "Claim Call" button

### 7.4 Claim the Call

1. Click **"Claim Call"**
2. Button shows loading spinner
3. Call is delivered to your agent desktop
4. Card updates to show "Assigned" status

---

## Step 8: Troubleshooting

### Widget Not Loading

**Symptom:** Blank space where widget should be

| Check | Solution |
|-------|----------|
| Browser console (F12) | Look for CORS or 404 errors |
| Script URL | Verify `https://[your-app-name].onrender.com/build/bundle.js` loads in browser |
| Render service | Check it shows "Live" status |
| CORS_ORIGINS | Must include your desktop URL exactly |

### Widget Shows Offline/Disconnected

**Symptom:** No "Live" indicator, connection errors

| Check | Solution |
|-------|----------|
| Render logs | Check for errors in Render dashboard > Logs |
| HOST_URI | Must match your actual Render URL |
| Free tier | First request after idle takes 30-60s - wait and refresh |

### Calls Not Appearing

**Symptom:** Make calls but widget stays empty

| Check | Solution |
|-------|----------|
| Flow published | Ensure flow is published, not just saved |
| HTTP Request URL | Must match your Render URL exactly |
| Render logs | Should see POST requests when calls come in |
| Queue configured | Verify `manuallyAssignable: true` |

### Claim Button Not Working

**Symptom:** Click claim but nothing happens

| Check | Solution |
|-------|----------|
| MMP configured | Verify `manuallyAssignable.telephony: 1` |
| Agent permissions | Agent must have access to the queue |
| Browser console | Look for 401/403 API errors |

### Dark Mode Not Syncing

**Symptom:** Widget doesn't change with desktop theme

| Check | Solution |
|-------|----------|
| Layout JSON | Verify `"darkmode": "$STORE.app.darkMode"` |
| Re-upload layout | Sometimes requires fresh upload |
| Clear cache | Hard refresh the agent desktop |

---

## Quick Reference

### Your URLs (fill these in)

| Resource | URL |
|----------|-----|
| Render Dashboard | https://dashboard.render.com |
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
| `LOG_LEVEL` | `info` |

### API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | POST | Receive call data from flow |
| `/health` | GET | Health check |
| `/callerIds` | POST | Retrieve cached caller info |

---

## Appendix A: Complete Desktop Layout Navigation Snippet

```json
{
  "nav": {
    "label": "Cherry Picker",
    "icon": "call-voicemail",
    "iconType": "momentum",
    "navigateTo": "cherry-picker",
    "align": "top"
  },
  "page": {
    "id": "cherry-picker",
    "widgets": {
      "comp2": {
        "comp": "div",
        "style": {
          "height": "100%",
          "overflow": "scroll"
        },
        "children": [
          {
            "comp": "sa-ds-voice-sdk",
            "script": "https://[your-app-name].onrender.com/build/bundle.js",
            "wrapper": {
              "title": "Cherry Picker",
              "maximizeAreaName": "app-maximize-area"
            },
            "attributes": {
              "darkmode": "$STORE.app.darkMode"
            },
            "properties": {
              "accessToken": "$STORE.auth.accessToken",
              "outdialEp": "$STORE.agent.outDialEp"
            }
          }
        ]
      }
    },
    "layout": {
      "areas": [["comp2"]],
      "size": {
        "cols": [1],
        "rows": [1]
      }
    }
  }
}
```

---

## Appendix B: Flow HTTP Request Body

Copy this exactly into your flow's HTTP Request body:

```
{"ANI":"{{NewPhoneContact.ANI}}","DNIS":"{{NewPhoneContact.DNIS}}","PSTNRegion":"{{NewPhoneContact.PSTNRegion}}","EntryPointId":"{{NewPhoneContact.EntryPointId}}","FlowId":"{{NewPhoneContact.FlowId}}","InteractionId":"{{NewPhoneContact.InteractionId}}","OrgId":"{{NewPhoneContact.OrgId}}","FlowVersionLabel":"{{NewPhoneContact.FlowVersionLabel}}","Headers":"{{NewPhoneContact.Headers}}","CallbackType":"{{NewPhoneContact.CallbackType}}","CallbackReason":"{{NewPhoneContact.CallbackReason}}"}
```

---

## Appendix C: API Quick Reference

### Get Queue

```bash
GET https://api.wxcc-{region}.cisco.com/organization/{orgId}/contact-service-queue/{queueId}
Authorization: Bearer {token}
```

### Update Queue (enable manual assignment)

```bash
PUT https://api.wxcc-{region}.cisco.com/organization/{orgId}/contact-service-queue/{queueId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Queue Name",
  "manuallyAssignable": true
}
```

### Get MMP

```bash
GET https://api.wxcc-{region}.cisco.com/organization/{orgId}/multimedia-profile/{profileId}
Authorization: Bearer {token}
```

### Update MMP (enable telephony manual assignment)

```bash
PUT https://api.wxcc-{region}.cisco.com/organization/{orgId}/multimedia-profile/{profileId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "MMP Name",
  "manuallyAssignable": {
    "telephony": 1,
    "chat": 0,
    "email": 0,
    "social": 0
  }
}
```

---

## Support

For issues or questions:
- **GitHub Issues**: [Repository Issues Page]
- **Email**: support@bucher-suter.com

---

**Document Version:** 2.0  
**Last Updated:** February 2025  
**Author:** B+S Solutions
