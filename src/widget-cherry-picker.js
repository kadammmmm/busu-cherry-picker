/**
 * Cherry Picker Widget v2.0
 * A production-ready WxCC voice queue cherry-picking widget
 * 
 * @author B+S Solutions
 * @version 2.0.0
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
  maxTaskAge: 600, // 10 minutes in seconds
  showCompleted: true,
  showAbandoned: true,
  region: 'us1'
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
    --cp-primary: #00bceb;
    --cp-primary-hover: #00a0c7;
    --cp-primary-active: #008fb3;
    
    --cp-success: #00c853;
    --cp-success-bg: rgba(0, 200, 83, 0.12);
    --cp-warning: #ffab00;
    --cp-warning-bg: rgba(255, 171, 0, 0.12);
    --cp-danger: #ff5252;
    --cp-danger-bg: rgba(255, 82, 82, 0.12);
    --cp-muted: #9e9e9e;
    --cp-muted-bg: rgba(158, 158, 158, 0.12);
    
    --cp-bg-primary: #ffffff;
    --cp-bg-secondary: #f8f9fa;
    --cp-bg-card: #ffffff;
    --cp-bg-hover: #f5f5f5;
    
    --cp-border: #e0e0e0;
    --cp-border-light: #f0f0f0;
    
    --cp-text-primary: #212121;
    --cp-text-secondary: #616161;
    --cp-text-muted: #9e9e9e;
    
    --cp-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
    --cp-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
    --cp-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
    
    --cp-radius-sm: 6px;
    --cp-radius-md: 10px;
    --cp-radius-lg: 14px;
    
    --cp-transition: 200ms ease;
    
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: var(--cp-text-primary);
  }

  :host([darkmode="true"]) {
    --cp-bg-primary: #1a1a1a;
    --cp-bg-secondary: #242424;
    --cp-bg-card: #2d2d2d;
    --cp-bg-hover: #363636;
    
    --cp-border: #404040;
    --cp-border-light: #333333;
    
    --cp-text-primary: #ffffff;
    --cp-text-secondary: #b0b0b0;
    --cp-text-muted: #757575;
    
    --cp-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
    --cp-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
    --cp-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .cherry-picker {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--cp-bg-primary);
    overflow: hidden;
  }

  /* =========== HEADER =========== */
  .cp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: var(--cp-bg-secondary);
    border-bottom: 1px solid var(--cp-border-light);
  }

  .cp-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cp-branding {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .cp-logo {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, var(--cp-primary) 0%, #0095d9 100%);
    border-radius: var(--cp-radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cp-logo svg {
    width: 18px;
    height: 18px;
    fill: white;
  }

  .cp-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--cp-text-primary);
    letter-spacing: -0.3px;
  }

  .cp-powered-by {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--cp-text-muted);
  }

  .cp-bs-text {
    font-weight: 600;
    color: #1a4b7a;
    letter-spacing: -0.3px;
  }

  :host([darkmode="true"]) .cp-bs-text {
    color: #5a9fd4;
  }

  .cp-plus {
    color: #e31937;
    font-weight: 700;
  }

  .cp-subtitle {
    font-size: 12px;
    color: var(--cp-text-muted);
  }

  .cp-connection-status {
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

  .cp-connection-status.connected {
    background: var(--cp-success-bg);
    color: var(--cp-success);
  }

  .cp-connection-status.disconnected {
    background: var(--cp-danger-bg);
    color: var(--cp-danger);
  }

  .cp-connection-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .cp-connection-status.connected .cp-connection-dot {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* =========== FILTERS =========== */
  .cp-filters {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--cp-bg-primary);
    border-bottom: 1px solid var(--cp-border-light);
    flex-wrap: wrap;
  }

  .cp-filter-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--cp-bg-secondary);
    border: 1px solid var(--cp-border);
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    color: var(--cp-text-secondary);
    cursor: pointer;
    transition: all var(--cp-transition);
    user-select: none;
  }

  .cp-filter-chip:hover {
    background: var(--cp-bg-hover);
    border-color: var(--cp-primary);
  }

  .cp-filter-chip.active {
    background: var(--cp-primary);
    border-color: var(--cp-primary);
    color: white;
  }

  .cp-filter-chip .count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 9px;
    font-size: 10px;
    font-weight: 600;
  }

  .cp-filter-chip.active .count {
    background: rgba(255, 255, 255, 0.25);
  }

  .cp-filter-chip.queued.active { background: var(--cp-success); border-color: var(--cp-success); }
  .cp-filter-chip.assigned.active { background: var(--cp-warning); border-color: var(--cp-warning); }
  .cp-filter-chip.abandoned.active { background: var(--cp-danger); border-color: var(--cp-danger); }
  .cp-filter-chip.completed.active { background: var(--cp-muted); border-color: var(--cp-muted); }

  /* =========== TASK LIST =========== */
  .cp-task-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .cp-task-list::-webkit-scrollbar {
    width: 6px;
  }

  .cp-task-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .cp-task-list::-webkit-scrollbar-thumb {
    background: var(--cp-border);
    border-radius: 3px;
  }

  .cp-task-list::-webkit-scrollbar-thumb:hover {
    background: var(--cp-text-muted);
  }

  /* =========== TASK CARD =========== */
  .cp-task-card {
    background: var(--cp-bg-card);
    border: 1px solid var(--cp-border-light);
    border-radius: var(--cp-radius-md);
    box-shadow: var(--cp-shadow-sm);
    overflow: hidden;
    transition: all var(--cp-transition);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .cp-task-card:hover {
    box-shadow: var(--cp-shadow-md);
    border-color: var(--cp-border);
  }

  .cp-task-card.faded {
    opacity: 0.6;
  }

  .cp-task-card.faded:hover {
    opacity: 0.8;
  }

  .cp-task-card.hidden {
    display: none;
  }

  .cp-task-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--cp-border-light);
  }

  .cp-task-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .cp-task-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .cp-task-status.queued { color: var(--cp-success); }
  .cp-task-status.queued .cp-task-status-dot { background: var(--cp-success); }
  
  .cp-task-status.assigned { color: var(--cp-warning); }
  .cp-task-status.assigned .cp-task-status-dot { background: var(--cp-warning); }
  
  .cp-task-status.abandoned { color: var(--cp-danger); }
  .cp-task-status.abandoned .cp-task-status-dot { background: var(--cp-danger); }
  
  .cp-task-status.completed { color: var(--cp-muted); }
  .cp-task-status.completed .cp-task-status-dot { background: var(--cp-muted); }

  .cp-task-time {
    font-size: 12px;
    color: var(--cp-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .cp-task-body {
    padding: 16px;
  }

  .cp-task-caller {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  .cp-task-avatar {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--cp-primary) 0%, #0095d9 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .cp-task-avatar svg {
    width: 20px;
    height: 20px;
    fill: white;
  }

  .cp-task-caller-info {
    flex: 1;
    min-width: 0;
  }

  .cp-task-phone {
    font-size: 16px;
    font-weight: 600;
    color: var(--cp-text-primary);
    margin-bottom: 2px;
  }

  .cp-task-name {
    font-size: 13px;
    color: var(--cp-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cp-task-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .cp-task-meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--cp-text-secondary);
  }

  .cp-task-meta-item svg {
    width: 14px;
    height: 14px;
    fill: var(--cp-text-muted);
  }

  .cp-task-actions {
    display: flex;
    justify-content: flex-end;
  }

  .cp-claim-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--cp-success);
    color: white;
    border: none;
    border-radius: var(--cp-radius-sm);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--cp-transition);
  }

  .cp-claim-btn:hover {
    background: #00b048;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 200, 83, 0.3);
  }

  .cp-claim-btn:active {
    transform: translateY(0);
  }

  .cp-claim-btn:disabled {
    background: var(--cp-border);
    color: var(--cp-text-muted);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .cp-claim-btn svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .cp-claim-btn.loading {
    position: relative;
    color: transparent;
  }

  .cp-claim-btn.loading::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border: 2px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* =========== EMPTY STATE =========== */
  .cp-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
  }

  .cp-empty-icon {
    width: 80px;
    height: 80px;
    margin-bottom: 20px;
    background: var(--cp-bg-secondary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cp-empty-icon svg {
    width: 36px;
    height: 36px;
    fill: var(--cp-text-muted);
  }

  .cp-empty-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--cp-text-primary);
    margin-bottom: 8px;
  }

  .cp-empty-text {
    font-size: 13px;
    color: var(--cp-text-secondary);
    max-width: 280px;
    line-height: 1.5;
  }

  /* =========== LOADING STATE =========== */
  .cp-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
  }

  .cp-loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--cp-border);
    border-top-color: var(--cp-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  .cp-loading-text {
    font-size: 13px;
    color: var(--cp-text-secondary);
  }

  /* =========== ERROR STATE =========== */
  .cp-error-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
  }

  .cp-error-icon {
    width: 60px;
    height: 60px;
    margin-bottom: 16px;
    background: var(--cp-danger-bg);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cp-error-icon svg {
    width: 28px;
    height: 28px;
    fill: var(--cp-danger);
  }

  .cp-error-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--cp-text-primary);
    margin-bottom: 8px;
  }

  .cp-error-text {
    font-size: 13px;
    color: var(--cp-text-secondary);
    margin-bottom: 20px;
    max-width: 280px;
    line-height: 1.5;
  }

  .cp-retry-btn {
    padding: 10px 24px;
    background: var(--cp-primary);
    color: white;
    border: none;
    border-radius: var(--cp-radius-sm);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--cp-transition);
  }

  .cp-retry-btn:hover {
    background: var(--cp-primary-hover);
  }

  /* =========== FOOTER =========== */
  .cp-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: var(--cp-bg-secondary);
    border-top: 1px solid var(--cp-border-light);
    font-size: 11px;
    color: var(--cp-text-muted);
  }

  .cp-footer-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cp-refresh-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .cp-refresh-indicator svg {
    width: 12px;
    height: 12px;
    fill: currentColor;
  }

  .cp-refresh-indicator.refreshing svg {
    animation: spin 1s linear infinite;
  }
