# 📞 Call Selector Widget

<p align="center">
  <strong>A production-ready Webex Contact Center widget for voice queue selection</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#installation">Installation</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#custom-fields">Custom Fields</a> •
  <a href="#api-reference">API</a>
</p>

---

## Overview

The Call Selector Widget enables Webex Contact Center agents to view and selectively claim voice calls from the queue, rather than waiting for automatic distribution. Calls are grouped by queue for easy navigation, and custom fields can be displayed for each call.

**Live Deployment:** `https://busu-cherry-picker.onrender.com`

### Use Cases

- **VIP Customer Handling**: Agents can identify and prioritize high-value customers
- **Specialized Support**: Technical experts can claim calls matching their expertise
- **Load Balancing**: Agents can proactively pick up calls during slow periods
- **Callback Management**: Easily identify and prioritize callback requests

---

## Features

### Core Functionality
- ✅ Real-time queue visibility
- ✅ One-click call claiming
- ✅ **Calls grouped by queue** for easy navigation
- ✅ Collapsible queue sections
- ✅ Instant call notifications via WebSocket
- ✅ Filter by call status (Queued, Assigned, Abandoned, Completed)
- ✅ Caller ID display with name lookup

### Custom Fields Support
- ✅ Display priority, customer name, account number, call reason
- ✅ Configurable via desktop layout or flow variables
- ✅ Priority-based color coding (high = red, medium = yellow)
- ✅ Support for any custom field passed from flow

### Technical Capabilities
- ✅ Multi-region support (US, EU, ANZ, CA, JP, SG)
- ✅ Dark mode support (syncs with Agent Desktop)
- ✅ Responsive design
- ✅ Production-ready with health checks
- ✅ Docker containerization
- ✅ Comprehensive logging

---

## Quick Start

### Prerequisites

- Node.js 18+ or Docker
- Webex Contact Center tenant with API access
- Queues configured with `manuallyAssignable: true`
- Multimedia Profile with manual assignment enabled

### 1. Clone and Install

```bash
git clone https://github.com/kadammmmm/busu-cherry-picker.git
cd busu-cherry-picker
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Build and Run

```bash
npm run build
npm start
```

### 4. Configure WxCC

See the [Configuration](#configuration) section below.

---

## Installation

### Option A: Deploy to Render.com (Recommended)

1. Fork this repository to your GitHub account
2. Create an account at [Render.com](https://render.com)
3. Create a new **Web Service** and connect your forked repo
4. Render will auto-detect the Dockerfile
5. Set environment variables:

| Variable | Value |
|----------|-------|
| `PORT` | `5000` |
| `HOST_URI` | `https://your-app-name.onrender.com` |
| `CORS_ORIGINS` | `https://desktop.wxcc-us1.cisco.com` |

6. Deploy and verify at `https://your-app-name.onrender.com/health`

### Option B: Docker

```bash
docker build -t call-selector .

docker run -d \
  -p 5000:5000 \
  -e HOST_URI=https://your-domain.com \
  -e CORS_ORIGINS=https://desktop.wxcc-us1.cisco.com \
  call-selector
```

### Option C: Docker Compose

```bash
docker-compose up -d
```

### Option D: Manual Installation

```bash
npm install
npm run build
npm start
```

---

## Configuration

### 1. Queue Configuration

Enable manual assignment on your queue via API:

```bash
curl --request PUT \
  --url 'https://api.wxcc-us1.cisco.com/organization/{orgId}/contact-service-queue/{queueId}' \
  --header 'Authorization: Bearer {token}' \
  --header 'Content-Type: application/json' \
  --data '{
    "manuallyAssignable": true
  }'
```

### 2. Multimedia Profile Configuration

Enable telephony manual assignment:

```bash
curl --request PUT \
  --url 'https://api.wxcc-us1.cisco.com/organization/{orgId}/multimedia-profile/{mmpId}' \
  --header 'Authorization: Bearer {token}' \
  --header 'Content-Type: application/json' \
  --data '{
    "manuallyAssignable": {
      "telephony": 1,
      "chat": 0,
      "email": 0,
      "social": 0
    }
  }'
```

