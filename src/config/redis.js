// 📄 src/config/redis.js - CONFIGURACIÓN CORREGIDA - CONEXIÓN INMEDIATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Redis = require('ioredis');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN CON CONEXIÓN INMEDIATA
// ═══════════════════════════════════════════════════════════════════

// URL completa del dashboard 
const REDIS_URL = `redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`;

// Configuración optimizada para conexión inmediata
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB) || 0,
  
  // ✅ CONEXIÓN INMEDIATA - NO lazy
  lazyConnect: false,  // ✅ Conectar inmediatamente
  
  // Configuración optimizada para Redis Cloud
  connectTimeout: 20000,  // Aumentado para cloud
  commandTimeout: 10000,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  
  // Configuración de reconexión
  retryDelayOnClusterDown: 300,
  enableOfflineQueue: true,  // ✅ Permitir cola offline
  
  // Configuración de red para cloud
  family: 4,
  keepAlive: true,
  
  // Redis Stack optimizations
  enableAutoPipelining: false
};

// ═══════════════════════════════════════════════════════════════════
// CREAR CLIENTE REDIS CON CONEXIÓN INMEDIATA
// ═══════════════════════════════════════════════════════════════════

console.log('🔄 Inicializando Redis Cloud con conexión inmediata...');

// Crear cliente (se conecta automáticamente)
const redisClient = new Redis(redisConfig);

// ═══════════════════════════════════════════════════════════════════
// EVENTOS DE CONEXIÓN
// ═══════════════════════════════════════════════════════════════════

redisClient.on('connect', () => {
  console.log('🔗 Conectando a Redis Cloud...');
  console.log(`📍 Endpoint: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
  console.log(`👤 Usuario: default`);
  console.log(`🗄️ Base de datos: ${process.env.REDIS_DB || 0}`);
});

redisClient.on('ready', async () => {
  console.log('🎉 ¡Redis Cloud conectado y listo!');
  console.log(`✅ Estado: ${redisClient.status}`);
  
  logger.info('✅ Redis Cloud conectado con credenciales correctas');
  
  // Test automático completo
  try {
    const startTime = Date.now();
    const pingResult = await redisClient.ping();
    const pingTime = Date.now() - startTime;
    
    console.log(`🏓 Ping: ${pingResult} (${pingTime}ms)`);
    
    // Test de escritura/lectura
    const testKey = 'connection:ready:' + Date.now();
    const testData = {
      timestamp: new Date().toISOString(),
      server: process.env.APP_NAME || 'predictmaster-sports-backend',
      status: 'ready',
      endpoint: `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    };
    
    await redisClient.setex(testKey, 60, JSON.stringify(testData));
    console.log('📝 Test escritura: ✅ OK');
    
    const retrieved = await redisClient.get(testKey);
    if (retrieved) {
      console.log('📖 Test lectura: ✅ OK');
    }
    
    // Test de información del servidor
    const serverInfo = await redisClient.info('server');
    const redisVersion = serverInfo.match(/redis_version:([^\r\n]+)/)?.[1];
    
    console.log(`🔧 Redis Version: ${redisVersion}`);
    
    // Limpiar test
    await redisClient.del(testKey);
    console.log('🧹 Test completado');
    
    console.log('🎯 ¡REDIS CLOUD COMPLETAMENTE FUNCIONAL!');
    
  } catch (testError) {
    console.error('❌ Error en test automático:', testError.message);
    logger.error('Error en test de Redis:', testError.message);
  }
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Cloud Error:', err.message);
  logger.error('Redis Cloud error:', err.message);
  
  // Diagnósticos específicos
  if (err.message.includes('WRONGPASS')) {
    console.error('🔍 Password incorrecta - Verifica REDIS_PASSWORD en .env');
  } else if (err.message.includes('NOAUTH')) {
    console.error('🔍 Se requiere autenticación - Verifica username/password');
  } else if (err.message.includes('ENOTFOUND')) {
    console.error('🔍 No se puede resolver hostname - Verifica conexión a internet');
  } else if (err.message.includes('ECONNREFUSED')) {
    console.error('🔍 Conexión rechazada - Verifica puerto y firewall');
  } else if (err.message.includes('ETIMEDOUT')) {
    console.error('🔍 Timeout - Verifica IP whitelist en Redis Cloud');
  }
});

