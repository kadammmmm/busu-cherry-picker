/**
 * Call Selector Widget v3.0
 * A production-ready WxCC voice queue selection widget
 * 
 * @version 3.1.0
 */

import { Desktop } from "@wxcc-desktop/sdk";
import { io } from "socket.io-client";

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const WXCC_REGIONS = {
  'us1': { api: 'https://api.wxcc-us1.cisco.com', desktop: 'https://desktop.wxcc-us1.cisco.com' },
  'eu1': { api: 'https://api.wxcc-eu1.cisco.com', desktop: 'https://desktop.wxcc-eu1.cisco.com' },
  'eu2': { api: 'https://api.wxcc-eu2.cisco.com', desktop: 'https://desktop.wxcc-eu2.cisco.com' },
  'anz1': { api: 'https://api.wxcc-anz1.cisco.com', desktop: 'https://desktop.wxcc-anz1.cisco.com' },
  'ca1': { api: 'https://api.wxcc-ca1.cisco.com', desktop: 'https://desktop.wxcc-ca1.cisco.com' },
  'jp1': { api: 'https://api.wxcc-jp1.cisco.com', desktop: 'https://desktop.wxcc-jp1.cisco.com' },
  'sg1': { api: 'https://api.wxcc-sg1.cisco.com', desktop: 'https://desktop.wxcc-sg1.cisco.com' }
};

const DEFAULT_CONFIG = {
  refreshInterval: 5,
  maxTaskAge: 600,
  region: 'us1',
  // Only queued calls shown by default. Admins can expand via the showstatuses widget attribute
  // e.g. showstatuses="queued,assigned,abandoned,completed"
  showStatuses: ['queued'],
  displayFields: ['priority', 'customerName', 'accountNumber', 'callReason']
};

const TASK_STATUS = {
  QUEUED: 'queued',
  CREATED: 'created',
  ASSIGNED: 'assigned',
  ABANDONED: 'abandoned',
  COMPLETED: 'completed'
};

