const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  // Obtener valor del caché
  async get(key) {
    try {
      if (redisClient.status !== 'ready') {
        logger.warn('⚠️ Redis no está listo, omitiendo lectura de cache');
        return null;
      }

      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('❌ Error obteniendo cache:', error);
      return null;
    }
  }

  // Guardar valor en caché
  async set(key, value, ttl = 3600) {
    try {
      if (redisClient.status !== 'ready') {
        logger.warn('⚠️ Redis no está listo, omitiendo escritura de cache');
        return false;
      }

      const json = JSON.stringify(value);
      await redisClient.setex(key, ttl, json);

      // También guardar versión "stale" con TTL extendido
      await redisClient.setex(`${key}:stale`, ttl * 3, json);

      return true;
    } catch (error) {
      logger.error('❌ Error guardando en cache:', error);
      return false;
    }
  }

  // Eliminar claves del caché
  async del(key) {
    try {
      if (redisClient.status !== 'ready') return false;

      await redisClient.del(key);
      await redisClient.del(`${key}:stale`);
      return true;
    } catch (error) {
      logger.error('❌ Error eliminando del cache:', error);
      return false;
    }
  }

  // Eliminar todas las claves que coincidan con un patrón
  async clearPattern(pattern) {
    try {
      if (redisClient.status !== 'ready') return 0;

      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return keys.length;
    } catch (error) {
      logger.error('❌ Error al limpiar patrón del cache:', error);
      return 0;
    }
  }

  // Obtener estadísticas del cache
  async getStats() {
    try {
      if (redisClient.status !== 'ready') return null;

      const info = await redisClient.info('memory');
      const keyCount = await redisClient.dbsize();
      return {
        memory: info,
        isConnected: redisClient.status === 'ready',
        keyCount
      };
    } catch (error) {
      logger.error('❌ Error obteniendo estadísticas del cache:', error);
      return null;
    }
  }
}

module.exports = new CacheService();
