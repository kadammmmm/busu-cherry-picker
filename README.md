# 🍒 WxCC Voice Cherry Picker Widget

<p align="center">
  <img src="docs/images/cherry-picker-logo.svg" alt="Cherry Picker Logo" width="120" />
</p>

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
git clone https://github.com/bucher-suter/wxcc-cherry-picker.git
cd wxcc-cherry-picker
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

### Option A: Docker (Recommended)

```bash
# Build image
docker build -t wxcc-cherry-picker .

# Run container
docker run -d \
  -p 5000:5000 \
  -e HOST_URI=https://your-domain.com \
  -e CORS_ORIGINS=https://desktop.wxcc-us1.cisco.com \
  wxcc-cherry-picker
```

### Option B: Docker Compose

```bash
docker-compose up -d
```

### Option C: Manual Installation

```bash
# Install dependencies
npm ci

# Build widget bundle
npm run build

# Start server
NODE_ENV=production npm start
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
**URL**: `https://your-server.com/`  
**Body**:
```json
{
  "ANI": "{{NewPhoneContact.ANI}}",
  "DNIS": "{{NewPhoneContact.DNIS}}",
  "InteractionId": "{{NewPhoneContact.InteractionId}}",
  "OrgId": "{{NewPhoneContact.OrgId}}",
  "Headers": "{{NewPhoneContact.Headers}}",
  "EntryPointId": "{{NewPhoneContact.EntryPointId}}",
  "FlowId": "{{NewPhoneContact.FlowId}}"
}
```

### Desktop Layout

Update the `script` URL in `config/desktop-layout.json`:

```json
{
  "comp": "cherry-picker-widget",
  "script": "https://your-server.com/build/bundle.js"
}
```

Upload to Control Hub: **Contact Center > Desktop Layouts**

---

## Widget Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `darkmode` | string | "false" | Enable dark theme |
| `region` | string | "us1" | WxCC API region |
| `refreshinterval` | string | "5" | Polling interval (seconds) |

### Layout Example

```json
{
  "comp": "cherry-picker-widget",
  "script": "https://your-host.com/build/bundle.js",
  "attributes": {
    "darkmode": "$STORE.app.darkMode",
    "region": "us1",
    "refreshinterval": "5"
  },
  "properties": {
    "accessToken": "$STORE.auth.accessToken"
  }
}
```

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

### Linting

```bash
npm run lint
npm run lint:fix
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

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
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

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

- 📧 Email: support@bucher-suter.com
- 🐛 Issues: [GitHub Issues](https://github.com/bucher-suter/wxcc-cherry-picker/issues)
- 📖 Docs: [Documentation Site](https://docs.bucher-suter.com/cherry-picker)

---

<p align="center">
  Made with ❤️ by <a href="https://www.bucher-suter.com">Bucher + Suter</a>
</p>