### 3. Agent Configuration

Ensure your agent:
- Is assigned to the Multimedia Profile with `manuallyAssignable.telephony: 1`
- Is on a Team that is assigned to the queue
- Is logged in with a valid DN or WebRTC

### 4. Desktop Layout Configuration

Add the Call Selector widget to your desktop layout JSON:

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
        "script": "https://busu-cherry-picker.onrender.com/build/bundle.js",
        "attributes": {
          "darkmode": "$STORE.app.darkMode"
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

Upload to Control Hub: **Contact Center > Desktop Layouts**

---

## Custom Fields

The Call Selector can display custom fields for each call (priority, customer name, account number, etc.). This requires sending the data from your flow to the Call Selector server.

### Step 1: Add HTTP Request Node to Your Flow

Add an HTTP Request node **after** your variables are set (e.g., after IVR data collection):

| Setting | Value |
|---------|-------|
| **Method** | `POST` |
| **URL** | `https://busu-cherry-picker.onrender.com/` |
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
  "customerName": "{{L_Caller_Name}}",
  "accountNumber": "{{accountNumber}}",
  "callReason": "{{L_Call_Reason}}",
  "verifiedInIVR": "{{L_VerifiedInIVR}}"
}
```

> **Note:** Replace the variable names with your actual flow variable names.

### Step 2: Configure Display Fields in Desktop Layout

Add the `displayfields` attribute to specify which fields to show:

```json
{
  "comp": "call-selector-widget",
  "script": "https://busu-cherry-picker.onrender.com/build/bundle.js",
  "attributes": {
    "darkmode": "$STORE.app.darkMode",
    "displayfields": "[\"priority\", \"customerName\", \"callReason\"]"
  }
}
```

### Supported Field Names

| Field Key | Display Label | Notes |
|-----------|---------------|-------|
| `priority` | Priority | Color-coded: high=red, medium=yellow |
| `customerName` | Customer | Customer's name |
| `accountNumber` | Account | Account number |
| `callReason` | Reason | Reason for calling |
| `customerId` | ID | Customer ID |
| `segment` | Segment | Customer segment |
| `language` | Language | Preferred language |
| `region` | Region | Geographic region |
| `productType` | Product | Product type |
| `caseNumber` | Case # | Support case number |
| `orderNumber` | Order # | Order number |

You can also use any custom field name - it will be displayed with a capitalized label.

---

## Flow Configuration

### Complete HTTP Request Body Template

```json
{"ANI":"{{NewPhoneContact.ANI}}","DNIS":"{{NewPhoneContact.DNIS}}","PSTNRegion":"{{NewPhoneContact.PSTNRegion}}","EntryPointId":"{{NewPhoneContact.EntryPointId}}","FlowId":"{{NewPhoneContact.FlowId}}","InteractionId":"{{NewPhoneContact.InteractionId}}","OrgId":"{{NewPhoneContact.OrgId}}","FlowVersionLabel":"{{NewPhoneContact.FlowVersionLabel}}","Headers":"{{NewPhoneContact.Headers}}","priority":"{{priority}}","customerName":"{{customerName}}","accountNumber":"{{accountNumber}}","callReason":"{{callReason}}"}
```

### Flow Placement

Place the HTTP Request node:
1. **After** `NewPhoneContact` event
2. **After** any `Set Variable` nodes that populate your custom fields
3. **Before** the `Queue Contact` node

Connect the error output of the HTTP Request to the Queue Contact node so calls aren't blocked if the server is unavailable.

---

## API Reference

### POST /

Receive call data from WxCC flow.

**Request Body:**
```json
{
  "InteractionId": "string",
  "ANI": "string",
  "DNIS": "string",
  "OrgId": "string",
  "Headers": "string",
  "priority": "string",
  "customerName": "string"
}
```

**Response:** `200 OK`

### POST /callerIds

Retrieve cached caller ID data.

**Request Body:**
```json
{
  "taskIds": ["id1", "id2"]
}
```

**Response:**
```json
[
  { "InteractionId": "id1", "ANI": "+15551234567", "customerName": "John" },
  { "InteractionId": "id2" }
]
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-04T12:00:00.000Z",
  "uptime": 3600,
  "version": "3.0.0"
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `HOST_URI` | Yes | - | Public URL of the server |
| `CORS_ORIGINS` | No | WxCC domains | Allowed CORS origins (comma-separated) |
| `CACHE_TTL` | No | 3600 | Caller ID cache TTL in seconds |
| `LOG_LEVEL` | No | info | Logging level (error, warn, info, debug) |