`;

// =============================================================================
// SVG ICONS
// =============================================================================

const ICONS = {
  phone: `<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`,
  
  queue: `<svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg>`,
  
  clock: `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
  
  check: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
  
  target: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>`,
  
  inbox: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.56c.69 1.19 1.97 2 3.45 2s2.75-.81 3.45-2H19v3zm0-5h-4.99c0 1.1-.9 2-2 2s-2-.9-2-2H5V5h14v9z"/></svg>`,
  
  warning: `<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  
  refresh: `<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
  
  user: `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
};

// =============================================================================
// UTILITIES
// =============================================================================

class Logger {
  constructor(prefix = 'cherry-picker') {
    this.prefix = prefix;
    this.isDev = process.env.NODE_ENV !== 'production';
  }

  _log(level, ...args) {
    if (!this.isDev && level === 'debug') return;
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [${this.prefix}]`, ...args);
  }

  debug(...args) { this._log('debug', ...args); }
  info(...args) { this._log('info', ...args); }
  warn(...args) { this._log('warn', ...args); }
  error(...args) { this._log('error', ...args); }
}

const logger = new Logger();

function formatPhoneNumber(phone) {
  if (!phone) return 'Unknown';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function parseCallerName(headers) {
  if (!headers) return null;
  try {
    const match = headers.match(/caller_id_name=([^}]+)/);
    return match ? match[1].trim() : null;
  } catch (e) {
    return null;
  }
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

class TaskStore {
  constructor() {
    this.tasks = new Map();
    this.callerIds = new Map();
    this.filters = {
      queued: true,
      assigned: true,
      abandoned: true,
      completed: true
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
      filters: { ...this.filters }
    };
  }

  setTask(id, task) {
    this.tasks.set(id, { id, ...task });
    this.notify();
  }

  removeTask(id) {
    this.tasks.delete(id);
    this.callerIds.delete(id);
    this.notify();
  }

  setCallerId(id, data) {
    this.callerIds.set(id, data);
    this.notify();
  }

  setFilter(key, value) {
    this.filters[key] = value;
    this.notify();
  }

  getFilteredTasks() {
    const { tasks, filters, callerIds } = this.getState();
    return tasks
      .filter(task => {
        // Only show tasks that have been assigned to a queue
        if (!task.queue?.id && !task.queue?.name) {
          return false;
        }
        const status = this.normalizeStatus(task.status);
        return filters[status];
      })
      .map(task => ({
        ...task,
        callerInfo: callerIds.get(task.id)
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
      // Only count tasks that have been assigned to a queue
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

    // Handle empty response (204 No Content or empty body)
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
      logger.error('Failed to fetch caller IDs:', error);
      return taskIds.map(id => ({ InteractionId: id }));
    }
  }
}

// =============================================================================
// MAIN WIDGET COMPONENT
// =============================================================================

class CherryPickerWidget extends HTMLElement {
  static get observedAttributes() {
    return ['darkmode', 'region', 'refreshinterval'];
  }

  constructor() {
    super();
    
    this.attachShadow({ mode: 'open' });
    this.store = new TaskStore();
    this.socket = null;
    this.pollInterval = null;
    this._socketConnected = false;
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.lastRefresh = null;
    this.claimingTasks = new Set();

    this.config = { ...DEFAULT_CONFIG };
    
    this.render();
    this.loadFiltersFromCookies();
    
    this.store.subscribe(() => this.updateUI());
  }

  connectedCallback() {
    logger.info('Cherry Picker widget connected');
    this.initialize();
  }

  disconnectedCallback() {
    logger.info('Cherry Picker widget disconnected');
    this.cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'darkmode':
        this.render();
        break;
      case 'region':
        this.config.region = newValue;
        this.initializeServices();
        break;
      case 'refreshinterval':
        this.config.refreshInterval = parseInt(newValue) || DEFAULT_CONFIG.refreshInterval;
        this.restartPolling();
        break;
    }
  }

  async initialize() {
    try {
      Desktop.config.init();
      
      // Store references
      window.myAgentService = Desktop.agentContact.SERVICE;
      
      // Get agent details
      const agentDetails = await Desktop.agentContact.SERVICE.webex.fetchPersonData("me");
      window.agentDetails = agentDetails;
      
      // Initialize services
      this.initializeServices();
      
      // Setup event listeners
      this.setupDesktopEvents();
      
      // Initialize socket connection
      this.initializeSocket();
      
      // Start polling
      this.startPolling();
      
      this.isLoading = false;
      this.updateUI();
      
    } catch (error) {
      logger.error('Initialization failed:', error);
      this.handleError('Failed to initialize widget');
    }
  }

  initializeServices() {
    // Get host URI from widget attribute, environment, or default to Render deployment
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
    // Get host URI from widget attribute, environment, or default to Render deployment
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
    // Store caller ID info
    this.store.setCallerId(data.InteractionId, data);
    
    // Create task object
    const task = {
      status: 'created',
      origin: data.ANI,
      queue: { name: data.DNIS },
      createdTime: Date.now(),
      lastUpdatedTime: Date.now()
    };
    
    this.store.setTask(data.InteractionId, task);
  }

  startPolling() {
    // Initial fetch
    this.fetchTasks();
    
    // Set up interval
    this.pollInterval = setInterval(
      () => this.fetchTasks(),
      this.config.refreshInterval * 1000
    );
  }

  restartPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.startPolling();
  }

  async fetchTasks() {
    try {
      const pastSeconds = this.config.maxTaskAge;
      const fromEpoch = Date.now() - (pastSeconds * 1000);
      
      const response = await this.apiService.getTasks(fromEpoch);
      
      if (response?.data?.length > 0) {
        await this.processTasks(response.data, fromEpoch);
      }
      
      // Remove stale tasks
      this.removeOldTasks(fromEpoch);
      
      this.lastRefresh = new Date();
      this.hasError = false;
      this.updateUI();
      
    } catch (error) {
      logger.error('Failed to fetch tasks:', error);
      this.handleError('Failed to load queue data');
    }
  }

  async processTasks(tasksData, fromEpoch) {
    const missingCallerIds = [];
    
    for (const item of tasksData) {
      const task = item.attributes;
      this.store.setTask(item.id, task);
      
      if (!this.store.callerIds.has(item.id)) {
        missingCallerIds.push(item.id);
      }
    }
    
    // Fetch missing caller IDs
    if (missingCallerIds.length > 0) {
      const callerData = await this.callerIdService.fetchCallerIds(missingCallerIds);
      for (const caller of callerData) {
        if (caller.InteractionId) {
          this.store.setCallerId(caller.InteractionId, caller);
        }
      }
    }
  }

  removeOldTasks(fromEpoch) {
    const { tasks } = this.store.getState();
    for (const task of tasks) {
      if (task.lastUpdatedTime < fromEpoch) {
        this.store.removeTask(task.id);
      }
    }
  }

  async claimTask(taskId) {
    if (this.claimingTasks.has(taskId)) return;
    
    this.claimingTasks.add(taskId);
    this.updateUI();
    
    try {
      logger.info('Attempting to claim task:', taskId);
      
      // Use exact same approach as Cisco's widget
      const assignResp = await fetch(`https://api.wxcc-us1.cisco.com/v1/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.myAgentService.webex.token.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      logger.info('Claim response status:', assignResp.status);
      
      // Remove from claiming set after a delay to let polling update the status
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
      const saved = this.getCookie(status);
      if (saved !== null) {
        this.store.setFilter(status, saved === 'true');
      }
    });
  }

  toggleFilter(status) {
    const current = this.store.filters[status];
    this.store.setFilter(status, !current);
    this.setCookie(status, !current);
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
      <div class="cherry-picker">
        <div class="cp-header">
          <div class="cp-header-left">
            <div class="cp-branding">
              <div class="cp-title">Cherry Picker</div>
              <div class="cp-powered-by">
                powered by <span class="cp-bs-text">bucher<span class="cp-plus">+</span>suter</span>
              </div>
            </div>
          </div>
          <div class="cp-connection-status ${this._socketConnected ? 'connected' : 'disconnected'}">
            <span class="cp-connection-dot"></span>
            <span>${this._socketConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
        
        <div class="cp-filters" id="filters"></div>
        
        <div class="cp-task-list" id="taskList"></div>
        
        <div class="cp-footer">
          <div class="cp-footer-left">
            <div class="cp-refresh-indicator" id="refreshIndicator">
              ${ICONS.refresh}
              <span id="lastRefresh">Refreshing...</span>
            </div>
          </div>
          <div>v2.0.0</div>
        </div>
      </div>
    `;
    
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.bindEvents();
    this.updateUI();
  }

  bindEvents() {
    // Filter clicks are handled via delegation in updateFilters
  }

  updateUI() {
    this.updateFilters();
    this.updateTaskList();
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
        <div class="cp-filter-chip ${status} ${filters[status] ? 'active' : ''}" 
             data-filter="${status}">
          ${capitalizeFirst(status)}
          <span class="count">${counts[status]}</span>
        </div>
      `).join('');
    
    // Bind click events
    filtersEl.querySelectorAll('.cp-filter-chip').forEach(chip => {
      chip.onclick = () => this.toggleFilter(chip.dataset.filter);
    });
  }

  updateTaskList() {
    const taskListEl = this.shadowRoot.getElementById('taskList');
    if (!taskListEl) return;
    
    if (this.isLoading) {
      taskListEl.innerHTML = `
        <div class="cp-loading">
          <div class="cp-loading-spinner"></div>
          <div class="cp-loading-text">Loading queue data...</div>
        </div>
      `;
      return;
    }
    
    if (this.hasError) {
      taskListEl.innerHTML = `
        <div class="cp-error-state">
          <div class="cp-error-icon">${ICONS.warning}</div>
          <div class="cp-error-title">Connection Error</div>
          <div class="cp-error-text">${this.errorMessage}</div>
          <button class="cp-retry-btn" id="retryBtn">Try Again</button>
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
    
    const tasks = this.store.getFilteredTasks();
    
    if (tasks.length === 0) {
      taskListEl.innerHTML = `
        <div class="cp-empty-state">
          <div class="cp-empty-icon">${ICONS.inbox}</div>
          <div class="cp-empty-title">No calls in queue</div>
          <div class="cp-empty-text">
            Calls will appear here automatically when they enter your configured queues.
          </div>
        </div>
      `;
      return;
    }
    
    // Smart update: only update changed tasks to prevent flickering
    const existingCards = taskListEl.querySelectorAll('.cp-task-card');
    const existingTaskIds = new Set(Array.from(existingCards).map(c => c.dataset.taskId));
    const newTaskIds = new Set(tasks.map(t => t.id));
    
    // Remove cards that no longer exist
    existingCards.forEach(card => {
      if (!newTaskIds.has(card.dataset.taskId)) {
        card.remove();
      }
    });
    
    // Update or add cards
    tasks.forEach((task, index) => {
      const existingCard = taskListEl.querySelector(`[data-task-id="${task.id}"]`);
      
      if (existingCard) {
        // Update only the dynamic parts (time, status) without replacing entire card
        this.updateTaskCardInPlace(existingCard, task);
      } else {
        // Insert new card at correct position
        const newCardHtml = this.renderTaskCard(task);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newCardHtml;
        const newCard = tempDiv.firstElementChild;
        
        const nextSibling = taskListEl.children[index];
        if (nextSibling) {
          taskListEl.insertBefore(newCard, nextSibling);
        } else {
          taskListEl.appendChild(newCard);
        }
        
        // Bind claim button event for new card
        const claimBtn = newCard.querySelector('.cp-claim-btn');
        if (claimBtn) {
          claimBtn.onclick = () => this.claimTask(claimBtn.dataset.taskId);
        }
      }
    });
  }

  updateTaskCardInPlace(card, task) {
    // Update time display
    const timeEl = card.querySelector('.cp-task-time');
    if (timeEl) {
      timeEl.textContent = formatDuration(Date.now() - task.createdTime);
    }
    
    // Update wait time in meta
    const waitMeta = card.querySelectorAll('.cp-task-meta-item')[1];
    if (waitMeta) {
      const span = waitMeta.querySelector('span');
      if (span) span.textContent = `Wait: ${formatDuration(Date.now() - task.createdTime)}`;
    }
    
    // Update status if changed
    const statusEl = card.querySelector('.cp-task-status');
    const currentStatus = this.store.normalizeStatus(task.status);
    if (statusEl && !statusEl.classList.contains(currentStatus)) {
      statusEl.className = `cp-task-status ${currentStatus}`;
      statusEl.innerHTML = `<span class="cp-task-status-dot"></span>${capitalizeFirst(currentStatus)}`;
    }
    
    // Update claiming state
    const isClaiming = this.claimingTasks.has(task.id);
    const claimBtn = card.querySelector('.cp-claim-btn');
    if (claimBtn) {
      claimBtn.classList.toggle('loading', isClaiming);
      claimBtn.disabled = isClaiming;
    }
    
    // Update faded state based on claimability
    const isClaimable = ['queued', 'created'].includes(task.status);
    card.classList.toggle('faded', !isClaimable);
  }

  renderTaskCard(task) {
    const status = this.store.normalizeStatus(task.status);
    const isClaimable = ['queued', 'created'].includes(task.status);
    const isClaiming = this.claimingTasks.has(task.id);
    const waitTime = formatDuration(Date.now() - task.createdTime);
    
    const callerInfo = task.callerInfo || {};
    const callerName = parseCallerName(callerInfo.Headers) || callerInfo.callerName;
    const phoneNumber = formatPhoneNumber(task.origin);
    const queueName = task.queue?.name || 'Unknown Queue';
    
    return `
      <div class="cp-task-card ${isClaimable ? '' : 'faded'}" data-task-id="${task.id}">
        <div class="cp-task-header">
          <div class="cp-task-status ${status}">
            <span class="cp-task-status-dot"></span>
            ${capitalizeFirst(status)}
          </div>
          <div class="cp-task-time">${waitTime}</div>
        </div>
        <div class="cp-task-body">
          <div class="cp-task-caller">
            <div class="cp-task-avatar">${ICONS.user}</div>
            <div class="cp-task-caller-info">
              <div class="cp-task-phone">${phoneNumber}</div>
              ${callerName ? `<div class="cp-task-name">${callerName}</div>` : ''}
            </div>
          </div>
          <div class="cp-task-meta">
            <div class="cp-task-meta-item">
              ${ICONS.queue}
              <span>${queueName}</span>
            </div>
            <div class="cp-task-meta-item">
              ${ICONS.clock}
              <span>Wait: ${waitTime}</span>
            </div>
          </div>
          ${isClaimable ? `
            <div class="cp-task-actions">
              <button class="cp-claim-btn ${isClaiming ? 'loading' : ''}" 
                      data-task-id="${task.id}"
                      ${isClaiming ? 'disabled' : ''}>
                ${ICONS.target}
                <span>Claim Call</span>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  updateConnectionStatus() {
    const statusEl = this.shadowRoot.querySelector('.cp-connection-status');
    if (statusEl) {
      statusEl.className = `cp-connection-status ${this._socketConnected ? 'connected' : 'disconnected'}`;
      statusEl.innerHTML = `
        <span class="cp-connection-dot"></span>
        <span>${this._socketConnected ? 'Live' : 'Offline'}</span>
      `;
    }
  }

  updateRefreshIndicator() {
    const indicatorEl = this.shadowRoot.getElementById('refreshIndicator');
    const lastRefreshEl = this.shadowRoot.getElementById('lastRefresh');
    
    if (lastRefreshEl && this.lastRefresh) {
      const seconds = Math.floor((Date.now() - this.lastRefresh.getTime()) / 1000);
      lastRefreshEl.textContent = seconds < 5 ? 'Just now' : `${seconds}s ago`;
    }
  }
}

// Register custom element
customElements.define('cherry-picker-widget', CherryPickerWidget);

export default CherryPickerWidget;