// =============================================================================
// STYLES
// =============================================================================

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :host {
    /* Theme */
    --cs-navy:         #1a4b7a;
    --cs-navy-dark:    #143a61;
    --cs-navy-light:   #2260a0;
    --cs-red:          #e31937;

    /* Urgency */
    --cs-low:          #16a34a;
    --cs-medium:       #d97706;
    --cs-high:         #e31937;

    /* Surfaces */
    --cs-bg:           #f0f4f8;
    --cs-surface:      #ffffff;
    --cs-border:       #dde3ea;
    --cs-border-light: #edf1f5;

    /* Text */
    --cs-text:         #0f172a;
    --cs-text-2:       #475569;
    --cs-text-3:       #94a3b8;

    /* Misc */
    --cs-radius:       8px;
    --cs-transition:   150ms ease;

    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: var(--cs-text);
  }

  :host([darkmode="true"]) {
    --cs-navy:         #1e3a5f;
    --cs-navy-dark:    #162d4a;
    --cs-navy-light:   #2a5080;
    --cs-bg:           #0f1923;
    --cs-surface:      #1a2535;
    --cs-border:       #2a3a4e;
    --cs-border-light: #1f2f42;
    --cs-text:         #e8edf3;
    --cs-text-2:       #8fa5be;
    --cs-text-3:       #4d6a85;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* =========== ROOT =========== */
  .cs-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--cs-bg);
    overflow: hidden;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* =========== HEADER =========== */
  .cs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--cs-navy);
    flex-shrink: 0;
  }

  .cs-brand-name {
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.3px;
    line-height: 1.2;
  }

  .cs-live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--cs-low);
    flex-shrink: 0;
  }

  .cs-live-dot.live {
    animation: pulse 2s ease-in-out infinite;
  }

  .cs-live-dot.offline {
    background: var(--cs-high);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.85); }
  }

  /* =========== FILTERS (admin-enabled only) =========== */
  .cs-filters {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--cs-surface);
    border-bottom: 1px solid var(--cs-border);
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .cs-filter-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background: transparent;
    border: 1px solid var(--cs-border);
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    color: var(--cs-text-2);
    cursor: pointer;
    transition: all var(--cs-transition);
    user-select: none;
  }

  .cs-filter-chip:hover { background: var(--cs-bg); }

  .cs-filter-chip.active { color: white; border-color: transparent; }
  .cs-filter-chip.queued.active   { background: var(--cs-low); }
  .cs-filter-chip.assigned.active { background: var(--cs-medium); }
  .cs-filter-chip.abandoned.active,
  .cs-filter-chip.completed.active { background: var(--cs-text-3); }

  .cs-filter-chip .count {
    background: rgba(255,255,255,0.25);
    padding: 0 5px;
    border-radius: 8px;
    font-size: 10px;
  }

  .cs-filter-chip:not(.active) .count { background: var(--cs-border); }

  /* =========== MAIN SCROLL AREA =========== */
  .cs-main {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  /* =========== QUEUE SECTIONS =========== */
  .cs-queue-section { margin-bottom: 18px; }

  .cs-queue-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 2px 8px;
  }

  .cs-queue-name-text {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.9px;
    color: var(--cs-text-2);
  }

  .cs-queue-count-badge {
    background: var(--cs-navy);
    color: white;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 7px;
    line-height: 1.6;
  }

  /* =========== CARD GRID =========== */
  .cs-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 10px;
  }

  /* =========== CALL CARDS =========== */
  .cs-card {
    background: var(--cs-surface);
    border: 1px solid var(--cs-border);
    border-left: 4px solid var(--cs-border);
    border-radius: var(--cs-radius);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: box-shadow var(--cs-transition);
  }

  .cs-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); }

  .cs-card.urgency-low    { border-left-color: var(--cs-low); }
  .cs-card.urgency-medium { border-left-color: var(--cs-medium); }
  .cs-card.urgency-high   { border-left-color: var(--cs-high); }

  .cs-card-phone {
    font-size: 14px;
    font-weight: 700;
    color: var(--cs-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cs-card-name {
    font-size: 12px;
    color: var(--cs-text-2);
    margin-top: -4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cs-card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px;
  }

  .cs-card-wait {
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .cs-card-wait.urgency-low    { color: var(--cs-low); }
  .cs-card-wait.urgency-medium { color: var(--cs-medium); }
  .cs-card-wait.urgency-high   { color: var(--cs-high); }

  /* =========== CUSTOM FIELD BADGES =========== */
  .cs-card-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .cs-field-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--cs-bg);
    color: var(--cs-text-2);
    border: 1px solid var(--cs-border);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }

  /* =========== STATUS BADGE (admin multi-status mode) =========== */
  .cs-status-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .cs-status-badge.queued    { background: rgba(22,163,74,0.12); color: var(--cs-low); }
  .cs-status-badge.assigned  { background: rgba(217,119,6,0.12); color: var(--cs-medium); }
  .cs-status-badge.abandoned,
  .cs-status-badge.completed { background: rgba(148,163,184,0.15); color: var(--cs-text-3); }

  /* =========== CLAIM BUTTON =========== */
  .cs-claim-btn {
    width: 100%;
    padding: 8px;
    background: var(--cs-navy);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background var(--cs-transition);
    margin-top: auto;
    letter-spacing: 0.2px;
  }

  .cs-claim-btn:hover:not(:disabled) { background: var(--cs-navy-dark); }

  .cs-claim-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* =========== EMPTY / LOADING / ERROR =========== */
  .cs-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 20px;
    text-align: center;
    color: var(--cs-text-3);
    gap: 8px;
  }

  .cs-state-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--cs-text-2);
  }

  .cs-state-text {
    font-size: 12px;
    max-width: 240px;
    line-height: 1.5;
  }

  .cs-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--cs-border);
    border-top-color: var(--cs-navy);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .cs-retry-btn {
    margin-top: 8px;
    padding: 8px 18px;
    background: var(--cs-navy);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background var(--cs-transition);
  }

  .cs-retry-btn:hover { background: var(--cs-navy-dark); }

  /* =========== FOOTER =========== */
  .cs-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 14px;
    background: var(--cs-surface);
    border-top: 1px solid var(--cs-border);
    font-size: 10px;
    color: var(--cs-text-3);
    flex-shrink: 0;
  }
