// 📄 server.js - SERVIDOR PRINCIPAL CON REDIS HEALTH CHECK MEJORADO
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
// HEALTH CHECK MEJORADO CON TEST REAL DE REDIS
// ═══════════════════════════════════════════════════════════════════
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      service: process.env.APP_NAME,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      port: process.env.PORT
    };

    // ✅ VERIFICAR POSTGRESQL
    try {
      await sequelize.authenticate();
      healthStatus.database = {
        status: 'connected',
        database: sequelize.config.database
      };
    } catch (dbError) {
      healthStatus.database = {
        status: 'disconnected',
        error: dbError.message
      };
      healthStatus.status = 'DEGRADED';
    }

    // ✅ VERIFICAR REDIS CON TEST REAL
    try {
      const redisHealth = await redisClient.testConnection();
      
      healthStatus.cache = {
        redis: redisHealth.status === 'healthy' ? 'connected' : 'disconnected',
        ping: redisHealth.ping || null,
        pingTime: redisHealth.pingTime || null,
        readWrite: redisHealth.readWrite || null
      };
      
      if (redisHealth.status !== 'healthy') {
        healthStatus.status = 'DEGRADED';
        healthStatus.cache.error = redisHealth.error;
      }
      
    } catch (redisError) {
      healthStatus.cache = {
        redis: 'disconnected',
        error: redisError.message
      };
      healthStatus.status = 'DEGRADED';
    }

    // ✅ VERIFICAR API-FOOTBALL
    const apiFootballStatus = process.env.API_FOOTBALL_KEY ? 'configured' : 'not configured';
    healthStatus.externalApi = {
      apiFootball: apiFootballStatus
    };

    // ✅ FEATURES DISPONIBLES
    healthStatus.features = {
      fixtures: true,
      odds: true,
      teams: true,
      leagues: true,
      analytics: false, // TODO: Implementar en módulos posteriores
      cache: healthStatus.cache.redis === 'connected'
    };

    // Determinar status code según el estado
    const statusCode = healthStatus.status === 'OK' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      service: process.env.APP_NAME,
      timestamp: new Date().toISOString(),
      error: 'Service temporarily unavailable',
      details: error.message
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
      backend1: process.env.BACKEND_1_URL || 'not configured',
      redis: redisClient.isHealthy() ? 'connected' : 'connecting'
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// RUTAS DE LA API (TODO: Implementar en módulos posteriores)
// ═══════════════════════════════════════════════════════════════════
   app.use('/api/fixtures', require('./src/routes/fixtures.routes'));
// app.use('/api/teams', require('./src/routes/teams.routes'));
   app.use('/api/leagues', require('./src/routes/leagues.routes'));
   app.use('/api/odds', require('./src/routes/odds.routes'));
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
// INICIALIZACIÓN DEL SERVIDOR CON VERIFICACIÓN DE REDIS
// ═══════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3002;

const startServer = async () => {
  try {
    // ✅ CONECTAR A POSTGRESQL
    await sequelize.authenticate();
    logger.info('✅ Conexión a PostgreSQL establecida');
    
    // ✅ SINCRONIZAR MODELOS
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      logger.info('✅ Modelos sincronizados');
    }
    
    // ✅ ESPERAR A QUE REDIS ESTÉ LISTO
    console.log('🔄 Verificando conexión Redis...');
    
    try {
      // Esperar hasta 15 segundos para que Redis esté listo
      await Promise.race([
        redisClient.ensureConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout esperando Redis')), 15000)
        )
      ]);
      
      if (redisClient.isHealthy()) {
        logger.info('✅ Redis conectado y verificado');
      } else {
        logger.warn('⚠️ Redis no está completamente listo, pero continuando...');
      }
      
    } catch (redisError) {
      logger.warn('⚠️ Redis no disponible al inicio:', redisError.message);
      logger.info('🔄 El servidor continuará y Redis se conectará en background');
    }
    
    // TODO: Iniciar trabajos programados en módulos posteriores
    // require('./src/jobs/scheduler');
    
    // ✅ INICIAR SERVIDOR
    app.listen(PORT, () => {
      logger.info(`🚀 ${process.env.APP_NAME} corriendo en puerto ${PORT}`);
      logger.info(`📚 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔐 JWT configurado: ${process.env.JWT_SECRET ? 'Sí' : 'No'}`);
      logger.info(`📡 API-Football: ${process.env.API_FOOTBALL_KEY ? 'Configurada' : 'NO configurada'}`);
      logger.info(`🗄️ Base de datos: ${sequelize.config.database}`);
      logger.info(`💾 Redis: ${redisClient.isHealthy() ? 'Conectado' : 'Conectando...'}`);
      
      console.log('\n📍 Endpoints disponibles:');
      console.log(`   - Service Info: GET http://localhost:${PORT}/`);
      console.log(`   - Health Check: GET http://localhost:${PORT}/health`);
      console.log('\n💡 Usa Ctrl+C para detener el servidor');
      
      // Verificar estado final después de 2 segundos
      setTimeout(async () => {
        try {
          const redisHealth = await redisClient.testConnection();
          if (redisHealth.status === 'healthy') {
            console.log('🎯 ¡TODOS LOS SERVICIOS FUNCIONANDO CORRECTAMENTE!');
            console.log(`   - PostgreSQL: ✅ Conectado`);
            console.log(`   - Redis: ✅ Conectado (${redisHealth.pingTime})`);
            console.log(`   - API-Football: ✅ Configurada`);
            console.log('\n🚀 Listo para implementar próximos módulos!');
          } else {
            console.log('⚠️ Algunos servicios necesitan atención:');
            console.log(`   - Redis: ${redisHealth.error || 'Verificar conexión'}`);
          }
        } catch (error) {
          console.log('⚠️ Error verificando servicios:', error.message);
        }
      }, 2000);
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
  logger.info('\n👋 Cerrando servidor gracefully...');
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