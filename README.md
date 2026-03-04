# 🍒 BuSu Voice Cherry Picker Widget

<p align="center">
  <strong>A production-ready Webex Contact Center widget for voice queue cherry-picking</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#installation">Installation</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#api-reference">API</a>
</p>

---

## Overview

The Cherry Picker Widget enables Webex Contact Center agents to view and selectively claim voice calls from the queue, rather than waiting for automatic distribution. This provides greater flexibility in high-skill, specialized support scenarios.

**Live Demo URL:** `https://busu-cherry-picker.onrender.com`

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
- ✅ Instant call notifications via WebSocket
- ✅ Filter by call status (Queued, Assigned, Abandoned, Completed)
- ✅ Caller ID display with name lookup

### Technical Capabilities
- ✅ Multi-region support (US, EU, ANZ, CA, JP, SG)
- ✅ Dark mode support (syncs with Agent Desktop)
- ✅ Responsive design
- ✅ Production-ready with health checks
- ✅ Docker containerization
- ✅ Comprehensive logging

### User Experience
- ✅ Modern, professional UI design
- ✅ Real-time wait time display
- ✅ Visual status indicators
- ✅ Empty and error state handling
- ✅ Loading states for all actions

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

Upload the desktop layout JSON and configure your flow to send data to the widget.

---

## Installation

### Option A: Deploy to Render.com (Recommended)

1. Fork this repository
2. Connect to Render.com
3. Deploy as a Web Service
4. Set environment variables

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for detailed instructions.

### Option B: Docker

```bash
# Build image
docker build -t busu-cherry-picker .

# Run container
docker run -d \
  -p 5000:5000 \
  -e HOST_URI=https://your-domain.com \
  -e CORS_ORIGINS=https://desktop.wxcc-us1.cisco.com \
  busu-cherry-picker
```

### Option C: Docker Compose

```bash
docker-compose up -d
```

### Option D: Manual Installation

```bash
# Install dependencies
npm install

# Build widget bundle
npm run build

# Start server
npm start
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `HOST_URI` | Yes | - | Public URL of the server |
| `CORS_ORIGINS` | No | WxCC domains | Allowed CORS origins |
| `CACHE_TTL` | No | 3600 | Caller ID cache TTL (seconds) |
| `LOG_LEVEL` | No | info | Logging level |

### WxCC Queue Configuration

Enable manual assignment on your queue:

```json
{
  "manuallyAssignable": true
}
```

Use the [Update Queue API](https://developer.webex.com/webex-contact-center/docs/api/v1/contact-service-queues/update-specific-contact-service-queue-by-id) to configure.

### Multimedia Profile Configuration

Enable telephony manual assignment:

```json
{
  "manuallyAssignable": {
    "telephony": 1,
    "chat": 0,
    "email": 0,
    "social": 0
  }
}
```

### Flow Configuration

Add an HTTP Request node to your flow:

**Method**: POST  
**URL**: `https://busu-cherry-picker.onrender.com/`  
**Body**:
```json
{"ANI":"{{NewPhoneContact.ANI}}","DNIS":"{{NewPhoneContact.DNIS}}","PSTNRegion":"{{NewPhoneContact.PSTNRegion}}","EntryPointId":"{{NewPhoneContact.EntryPointId}}","FlowId":"{{NewPhoneContact.FlowId}}","InteractionId":"{{NewPhoneContact.InteractionId}}","OrgId":"{{NewPhoneContact.OrgId}}","FlowVersionLabel":"{{NewPhoneContact.FlowVersionLabel}}","Headers":"{{NewPhoneContact.Headers}}","CallbackType":"{{NewPhoneContact.CallbackType}}","CallbackReason":"{{NewPhoneContact.CallbackReason}}"}
```

### Desktop Layout

Add the Cherry Picker widget to your desktop layout navigation:

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
            "script": "https://busu-cherry-picker.onrender.com/build/bundle.js",
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

Upload to Control Hub: **Contact Center > Desktop Layouts**

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
  "Headers": "string"
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
  { "InteractionId": "id1", "ANI": "+15551234567", ... },
  { "InteractionId": "id2" }
]
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-02-23T12:00:00.000Z",
  "uptime": 3600,
  "version": "2.0.0"
}
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

### Testing

```bash
# Run tests
npm test

# With coverage
npm run test:coverage
```

---

## Troubleshooting

### Common Issues

**Widget not loading:**
- Verify `script` URL is accessible
- Check browser console for CORS errors
- Ensure HOST_URI matches your deployment

**No calls appearing:**
- Verify flow HTTP Request is configured
- Check server logs for incoming requests
- Confirm queue has `manuallyAssignable: true`

**Claim button not working:**
- Verify agent has appropriate permissions
- Check MMP has manual assignment enabled
- Review browser console for API errors

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
│  │              Cherry Picker Widget                        ││
│  │  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐  ││
│  │  │ Task Cards  │   │  Filters    │   │  Connection  │  ││
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
                          │       Cherry Picker Server         │
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

## Documentation

- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Full setup instructions
- [Developer Setup Guide](docs/DEVELOPER_SETUP_GUIDE.md) - Local development setup
- [Creating GitHub Repo](docs/CREATING_GITHUB_REPO.md) - Repository setup

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

- 🐛 Issues: [GitHub Issues](https://github.com/kadammmmm/busu-cherry-picker/issues)
- 📧 Email: support@bucher-suter.com

---

<p align="center">
  Made with ❤️ by <a href="https://www.bucher-suter.com">Bucher + Suter</a>
</p>