---

## Troubleshooting

### Widget not loading
- Verify the `script` URL is accessible
- Check browser console for CORS errors
- Ensure `HOST_URI` matches your deployment URL

### "AGENT_CHANNEL_NOT_FOUND" error when claiming
- Agent must be logged in with a valid DN or WebRTC
- Verify agent's Multimedia Profile has `manuallyAssignable.telephony: 1`
- Check that agent is on a Team assigned to the queue

### Calls not appearing
- Verify the flow HTTP Request is configured (if using custom fields)
- Check server logs for incoming requests
- Confirm queue has `manuallyAssignable: true`

### Custom fields not showing
- Verify HTTP Request node is in your flow and sends the fields
- Check that `displayfields` attribute matches the field names in the HTTP body
- Use camelCase field names (e.g., `customerName`, not `Customer Name`)

### Connection shows "Offline"
- Server might be starting up (Render.com free tier has cold starts)
- Check that `HOST_URI` is set correctly
- Verify WebSocket connection in browser Network tab

### Debug Mode

Enable debug logging in your `.env`:
```ini
LOG_LEVEL=debug
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WxCC Agent Desktop                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Call Selector Widget                        ││
│  │  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐  ││
│  │  │ Queue Groups│   │  Filters    │   │  Connection  │  ││
│  │  └──────┬──────┘   └──────┬──────┘   └──────┬───────┘  ││
│  │         │                 │                  │          ││
│  │  ┌──────▼─────────────────▼──────────────────▼───────┐ ││
│  │  │                State Management                    │ ││
│  │  └────────┬───────────────────────────────────┬──────┘ ││
│  └───────────┼───────────────────────────────────┼────────┘│
│              │                                   │         │
│     ┌────────▼────────┐              ┌───────────▼───────┐ │
│     │ WxCC Tasks API  │              │  Socket.IO Client │ │
│     └─────────────────┘              └───────────────────┘ │
└───────────────────────────────────────────────┬────────────┘
                                                │
                          ┌─────────────────────▼──────────────┐
                          │       Call Selector Server         │
                          │  ┌────────────┐  ┌──────────────┐  │
                          │  │ Express.js │  │  Socket.IO   │  │
                          │  └────────────┘  └──────────────┘  │
                          │  ┌─────────────────────────────┐   │
                          │  │      TTL Cache (CallerIds)  │   │
                          │  └─────────────────────────────┘   │
                          └────────────────────────────────────┘
                                         ▲
                          ┌──────────────┘
                          │
                   ┌──────▼──────┐
                   │  WxCC Flow  │
                   │ HTTP Request│
                   └─────────────┘
```

---

## File Structure

```
busu-cherry-picker/
├── src/
│   └── widget-call-selector.js    # Main widget component
├── config/
│   └── desktop-layout.json        # Sample desktop layout
├── docs/
│   ├── DEPLOYMENT_GUIDE.md
│   └── DEVELOPER_SETUP_GUIDE.md
├── index.js                       # Express server
├── package.json
├── webpack.config.cjs
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Development

### Local Development

```bash
# Start with hot-reload
npm run dev

# Build in watch mode
npm run build:watch
```

### Building

```bash
npm run build
```

---

## Version History

| Version | Changes |
|---------|---------|
| 3.0.0 | Renamed to Call Selector, queue grouping, custom fields support |
| 2.0.0 | Production redesign, multi-region, dark mode, improved UI |
| 1.0.0 | Initial release |

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

- Issues: [GitHub Issues](https://github.com/kadammmmm/busu-cherry-picker/issues)

---

<p align="center">
  Made with care by <a href="https://www.bucher-suter.com">bucher+suter</a>
</p>
