// 📄 server.js - SERVIDOR PRINCIPAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const sequelize = require('./src/config/database');
const redisClient = require('./src/config/redis');
const logger = require('./src/utils/logger');

const app = express();

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE BÁSICO
// ═══════════════════════════════════════════════════════════════════

// Compresión GZIP
app.use(compression());

// Seguridad con Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS - Permitir Backend 1 y Frontend
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',   // Frontend React
      'http://localhost:3001',   // Backend 1
      'http://localhost:5173',   // Vite dev
      'https://app.iasport.pe',
      'https://predictmaster.pe'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const isTestEnvironment = process.env.NODE_ENV === 'test';

const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: isTestEnvironment ? 1000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Demasiadas peticiones desde esta IP',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
  }
});

if (!isTestEnvironment) {
  app.use(globalLimiter);
}

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE DE AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════════
const authMiddleware = require('./src/middleware/auth.middleware');
app.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════
app.get('/health', async (req, res) => {
  try {
    // Verificar PostgreSQL
    await sequelize.authenticate();
    
    // Verificar Redis
    const redisStatus = redisClient.status === 'ready' ? 'connected' : 'disconnected';
    
    // Verificar API-Football
    const apiFootballStatus = process.env.API_FOOTBALL_KEY ? 'configured' : 'not configured';

    res.json({
      status: 'OK',
      service: process.env.APP_NAME,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      port: process.env.PORT,
      database: {
        status: 'connected',
        database: sequelize.config.database
      },
      cache: {
        redis: redisStatus
      },
      externalApi: {
        apiFootball: apiFootballStatus
      },
      features: {
        fixtures: true,
        odds: true,
        teams: true,
        leagues: true,
        analytics: false, // TODO: Implementar en módulos posteriores
        cache: redisStatus === 'connected'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      service: process.env.APP_NAME,
      timestamp: new Date().toISOString(),
      error: 'Service temporarily unavailable'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// RUTA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({
    message: 'PredictMaster Sports Backend API v1.0',
    service: 'Sports Data & Analytics',
    status: 'active',
    timestamp: new Date().toISOString(),
    apiDocs: '/docs',
    endpoints: {
      health: 'GET /health',
      // TODO: Agregar endpoints en módulos posteriores
      fixtures: {
        today: 'GET /api/fixtures/today',
        search: 'GET /api/fixtures/search'
      },
      teams: {
        search: 'GET /api/teams/search'
      },
      admin: {
        sync: 'POST /api/admin/sync'
      }
    },
    integrations: {
      apiFootball: process.env.API_FOOTBALL_KEY ? 'configured' : 'not configured',
      backend1: process.env.BACKEND_1_URL || 'not configured'
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// RUTAS DE LA API (TODO: Implementar en módulos posteriores)
// ═══════════════════════════════════════════════════════════════════
// app.use('/api/fixtures', require('./src/routes/fixtures.routes'));
// app.use('/api/teams', require('./src/routes/teams.routes'));
// app.use('/api/leagues', require('./src/routes/leagues.routes'));
// app.use('/api/odds', require('./src/routes/odds.routes'));
// app.use('/api/admin', require('./src/routes/admin.routes'));

// ═══════════════════════════════════════════════════════════════════
// MANEJO DE ERRORES
// ═══════════════════════════════════════════════════════════════════

// Ruta no encontrada
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.path,
    method: req.method,
    service: process.env.APP_NAME
  });
});

// Error handler global
app.use((err, req, res, next) => {
  logger.error('Global error handler:', err);
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
  
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: err.details
    });
  }
  
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    service: process.env.APP_NAME,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack 
    })
  });
});

// ═══════════════════════════════════════════════════════════════════
// INICIALIZACIÓN DEL SERVIDOR
// ═══════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3002;

const startServer = async () => {
  try {
    // Conectar a PostgreSQL
    await sequelize.authenticate();
    logger.info('✅ Conexión a PostgreSQL establecida');
    
    // Sincronizar modelos (sin alter en producción)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      logger.info('✅ Modelos sincronizados');
    }
    
    // Conectar a Redis
    if (redisClient.status !== 'ready') {
      // Redis se conecta automáticamente
      logger.info('🔄 Conectando a Redis...');
    } else {
      logger.info('✅ Redis conectado');
    }
    
    // TODO: Iniciar trabajos programados en módulos posteriores
    // require('./src/jobs/scheduler');
    
    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 ${process.env.APP_NAME} corriendo en puerto ${PORT}`);
      logger.info(`📚 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔐 JWT configurado: ${process.env.JWT_SECRET ? 'Sí' : 'No'}`);
      logger.info(`📡 API-Football: ${process.env.API_FOOTBALL_KEY ? 'Configurada' : 'NO configurada'}`);
      logger.info(`🗄️ Base de datos: ${sequelize.config.database}`);
      
      console.log('\n📍 Endpoints disponibles:');
      console.log(`   - Service Info: GET http://localhost:${PORT}/`);
      console.log(`   - Health Check: GET http://localhost:${PORT}/health`);
      console.log('\n💡 Usa Ctrl+C para detener el servidor');
      console.log('🎯 Próximo paso: Implementar MÓDULO 2 (Modelos)');
    });
    
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// ═══════════════════════════════════════════════════════════════════
// MANEJO DE CIERRE GRACEFUL
// ═══════════════════════════════════════════════════════════════════
process.on('SIGINT', async () => {
  logger.info('\n👋 Cerrando servidor...');
  try {
    await sequelize.close();
    redisClient.disconnect();
    logger.info('✅ Conexiones cerradas correctamente');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error al cerrar:', error);
    process.exit(1);
  }
});

process.on('unhandledRejection', (err) => {
  logger.error('❌ Promesa rechazada no manejada:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('❌ Excepción no capturada:', err);
  process.exit(1);
});

// Iniciar servidor
startServer();