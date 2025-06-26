// 📄 testOddsFix.js - PROBAR CORRECCIÓN DE ODDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const apiFootballService = require('./src/services/apiFootballService');

async function testOddsFix() {
  console.log('🔧 PROBANDO CORRECCIÓN DE ODDS');
  console.log('═'.repeat(50));
  
  const fixtureId = '1321721'; // El fixture que mencionas
  
  try {
    console.log(`\n📊 Probando fixture ${fixtureId}...`);
    
    // 1. Probar método corregido (SIN especificar bookmaker)
    console.log('\n1. 🆓 Obteniendo TODAS las odds (sin filtro bookmaker):');
    try {
      const allOdds = await apiFootballService.getAllFixtureOdds(fixtureId);
      
      if (allOdds.response && allOdds.response.length > 0) {
        const oddsData = allOdds.response[0];
        console.log(`   ✅ Fixture: ${oddsData.fixture.id}`);
        console.log(`   📅 Fecha: ${oddsData.fixture.date}`);
        console.log(`   📊 Total bookmakers: ${oddsData.bookmakers.length}`);
        
        console.log('\n   📈 Bookmakers disponibles:');
        oddsData.bookmakers.forEach((bookmaker, index) => {
          console.log(`   ${index + 1}. ${bookmaker.name} (ID: ${bookmaker.id}) - ${bookmaker.bets.length} mercados`);
        });
        
        // Mostrar el primer mercado de ejemplo
        if (oddsData.bookmakers[0] && oddsData.bookmakers[0].bets[0]) {
          const firstBet = oddsData.bookmakers[0].bets[0];
          console.log(`\n   🎯 Ejemplo - Mercado: ${firstBet.name}`);
          console.log(`      Valores: ${firstBet.values.map(v => `${v.value}: ${v.odd}`).join(', ')}`);
        }
        
      } else {
        console.log('   ❌ No se encontraron odds para este fixture');
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
    
    // 2. Probar con un bookmaker específico para comparar
    console.log('\n2. 🎯 Probando con bookmaker específico (Bet365 - ID: 8):');
    try {
      const bet365Odds = await apiFootballService.getFixtureOddsByBookmaker(fixtureId, '8');
      
      if (bet365Odds.response && bet365Odds.response.length > 0) {
        const oddsData = bet365Odds.response[0];
        console.log(`   ✅ Solo Bet365: ${oddsData.bookmakers.length} bookmaker(s)`);
        
        if (oddsData.bookmakers[0]) {
          console.log(`   📊 Mercados Bet365: ${oddsData.bookmakers[0].bets.length}`);
        }
      } else {
        console.log('   ❌ No se encontraron odds de Bet365 para este fixture');
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
    
    // 3. Comparar con llamada directa
    console.log('\n3. 🔍 Llamada directa a API (como la que funciona en el navegador):');
    try {
      const directOdds = await apiFootballService.makeRequest('/odds', {
        fixture: fixtureId
      });
      
      if (directOdds.response && directOdds.response.length > 0) {
        const oddsData = directOdds.response[0];
        console.log(`   ✅ Respuesta directa: ${oddsData.bookmakers.length} bookmakers`);
        console.log(`   📋 Rate limit info: Requests restantes: ${directOdds.paging.current}/${directOdds.paging.total}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
    
    // 4. Información de configuración
    console.log('\n4. ⚙️ Configuración actual:');
    console.log(`   API Key: ${process.env.API_FOOTBALL_KEY ? '✅ Configurada' : '❌ NO configurada'}`);
    console.log(`   Host: ${process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io'}`);
    
    console.log('\n🎉 PRUEBA COMPLETADA');
    console.log('\n📋 ANÁLISIS:');
    console.log('   - Si ves muchos bookmakers en el punto 1, ¡la corrección funcionó!');
    console.log('   - Si solo ves 1-2 bookmakers, revisa la configuración de API');
    console.log('   - El punto 2 debería mostrar solo Bet365');
    console.log('   - Compara los números entre los puntos 1 y 2');
    
  } catch (error) {
    console.error('\n💥 ERROR GENERAL:', error.message);
    
    if (error.message.includes('Rate limit')) {
      console.log('\n🔧 SOLUCIÓN:');
      console.log('   Rate limit alcanzado. Espera o verifica tu plan de API-Football');
    } else if (error.message.includes('API_FOOTBALL_KEY')) {
      console.log('\n🔧 SOLUCIÓN:');
      console.log('   Configura tu API_FOOTBALL_KEY en el archivo .env');
    }
  }
}

// Función adicional para probar diferentes filtros
async function testDifferentFilters() {
  console.log('\n🔬 PROBANDO DIFERENTES FILTROS DE ODDS');
  console.log('═'.repeat(40));
  
  const fixtureId = '1321721';
  
  const filters = [
    { name: 'Sin filtros (todas)', params: {} },
    { name: 'Solo mercado 1 (Match Winner)', params: { bet: '1' } },
    { name: 'Solo mercado 5 (Over/Under)', params: { bet: '5' } },
    { name: 'Múltiples mercados', params: { bet: '1,5,8' } }
  ];
  
  for (const filter of filters) {
    try {
      console.log(`\n📊 ${filter.name}:`);
      
      const odds = await apiFootballService.getFixtureOddsWithFilters(fixtureId, filter.params);
      
      if (odds.response && odds.response.length > 0) {
        const oddsData = odds.response[0];
        console.log(`   ✅ Bookmakers: ${oddsData.bookmakers.length}`);
        
        if (oddsData.bookmakers[0]) {
          console.log(`   📋 Mercados ejemplo: ${oddsData.bookmakers[0].bets.length}`);
          oddsData.bookmakers[0].bets.forEach(bet => {
            console.log(`      • ${bet.name} (ID: ${bet.id})`);
          });
        }
      } else {
        console.log('   ❌ Sin resultados');
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Pausa para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Ejecutar pruebas
async function runTests() {
  try {
    await testOddsFix();
    
    // Preguntar si quiere probar filtros específicos
    console.log('\n❓ ¿Quieres probar filtros específicos? (Requiere más requests de API)');
    console.log('   Descomenta la línea de abajo si quieres probar:');
    console.log('   // await testDifferentFilters();');
    
    // await testDifferentFilters(); // Descomenta para probar filtros
    
  } catch (error) {
    console.error('Error en pruebas:', error.message);
  } finally {
    console.log('\n👋 Pruebas finalizadas');
    process.exit(0);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  runTests();
}

module.exports = { testOddsFix, testDifferentFilters };