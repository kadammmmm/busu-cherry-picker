# Call Selector Widget — Minimum Requirements

Everything you need to have in place **before** you can deploy and use the Call Selector Widget.

---

## 1. Server / Hosting

| Requirement | Detail |
|-------------|--------|
| **Operating System** | Windows Server 2016+ (on-premise) **or** a cloud host such as Render.com |
| **Node.js** | Version 18 or later |
| **RAM / CPU** | Minimum 512 MB RAM, 1 vCPU (the free Render.com tier is sufficient for evaluation) |
| **Outbound HTTPS** | The server must be able to reach `api.wxcc-<region>.cisco.com` on port 443 |
| **Public HTTPS URL** | A public URL that Agent Desktop browsers can load (e.g. `https://call-selector.yourcompany.com`). Self-signed certificates will be blocked by browsers — use a trusted CA or a cloud host |

> **Cloud option:** Render.com free tier works for evaluation. For production, use the Starter plan ($7/month) to avoid cold-start delays.  
> **On-premise option:** See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) — Step 3 covers IIS + PM2 on Windows Server.

---

## 2. WxCC Admin Access

| Requirement | Detail |
|-------------|--------|
| **Control Hub** | Administrator role |
| **Flow Designer** | Access to create / edit flows |
| **API Access** | Ability to generate a Personal Access Token at https://developer.webex.com |

---

## 3. WxCC Configuration

The following WxCC objects must be configured before agents can use the widget:

| Object | Setting Required |
|--------|-----------------|
| **Queue** | `manuallyAssignable: true` — set via the WxCC API (see Deployment Guide Step 4) |
| **Multimedia Profile (MMP)** | `manuallyAssignable.telephony: 1` — set via the WxCC API (see Deployment Guide Step 5) |
| **Agents** | Each agent must be assigned to the MMP above and to a team that is assigned to the queue |
| **Agent DN / WebRTC** | Agents must be logged in with a valid dial number or WebRTC to receive claimed calls |

---

## 4. Information to Gather

Collect these values before you start deployment:

| Item | Where to Find It |
|------|-----------------|
| **Organization ID** | Control Hub > Account > Org ID |
| **Queue ID** | Control Hub > Contact Center > Queues > select queue > URL bar |
| **Multimedia Profile ID** | Control Hub > Contact Center > Multimedia Profiles > select profile > URL bar |
| **WxCC Region** | Your Agent Desktop URL — e.g. `desktop.wxcc-us1.cisco.com` → region is `us1` |
| **API Access Token** | https://developer.webex.com > Sign In > My Webex Developer Info > Personal Access Token (valid 12 h) |
| **Public Server URL** | The HTTPS URL where the Call Selector server will be hosted |

---

## 5. WxCC Flow Requirements

Two HTTP Request nodes are needed in your flow:

| Node | Trigger | Purpose |
|------|---------|---------|
| **Node 1 — Call Arrival** (required) | After `NewPhoneContact`, before `Queue Contact` | Sends call data to the widget server so the call appears in agents' widgets |
| **Node 2 — Call Abandoned** (optional, recommended) | `AgentContactAbandoned` event | Removes the call from the widget immediately when the caller hangs up |

Both nodes POST to the same endpoint and must include the `x-api-key` header with your `API_KEY` value (generated during installation).

See [DEPLOYMENT_GUIDE.md — Step 6](docs/DEPLOYMENT_GUIDE.md#step-6-configure-the-flow) for the exact request body for each node.

---

## 6. Desktop Layout Requirements

To embed the widget in Agent Desktop you need:

| Item | Value / Notes |
|------|--------------|
| **Widget script URL** | `https://<your-server>/build/bundle.js` — available once the server is deployed |
| **`region` attribute** | Your WxCC region code (e.g. `us1`, `eu1`, `anz1`) |
| **`accessToken` property** | `"$STORE.auth.accessToken"` — injected automatically by Agent Desktop |
| **Desktop Layout admin access** | Ability to edit and upload layouts in Control Hub > Contact Center > Desktop Layouts |
| **Team assignment** | The updated layout must be assigned to the team(s) whose agents will use the widget |

See [DEPLOYMENT_GUIDE.md — Step 7](docs/DEPLOYMENT_GUIDE.md#step-7-add-widget-to-desktop-layout) for the full layout JSON snippet.

---

## Quick Checklist

Before starting deployment, confirm each item:

- [ ] Server ready with Node.js 18+ and a public HTTPS URL
- [ ] Control Hub admin access available
- [ ] Flow Designer access available
- [ ] Org ID, Queue ID, MMP ID collected
- [ ] WxCC region confirmed
- [ ] Queue updated: `manuallyAssignable: true`
- [ ] MMP updated: `manuallyAssignable.telephony: 1`
- [ ] Agents assigned to the correct MMP and team/queue

Once all boxes are checked, follow [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) to deploy and configure the app.
