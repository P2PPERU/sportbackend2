const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

// GET /api/admin/clear-all-cache
router.get('/clear-all-cache', async (req, res) => {
  try {
    logger.info('🧹 Limpiando TODO el cache...');
    
    const patterns = [
      'api_football:*',
      'leagues:*', 
      'fixtures:*',
      'odds:*',
      'teams:*'
    ];
    
    let totalCleared = 0;
    for (const pattern of patterns) {
      try {
        const cleared = await cacheService.clearPattern(pattern);
        totalCleared += cleared;
        logger.info(`   🗑️ Patrón ${pattern}: ${cleared} claves eliminadas`);
      } catch (error) {
        logger.error(`❌ Error limpiando patrón ${pattern}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: 'TODO el cache limpiado exitosamente',
      clearedKeys: totalCleared,
      patterns: patterns
    });
    
    logger.info(`✅ Cache limpiado: ${totalCleared} claves eliminadas`);
    
  } catch (error) {
    logger.error('❌ Error limpiando cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error limpiando cache',
      error: error.message
    });
  }
});

// GET /api/admin/cache-stats
router.get('/cache-stats', async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;