/**
 * Call Selector Widget v3.0
 * A production-ready WxCC voice queue selection widget
 * 
 * @author B+S Solutions
 * @version 3.0.0
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
  showCompleted: true,
  showAbandoned: true,
  region: 'us1',
  // Configurable display fields - customers can customize this
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
    --cs-primary: #00bceb;
    --cs-primary-hover: #00a0c7;
    --cs-primary-active: #008fb3;
    
    --cs-success: #00c853;
    --cs-success-bg: rgba(0, 200, 83, 0.12);
    --cs-warning: #ffab00;
    --cs-warning-bg: rgba(255, 171, 0, 0.12);
    --cs-danger: #ff5252;
    --cs-danger-bg: rgba(255, 82, 82, 0.12);
    --cs-muted: #9e9e9e;
    --cs-muted-bg: rgba(158, 158, 158, 0.12);
    
    --cs-bg-primary: #ffffff;
    --cs-bg-secondary: #f8f9fa;
    --cs-bg-card: #ffffff;
    --cs-bg-hover: #f5f5f5;
    --cs-bg-queue-header: #f0f4f8;
    
    --cs-border: #e0e0e0;
    --cs-border-light: #f0f0f0;
    
    --cs-text-primary: #212121;
    --cs-text-secondary: #616161;
    --cs-text-muted: #9e9e9e;
    
    --cs-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
    --cs-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
    --cs-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
    
    --cs-radius-sm: 6px;
    --cs-radius-md: 10px;
    --cs-radius-lg: 14px;
    
    --cs-transition: 200ms ease;
    
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: var(--cs-text-primary);
  }

  :host([darkmode="true"]) {
    --cs-bg-primary: #1a1a1a;
    --cs-bg-secondary: #242424;
    --cs-bg-card: #2d2d2d;
    --cs-bg-hover: #363636;
    --cs-bg-queue-header: #333333;
    
    --cs-border: #404040;
    --cs-border-light: #333333;
    
    --cs-text-primary: #ffffff;
    --cs-text-secondary: #b0b0b0;
    --cs-text-muted: #757575;
    
    --cs-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
    --cs-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
    --cs-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .call-selector {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--cs-bg-primary);
    overflow: hidden;
  }

  /* =========== HEADER =========== */
  .cs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: var(--cs-bg-primary);
    border-bottom: 1px solid var(--cs-border-light);
    flex-shrink: 0;
  }

  .cs-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cs-branding {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .cs-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--cs-text-primary);
    letter-spacing: -0.3px;
  }

  .cs-powered-by {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--cs-text-muted);
  }

  .cs-bs-text {
    font-weight: 600;
    color: #1a4b7a;
    letter-spacing: -0.3px;
  }

  :host([darkmode="true"]) .cs-bs-text {
    color: #5a9fd4;
  }

  .cs-plus {
    color: #e31937;
    font-weight: 700;
  }

  .cs-connection-status {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .cs-connection-status.connected {
    background: var(--cs-success-bg);
    color: var(--cs-success);
  }

  .cs-connection-status.disconnected {
    background: var(--cs-danger-bg);
    color: var(--cs-danger);
  }

  .cs-connection-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .cs-connection-status.connected .cs-connection-dot {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* =========== FILTERS =========== */
  .cs-filters {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--cs-bg-primary);
    border-bottom: 1px solid var(--cs-border-light);
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .cs-filter-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--cs-bg-secondary);
    border: 1px solid var(--cs-border);
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    color: var(--cs-text-secondary);
    cursor: pointer;
    transition: all var(--cs-transition);
    user-select: none;
  }

  .cs-filter-chip:hover {
    background: var(--cs-bg-hover);
  }

  .cs-filter-chip.active {
    color: white;
    border-color: transparent;
  }

  .cs-filter-chip.queued.active { background: var(--cs-success); border-color: var(--cs-success); }
  .cs-filter-chip.assigned.active { background: var(--cs-warning); border-color: var(--cs-warning); }
  .cs-filter-chip.abandoned.active { background: var(--cs-danger); border-color: var(--cs-danger); }
  .cs-filter-chip.completed.active { background: var(--cs-muted); border-color: var(--cs-muted); }

  .cs-filter-chip .count {
    background: rgba(255, 255, 255, 0.2);
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 11px;
  }

  .cs-filter-chip:not(.active) .count {
    background: var(--cs-border);
  }

  /* =========== QUEUE GROUPS =========== */
  .cs-queue-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: var(--cs-bg-secondary);
  }

  .cs-queue-group {
    margin-bottom: 16px;
    background: var(--cs-bg-card);
    border-radius: var(--cs-radius-md);
    box-shadow: var(--cs-shadow-sm);
    overflow: hidden;
  }

  .cs-queue-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--cs-bg-queue-header);
    border-bottom: 1px solid var(--cs-border-light);
    cursor: pointer;
    user-select: none;
  }

  .cs-queue-header:hover {
    background: var(--cs-bg-hover);
  }

  .cs-queue-name {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    color: var(--cs-text-primary);
  }

  .cs-queue-name svg {
    width: 18px;
    height: 18px;
    fill: var(--cs-primary);
  }

  .cs-queue-count {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cs-queue-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }

  .cs-queue-badge.queued {
    background: var(--cs-success-bg);
    color: var(--cs-success);
  }

  .cs-queue-badge.total {
    background: var(--cs-bg-secondary);
    color: var(--cs-text-secondary);
  }

  .cs-queue-chevron {
    width: 20px;
    height: 20px;
    fill: var(--cs-text-muted);
    transition: transform var(--cs-transition);
  }

  .cs-queue-group.collapsed .cs-queue-chevron {
    transform: rotate(-90deg);
  }

  .cs-queue-tasks {
    padding: 8px;
  }

  .cs-queue-group.collapsed .cs-queue-tasks {
    display: none;
  }

  /* =========== TASK CARDS =========== */
  .cs-task-card {
    background: var(--cs-bg-card);
    border: 1px solid var(--cs-border-light);
    border-radius: var(--cs-radius-sm);
    margin-bottom: 8px;
    transition: all var(--cs-transition);
  }

  .cs-task-card:last-child {
    margin-bottom: 0;
  }

  .cs-task-card:hover {
    box-shadow: var(--cs-shadow-md);
    border-color: var(--cs-border);
  }

  .cs-task-card.faded {
    opacity: 0.6;
  }

  .cs-task-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--cs-border-light);
  }

  .cs-task-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .cs-task-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .cs-task-status.queued { color: var(--cs-success); }
  .cs-task-status.queued .cs-task-status-dot { background: var(--cs-success); }
  
  .cs-task-status.assigned { color: var(--cs-warning); }
  .cs-task-status.assigned .cs-task-status-dot { background: var(--cs-warning); }
  
  .cs-task-status.abandoned { color: var(--cs-danger); }
  .cs-task-status.abandoned .cs-task-status-dot { background: var(--cs-danger); }
  
  .cs-task-status.completed { color: var(--cs-muted); }
  .cs-task-status.completed .cs-task-status-dot { background: var(--cs-muted); }

  .cs-task-time {
    font-size: 12px;
    color: var(--cs-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .cs-task-body {
    padding: 14px;
  }

  .cs-task-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .cs-task-caller {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex: 1;
  }

  .cs-task-avatar {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--cs-primary) 0%, #0095d9 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .cs-task-avatar svg {
    width: 20px;
    height: 20px;
    fill: white;
  }

  .cs-task-avatar.priority-high {
    background: linear-gradient(135deg, var(--cs-danger) 0%, #ff1744 100%);
  }

  .cs-task-avatar.priority-medium {
    background: linear-gradient(135deg, var(--cs-warning) 0%, #ff9100 100%);
  }

  .cs-task-caller-info {
    flex: 1;
    min-width: 0;
  }

  .cs-task-phone {
    font-size: 15px;
    font-weight: 600;
    color: var(--cs-text-primary);
    margin-bottom: 2px;
  }

  .cs-task-name {
    font-size: 13px;
    color: var(--cs-text-secondary);
    margin-bottom: 4px;
  }

  /* =========== CUSTOM FIELDS =========== */
  .cs-task-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--cs-border-light);
  }

  .cs-task-field {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--cs-bg-secondary);
    border-radius: var(--cs-radius-sm);
    font-size: 11px;
  }

  .cs-task-field-label {
    color: var(--cs-text-muted);
    font-weight: 500;
  }

  .cs-task-field-value {
    color: var(--cs-text-primary);
    font-weight: 600;
  }

  .cs-task-field.priority-high {
    background: var(--cs-danger-bg);
  }

  .cs-task-field.priority-high .cs-task-field-value {
    color: var(--cs-danger);
  }

  .cs-task-field.priority-medium {
    background: var(--cs-warning-bg);
  }

  .cs-task-field.priority-medium .cs-task-field-value {
    color: var(--cs-warning);
  }

  /* =========== CLAIM BUTTON =========== */
  .cs-claim-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: var(--cs-success);
    color: white;
    border: none;
    border-radius: var(--cs-radius-sm);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--cs-transition);
    flex-shrink: 0;
  }

  .cs-claim-btn:hover {
    background: #00b048;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 200, 83, 0.3);
  }

  .cs-claim-btn:active {
    transform: translateY(0);
  }

  .cs-claim-btn:disabled {
    background: var(--cs-border);
    color: var(--cs-text-muted);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .cs-claim-btn svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  .cs-claim-btn.loading {
    position: relative;
    color: transparent;
  }

  .cs-claim-btn.loading::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    border: 2px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* =========== EMPTY & LOADING STATES =========== */
  .cs-empty-state,
  .cs-loading,
  .cs-error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
  }

  .cs-empty-icon,
  .cs-error-icon {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .cs-empty-icon svg,
  .cs-error-icon svg {
    width: 100%;
    height: 100%;
    fill: var(--cs-text-muted);
  }

  .cs-empty-title,
  .cs-error-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--cs-text-primary);
    margin-bottom: 8px;
  }

  .cs-empty-text,
  .cs-error-text {
    font-size: 13px;
    color: var(--cs-text-muted);
    max-width: 280px;
    line-height: 1.5;
  }

  .cs-loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--cs-border);
    border-top-color: var(--cs-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }

  .cs-loading-text {
    font-size: 13px;
    color: var(--cs-text-muted);
  }

  .cs-retry-btn {
    margin-top: 16px;
    padding: 10px 20px;
    background: var(--cs-primary);
    color: white;
    border: none;
    border-radius: var(--cs-radius-sm);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background var(--cs-transition);
  }

  .cs-retry-btn:hover {
    background: var(--cs-primary-hover);
  }

  /* =========== FOOTER =========== */
  .cs-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: var(--cs-bg-primary);
    border-top: 1px solid var(--cs-border-light);
    font-size: 11px;
    color: var(--cs-text-muted);
    flex-shrink: 0;
  }

  .cs-footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cs-refresh-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cs-refresh-indicator svg {
    width: 12px;
    height: 12px;
    fill: var(--cs-text-muted);
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
    tasks.forEach(task => {
      const existing = this.tasks.get(task.id);
      if (!existing || existing.lastUpdatedTime !== task.lastUpdatedTime) {
        this.tasks.set(task.id, task);
      }
    });
    this.notify();
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
  getTasksGroupedByQueue() {
    const { tasks, filters, callerIds, customFields } = this.getState();
    const groups = new Map();

    tasks
      .filter(task => {
        // Only show tasks that have been assigned to a queue
        if (!task.queue?.id && !task.queue?.name) {
          return false;
        }
        const status = this.normalizeStatus(task.status);
        return filters[status];
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

  getFilteredTasks() {
    const { tasks, filters, callerIds, customFields } = this.getState();
    return tasks
      .filter(task => {
        if (!task.queue?.id && !task.queue?.name) {
          return false;
        }
        const status = this.normalizeStatus(task.status);
        return filters[status];
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
  constructor(config) {
    this.config = config;
    this.region = WXCC_REGIONS[config.region] || WXCC_REGIONS.us1;
  }

  async getToken() {
    return window.myAgentService?.webex?.token?.access_token;
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
    return ['darkmode', 'region', 'refreshinterval', 'displayfields'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this.store = new TaskStore();
    this.config = { ...DEFAULT_CONFIG };
    this.apiService = null;
    this.callerIdService = null;
    this.socket = null;
    this.pollInterval = null;
    this.lastRefresh = null;
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.claimingTasks = new Set();
    this._socketConnected = false;
    this.collapsedQueues = new Set(); // Track collapsed queue groups
    
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
    }
  }

  async initialize() {
    try {
      Desktop.config.init();
      
      window.myAgentService = Desktop.agentContact.SERVICE;
      
      const agentDetails = await Desktop.agentContact.SERVICE.webex.fetchPersonData("me");
      window.agentDetails = agentDetails;
      
      this.initializeServices();
      this.setupDesktopEvents();
      this.initializeSocket();
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
    
    this.apiService = new WxCCApiService(this.config);
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
      if (data.InteractionId) {
        this.handleNewTask(data);
      }
    });
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

    setInterval(() => {
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
    }
  }

  async claimTask(taskId) {
    if (this.claimingTasks.has(taskId)) return;
    
    this.claimingTasks.add(taskId);
    this.updateUI();
    
    try {
      logger.info('Attempting to claim task:', taskId);
      
      const assignResp = await fetch(`https://api.wxcc-us1.cisco.com/v1/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.myAgentService.webex.token.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      logger.info('Claim response status:', assignResp.status);
      
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
      <div class="call-selector">
        <div class="cs-header">
          <div class="cs-header-left">
            <div class="cs-branding">
              <div class="cs-title">Call Selector</div>
              <div class="cs-powered-by">
                powered by <span class="cs-bs-text">bucher<span class="cs-plus">+</span>suter</span>
              </div>
            </div>
          </div>
          <div class="cs-connection-status ${this._socketConnected ? 'connected' : 'disconnected'}">
            <span class="cs-connection-dot"></span>
            <span>${this._socketConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
        
        <div class="cs-filters" id="filters"></div>
        
        <div class="cs-queue-list" id="queueList"></div>
        
        <div class="cs-footer">
          <div class="cs-footer-left">
            <div class="cs-refresh-indicator" id="refreshIndicator">
              ${ICONS.refresh}
              <span id="lastRefresh">Refreshing...</span>
            </div>
          </div>
          <div>v3.0.0</div>
        </div>
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
    
    const counts = this.store.getTaskCounts();
    const { filters } = this.store.getState();
    
    filtersEl.innerHTML = ['queued', 'assigned', 'abandoned', 'completed']
      .map(status => `
        <div class="cs-filter-chip ${status} ${filters[status] ? 'active' : ''}" 
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
        <div class="cs-loading">
          <div class="cs-loading-spinner"></div>
          <div class="cs-loading-text">Loading queue data...</div>
        </div>
      `;
      return;
    }
    
    if (this.hasError) {
      queueListEl.innerHTML = `
        <div class="cs-error-state">
          <div class="cs-error-icon">${ICONS.warning}</div>
          <div class="cs-error-title">Connection Error</div>
          <div class="cs-error-text">${this.errorMessage}</div>
          <button class="cs-retry-btn" id="retryBtn">Try Again</button>
        </div>
      `;
      this.shadowRoot.getElementById('retryBtn').onclick = () => {
        this.hasError = false;
        this.isLoading = true;
        this.updateUI();
        this.initialize();
      };
      return;
    }
    
    const queueGroups = this.store.getTasksGroupedByQueue();
    
    if (queueGroups.length === 0) {
      queueListEl.innerHTML = `
        <div class="cs-empty-state">
          <div class="cs-empty-icon">${ICONS.inbox}</div>
          <div class="cs-empty-title">No calls in queue</div>
          <div class="cs-empty-text">
            Calls will appear here automatically when they enter your configured queues.
          </div>
        </div>
      `;
      return;
    }
    
    queueListEl.innerHTML = queueGroups.map(group => this.renderQueueGroup(group)).join('');
    
    // Bind queue header click events
    queueListEl.querySelectorAll('.cs-queue-header').forEach(header => {
      header.onclick = () => this.toggleQueueCollapse(header.dataset.queueId);
    });
    
    // Bind claim button events
    queueListEl.querySelectorAll('.cs-claim-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this.claimTask(btn.dataset.taskId);
      };
    });
  }

  renderQueueGroup(group) {
    const isCollapsed = this.collapsedQueues.has(group.id);
    
    return `
      <div class="cs-queue-group ${isCollapsed ? 'collapsed' : ''}" data-queue-id="${group.id}">
        <div class="cs-queue-header" data-queue-id="${group.id}">
          <div class="cs-queue-name">
            ${ICONS.queue}
            <span>${group.name}</span>
          </div>
          <div class="cs-queue-count">
            ${group.queuedCount > 0 ? `<span class="cs-queue-badge queued">${group.queuedCount} waiting</span>` : ''}
            <span class="cs-queue-badge total">${group.totalCount} total</span>
            <span class="cs-queue-chevron">${ICONS.chevron}</span>
          </div>
        </div>
        <div class="cs-queue-tasks">
          ${group.tasks.map(task => this.renderTaskCard(task)).join('')}
        </div>
      </div>
    `;
  }

  renderTaskCard(task) {
    const status = this.store.normalizeStatus(task.status);
    const isClaimable = ['queued', 'created'].includes(task.status);
    const isClaiming = this.claimingTasks.has(task.id);
    const waitTime = formatDuration(Date.now() - task.createdTime);
    
    const callerInfo = task.callerInfo || {};
    const customFields = task.customFields || {};
    const callerName = customFields.customerName || parseCallerName(callerInfo.Headers) || callerInfo.callerName;
    const phoneNumber = formatPhoneNumber(task.origin);
    const priority = customFields.priority;
    
    // Determine priority class for styling
    let priorityClass = '';
    if (priority) {
      const p = priority.toString().toLowerCase();
      if (p === 'high' || p === '1' || p === 'urgent') priorityClass = 'priority-high';
      else if (p === 'medium' || p === '2' || p === 'normal') priorityClass = 'priority-medium';
    }
    
    return `
      <div class="cs-task-card ${isClaimable ? '' : 'faded'}" data-task-id="${task.id}">
        <div class="cs-task-header">
          <div class="cs-task-status ${status}">
            <span class="cs-task-status-dot"></span>
            ${capitalizeFirst(status)}
          </div>
          <div class="cs-task-time">${waitTime}</div>
        </div>
        <div class="cs-task-body">
          <div class="cs-task-main">
            <div class="cs-task-caller">
              <div class="cs-task-avatar ${priorityClass}">${ICONS.user}</div>
              <div class="cs-task-caller-info">
                <div class="cs-task-phone">${phoneNumber}</div>
                ${callerName ? `<div class="cs-task-name">${callerName}</div>` : ''}
              </div>
            </div>
            ${isClaimable ? `
              <button class="cs-claim-btn ${isClaiming ? 'loading' : ''}" 
                      data-task-id="${task.id}"
                      ${isClaiming ? 'disabled' : ''}>
                ${ICONS.target}
                <span>Claim</span>
              </button>
            ` : ''}
          </div>
          ${this.renderCustomFields(customFields)}
        </div>
      </div>
    `;
  }

  renderCustomFields(customFields) {
    if (!customFields || Object.keys(customFields).length === 0) {
      return '';
    }

    // Map of field names to display labels
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
    
    if (fieldsToShow.length === 0) {
      return '';
    }

    let priorityClass = '';
    if (customFields.priority) {
      const p = customFields.priority.toString().toLowerCase();
      if (p === 'high' || p === '1' || p === 'urgent') priorityClass = 'priority-high';
      else if (p === 'medium' || p === '2' || p === 'normal') priorityClass = 'priority-medium';
    }

    return `
      <div class="cs-task-fields">
        ${fieldsToShow.map(field => `
          <div class="cs-task-field ${field === 'priority' ? priorityClass : ''}">
            <span class="cs-task-field-label">${fieldLabels[field] || capitalizeFirst(field)}:</span>
            <span class="cs-task-field-value">${customFields[field]}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  updateWaitTimes() {
    // Update wait times without full re-render
    this.shadowRoot.querySelectorAll('.cs-task-card').forEach(card => {
      const taskId = card.dataset.taskId;
      const tasks = this.store.getFilteredTasks();
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
    const statusEl = this.shadowRoot.querySelector('.cs-connection-status');
    if (statusEl) {
      statusEl.className = `cs-connection-status ${this._socketConnected ? 'connected' : 'disconnected'}`;
      statusEl.innerHTML = `
        <span class="cs-connection-dot"></span>
        <span>${this._socketConnected ? 'Live' : 'Offline'}</span>
      `;
    }
  }

  updateRefreshIndicator() {
    const lastRefreshEl = this.shadowRoot.getElementById('lastRefresh');
    
    if (lastRefreshEl && this.lastRefresh) {
      const seconds = Math.floor((Date.now() - this.lastRefresh.getTime()) / 1000);
      lastRefreshEl.textContent = seconds < 5 ? 'Just now' : `${seconds}s ago`;
    }
  }
}

// Register custom element
customElements.define('call-selector-widget', CallSelectorWidget);

export default CallSelectorWidget;
