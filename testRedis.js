require('dotenv').config();
const Redis = require('ioredis');

// Usa rediss:// para conexión segura (TLS)
const redisUrl = `rediss://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const client = new Redis(redisUrl);

client.on('ready', async () => {
  console.log('✅ Redis conectado correctamente');

  try {
    await client.set('test:key', 'funciona', 'EX', 30);
    const valor = await client.get('test:key');
    console.log('📦 Valor desde Redis:', valor);
  } catch (err) {
    console.error('❌ Error en operaciones Redis:', err);
  } finally {
    client.quit();
  }
});

client.on('error', (err) => {
  console.error('❌ Error de Redis:', err);
});

