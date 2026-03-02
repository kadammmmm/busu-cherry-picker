/**
 * Cherry Picker Backend Server v2.0
 * Production-ready Express + Socket.IO server for WxCC Cherry Picker widget
 * 
 * @author B+S Solutions
 * @version 2.0.0
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import http from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// =============================================================================
// CONFIGURATION
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG = {
  port: process.env.PORT || 5000,
  hostUri: process.env.HOST_URI || `http://localhost:${process.env.PORT || 5000}`,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'https://desktop.wxcc-us1.cisco.com',
    'https://desktop.wxcc-eu1.cisco.com',
    'https://desktop.wxcc-eu2.cisco.com',
    'https://desktop.wxcc-anz1.cisco.com',
    'https://desktop.wxcc-ca1.cisco.com',
    'https://desktop.wxcc-jp1.cisco.com',
    'https://desktop.wxcc-sg1.cisco.com'
  ],
  cacheTtl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour in seconds
  logLevel: process.env.LOG_LEVEL || 'info'
};

// =============================================================================
// LOGGER
// =============================================================================

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLogLevel = LOG_LEVELS[CONFIG.logLevel] ?? LOG_LEVELS.info;

const logger = {
  _log(level, ...args) {
    if (LOG_LEVELS[level] <= currentLogLevel) {
      const timestamp = new Date().toISOString();
      console[level === 'debug' ? 'log' : level](`[${timestamp}] [${level.toUpperCase()}]`, ...args);
    }
  },
  error: (...args) => logger._log('error', ...args),
  warn: (...args) => logger._log('warn', ...args),
  info: (...args) => logger._log('info', ...args),
  debug: (...args) => logger._log('debug', ...args)
};

// =============================================================================
// IN-MEMORY CACHE (with TTL)
// =============================================================================

class TTLCache {
  constructor(defaultTtl = 3600000) {
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
    
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  set(key, value, ttl = this.defaultTtl) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
    logger.debug(`Cache SET: ${key}, expires in ${ttl}ms`);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  has(key) {
    return this.get(key) !== null;
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  stats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// =============================================================================
// EXPRESS APP SETUP
// =============================================================================

const app = express();
const server = http.createServer(app);

// Initialize cache
const callerIdCache = new TTLCache(CONFIG.cacheTtl * 1000);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "wss:", "https:"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = CONFIG.corsOrigins.some(allowed => {
      if (allowed === '*') return true;
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        return origin.endsWith(domain);
      }
      return origin === allowed;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Static files
app.use(express.static(join(__dirname, 'src')));
app.use('/build', express.static(join(__dirname, 'src/build')));
app.use('/img', express.static(join(__dirname, 'public/img')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// =============================================================================
// SOCKET.IO SETUP
// =============================================================================

const io = new Server(server, {
  cors: {
    origin: CONFIG.corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Socket connection tracking
const connectedAgents = new Map();

io.on('connection', (socket) => {
  const { agentId, agentName, orgId } = socket.handshake.auth;
  
  logger.info(`Socket connected: ${socket.id} (agent: ${agentName || 'unknown'})`);
  
  // Store agent connection info
  connectedAgents.set(socket.id, {
    agentId,
    agentName,
    orgId,
    connectedAt: new Date()
  });

  // Join org-specific room for targeted broadcasts
  if (orgId) {
    socket.join(orgId);
    logger.debug(`Socket ${socket.id} joined room: ${orgId}`);
  }

  // Handle incoming messages from client
  socket.on('message', (msg) => {
    logger.debug(`Message from ${socket.id}:`, msg);
  });

  // Handle ping for connection health
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    connectedAgents.delete(socket.id);
    logger.info(`Socket disconnected: ${socket.id} (reason: ${reason})`);
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error(`Socket error ${socket.id}:`, error);
  });
});

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
    connections: {
      websocket: connectedAgents.size,
      rooms: io.sockets.adapter.rooms.size
    },
    cache: callerIdCache.stats(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  };
  
  res.json(health);
});

/**
 * Ready check for container orchestration
 */
