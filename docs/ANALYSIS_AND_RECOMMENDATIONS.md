# WxCC Voice Cherry Picker Widget - Analysis & Recommendations

## Executive Summary

This document provides a comprehensive analysis of the existing Cherry Picker widget prototype and outlines the architectural, design, and code improvements required to transform it into a production-ready B+S product offering.

---

## Current State Analysis

### What Works Well

1. **Core Functionality**: The widget successfully implements cherry-picking via the WxCC Tasks API
2. **Real-time Updates**: Socket.IO integration enables instant task notifications from flow HTTP requests
3. **Desktop SDK Integration**: Proper use of `@wxcc-desktop/sdk` for agent context and authentication
4. **Filter Persistence**: Cookie-based filter state preservation across sessions
5. **Multi-region Support**: API endpoint is configurable (though hardcoded to US1)

### Critical Issues Identified

#### Architecture Issues

| Issue | Impact | Severity |
|-------|--------|----------|
| Hardcoded API region (`wxcc-us1`) | Breaks for EU, ANZ customers | **Critical** |
| No error boundaries or retry logic | Silent failures, poor UX | **High** |
| Global variables (`window.myAgentService`) | Memory leaks, testing difficulty | **High** |
| Polling interval hardcoded (5s) | No configurability | **Medium** |
| No TypeScript | Type safety, maintainability issues | **Medium** |

#### UI/UX Issues

| Issue | Impact | Severity |
|-------|--------|----------|
| Basic/dated visual design | Poor first impression, non-professional | **High** |
| No dark mode proper support | Clashes with Agent Desktop dark theme | **High** |
| Fixed 450px width | Not responsive, wastes space | **Medium** |
| No loading states for actions | Users unsure if action is processing | **Medium** |
| No empty state design | Confusing when no calls in queue | **Medium** |
| Generic GIF loading spinner | Unprofessional appearance | **Low** |

#### Code Quality Issues

| Issue | Impact | Severity |
|-------|--------|----------|
| Mixed ES6/CommonJS patterns | Build complexity | **Medium** |
| No unit tests | Regression risk | **High** |
| Inline styles mixed with CSS | Maintenance difficulty | **Medium** |
| No JSDoc or TypeScript types | Developer experience | **Medium** |
| Console.log for production logging | Performance, security | **Low** |

---

## Recommended Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    WxCC Agent Desktop                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Cherry Picker Widget (Web Component)            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │ │
│  │  │ Task Cards   │  │ Filters      │  │ Status Indicators│  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │ │
│  │         │                 │                   │             │ │
│  │  ┌──────▼─────────────────▼───────────────────▼─────────┐  │ │
│  │  │               State Management (Reactive Store)       │  │ │
│  │  └──────┬─────────────────┬───────────────────┬─────────┘  │ │
│  └─────────┼─────────────────┼───────────────────┼───────────┘ │
│            │                 │                   │              │
│  ┌─────────▼─────────┐  ┌────▼────┐  ┌──────────▼──────────┐  │
│  │ WxCC Desktop SDK  │  │ Socket  │  │ Cherry Picker API   │  │
│  │ (Auth, Events)    │  │ Client  │  │ Service             │  │
│  └─────────┬─────────┘  └────┬────┘  └──────────┬──────────┘  │
└────────────┼─────────────────┼───────────────────┼─────────────┘
             │                 │                   │
             ▼                 ▼                   ▼
┌────────────────────┐  ┌──────────────┐  ┌───────────────────┐
│  WxCC Tasks API    │  │ WebSocket    │  │ Cherry Picker     │
│  (Get/Assign)      │  │ Server       │  │ Backend           │
└────────────────────┘  │              │  │                   │
                        │  ┌────────┐  │  │  ┌─────────────┐  │
                        │  │ Rooms  │  │  │  │ TTL Cache   │  │
                        │  │ (OrgId)│  │  │  │ (CallerIds) │  │
                        │  └────────┘  │  │  └─────────────┘  │
                        └──────────────┘  └───────────────────┘
                                                   ▲
                                                   │
                        ┌──────────────────────────┘
                        │
              ┌─────────▼─────────┐
              │  WxCC Flow        │
              │  (HTTP Request)   │
              │  - ANI            │
              │  - DNIS           │
              │  - InteractionId  │
              │  - CallerIdName   │
              └───────────────────┘