redisClient.on('close', () => {
  console.log('⚠️ Conexión Redis Cloud cerrada');
  logger.warn('Redis Cloud conexión cerrada');
});

redisClient.on('reconnecting', (delay) => {
  console.log(`🔄 Reconectando a Redis Cloud en ${delay}ms...`);
  logger.info(`Redis Cloud reconectando en ${delay}ms`);
});

redisClient.on('end', () => {
  console.log('🔚 Redis Cloud: Conexión terminada');
  logger.warn('Redis Cloud conexión terminada completamente');
});

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN DE CONEXIÓN ASEGURADA
// ═══════════════════════════════════════════════════════════════════
redisClient.ensureConnection = async function() {
  if (this.status === 'ready') {
    return true;
  }
  
  if (this.status === 'connecting') {
    // Esperar hasta que esté listo
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout esperando conexión Redis'));
      }, 15000);
      
      this.once('ready', () => {
        clearTimeout(timeout);
        resolve(true);
      });
      
      this.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }
  
  // Si está desconectado, intentar reconectar
  try {
    await this.connect();
    return true;
  } catch (error) {
    logger.error('Error asegurando conexión Redis:', error);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS MEJORADOS
// ═══════════════════════════════════════════════════════════════════

redisClient.getJSON = async function (key) {
  try {
    await this.ensureConnection();
    
    if (this.status !== 'ready') {
      logger.warn('⚠️ Redis no está listo, omitiendo lectura');
      return null;
    }
    
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('❌ Error obteniendo JSON del cache:', error.message);
    return null;
  }
};

redisClient.setJSON = async function (key, value, ttl = 3600) {
  try {
    await this.ensureConnection();
    
    if (this.status !== 'ready') {
      logger.warn('⚠️ Redis no está listo, omitiendo escritura');
      return false;
    }
    
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await this.setex(key, ttl, stringValue);
    } else {
      await this.set(key, stringValue);
    }
    return true;
  } catch (error) {
    logger.error('❌ Error guardando JSON en cache:', error.message);
    return false;
  }
};

redisClient.isHealthy = function() {
  return this.status === 'ready';
};

redisClient.getConnectionInfo = function() {
  return {
    status: this.status,
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: 'default',
    db: process.env.REDIS_DB || 0,
    tls: false,
    connected: this.status === 'ready',
    url: REDIS_URL.replace(/:([^:@]*?)@/, ':***@') // Ocultar password en logs
  };
};

// ✅ HEALTH CHECK MEJORADO CON TEST REAL
redisClient.testConnection = async function() {
  try {
    // Asegurar conexión primero
    await this.ensureConnection();
    
    if (this.status !== 'ready') {
      throw new Error(`Redis no está listo. Estado actual: ${this.status}`);
    }
    
    const startTime = Date.now();
    const pingResult = await this.ping();
    const pingTime = Date.now() - startTime;
    
    // Test completo de funcionalidad
    const testKey = 'health:check:' + Date.now();
    const testData = {
      timestamp: new Date().toISOString(),
      server: process.env.APP_NAME || 'predictmaster-sports-backend',
      test: 'health_check',
      random: Math.random()
    };
    
    await this.setex(testKey, 30, JSON.stringify(testData));
    const retrieved = await this.get(testKey);
    const isReadWriteOk = retrieved && JSON.parse(retrieved).random === testData.random;
    await this.del(testKey);
    
    const result = {
      status: 'healthy',
      ping: pingResult,
      pingTime: `${pingTime}ms`,
      readWrite: isReadWriteOk ? 'OK' : 'FAILED',
      connection: this.getConnectionInfo(),
      timestamp: new Date().toISOString()
    };
    
    return result;
    
  } catch (error) {
    const result = {
      status: 'unhealthy',
      error: error.message,
      connection: this.getConnectionInfo(),
      timestamp: new Date().toISOString()
    };
    
    logger.error('💔 Health Check Failed:', result);
    return result;
  }
};

module.exports = redisClient;