`;

// =============================================================================
// ICONS
// =============================================================================

const ICONS = {
  user: `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
  queue: `<svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
  target: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-5-9h4V7h2v4h4v2h-4v4h-2v-4H7z"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
  warning: `<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  inbox: `<svg viewBox="0 0 24 24"><path d="M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`,
  priority: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const formatPhoneNumber = (phone) => {
  if (!phone) return 'Unknown';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1 (${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const getUrgencyClass = (createdTime) => {
  const age = (Date.now() - createdTime) / 1000;
  if (age < 120) return 'urgency-low';
  if (age < 300) return 'urgency-medium';
  return 'urgency-high';
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const parseCallerName = (headers) => {
  if (!headers) return null;
  try {
    const match = headers.match(/caller_id_name=([^}]+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
};

// =============================================================================
// LOGGER
// =============================================================================

const logger = {
  prefix: '[call-selector]',
  info: (...args) => console.log(`${new Date().toISOString()} ${logger.prefix}`, ...args),
  warn: (...args) => console.warn(`${new Date().toISOString()} ${logger.prefix}`, ...args),
  error: (...args) => console.error(`${new Date().toISOString()} ${logger.prefix}`, ...args),
  debug: (...args) => console.log(`${new Date().toISOString()} ${logger.prefix} [DEBUG]`, ...args)
};

// =============================================================================
// STATE STORE
// =============================================================================

class TaskStore {
  constructor() {
    this.tasks = new Map();
    this.callerIds = new Map();
    this.customFields = new Map(); // Store custom field data
    this.filters = {
      queued: true,
      assigned: true,
      abandoned: true,
      completed: false
    };
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  getState() {
    return {
      tasks: Array.from(this.tasks.values()),
      callerIds: this.callerIds,
      customFields: this.customFields,
      filters: { ...this.filters }
    };
  }

  setTasks(tasks) {
    // Replace the full task set so tasks removed from the API disappear from the UI
    this.tasks.clear();
    tasks.forEach(task => this.tasks.set(task.id, task));
    this.notify();
  }

  updateTask(id, partial) {
    const existing = this.tasks.get(id);
    if (existing) {
      this.tasks.set(id, { ...existing, ...partial });
      this.notify();
    }
  }

  setCallerId(id, data) {
    this.callerIds.set(id, data);
    this.notify();
  }

  setCustomFields(taskId, fields) {
    this.customFields.set(taskId, fields);
    this.notify();
  }

  setFilter(key, value) {
    this.filters[key] = value;
    this.notify();
  }

  // Group tasks by queue
  getTasksGroupedByQueue(showStatuses) {
    const { tasks, filters, callerIds, customFields } = this.getState();
    const groups = new Map();

    tasks
      .filter(task => {
        // Only show tasks that have been assigned to a queue
        if (!task.queue?.id && !task.queue?.name) {
          return false;
        }
        const status = this.normalizeStatus(task.status);
        // If admin has enabled multiple statuses, also respect the agent's filter toggles
        if (showStatuses && showStatuses.length > 0) {
          if (!showStatuses.includes(status)) return false;
        }
        if (showStatuses && showStatuses.length > 1) {
          return filters[status] !== false;
        }
        return true;
      })
      .forEach(task => {
        const queueName = task.queue?.name || 'Unknown Queue';
        const queueId = task.queue?.id || 'unknown';
        
        if (!groups.has(queueId)) {
          groups.set(queueId, {
            id: queueId,
            name: queueName,
            tasks: [],
            queuedCount: 0,
            totalCount: 0
          });
        }
        
        const group = groups.get(queueId);
        const enrichedTask = {
          ...task,
          callerInfo: callerIds.get(task.id),
          customFields: customFields.get(task.id) || {}
        };
        
        group.tasks.push(enrichedTask);
        group.totalCount++;
        
        if (['queued', 'created'].includes(task.status)) {
          group.queuedCount++;
        }
      });

    // Sort tasks within each group by createdTime (newest first)
    groups.forEach(group => {
      group.tasks.sort((a, b) => b.createdTime - a.createdTime);
    });

    // Convert to array and sort groups by queued count (most queued first)
    return Array.from(groups.values()).sort((a, b) => b.queuedCount - a.queuedCount);
  }

  getFilteredTasks(showStatuses) {
    const { tasks, filters, callerIds, customFields } = this.getState();
    return tasks
      .filter(task => {
        if (!task.queue?.id && !task.queue?.name) {
          return false;
        }
        const status = this.normalizeStatus(task.status);
        if (showStatuses && showStatuses.length > 0) {
          if (!showStatuses.includes(status)) return false;
        }
        if (showStatuses && showStatuses.length > 1) {
          return filters[status] !== false;
        }
        return true;
      })
      .map(task => ({
        ...task,
        callerInfo: callerIds.get(task.id),
        customFields: customFields.get(task.id) || {}
      }))
      .sort((a, b) => b.createdTime - a.createdTime);
  }

  normalizeStatus(status) {
    if (status === 'created') return 'queued';
    return status;
  }

  getTaskCounts() {
    const counts = { queued: 0, assigned: 0, abandoned: 0, completed: 0 };
    this.tasks.forEach(task => {
      if (!task.queue?.id && !task.queue?.name) {
        return;
      }
      const status = this.normalizeStatus(task.status);
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      }
    });
    return counts;
  }

  clear() {
    this.tasks.clear();
    this.callerIds.clear();
    this.customFields.clear();
    this.notify();
  }
}

// =============================================================================
// API SERVICE
// =============================================================================

class WxCCApiService {
  constructor(config, getToken) {
    this.config = config;
    this.region = WXCC_REGIONS[config.region] || WXCC_REGIONS.us1;
    this._getToken = getToken;
  }

  async getToken() {
    return this._getToken?.();
  }

  async getTasks(fromEpoch) {
    const token = await this.getToken();
    if (!token) throw new Error('No access token available');

    const response = await fetch(
      `${this.region.api}/v1/tasks?from=${fromEpoch}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async assignTask(taskId) {
    const token = await this.getToken();
    if (!token) throw new Error('No access token available');

    const response = await fetch(
      `${this.region.api}/v1/tasks/${taskId}/assign`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Assign error: ${response.status} - ${errorText}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
  }
}

// =============================================================================
// CALLER ID SERVICE
// =============================================================================

class CallerIdService {
  constructor(hostUri) {
    this.hostUri = hostUri;
  }

  async fetchCallerIds(taskIds) {
    if (!taskIds?.length) return [];

    try {
      const response = await fetch(`${this.hostUri}/callerIds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds })
      });

      if (!response.ok) {
        throw new Error(`CallerIds error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      logger.warn('Failed to fetch caller IDs:', error);
      return [];
    }
  }
}

// =============================================================================
// CALL SELECTOR WIDGET
// =============================================================================

class CallSelectorWidget extends HTMLElement {
  static get observedAttributes() {
    return ['darkmode', 'region', 'refreshinterval', 'displayfields', 'showstatuses'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this.store = new TaskStore();
    this.config = { ...DEFAULT_CONFIG };
    this.agentService = null;
    this.agentDetails = null;
    this.apiService = null;
    this.callerIdService = null;
    this.socket = null;
    this.pollInterval = null;
    this.lastRefresh = null;
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.claimingTasks = new Set();
    this._fetchInFlight = false;
    this._socketConnected = false;
    this.collapsedQueues = new Set(); // Track collapsed queue groups
    this.uiInterval = null;
    
    // Parse display fields from attribute or use defaults
    this.displayFields = DEFAULT_CONFIG.displayFields;

    this.store.subscribe(() => this.updateUI());
  }

  connectedCallback() {
    this.render();
    this.initialize();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'darkmode':
        break;
      case 'region':
        this.config.region = newValue || DEFAULT_CONFIG.region;
        break;
      case 'refreshinterval':
        this.config.refreshInterval = parseInt(newValue) || DEFAULT_CONFIG.refreshInterval;
        this.restartPolling();
        break;
      case 'displayfields':
        try {
          this.displayFields = JSON.parse(newValue);
        } catch {
          this.displayFields = newValue.split(',').map(f => f.trim());
        }
        break;
      case 'showstatuses':
        this.config.showStatuses = newValue.split(',').map(s => s.trim()).filter(Boolean);
        this.updateUI();
        break;
    }
  }

  async initialize() {
    try {
      Desktop.config.init();

      this.agentService = Desktop.agentContact.SERVICE;
      this.agentDetails = await this.agentService.webex.fetchPersonData("me");

      this.initializeServices();
      this.setupDesktopEvents();
      this.initializeSocket();
      this.loadFiltersFromCookies();
      this.startPolling();
      
      this.isLoading = false;
      this.updateUI();
      
    } catch (error) {
      logger.error('Initialization failed:', error);
      this.handleError('Failed to initialize widget');
    }
  }

  initializeServices() {
    const hostUri = this.getAttribute('hosturi') 
      || process.env.HOST_URI 
      || 'https://busu-cherry-picker.onrender.com';
    
    this.apiService = new WxCCApiService(this.config, () => this.agentService?.webex?.token?.access_token);
    this.callerIdService = new CallerIdService(hostUri);
  }

  setupDesktopEvents() {
    Desktop.agentContact.addEventListener('eAgentOfferContact', (contact) => {
      logger.debug('Agent offer contact:', contact);
      const taskId = contact.data?.interactionId;
      if (taskId && this.claimingTasks.has(taskId)) {
        this.claimingTasks.delete(taskId);
        this.updateUI();
      }
    });

    Desktop.agentStateInfo.addEventListener('updated', (state) => {
      logger.debug('Agent state updated:', state);
    });
  }

  initializeSocket() {
    const hostUri = this.getAttribute('hosturi') 
      || process.env.HOST_URI 
      || 'https://busu-cherry-picker.onrender.com';
    
    logger.info('Connecting to socket server:', hostUri);
    
    const profile = Desktop.agentContact.SERVICE.conf.profile;

    this.socket = io(hostUri, {
      transports: ['websocket', 'polling'],
      auth: {
        agentId: profile.agentId,
        agentName: profile.agentName,
        agentMailId: profile.agentMailId,
        orgId: profile.orgId
      }
    });

    this.socket.on('connect', () => {
      logger.info('Socket connected');
      this._socketConnected = true;
      this.updateConnectionStatus();
    });

    this.socket.on('disconnect', () => {
      logger.warn('Socket disconnected');
      this._socketConnected = false;
      this.updateConnectionStatus();
    });

    this.socket.on('connect_error', (error) => {
      logger.warn('Socket connection error:', error.message);
      this._socketConnected = false;
      this.updateConnectionStatus();
    });

    this.socket.on('message', (data) => {
      logger.debug('Socket message:', data);
      if (!data.InteractionId) return;
      if (data.eventType === 'abandoned') {
        this.handleAbandonedTask(data);
      } else {
        this.handleNewTask(data);
      }
    });
  }

  handleAbandonedTask(data) {
    // Optimistically mark the task abandoned so the UI updates before the next poll
    this.store.updateTask(data.InteractionId, { status: 'abandoned' });
    // Confirm with the WxCC API
    this.fetchTasks();
  }

  handleNewTask(data) {
    this.store.setCallerId(data.InteractionId, data);
    
    // Store any custom fields from the flow
    const customFields = {};
    if (data.priority) customFields.priority = data.priority;
    if (data.customerName) customFields.customerName = data.customerName;
    if (data.accountNumber) customFields.accountNumber = data.accountNumber;
    if (data.callReason) customFields.callReason = data.callReason;
    // Add any other custom fields passed from the flow
    Object.keys(data).forEach(key => {
      if (!['InteractionId', 'ANI', 'DNIS', 'OrgId', 'Headers', 'EntryPointId', 'FlowId'].includes(key)) {
        customFields[key] = data[key];
      }
    });
    
    if (Object.keys(customFields).length > 0) {
      this.store.setCustomFields(data.InteractionId, customFields);
    }
    
    this.fetchTasks();
  }

  startPolling() {
    this.fetchTasks();
    this.pollInterval = setInterval(() => {
      this.fetchTasks();
    }, this.config.refreshInterval * 1000);

    this.uiInterval = setInterval(() => {
      this.updateRefreshIndicator();
      this.updateWaitTimes();
    }, 1000);
  }

  restartPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.startPolling();
  }

  async fetchTasks() {
    if (this._fetchInFlight) return;
    this._fetchInFlight = true;
    try {
      const fromEpoch = Date.now() - (this.config.maxTaskAge * 1000);
      const response = await this.apiService.getTasks(fromEpoch);

      if (response?.data) {
        const tasks = response.data.map(item => ({
          id: item.id,
          ...item.attributes
        }));

        this.store.setTasks(tasks);

        const taskIds = tasks.map(t => t.id);
        const existingIds = Array.from(this.store.callerIds.keys());
        const missingIds = taskIds.filter(id => !existingIds.includes(id));

        if (missingIds.length > 0) {
          const callerIds = await this.callerIdService.fetchCallerIds(missingIds);
          callerIds.forEach(info => {
            if (info.InteractionId) {
              this.store.setCallerId(info.InteractionId, info);

              // Extract custom fields
              const customFields = {};
              Object.keys(info).forEach(key => {
                if (!['InteractionId', 'ANI', 'DNIS', 'OrgId', 'Headers', 'EntryPointId', 'FlowId'].includes(key)) {
                  customFields[key] = info[key];
                }
              });
              if (Object.keys(customFields).length > 0) {
                this.store.setCustomFields(info.InteractionId, customFields);
              }
            }
          });
        }
      }

      this.lastRefresh = new Date();
      this.hasError = false;

    } catch (error) {
      logger.error('Failed to fetch tasks:', error);
      this.handleError('Failed to load queue data');
    } finally {
      this._fetchInFlight = false;
    }
  }

  async claimTask(taskId) {
    if (this.claimingTasks.has(taskId)) return;
    
    this.claimingTasks.add(taskId);
    this.updateUI();
    
    try {
      logger.info('Attempting to claim task:', taskId);
      await this.apiService.assignTask(taskId);
      logger.info('Claim successful:', taskId);

      setTimeout(() => {
        this.claimingTasks.delete(taskId);
        this.updateUI();
      }, 3000);
      
    } catch (error) {
      logger.error('Failed to claim task:', taskId, error);
      this.claimingTasks.delete(taskId);
      this.updateUI();
    }
  }

  handleError(message) {
    this.hasError = true;
    this.errorMessage = message;
    this.isLoading = false;
    this.updateUI();
  }

  cleanup() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.uiInterval) {
      clearInterval(this.uiInterval);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
    Desktop.agentContact.removeAllEventListeners();
  }

  // Filter management
  loadFiltersFromCookies() {
    const statuses = ['queued', 'assigned', 'abandoned', 'completed'];
    statuses.forEach(status => {
      const saved = this.getCookie(`cs-filter-${status}`);
      if (saved !== null) {
        this.store.setFilter(status, saved === 'true');
      }
    });
  }

  toggleFilter(status) {
    const { filters } = this.store.getState();
    const newValue = !filters[status];
    this.store.setFilter(status, newValue);
    this.setCookie(`cs-filter-${status}`, newValue);
  }

  toggleQueueCollapse(queueId) {
    if (this.collapsedQueues.has(queueId)) {
      this.collapsedQueues.delete(queueId);
    } else {
      this.collapsedQueues.add(queueId);
    }
    this.updateUI();
  }

  getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  setCookie(name, value) {
    document.cookie = `${name}=${value};path=/;max-age=31536000`;
  }

  // Rendering
  render() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>${styles}</style>
      <div class="cs-root">
        <header class="cs-header">
          <div class="cs-brand-name">Call Selector</div>
          <div class="cs-live-dot ${this._socketConnected ? 'live' : 'offline'}" id="liveDot"></div>
        </header>

        <div class="cs-filters" id="filters" style="display:none"></div>

        <main class="cs-main" id="queueList"></main>

        <footer class="cs-footer">
          <span id="lastRefresh">Loading...</span>
          <span>v3.0.0</span>
        </footer>
      </div>
    `;
    
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.bindEvents();
    this.updateUI();
  }

  bindEvents() {
    // Filter clicks and queue collapse are handled via delegation in update methods
  }

  updateUI() {
    this.updateFilters();
    this.updateQueueList();
    this.updateConnectionStatus();
    this.updateRefreshIndicator();
  }

  updateFilters() {
    const filtersEl = this.shadowRoot.getElementById('filters');
    if (!filtersEl) return;

    // Only show filter chips when admin has enabled multiple statuses
    if (this.config.showStatuses.length <= 1) {
      filtersEl.style.display = 'none';
      return;
    }

    filtersEl.style.display = 'flex';
    const counts = this.store.getTaskCounts();
    const { filters } = this.store.getState();

    filtersEl.innerHTML = this.config.showStatuses
      .map(status => `
        <div class="cs-filter-chip ${status} ${filters[status] !== false ? 'active' : ''}"
             data-filter="${status}">
          ${capitalizeFirst(status)}
          <span class="count">${counts[status]}</span>
        </div>
      `).join('');

    filtersEl.querySelectorAll('.cs-filter-chip').forEach(chip => {
      chip.onclick = () => this.toggleFilter(chip.dataset.filter);
    });
  }

  updateQueueList() {
    const queueListEl = this.shadowRoot.getElementById('queueList');
    if (!queueListEl) return;
    
    if (this.isLoading) {
      queueListEl.innerHTML = `
        <div class="cs-state">
          <div class="cs-spinner"></div>
          <span class="cs-state-title">Loading queue data…</span>
        </div>
      `;
      return;
    }

    if (this.hasError) {
      queueListEl.innerHTML = `
        <div class="cs-state">
          <span class="cs-state-title">Connection Error</span>
          <span class="cs-state-text">${escapeHtml(this.errorMessage)}</span>
          <button class="cs-retry-btn" id="retryBtn">Try Again</button>
        </div>
      `;
      this.shadowRoot.getElementById('retryBtn').onclick = () => {
        this.cleanup();
        this.hasError = false;
        this.isLoading = true;
        this.updateUI();
        this.initialize();
      };
      return;
    }

    const queueGroups = this.store.getTasksGroupedByQueue(this.config.showStatuses);

    if (queueGroups.length === 0) {
      queueListEl.innerHTML = `
        <div class="cs-state">
          <span class="cs-state-title">No calls waiting</span>
          <span class="cs-state-text">Calls will appear here when they enter your queues.</span>
        </div>
      `;
      return;
    }

    queueListEl.innerHTML = queueGroups.map(group => this.renderQueueGroup(group)).join('');

    // Bind claim button events
    queueListEl.querySelectorAll('.cs-claim-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this.claimTask(btn.dataset.taskId);
      };
    });
  }

  renderQueueGroup(group) {
    return `
      <section class="cs-queue-section">
        <div class="cs-queue-label">
          <span class="cs-queue-name-text">${escapeHtml(group.name)}</span>
          <span class="cs-queue-count-badge">${group.queuedCount}</span>
        </div>
        <div class="cs-card-grid">
          ${group.tasks.map(task => this.renderTaskCard(task)).join('')}
        </div>
      </section>
    `;
  }

  renderTaskCard(task) {
    const status = this.store.normalizeStatus(task.status);
    const isClaimable = ['queued', 'created'].includes(task.status);
    const isClaiming = this.claimingTasks.has(task.id);
    const urgencyClass = getUrgencyClass(task.createdTime);
    const waitTime = formatDuration(Date.now() - task.createdTime);

    const callerInfo = task.callerInfo || {};
    const customFields = task.customFields || {};
    const callerName = customFields.customerName || parseCallerName(callerInfo.Headers) || callerInfo.callerName;
    const phoneNumber = formatPhoneNumber(task.origin);

    // Show status badge only when admin has enabled multiple statuses
    const showStatusBadge = this.config.showStatuses.length > 1;

    return `
      <div class="cs-card ${urgencyClass}" data-task-id="${task.id}">
        <div class="cs-card-phone">${escapeHtml(phoneNumber)}</div>
        ${callerName ? `<div class="cs-card-name">${escapeHtml(callerName)}</div>` : ''}
        <div class="cs-card-meta">
          <span class="cs-card-wait ${urgencyClass}">${waitTime}</span>
          ${showStatusBadge ? `<span class="cs-status-badge ${status}">${capitalizeFirst(status)}</span>` : ''}
        </div>
        ${this.renderCustomFields(customFields)}
        ${isClaimable ? `
          <button class="cs-claim-btn" data-task-id="${task.id}" ${isClaiming ? 'disabled' : ''}>
            ${isClaiming ? 'Claiming…' : 'Claim'}
          </button>
        ` : ''}
      </div>
    `;
  }

  renderCustomFields(customFields) {
    if (!customFields || Object.keys(customFields).length === 0) return '';

    const fieldLabels = {
      priority: 'Priority',
      customerName: 'Customer',
      accountNumber: 'Account',
      callReason: 'Reason',
      customerId: 'ID',
      segment: 'Segment',
      language: 'Language',
      region: 'Region',
      productType: 'Product',
      caseNumber: 'Case #',
      orderNumber: 'Order #'
    };

    const fieldsToShow = this.displayFields.filter(field => customFields[field]);
    if (fieldsToShow.length === 0) return '';

    return `
      <div class="cs-card-fields">
        ${fieldsToShow.map(field => `
          <span class="cs-field-badge" title="${escapeHtml(fieldLabels[field] || capitalizeFirst(field))}: ${escapeHtml(customFields[field])}">
            ${escapeHtml(fieldLabels[field] || capitalizeFirst(field))}: ${escapeHtml(customFields[field])}
          </span>
        `).join('')}
      </div>
    `;
  }

  updateWaitTimes() {
    // Update wait times without full re-render
    this.shadowRoot.querySelectorAll('.cs-task-card').forEach(card => {
      const taskId = card.dataset.taskId;
      const tasks = this.store.getFilteredTasks(this.config.showStatuses);
      const task = tasks.find(t => t.id === taskId);
      
      if (task) {
        const timeEl = card.querySelector('.cs-task-time');
        if (timeEl) {
          timeEl.textContent = formatDuration(Date.now() - task.createdTime);
        }
      }
    });
  }

  updateConnectionStatus() {
    const dot = this.shadowRoot.getElementById('liveDot');
    if (dot) {
      dot.className = `cs-live-dot ${this._socketConnected ? 'live' : 'offline'}`;
    }
  }

  updateRefreshIndicator() {
    const el = this.shadowRoot.getElementById('lastRefresh');
    if (el && this.lastRefresh) {
      const seconds = Math.floor((Date.now() - this.lastRefresh.getTime()) / 1000);
      el.textContent = seconds < 5 ? 'Updated just now' : `Updated ${seconds}s ago`;
    }
  }
}

// Register custom element
customElements.define('call-selector-widget', CallSelectorWidget);

export default CallSelectorWidget;