```

### Multi-Region Support

```typescript
// Region configuration
const WXCC_REGIONS = {
  'us1': { api: 'https://api.wxcc-us1.cisco.com', desktop: 'https://desktop.wxcc-us1.cisco.com' },
  'eu1': { api: 'https://api.wxcc-eu1.cisco.com', desktop: 'https://desktop.wxcc-eu1.cisco.com' },
  'eu2': { api: 'https://api.wxcc-eu2.cisco.com', desktop: 'https://desktop.wxcc-eu2.cisco.com' },
  'anz1': { api: 'https://api.wxcc-anz1.cisco.com', desktop: 'https://desktop.wxcc-anz1.cisco.com' },
  'ca1': { api: 'https://api.wxcc-ca1.cisco.com', desktop: 'https://desktop.wxcc-ca1.cisco.com' },
  'jp1': { api: 'https://api.wxcc-jp1.cisco.com', desktop: 'https://desktop.wxcc-jp1.cisco.com' },
  'sg1': { api: 'https://api.wxcc-sg1.cisco.com', desktop: 'https://desktop.wxcc-sg1.cisco.com' }
} as const;
```

---

## UI/UX Redesign Specifications

### Design Philosophy

The redesign follows these principles:

1. **Native Feel**: Match Webex/Cisco design language (Momentum Design tokens)
2. **Information Density**: Maximize useful information without clutter
3. **Status at a Glance**: Color-coded states, clear visual hierarchy
4. **Responsive**: Adapt to panel width dynamically
5. **Accessible**: WCAG 2.1 AA compliance

### Color Palette

```css
:root {
  /* Primary Brand */
  --bs-primary: #00bceb;        /* Webex Cyan */
  --bs-primary-hover: #00a0c7;
  
  /* Status Colors */
  --bs-success: #00c853;        /* Available/Queued */
  --bs-warning: #ffab00;        /* Assigned/In Progress */
  --bs-danger: #ff5252;         /* Abandoned */
  --bs-muted: #9e9e9e;          /* Completed */
  
  /* Backgrounds - Light Theme */
  --bs-bg-primary: #ffffff;
  --bs-bg-secondary: #f5f5f5;
  --bs-bg-card: #ffffff;
  
  /* Backgrounds - Dark Theme */
  --bs-bg-primary-dark: #1a1a1a;
  --bs-bg-secondary-dark: #2d2d2d;
  --bs-bg-card-dark: #333333;
  
  /* Text */
  --bs-text-primary: #212121;
  --bs-text-secondary: #757575;
  --bs-text-primary-dark: #ffffff;
  --bs-text-secondary-dark: #b0b0b0;
}
```

### Component Specifications

#### Task Card

```
┌────────────────────────────────────────────────────────────┐
│ ● QUEUED                                           2m 15s  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📞 +1 (555) 123-4567                                      │
│     John Smith                                             │
│                                                            │
│  Queue: Sales Support                                      │
│  Wait: 2m 15s                                              │
│                                                            │
│                                    ┌──────────────────┐    │
│                                    │   🎯 Claim Call   │    │
│                                    └──────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

#### Empty State

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                    📭                                       │
│                                                            │
│              No calls in queue                             │
│                                                            │
│     Calls will appear here automatically when              │
│     they enter your configured queues.                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### Error State

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                    ⚠️                                       │
│                                                            │
│           Connection lost                                  │
│                                                            │
│     Unable to retrieve queue data.                         │
│     ┌──────────────┐                                       │
│     │    Retry     │                                       │
│     └──────────────┘                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Product Enhancement Recommendations

### Phase 1: Core Improvements (MVP)

1. **Multi-Region Support**
   - Auto-detect region from Desktop SDK
   - Configurable via widget properties

2. **Enhanced Caller Information**
   - Display all available caller data from flow
   - Support custom CAD variables display

