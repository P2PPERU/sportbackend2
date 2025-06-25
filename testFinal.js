require('dotenv').config();
const Redis = require('ioredis');

// Configuración exacta del dashboard
const client = new Redis({
  host: 'redis-16264.c256.us-east-1-2.ec2.redns.redis-cloud.com',
  port: 16264,
  username: 'default',
  password: 'tcYYpxTY040Ol5urEcFQyUSoq5PZ5PR1',  // Password correcta
  db: 0
});

client.on('ready', async () => {
  console.log('🎉 ¡CONECTADO CON CREDENCIALES CORRECTAS!');
  
  try {
    // Test completo
    const ping = await client.ping();
    console.log('Ping:', ping);
    
    await client.set('test:final', 'funciona perfectamente', 'EX', 30);
    const value = await client.get('test:final');
    console.log('Test lectura/escritura:', value);
    
    console.log('✅ ¡REDIS CLOUD FUNCIONANDO AL 100%!');
  } catch (error) {
    console.error('Error en operaciones:', error.message);
  } finally {
    client.disconnect();
  }
});

client.on('error', (err) => {
  console.error('❌ Error:', err.message);
});