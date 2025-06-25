const express = require('express');
const router = express.Router();
const leaguesController = require('../controllers/leagues.controller');
const rateLimit = require('express-rate-limit');

// Rate limiting para leagues
const leaguesLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 25, // 25 requests por minuto
  message: {
    success: false,
    message: 'Demasiadas consultas de ligas. Intenta en un minuto.',
    retryAfter: '1 minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
  }
});

// Rate limiting para sincronización
const syncLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 2, // Solo 2 sincronizaciones cada 10 minutos
  message: {
    success: false,
    message: 'Límite de sincronización de ligas excedido. Intenta en 10 minutos.',
    retryAfter: '10 minutos'
  }
});

// ═══════════════════════════════════════════════════════════════════
// RUTAS PÚBLICAS DE LIGAS
// ═══════════════════════════════════════════════════════════════════

// GET /api/leagues/top - Solo ligas top mundiales
router.get('/top', leaguesLimiter, leaguesController.getTopLeagues);

// GET /api/leagues/premium - Solo ligas premium (prioridad >= 85)
router.get('/premium', leaguesLimiter, leaguesController.getPremiumLeagues);

// GET /api/leagues/south-america - Ligas sudamericanas
router.get('/south-america', leaguesLimiter, leaguesController.getSouthAmericanLeagues);

// GET /api/leagues/:id - Información detallada de una liga
router.get('/:id', leaguesLimiter, leaguesController.getLeagueById);

// GET /api/leagues - Listar todas las ligas (debe ir al final por el orden de rutas)
router.get('/', leaguesLimiter, leaguesController.getAllLeagues);

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

// POST /api/leagues/sync - Sincronizar ligas top (solo admins)
router.post('/sync', syncLimiter, requireAdmin, leaguesController.syncTopLeagues);

module.exports = router;