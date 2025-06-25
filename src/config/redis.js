const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  tls: {}  // 🔐 Esto es clave para Redis Cloud
};

const redisClient = new Redis(redisConfig);

// Eventos de conexión
redisClient.on('connect', () => {
  logger.info('✅ Redis conectado exitosamente');
});
redisClient.on('ready', () => {
  logger.info('🚀 Redis listo para recibir comandos');
});
redisClient.on('error', (err) => {
  logger.error('❌ Redis error:', err.message);
});
redisClient.on('close', () => {
  logger.warn('⚠️ Redis conexión cerrada');
});
redisClient.on('reconnecting', () => {
  logger.info('🔄 Redis reconectando...');
});

// Helpers
redisClient.getJSON = async function (key) {
  try {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Error obteniendo JSON del cache:', error);
    return null;
  }
};

redisClient.setJSON = async function (key, value, ttl = 3600) {
  try {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await this.setex(key, ttl, stringValue);
    } else {
      await this.set(key, stringValue);
    }
    return true;
  } catch (error) {
    logger.error('Error guardando JSON en cache:', error);
    return false;
  }
};

module.exports = redisClient;