3. **Queue Filtering**
   - Filter by specific queue names
   - Remember filter preferences

4. **Improved Reliability**
   - Exponential backoff retry logic
   - Offline detection and recovery
   - Health check endpoint

### Phase 2: Advanced Features

1. **Skills-Based Filtering**
   - Show only tasks matching agent skills
   - Highlight best-match tasks

2. **Priority Visualization**
   - Visual indicators for high-priority calls
   - Sort by priority option

3. **Queue Analytics**
   - Mini dashboard showing queue stats
   - Average wait time trending

4. **Supervisor Features**
   - View all agents' cherry-pick activity
   - Audit log of claimed calls

### Phase 3: Enterprise Features

1. **Multi-Tenant Configuration**
   - Centralized config management
   - Per-tenant branding options

2. **Integration APIs**
   - Webhooks for cherry-pick events
   - CRM integration hooks

3. **Advanced Analytics**
   - Cherry-pick patterns analysis
   - Agent performance metrics

---

## Deployment Architecture

### Recommended Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (HTTPS)                   │
│                   *.cherrypicker.yourcompany.com            │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Instance 1  │  │   Instance 2  │  │   Instance 3  │
│   (Primary)   │  │   (Replica)   │  │   (Replica)   │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │  (Session   │
                    │   Store)    │
                    └─────────────┘
```

### Container Configuration

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

---

## Configuration Guide

### Widget Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `accessToken` | string | Yes | WxCC access token from $STORE |
| `region` | string | No | WxCC region (auto-detect if omitted) |
| `refreshInterval` | number | No | Polling interval in seconds (default: 5) |
| `showCompleted` | boolean | No | Show completed tasks (default: true) |
| `showAbandoned` | boolean | No | Show abandoned tasks (default: true) |
| `maxTaskAge` | number | No | Max task age in minutes (default: 10) |
| `queues` | string[] | No | Filter to specific queue IDs |

### Layout JSON Example

```json
{
  "comp": "cherry-picker-widget",
  "script": "https://your-host.com/build/bundle.js",
  "wrapper": {
    "title": "Cherry Picker",
    "maximizeAreaName": "app-maximize-area"
  },
  "attributes": {
    "darkmode": "$STORE.app.darkMode"
  },
  "properties": {
    "accessToken": "$STORE.auth.accessToken",
    "region": "us1",
    "refreshInterval": 5,
    "showCompleted": false,
    "showAbandoned": true,
    "maxTaskAge": 15,
    "queues": ["queue-id-1", "queue-id-2"]
  }
}
```

---

## Testing Strategy

### Unit Tests

- Task card rendering
- Filter logic
- Time formatting utilities
- API response parsing

### Integration Tests

- Socket.IO connection/reconnection
- API authentication flow
- Desktop SDK event handling

### E2E Tests

- Full cherry-pick workflow
- Filter persistence
- Error recovery scenarios

---

## Migration Guide

### From v1 (Current) to v2 (Recommended)

1. **Update Layout JSON**
   - Change component name from `sa-ds-voice-sdk` to `cherry-picker-widget`
   - Add new configuration properties

2. **Update Flow HTTP Request**
   - No changes required (backward compatible)

3. **Update Backend Environment**
   - Add `REDIS_URL` for session persistence
   - Update CORS origins if needed

4. **Deploy New Bundle**
   - Replace `bundle.js` with new build
   - Verify health endpoint responds

---

## Security Considerations

1. **Token Handling**: Never log or expose access tokens
2. **CORS Policy**: Restrict to specific desktop domains
3. **Input Validation**: Sanitize all task data display
4. **Rate Limiting**: Implement request throttling
5. **CSP Headers**: Proper Content Security Policy

---

## Support & Documentation

### Required Documentation

1. Installation Guide
2. Configuration Reference
3. Troubleshooting Guide
4. API Reference
5. Release Notes

### Support Channels

- GitHub Issues for bug reports
- Documentation site for guides
- Email support for enterprise customers

---

*Document Version: 2.0*
*Last Updated: February 2025*
*Author: B+S Solutions Architecture*
