const express = require('express');
const router = express.Router();
const fixturesController = require('../controllers/fixtures.controller');
const rateLimit = require('express-rate-limit');

// Rate limiting específico para fixtures
const fixturesLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 requests por minuto
  message: {
    success: false,
    message: 'Demasiadas consultas de fixtures. Intenta en un minuto.',
    retryAfter: '1 minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
  }
});

// Rate limiting más estricto para sincronización
const syncLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 3, // Solo 3 sincronizaciones cada 5 minutos
  message: {
    success: false,
    message: 'Límite de sincronización excedido. Intenta en 5 minutos.',
    retryAfter: '5 minutos'
  }
});

// ═══════════════════════════════════════════════════════════════════
// RUTAS PÚBLICAS (solo lectura)
// ═══════════════════════════════════════════════════════════════════

// GET /api/fixtures/today - Partidos de hoy
router.get('/today', fixturesLimiter, fixturesController.getTodayFixtures);

// GET /api/fixtures/top - Fixtures de ligas top mundiales
//router.get('/top', fixturesLimiter, fixturesController.getTopFixtures);

// GET /api/fixtures/premium - Solo fixtures premium (prioridad >= 85)
//router.get('/premium', fixturesLimiter, fixturesController.getPremiumFixtures);

// GET /api/fixtures/south-america - Fixtures sudamericanos
//router.get('/south-america', fixturesLimiter, fixturesController.getSouthAmericanFixtures);

// GET /api/fixtures/search - Buscar fixtures con filtros
router.get('/search', fixturesLimiter, fixturesController.searchFixtures);

// GET /api/fixtures/live - Partidos en vivo
router.get('/live', fixturesLimiter, fixturesController.getLiveFixtures);

// GET /api/fixtures/league/:leagueId - Fixtures de una liga
router.get('/league/:leagueId', fixturesLimiter, fixturesController.getFixturesByLeague);

// GET /api/fixtures/:id - Fixture específico
router.get('/:id', fixturesLimiter, fixturesController.getFixtureById);

// ═══════════════════════════════════════════════════════════════════
// RUTAS ADMINISTRATIVAS (requieren autenticación)
// ═══════════════════════════════════════════════════════════════════

// Middleware para verificar autenticación de admin
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Se requieren permisos de administrador',
      required: 'admin_token'
    });
  }
  next();
};

// POST /api/fixtures/sync - Forzar sincronización (solo admins)
router.post('/sync', syncLimiter, requireAdmin, fixturesController.forceSyncFixtures);

// ═══════════════════════════════════════════════════════════════════
// DOCUMENTACIÓN DE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// GET /api/fixtures - Documentación
router.get('/', (req, res) => {
  res.json({
    service: 'Fixtures API',
    description: 'API para consultar partidos de fútbol en tiempo real',
    version: '1.0.0',
    endpoints: {
      public: {
        'GET /today': {
          description: 'Obtener partidos de hoy',
          rateLimit: '30 requests/min',
          example: '/api/fixtures/today'
        },
        'GET /top': {
          description: 'Fixtures de ligas top mundiales',
          parameters: {
            continent: 'string (ALL|EUROPE|SOUTH_AMERICA|NORTH_AMERICA|ASIA|AFRICA|OCEANIA|WORLD)',
            days: 'number (días hacia adelante, default: 7)',
            priority: 'number (prioridad mínima, default: 75)'
          },
          rateLimit: '30 requests/min',
          example: '/api/fixtures/top?continent=SOUTH_AMERICA&days=14&priority=85'
        },
        'GET /premium': {
          description: 'Solo fixtures de ligas premium (prioridad >= 85)',
          parameters: {
            days: 'number (días hacia adelante, default: 7)'
          },
          rateLimit: '30 requests/min',
          example: '/api/fixtures/premium?days=3'
        },
        'GET /south-america': {
          description: 'Fixtures sudamericanos (Libertadores, Brasileirão, etc.)',
          parameters: {
            days: 'number (días hacia adelante, default: 7)'
          },
          rateLimit: '30 requests/min',
          example: '/api/fixtures/south-america'
        },
        'GET /search': {
          description: 'Buscar fixtures con filtros',
          parameters: {
            date: 'YYYY-MM-DD (fecha específica)',
            leagueId: 'UUID (ID de liga)',
            teamId: 'UUID (ID de equipo)',
            status: 'NS|1H|HT|2H|FT (estado del partido)',
            limit: 'number (máximo 100)'
          },
          rateLimit: '30 requests/min',
          example: '/api/fixtures/search?date=2024-12-25&status=FT'
        },
        'GET /live': {
          description: 'Obtener partidos en vivo',
          rateLimit: '30 requests/min',
          example: '/api/fixtures/live'
        },
        'GET /league/:leagueId': {
          description: 'Fixtures de una liga específica',
          rateLimit: '30 requests/min',
          example: '/api/fixtures/league/123e4567-e89b-12d3-a456-426614174000'
        },
        'GET /:id': {
          description: 'Obtener fixture específico',
          rateLimit: '30 requests/min',
          example: '/api/fixtures/123e4567-e89b-12d3-a456-426614174000'
        }
      },
      admin: {
        'POST /sync': {
          description: 'Forzar sincronización con API-Football',
          authentication: 'Bearer token (admin)',
          rateLimit: '3 requests/5min',
          example: 'POST /api/fixtures/sync'
        }
      }
    },
    dataSource: 'API-Football',
    caching: 'Redis Cache habilitado',
    realTimeUpdates: 'Sincronización automática cada 5 minutos',
    supportedStatuses: {
      'NS': 'Not Started',
      '1H': 'First Half',
      'HT': 'Half Time',
      '2H': 'Second Half',
      'ET': 'Extra Time',
      'FT': 'Full Time',
      'PST': 'Postponed',
      'CANC': 'Cancelled'
    },
    tips: [
      'Usa GET /today para partidos del día actual',
      'Usa GET /live para partidos en curso',
      'Los datos se actualizan automáticamente cada 5 minutos',
      'El cache mejora la velocidad de respuesta',
      'Solo admins pueden forzar sincronización'
    ]
  });
});

module.exports = router;