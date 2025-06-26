// 🎯 TEST DE ODDS - SCRIPT JAVASCRIPT PARA WINDOWS VS CODE
// Ejecutar: node test-odds.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

// Colores para console.log
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Función para logs con colores
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.magenta}🔍 ${msg}${colors.reset}`),
  result: (msg) => console.log(`${colors.cyan}📊 ${msg}${colors.reset}`)
};

// Función para hacer requests con manejo de errores
async function makeRequest(url, description) {
  try {
    log.step(`${description}...`);
    console.log(`📡 URL: ${url}`);
    
    const response = await axios.get(url, { timeout: 15000 });
    
    log.success(`${description} - SUCCESS (${response.status})`);
    return response.data;
  } catch (error) {
    if (error.response) {
      log.error(`${description} - FAILED (${error.response.status})`);
      console.log(error.response.data);
    } else if (error.request) {
      log.error(`${description} - NO RESPONSE`);
      console.log('Servidor no responde. ¿Está corriendo en puerto 3002?');
    } else {
      log.error(`${description} - ERROR: ${error.message}`);
    }
    return null;
  }
}

// Función para mostrar resumen de datos
function showSummary(data, type) {
  if (!data) return;
  
  switch (type) {
    case 'health':
      log.result(`Estado: ${data.status}`);
      log.result(`Base de datos: ${data.database?.status || 'N/A'}`);
      log.result(`Redis: ${data.cache?.redis || 'N/A'}`);
      log.result(`API-Football: ${data.externalApi?.apiFootball || 'N/A'}`);
      break;
      
    case 'fixtures':
      log.result(`Total fixtures: ${data.data?.count || 0}`);
      if (data.data?.fixtures?.length > 0) {
        console.log('\n📋 Primeros fixtures:');
        data.data.fixtures.slice(0, 3).forEach((fixture, i) => {
          console.log(`${i + 1}. ${fixture.homeTeam?.name || 'Home'} vs ${fixture.awayTeam?.name || 'Away'}`);
          console.log(`   ID: ${fixture.id} | Estado: ${fixture.status} | Fecha: ${fixture.date}`);
        });
      }
      break;
      
    case 'markets':
      log.result(`Total mercados: ${data.data?.totalMarkets || 0}`);
      if (data.data?.markets) {
        const categories = Object.keys(data.data.markets);
        console.log(`📋 Categorías: ${categories.slice(0, 5).join(', ')}`);
      }
      break;
      
    case 'odds':
      if (data.data?.fixtures) {
        log.result(`Fixtures con odds: ${data.data.fixtures.length}`);
        data.data.fixtures.slice(0, 2).forEach((fixture, i) => {
          console.log(`${i + 1}. ${fixture.homeTeam} vs ${fixture.awayTeam}`);
          if (fixture.odds) {
            console.log(`   Odds disponibles: ${Object.keys(fixture.odds).join(', ')}`);
          }
        });
      } else if (data.data?.markets) {
        log.result(`Mercados con odds: ${Object.keys(data.data.markets).length}`);
      }
      break;
      
    case 'fixtureOdds':
      if (data.data?.odds) {
        log.result(`Mercados disponibles: ${Object.keys(data.data.odds).length}`);
        console.log(`📊 Bookmaker: ${data.data.bookmaker}`);
        Object.entries(data.data.odds).slice(0, 3).forEach(([market, odds]) => {
          console.log(`   ${market}: ${Object.keys(odds.odds || {}).join(', ')}`);
        });
      }
      break;
  }
  console.log(''); // Línea en blanco
}

// Función principal de pruebas
async function runOddsTests() {
  console.log(`${colors.bright}🎯 INICIANDO TESTS DE ODDS - API FOOTBALL${colors.reset}`);
  console.log('='.repeat(50));
  
  try {
    // PASO 1: Health Check
    const health = await makeRequest(`${BASE_URL}/health`, 'Health Check del Sistema');
    showSummary(health, 'health');
    
    if (!health || health.status !== 'OK') {
      log.error('El sistema no está funcionando correctamente');
      return;
    }
    
    // PASO 2: Mercados de apuestas disponibles
    const markets = await makeRequest(`${BASE_URL}/api/odds/markets`, 'Mercados de Apuestas Disponibles');
    showSummary(markets, 'markets');
    
    // PASO 3: Fixtures de hoy
    const fixturesRes = await makeRequest(`${BASE_URL}/api/fixtures/today`, 'Fixtures de Hoy');
    showSummary(fixturesRes, 'fixtures');
    
    // PASO 4: Extraer IDs de fixtures para probar odds
    let fixtureIds = [];
    if (fixturesRes?.data?.fixtures?.length > 0) {
      fixtureIds = fixturesRes.data.fixtures.slice(0, 3).map(f => f.id).filter(id => id);
      log.success(`Encontrados ${fixtureIds.length} fixtures para probar odds`);
    } else {
      log.warning('No hay fixtures de hoy. Probando con búsqueda de otros días...');
      
      // Intentar con ayer
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const yesterdayFixtures = await makeRequest(
        `${BASE_URL}/api/fixtures/search?date=${yesterdayStr}&limit=3`, 
        'Fixtures de Ayer'
      );
      
      if (yesterdayFixtures?.data?.fixtures?.length > 0) {
        fixtureIds = yesterdayFixtures.data.fixtures.map(f => f.id).filter(id => id);
      }
    }
    
    // PASO 5: Odds generales de hoy
    const todayOdds = await makeRequest(`${BASE_URL}/api/odds/today`, 'Odds de Fixtures de Hoy');
    showSummary(todayOdds, 'odds');
    
    // PASO 6: Odds con mercado específico
    const market1x2 = await makeRequest(`${BASE_URL}/api/odds/today?market=1X2&limit=3`, 'Odds Mercado 1X2');
    showSummary(market1x2, 'odds');
    
    // PASO 7: Bookmakers disponibles
    const bookmakers = await makeRequest(`${BASE_URL}/api/odds/bookmakers`, 'Bookmakers Disponibles');
    if (bookmakers?.data?.bookmakers) {
      log.result(`Bookmakers: ${bookmakers.data.bookmakers.length}`);
      bookmakers.data.bookmakers.slice(0, 5).forEach(bm => {
        console.log(`📊 ${bm.name}: ${bm.oddsCount} odds`);
      });
    }
    
    // PASO 8: Probar odds de fixtures específicos
    if (fixtureIds.length > 0) {
      console.log(`${colors.bright}\n🎯 PROBANDO ODDS DE FIXTURES ESPECÍFICOS${colors.reset}`);
      
      for (let i = 0; i < Math.min(fixtureIds.length, 2); i++) {
        const fixtureId = fixtureIds[i];
        log.step(`\n--- FIXTURE ${i + 1}: ${fixtureId} ---`);
        
        // Odds promedio
        const fixtureOdds = await makeRequest(
          `${BASE_URL}/api/odds/fixture/${fixtureId}`, 
          `Odds del Fixture (Average)`
        );
        showSummary(fixtureOdds, 'fixtureOdds');
        
        // Mejores odds
        const bestOdds = await makeRequest(
          `${BASE_URL}/api/odds/fixture/${fixtureId}/best`, 
          `Mejores Odds del Fixture`
        );
        if (bestOdds?.data?.bestOdds) {
          log.result(`Mejores odds en ${Object.keys(bestOdds.data.bestOdds).length} mercados`);
        }
        
        // Odds con Bet365 (si está disponible)
        const bet365Odds = await makeRequest(
          `${BASE_URL}/api/odds/fixture/${fixtureId}?bookmaker=Bet365`, 
          `Odds del Fixture (Bet365)`
        );
        showSummary(bet365Odds, 'fixtureOdds');
        
        // Pausa entre fixtures
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      log.warning('No se encontraron fixtures válidos para probar odds específicas');
    }
    
    // PASO 9: Estadísticas finales
    const stats = await makeRequest(`${BASE_URL}/api/odds/stats`, 'Estadísticas de Odds');
    if (stats?.data) {
      log.result(`Total odds en sistema: ${stats.data.totalOdds || 0}`);
      if (stats.data.bookmakers?.length > 0) {
        console.log('📊 Top bookmakers por cantidad de odds:');
        stats.data.bookmakers.slice(0, 5).forEach((bm, i) => {
          console.log(`   ${i + 1}. ${bm.bookmaker}: ${bm.dataValues?.count || bm.count} odds`);
        });
      }
    }
    
    // RESUMEN FINAL
    console.log(`${colors.bright}\n🎉 TESTS COMPLETADOS${colors.reset}`);
    console.log('='.repeat(50));
    
    if (fixtureIds.length > 0) {
      log.success(`✅ Odds específicas probadas para ${fixtureIds.length} fixtures`);
    }
    
    log.info('📝 Para tests adicionales:');
    console.log('   - Verifica los logs del servidor para más detalles');
    console.log('   - Usa Postman o curl para tests más específicos');
    console.log('   - Revisa la documentación en http://localhost:3002/api/odds');
    
  } catch (error) {
    log.error(`Error general en tests: ${error.message}`);
    console.error(error);
  }
}

// Función de utilidad para tests manuales
async function testSpecificFixture(fixtureId) {
  log.info(`Probando odds para fixture específico: ${fixtureId}`);
  
  const odds = await makeRequest(`${BASE_URL}/api/odds/fixture/${fixtureId}`, 'Odds del Fixture');
  const best = await makeRequest(`${BASE_URL}/api/odds/fixture/${fixtureId}/best`, 'Mejores Odds');
  
  return { odds, best };
}

// Verificar si se está ejecutando directamente
if (require.main === module) {
  // Verificar dependencias
  log.info('🚀 Iniciando tests de odds...');
  log.info('⏳ Asegúrate de que el servidor esté corriendo en puerto 3002');
  
  setTimeout(() => {
    runOddsTests().catch(error => {
      log.error(`Error fatal: ${error.message}`);
      process.exit(1);
    });
  }, 1000);
}

// Exportar para uso externo
module.exports = {
  runOddsTests,
  testSpecificFixture,
  makeRequest
};