app.get('/ready', (req, res) => {
  res.status(200).send('OK');
});

/**
 * Receive new call data from WxCC Flow HTTP Request
 * This endpoint caches caller ID info and broadcasts to connected agents
 */
app.post('/', (req, res) => {
  try {
    const callData = req.body;
    
    logger.debug('Received call data:', JSON.stringify(callData, null, 2));
    
    if (!callData?.InteractionId) {
      logger.warn('Missing InteractionId in request body');
      return res.status(400).json({ error: 'InteractionId is required' });
    }

    // Validate required fields
    const requiredFields = ['ANI', 'DNIS', 'OrgId'];
    const missingFields = requiredFields.filter(f => !callData[f]);
    
    if (missingFields.length > 0) {
      logger.warn(`Missing fields: ${missingFields.join(', ')}`);
    }

    // Cache the caller ID data
    callerIdCache.set(callData.InteractionId, {
      ...callData,
      receivedAt: new Date().toISOString()
    });

    // Broadcast to agents in the same org
    if (callData.OrgId) {
      io.to(callData.OrgId).emit('message', callData);
      logger.info(`Broadcasted call ${callData.InteractionId} to org ${callData.OrgId}`);
    }

    res.status(200).json({ 
      success: true, 
      interactionId: callData.InteractionId 
    });

  } catch (error) {
    logger.error('Error processing call data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Retrieve caller ID data for multiple tasks
 */
app.post('/callerIds', cors(corsOptions), (req, res) => {
  try {
    const { taskIds } = req.body;
    
    logger.debug(`CallerIds request for ${taskIds?.length || 0} tasks`);

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'taskIds array is required' });
    }

    // Limit request size
    if (taskIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 taskIds per request' });
    }

    const results = taskIds.map(taskId => {
      const cached = callerIdCache.get(taskId);
      return cached || { InteractionId: taskId, cached: false };
    });

    logger.debug(`Returning ${results.filter(r => r.cached !== false).length}/${taskIds.length} cached callerIds`);

    res.json(results);

  } catch (error) {
    logger.error('Error fetching callerIds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get cache statistics (admin endpoint)
 */
app.get('/admin/cache', (req, res) => {
  // In production, add authentication here
  res.json(callerIdCache.stats());
});

/**
 * Get connected agents (admin endpoint)
 */
app.get('/admin/connections', (req, res) => {
  // In production, add authentication here
  const connections = Array.from(connectedAgents.entries()).map(([id, info]) => ({
    socketId: id,
    ...info
  }));
  
  res.json({
    count: connections.length,
    connections
  });
});

/**
 * Clear cache (admin endpoint)
 */
app.post('/admin/cache/clear', (req, res) => {
  // In production, add authentication here
  callerIdCache.cache.clear();
  logger.info('Cache cleared by admin request');
  res.json({ success: true, message: 'Cache cleared' });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: CONFIG.nodeEnv === 'production' ? 'Internal server error' : err.message
  });
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    io.close(() => {
      logger.info('Socket.IO server closed');
      callerIdCache.destroy();
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// =============================================================================
// START SERVER
// =============================================================================

server.listen(CONFIG.port, () => {
  logger.info('='.repeat(50));
  logger.info('Cherry Picker Server v2.0.0');
  logger.info('='.repeat(50));
  logger.info(`Environment: ${CONFIG.nodeEnv}`);
  logger.info(`Port: ${CONFIG.port}`);
  logger.info(`Host URI: ${CONFIG.hostUri}`);
  logger.info(`CORS Origins: ${CONFIG.corsOrigins.join(', ')}`);
  logger.info(`Cache TTL: ${CONFIG.cacheTtl}s`);
  logger.info('='.repeat(50));
});

export { app, server, io };
