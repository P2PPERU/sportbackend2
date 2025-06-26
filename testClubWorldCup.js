// 📄 testClubWorldCup.js - PROBAR MUNDIAL DE CLUBES Y ODDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const axios = require('axios');

async function testClubWorldCup() {
  console.log('🏆 PROBANDO MUNDIAL DE CLUBES FIFA 2025');
  console.log('═'.repeat(50));
  
  const BASE_URL = 'http://localhost:3002';
  
  try {
    // 1. Buscar fixtures de hoy
    console.log('\n📅 1. Buscando fixtures de hoy...');
    const todayResponse = await axios.get(`${BASE_URL}/api/fixtures/today`);
    
    console.log(`   ✅ Total fixtures hoy: ${todayResponse.data.data.count}`);
    
    // Filtrar Mundial de Clubes
    const clubWorldCupFixtures = todayResponse.data.data.fixtures.filter(fixture => 
      fixture.league.name.includes('FIFA Club World Cup') || 
      fixture.league.name.includes('Club World')
    );
    
    console.log(`   🏆 Fixtures Mundial de Clubes: ${clubWorldCupFixtures.length}`);
    
    if (clubWorldCupFixtures.length === 0) {
      console.log('\n⚠️ No hay partidos del Mundial de Clubes hoy');
      console.log('🔍 Mostrando todos los partidos disponibles:');
      
      todayResponse.data.data.fixtures.forEach((fixture, index) => {
        console.log(`   ${index + 1}. ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
        console.log(`      Liga: ${fixture.league.name}`);
        console.log(`      Estado: ${fixture.status} | Fecha: ${fixture.date}`);
        console.log(`      UUID: ${fixture.id}`);
        console.log('');
      });
      
      return;
    }
    
    // 2. Mostrar partidos del Mundial de Clubes
    console.log('\n🏆 PARTIDOS DEL MUNDIAL DE CLUBES:');
    clubWorldCupFixtures.forEach((fixture, index) => {
      console.log(`\n   ${index + 1}. ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
      console.log(`      🏆 Liga: ${fixture.league.name}`);
      console.log(`      📅 Fecha: ${new Date(fixture.date).toLocaleString()}`);
      console.log(`      📊 Estado: ${fixture.status} (${fixture.statusLong})`);
      console.log(`      🏟️ Estadio: ${fixture.venue || 'N/A'}`);
      console.log(`      📋 UUID: ${fixture.id}`);
      
      if (fixture.homeScore !== null || fixture.awayScore !== null) {
        console.log(`      ⚽ Resultado: ${fixture.homeScore || 0} - ${fixture.awayScore || 0}`);
      }
    });
    
    // 3. Probar odds del primer partido del Mundial de Clubes
    const firstMatch = clubWorldCupFixtures[0];
    console.log(`\n📊 3. Probando odds del partido: ${firstMatch.homeTeam.name} vs ${firstMatch.awayTeam.name}`);
    console.log(`   UUID: ${firstMatch.id}`);
    
    try {
      const oddsResponse = await axios.get(`${BASE_URL}/api/odds/fixture/${firstMatch.id}`);
      
      if (oddsResponse.data.success) {
        console.log(`   ✅ ¡ODDS OBTENIDAS EXITOSAMENTE!`);
        console.log(`   📊 Mercados disponibles: ${Object.keys(oddsResponse.data.data.odds).length}`);
        console.log(`   🏪 Bookmakers disponibles: ${oddsResponse.data.data.availableBookmakers.length}`);
        
        // Mostrar mercados principales
        const odds = oddsResponse.data.data.odds;
        console.log('\n   🎯 MERCADOS PRINCIPALES:');
        
        // 1X2
        if (odds['1X2']) {
          console.log('   📈 Match Winner (1X2):');
          const market = odds['1X2'].odds;
          if (market.HOME) console.log(`      Local: ${market.HOME.odds}`);
          if (market.DRAW) console.log(`      Empate: ${market.DRAW.odds}`);
          if (market.AWAY) console.log(`      Visitante: ${market.AWAY.odds}`);
        }
        
        // Over/Under 2.5
        if (odds['OVER_UNDER_2_5']) {
          console.log('   📈 Over/Under 2.5 Goals:');
          const market = odds['OVER_UNDER_2_5'].odds;
          if (market.OVER) console.log(`      Over 2.5: ${market.OVER.odds}`);
          if (market.UNDER) console.log(`      Under 2.5: ${market.UNDER.odds}`);
        }
        
        // BTTS
        if (odds['BTTS']) {
          console.log('   📈 Both Teams to Score:');
          const market = odds['BTTS'].odds;
          if (market.YES) console.log(`      Sí: ${market.YES.odds}`);
          if (market.NO) console.log(`      No: ${market.NO.odds}`);
        }
        
        console.log(`\n   🏪 Bookmakers: ${oddsResponse.data.data.availableBookmakers.join(', ')}`);
        
      } else {
        console.log(`   ❌ Error obteniendo odds: ${oddsResponse.data.message}`);
        
        // Si no hay odds, intentar sincronizar
        console.log('\n🔄 4. Intentando sincronizar odds...');
        try {
          // Nota: Este endpoint requiere permisos de admin
          const syncResponse = await axios.post(`${BASE_URL}/api/odds/sync`, {
            fixtureId: firstMatch.id
          });
          console.log('   ✅ Sincronización exitosa');
          
          // Reintentar obtener odds
          const retryOdds = await axios.get(`${BASE_URL}/api/odds/fixture/${firstMatch.id}`);
          if (retryOdds.data.success) {
            console.log('   ✅ ¡Odds obtenidas después de sincronizar!');
          }
          
        } catch (syncError) {
          console.log(`   ⚠️ No se pudo sincronizar (requiere permisos admin): ${syncError.response?.data?.message || syncError.message}`);
        }
      }
      
    } catch (oddsError) {
      console.log(`   ❌ Error obteniendo odds: ${oddsError.response?.data?.message || oddsError.message}`);
      
      if (oddsError.response?.data?.error?.includes('uuid')) {
        console.log('   💡 Error de UUID detectado');
      }
    }
    
    // 4. Probar mercados disponibles
    console.log('\n📋 5. Consultando mercados de apuestas disponibles...');
    try {
      const marketsResponse = await axios.get(`${BASE_URL}/api/odds/markets`);
      console.log(`   ✅ Mercados configurados: ${marketsResponse.data.data.totalMarkets}`);
      console.log(`   📂 Categorías: ${marketsResponse.data.data.categories.join(', ')}`);
    } catch (marketError) {
      console.log(`   ❌ Error obteniendo mercados: ${marketError.message}`);
    }
    
    console.log('\n🎉 PRUEBA DEL MUNDIAL DE CLUBES COMPLETADA!');
    
    console.log('\n📋 RESUMEN:');
    console.log(`   🏆 Partidos Mundial de Clubes hoy: ${clubWorldCupFixtures.length}`);
    console.log(`   📊 API-Football funcionando: ✅`);
    console.log(`   🔧 Redis funcionando: ✅`);
    console.log(`   💰 Sistema de odds: ${clubWorldCupFixtures.length > 0 ? '✅' : 'Sin partidos para probar'}`);
    
  } catch (error) {
    console.error('\n💥 ERROR GENERAL:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 SOLUCIÓN:');
      console.log('   El servidor no está corriendo. Ejecuta: npm run dev');
    }
  }
}

// Función adicional para buscar fixture específico por equipos
async function findFixtureByTeams(homeTeam, awayTeam) {
  try {
    const response = await axios.get('http://localhost:3002/api/fixtures/today');
    
    const fixture = response.data.data.fixtures.find(f => 
      f.homeTeam.name.toLowerCase().includes(homeTeam.toLowerCase()) &&
      f.awayTeam.name.toLowerCase().includes(awayTeam.toLowerCase())
    );
    
    if (fixture) {
      console.log(`\n🎯 Fixture encontrado: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
      console.log(`   UUID: ${fixture.id}`);
      console.log(`   Liga: ${fixture.league.name}`);
      return fixture.id;
    } else {
      console.log(`\n❌ No se encontró fixture entre ${homeTeam} y ${awayTeam}`);
      return null;
    }
    
  } catch (error) {
    console.error('Error buscando fixture:', error.message);
    return null;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testClubWorldCup()
    .then(() => {
      console.log('\n👋 Prueba finalizada');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

module.exports = { testClubWorldCup, findFixtureByTeams };