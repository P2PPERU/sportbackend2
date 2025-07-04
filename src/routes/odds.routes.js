const express = require('express');
const router = express.Router();
const oddsController = require('../controllers/odds.controller');
const rateLimit = require('express-rate-limit');

// Rate limiting para odds (más restrictivo por ser datos costosos)
const oddsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 20, // 20 requests por minuto
  message: {
    success: false,
    message: 'Demasiadas consultas de odds. Intenta en un minuto.',
    retryAfter: '1 minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
  }
});

// Rate limiting muy restrictivo para sincronización
const syncLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 2, // Solo 2 sincronizaciones cada 10 minutos
  message: {
    success: false,
    message: 'Límite de sincronización de odds excedido. Intenta en 10 minutos.',
    retryAfter: '10 minutos'
  }
});

// ═══════════════════════════════════════════════════════════════════
// RUTAS PÚBLICAS DE ODDS
// ═══════════════════════════════════════════════════════════════════

// GET /api/odds/fixture/:id - Odds de un fixture específico
router.get('/fixture/:id', oddsLimiter, oddsController.getFixtureOdds);

// GET /api/odds/fixture/:id/best - Mejores odds de un fixture
router.get('/fixture/:id/best', oddsLimiter, oddsController.getBestFixtureOdds);

// GET /api/odds/today - Odds de fixtures de hoy (ligas top)
router.get('/today', oddsLimiter, oddsController.getTodayOdds);

// GET /api/odds/markets - Mercados de apuestas disponibles
router.get('/markets', oddsController.getAvailableMarkets);

// GET /api/odds/bookmakers - Bookmakers disponibles
router.get('/bookmakers', oddsController.getBookmakers);

// GET /api/odds/stats - Estadísticas de odds
router.get('/stats', oddsController.getOddsStats);

// Comparar odds entre bookmakers
router.get('/fixture/:id/compare', oddsLimiter, oddsController.compareFixtureOdds);

// Mercados más populares
router.get('/markets/popular', oddsController.getPopularMarkets);



// ═══════════════════════════════════════════════════════════════════
// RUTAS ADMINISTRATIVAS
// ═══════════════════════════════════════════════════════════════════

// Middleware para verificar admin
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

// POST /api/odds/sync - Forzar sincronización de odds (solo admins)
router.post('/sync', syncLimiter, oddsController.forceSyncOdds);

// ═══════════════════════════════════════════════════════════════════
// DOCUMENTACIÓN DE LA API DE ODDS
// ═══════════════════════════════════════════════════════════════════

// GET /api/odds - Documentación
router.get('/', (req, res) => {
  res.json({
    service: 'Odds & Betting Markets API',
    description: 'API para consultar cuotas y mercados de apuestas en tiempo real',
    version: '1.0.0',
    features: [
      'Cuotas de múltiples casas de apuestas',
      'Mercados principales: 1X2, Over/Under, BTTS',
      'Comparación de mejores odds',
      'Datos en tiempo real de API-Football',
      'Cálculo de probabilidades implícitas'
    ],
    endpoints: {
      public: {
        'GET /fixture/:id': {
          description: 'Obtener odds de un fixture específico',
          parameters: {
            bookmaker: 'string (opcional) - Casa de apuestas específica o "Average"'
          },
          rateLimit: '20 requests/min',
          example: '/api/odds/fixture/123e4567-e89b-12d3-a456-426614174000?bookmaker=Bet365'
        },
        'GET /fixture/:id/best': {
          description: 'Obtener las mejores odds de un fixture',
          rateLimit: '20 requests/min',
          example: '/api/odds/fixture/123e4567-e89b-12d3-a456-426614174000/best'
        },
        'GET /today': {
          description: 'Odds de fixtures de hoy (solo ligas top)',
          parameters: {
            league: 'UUID (opcional) - Filtrar por liga específica',
            market: 'string (opcional) - Mercado específico (default: 1X2)',
            bookmaker: 'string (opcional) - Casa de apuestas (default: Average)'
          },
          rateLimit: '20 requests/min',
          example: '/api/odds/today?market=OVER_UNDER_2_5&bookmaker=Bet365'
        },
        'GET /markets': {
          description: 'Listar mercados de apuestas disponibles',
          rateLimit: 'Sin límite',
          example: '/api/odds/markets'
        },
        'GET /bookmakers': {
          description: 'Listar casas de apuestas disponibles',
          parameters: {
            fixtureId: 'UUID (opcional) - Filtrar por fixture específico'
          },
          rateLimit: 'Sin límite',
          example: '/api/odds/bookmakers?fixtureId=123e4567-e89b-12d3-a456-426614174000'
        },
        'GET /stats': {
          description: 'Estadísticas generales de odds',
          rateLimit: 'Sin límite',
          example: '/api/odds/stats'
        }
      },
      admin: {
        'POST /sync': {
          description: 'Forzar sincronización de odds',
          authentication: 'Bearer token (admin)',
          body: {
            fixtureId: 'UUID (opcional) - Sincronizar odds de fixture específico'
          },
          rateLimit: '2 requests/10min',
          example: 'POST /api/odds/sync { "fixtureId": "123e4567-e89b-12d3-a456-426614174000" }'
        }
      }
    },
    supportedMarkets: {
      '1X2': {
        name: 'Match Winner',
        outcomes: ['HOME', 'DRAW', 'AWAY'],
        description: 'Resultado final del partido'
      },
      'OVER_UNDER_2_5': {
        name: 'Over/Under 2.5 Goals',
        outcomes: ['OVER', 'UNDER'],
        description: 'Total de goles mayor o menor a 2.5'
      },
      'BTTS': {
        name: 'Both Teams To Score',
        outcomes: ['YES', 'NO'],
        description: 'Ambos equipos anotan al menos un gol'
      },
      'DOUBLE_CHANCE': {
        name: 'Double Chance',
        outcomes: ['1X', 'X2', '12'],
        description: 'Dos de tres posibles resultados'
      },
      'OVER_UNDER_1_5': {
        name: 'Over/Under 1.5 Goals',
        outcomes: ['OVER', 'UNDER'],
        description: 'Total de goles mayor o menor a 1.5'
      },
      'OVER_UNDER_3_5': {
        name: 'Over/Under 3.5 Goals',
        outcomes: ['OVER', 'UNDER'],
        description: 'Total de goles mayor o menor a 3.5'
      }
    },
    supportedBookmakers: [
      'Bet365',
      'William Hill',
      'Betfair',
      'Unibet',
      'Pinnacle',
      'Betway',
      '1xBet',
      'Average (promedio calculado)'
    ],
    dataSource: 'API-Football',
    updateFrequency: {
      'live_matches': 'Cada 2 minutos',
      'upcoming_matches': 'Cada 30 minutos',
      'finished_matches': 'Final'
    },
    tips: [
      'Usa "Average" como bookmaker para obtener odds promedio',
      'Las mejores odds muestran la cuota más alta de cada outcome',
      'Los fixtures de ligas top (prioridad >= 75) tienen odds más frecuentes',
      'Las probabilidades implícitas se calculan automáticamente',
      'Solo admins pueden forzar sincronización',
      'Los datos se actualizan automáticamente según el estado del partido'
    ],
    limitations: [
      'Rate limit más restrictivo debido al costo de datos',
      'Solo ligas con prioridad >= 75 tienen sincronización automática',
      'Algunos mercados pueden no estar disponibles para todos los fixtures',
      'Las odds históricas se mantienen por 30 días'
    ]
  });
});

module.exports = router;