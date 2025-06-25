const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

class CleanupCacheJob {
  // Limpiar cache expirado
  async cleanExpiredCache() {
    try {
      logger.info('🧹 Iniciando limpieza de cache...');

      let totalCleaned = 0;

      // Limpiar patrones específicos de API-Football
      const patterns = [
        'api_football:*',     // Cache de API-Football
        'fixtures:*',         // Cache de fixtures
        'teams:*',           // Cache de equipos
        'leagues:*',         // Cache de ligas
        'odds:*',            // Cache de cuotas
        'standings:*'        // Cache de tablas
      ];

      for (const pattern of patterns) {
        try {
          const cleaned = await cacheService.clearPattern(pattern);
          totalCleaned += cleaned;
          logger.info(`   🗑️ Patrón ${pattern}: ${cleaned} claves eliminadas`);
        } catch (error) {
          logger.error(`❌ Error limpiando patrón ${pattern}:`, error.message);
        }
      }

      // Obtener estadísticas del cache
      const stats = await cacheService.getStats();
      
      const result = {
        totalCleaned,
        cacheStats: stats,
        timestamp: new Date().toISOString()
      };

      logger.info(`✅ Limpieza de cache completada:`, result);
      return result;

    } catch (error) {
      logger.error('❌ Error en limpieza de cache:', error);
      throw error;
    }
  }

  // Limpiar cache específico de API-Football
  async cleanApiFootballCache() {
    try {
      logger.info('🧹 Limpiando cache específico de API-Football...');
      
      const cleaned = await cacheService.clearPattern('api_football:*');
      
      logger.info(`✅ Cache API-Football limpiado: ${cleaned} claves`);
      return { cleaned, timestamp: new Date().toISOString() };

    } catch (error) {
      logger.error('❌ Error limpiando cache API-Football:', error);
      throw error;
    }
  }

  // Limpiar cache de fixtures antiguos
  async cleanOldFixturesCache() {
    try {
      logger.info('🧹 Limpiando cache de fixtures antiguos...');
      
      const patterns = [
        'fixtures:old:*',
        'fixtures:past:*'
      ];

      let totalCleaned = 0;
      for (const pattern of patterns) {
        const cleaned = await cacheService.clearPattern(pattern);
        totalCleaned += cleaned;
      }

      logger.info(`✅ Cache de fixtures antiguos limpiado: ${totalCleaned} claves`);
      return { cleaned: totalCleaned, timestamp: new Date().toISOString() };

    } catch (error) {
      logger.error('❌ Error limpiando cache de fixtures antiguos:', error);
      throw error;
    }
  }

  // Obtener información del cache
  async getCacheInfo() {
    try {
      const stats = await cacheService.getStats();
      
      return {
        memory: stats?.memory || 'unavailable',
        keyCount: stats?.keyCount || 0,
        isConnected: stats?.isConnected || false,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Error obteniendo información del cache:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new CleanupCacheJob();