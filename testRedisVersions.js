// 📄 testRedisVersions.js - PRUEBA TODAS LAS CONFIGURACIONES POSIBLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const Redis = require('ioredis');

async function testRedisConfigurations() {
  console.log('🔍 PROBANDO DIFERENTES CONFIGURACIONES DE REDIS CLOUD');
  console.log('═'.repeat(60));
  console.log(`Host: ${process.env.REDIS_HOST}`);
  console.log(`Port: ${process.env.REDIS_PORT}`);
  console.log(`Password: ${process.env.REDIS_PASSWORD ? '✅ SET' : '❌ NOT SET'}`);
  console.log('═'.repeat(60));

  const configurations = [
    {
      name: '1. Redis SIN TLS (redis://)',
      config: `redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`
    },
    {
      name: '2. Redis CON TLS (rediss://)',
      config: `rediss://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`
    },
    {
      name: '3. Configuración objeto SIN TLS',
      config: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        db: 0,
        connectTimeout: 10000,
        commandTimeout: 5000
      }
    },
    {
      name: '4. Configuración objeto CON TLS básica',
      config: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        db: 0,
        tls: {},
        connectTimeout: 10000,
        commandTimeout: 5000
      }
    },
    {
      name: '5. Configuración objeto CON TLS avanzada',
      config: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        db: 0,
        tls: {
          rejectUnauthorized: false,
          requestCert: true,
          agent: false
        },
        connectTimeout: 10000,
        commandTimeout: 5000
      }
    },
    {
      name: '6. TLS con checkServerIdentity deshabilitado',
      config: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        db: 0,
        tls: {
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined
        },
        connectTimeout: 10000,
        commandTimeout: 5000
      }
    }
  ];

  for (let i = 0; i < configurations.length; i++) {
    const { name, config } = configurations[i];
    console.log(`\n${name}`);
    console.log('-'.repeat(40));

    try {
      const client = new Redis(config);
      
      // Promesa para manejar timeout
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout de conexión (10s)'));
        }, 10000);

        client.on('ready', () => {
          clearTimeout(timeout);
          resolve(client);
        });

        client.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      const connectedClient = await connectionPromise;

      // Test de ping
      const pingResult = await connectedClient.ping();
      console.log(`   ✅ ÉXITO: Ping = ${pingResult}`);

      // Test de escritura/lectura
      const testKey = 'test:connection:' + Date.now();
      await connectedClient.set(testKey, 'funciona', 'EX', 30);
      const value = await connectedClient.get(testKey);
      console.log(`   ✅ Escritura/Lectura: ${value}`);

      // Limpiar
      await connectedClient.del(testKey);
      connectedClient.disconnect();

      console.log('   🎯 ¡ESTA CONFIGURACIÓN FUNCIONA!');
      console.log('\n🎉 CONFIGURACIÓN GANADORA ENCONTRADA:');
      console.log(JSON.stringify(config, null, 2));
      
      return { success: true, config, name };

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      
      // Diagnóstico específico
      if (error.message.includes('wrong version number')) {
        console.log('   🔍 Problema TLS/SSL - versión incorrecta');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('   🔍 Conexión rechazada - puerto cerrado');
      } else if (error.message.includes('ETIMEDOUT')) {
        console.log('   🔍 Timeout - posible problema de red o IP no autorizada');
      } else if (error.message.includes('AUTH')) {
        console.log('   🔍 Error de autenticación - contraseña incorrecta');
      }
    }
  }

  console.log('\n❌ NINGUNA CONFIGURACIÓN FUNCIONÓ');
  console.log('\n🔧 SOLUCIONES SUGERIDAS:');
  console.log('   1. Verifica que tu IP esté en la whitelist de Redis Cloud');
  console.log('   2. Confirma las credenciales en el dashboard');
  console.log('   3. Verifica que el puerto 16264 esté abierto');
  console.log('   4. Prueba desde una red diferente');
  
  return { success: false };
}

// Función para obtener la configuración del dashboard
async function getRedisCloudInfo() {
  console.log('\n📋 INFORMACIÓN PARA VERIFICAR EN REDIS CLOUD DASHBOARD:');
  console.log('═'.repeat(60));
  console.log('1. Ve a tu dashboard de Redis Cloud');
  console.log('2. Haz clic en el botón "Connect" de tu base de datos');
  console.log('3. Selecciona "Redis CLI" o "Application"');
  console.log('4. Copia la cadena de conexión exacta');
  console.log('5. Verifica si usa TLS o no en la documentación');
  console.log('\n💡 TAMBIÉN VERIFICA:');
  console.log('   • Data Access Control → IP Whitelist');
  console.log('   • Security → TLS/SSL Settings');
  console.log('   • Database Status = Active');
}

// Ejecutar pruebas
async function main() {
  try {
    const result = await testRedisConfigurations();
    
    if (!result.success) {
      await getRedisCloudInfo();
    }
    
  } catch (error) {
    console.error('\n💥 ERROR GENERAL:', error.message);
  }
  
  process.exit(0);
}

main();