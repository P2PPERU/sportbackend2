// 🎯 BUSCAR PARTIDOS CON MÁS ODDS DISPONIBLES
// Ejecutar: node find-best-odds.js

const axios = require('axios');
const BASE_URL = 'http://localhost:3002';

// Colores
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

async function findFixturesWithMostOdds() {
  console.log(`${colors.bright}🔍 BUSCANDO PARTIDOS CON MÁS ODDS DISPONIBLES${colors.reset}`);
  console.log('='.repeat(70) + '\n');
  
  try {
    // 1. Obtener todos los fixtures de hoy
    console.log(`${colors.yellow}📅 Obteniendo todos los fixtures de hoy...${colors.reset}`);
    const fixturesResponse = await axios.get(`${BASE_URL}/api/fixtures/today`);
    const fixtures = fixturesResponse.data.data.fixtures;
    
    console.log(`✅ Encontrados ${fixtures.length} fixtures de hoy\n`);
    
    // 2. Analizar odds de varios fixtures
    console.log(`${colors.yellow}🎯 Analizando odds de fixtures aleatorios...${colors.reset}\n`);
    
    const fixtureAnalysis = [];
    
    // Tomar una muestra de fixtures para analizar (máximo 20 para no saturar)
    const sampleSize = Math.min(20, fixtures.length);
    const sampleFixtures = fixtures.slice(0, sampleSize);
    
    for (let i = 0; i < sampleFixtures.length; i++) {
      const fixture = sampleFixtures[i];
      
      try {
        console.log(`${i + 1}/${sampleSize} Analizando: ${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name}...`);
        
        const oddsResponse = await axios.get(`${BASE_URL}/api/odds/fixture/${fixture.id}/best`);
        
        let marketsCount = 0;
        let marketsList = [];
        
        if (oddsResponse.data.data?.bestOdds) {
          marketsCount = Object.keys(oddsResponse.data.data.bestOdds).length;
          marketsList = Object.keys(oddsResponse.data.data.bestOdds);
        }
        
        fixtureAnalysis.push({
          id: fixture.id,
          homeTeam: fixture.homeTeam?.name || 'Home',
          awayTeam: fixture.awayTeam?.name || 'Away',
          league: fixture.league?.name || 'Unknown League',
          country: fixture.league?.country || 'Unknown',
          status: fixture.status,
          marketsCount,
          markets: marketsList,
          time: fixture.date
        });
        
        console.log(`   ✅ ${marketsCount} mercados encontrados`);
        
        // Pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        fixtureAnalysis.push({
          id: fixture.id,
          homeTeam: fixture.homeTeam?.name || 'Home',
          awayTeam: fixture.awayTeam?.name || 'Away',
          league: fixture.league?.name || 'Unknown League',
          marketsCount: 0,
          markets: [],
          error: error.message
        });
      }
    }
    
    // 3. Ordenar por número de mercados (mayor a menor)
    fixtureAnalysis.sort((a, b) => b.marketsCount - a.marketsCount);
    
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bright}🏆 TOP 10 PARTIDOS CON MÁS ODDS DISPONIBLES:${colors.reset}\n`);
    
    const top10 = fixtureAnalysis.slice(0, 10);
    
    top10.forEach((fixture, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const statusEmoji = fixture.status === 'NS' ? '⏰' : fixture.status === 'FT' ? '✅' : '▶️';
      
      console.log(`${medal} ${statusEmoji} ${colors.bright}${fixture.homeTeam} vs ${fixture.awayTeam}${colors.reset}`);
      console.log(`   🏆 ${fixture.league} (${fixture.country})`);
      console.log(`   📊 ${colors.green}${fixture.marketsCount} mercados disponibles${colors.reset}`);
      console.log(`   🆔 ${fixture.id}`);
      
      if (fixture.marketsCount > 0) {
        // Mostrar algunos mercados principales
        const mainMarkets = fixture.markets.filter(m => 
          ['1X2', 'BTTS', 'OVER_UNDER_2_5', 'HT_1X2', 'HT_FT', 'EXACT_SCORE'].includes(m)
        );
        if (mainMarkets.length > 0) {
          console.log(`   🎯 Mercados principales: ${mainMarkets.join(', ')}`);
        }
      }
      
      console.log('');
    });
    
    // 4. Estadísticas generales
    console.log('='.repeat(70));
    console.log(`${colors.bright}📈 ESTADÍSTICAS DE ANÁLISIS:${colors.reset}\n`);
    
    const withOdds = fixtureAnalysis.filter(f => f.marketsCount > 0);
    const maxMarkets = Math.max(...fixtureAnalysis.map(f => f.marketsCount));
    const avgMarkets = withOdds.length > 0 ? 
      (withOdds.reduce((sum, f) => sum + f.marketsCount, 0) / withOdds.length).toFixed(1) : 0;
    
    console.log(`📊 Fixtures analizados: ${fixtureAnalysis.length}`);
    console.log(`✅ Con odds disponibles: ${withOdds.length}`);
    console.log(`📈 Máximo mercados en un partido: ${maxMarkets}`);
    console.log(`📊 Promedio de mercados: ${avgMarkets}`);
    
    // 5. Mostrar mejores fixtures por liga
    console.log(`\n${colors.bright}🏆 MEJORES FIXTURES POR LIGA:${colors.reset}\n`);
    
    const byLeague = {};
    withOdds.forEach(fixture => {
      const league = fixture.league;
      if (!byLeague[league] || byLeague[league].marketsCount < fixture.marketsCount) {
        byLeague[league] = fixture;
      }
    });
    
    Object.entries(byLeague)
      .sort(([,a], [,b]) => b.marketsCount - a.marketsCount)
      .slice(0, 8)
      .forEach(([league, fixture]) => {
        console.log(`🏆 ${league}:`);
        console.log(`   ${fixture.homeTeam} vs ${fixture.awayTeam} (${fixture.marketsCount} mercados)`);
        console.log(`   🆔 ${fixture.id}`);
        console.log('');
      });
    
    // 6. Sugerir el mejor fixture para probar
    if (withOdds.length > 0) {
      const bestFixture = withOdds[0];
      
      console.log('='.repeat(70));
      console.log(`${colors.bright}🎯 RECOMENDACIÓN - MEJOR FIXTURE PARA PROBAR:${colors.reset}\n`);
      
      console.log(`⚽ ${colors.bright}${bestFixture.homeTeam} vs ${bestFixture.awayTeam}${colors.reset}`);
      console.log(`🏆 ${bestFixture.league}`);
      console.log(`📊 ${colors.green}${bestFixture.marketsCount} mercados disponibles${colors.reset}`);
      console.log(`🆔 ${bestFixture.id}`);
      
      console.log(`\n${colors.cyan}🚀 COMANDOS PARA PROBAR:${colors.reset}`);
      console.log(`# Ver todas las mejores odds:`);
      console.log(`curl "${BASE_URL}/api/odds/fixture/${bestFixture.id}/best"`);
      
      console.log(`\n# Crear script específico:`);
      console.log(`node -e "`);
      console.log(`const axios = require('axios');`);
      console.log(`axios.get('${BASE_URL}/api/odds/fixture/${bestFixture.id}/best')`);
      console.log(`.then(res => {`);
      console.log(`  console.log('🏆 ${bestFixture.homeTeam} vs ${bestFixture.awayTeam}');`);
      console.log(`  console.log('📊 Mercados:', Object.keys(res.data.data.bestOdds || {}));`);
      console.log(`  console.log(''); `);
      console.log(`  Object.entries(res.data.data.bestOdds || {}).forEach(([market, data]) => {`);
      console.log(`    console.log(market + ':', Object.keys(data.bestOdds || {}));`);
      console.log(`  });`);
      console.log(`})`);
      console.log(`"`);
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Error general: ${error.message}${colors.reset}`);
  }
}

// Función para probar un fixture específico con odds detalladas
async function testSpecificFixture(fixtureId) {
  console.log(`${colors.bright}🎯 ANÁLISIS DETALLADO DEL FIXTURE: ${fixtureId}${colors.reset}\n`);
  
  try {
    // Obtener información del fixture
    const fixtureResponse = await axios.get(`${BASE_URL}/api/fixtures/today`);
    const fixture = fixtureResponse.data.data.fixtures.find(f => f.id === fixtureId);
    
    if (!fixture) {
      console.log(`❌ Fixture no encontrado`);
      return;
    }
    
    console.log(`⚽ ${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name}`);
    console.log(`🏆 ${fixture.league?.name}`);
    console.log(`📍 ${fixture.status}\n`);
    
    // Obtener odds
    const oddsResponse = await axios.get(`${BASE_URL}/api/odds/fixture/${fixtureId}/best`);
    
    if (oddsResponse.data.data?.bestOdds) {
      const markets = oddsResponse.data.data.bestOdds;
      const marketKeys = Object.keys(markets);
      
      console.log(`📊 ${marketKeys.length} mercados con odds disponibles:\n`);
      
      Object.entries(markets).forEach(([marketKey, marketData]) => {
        console.log(`💰 ${marketData.market?.name || marketKey}:`);
        
        if (marketData.bestOdds) {
          Object.entries(marketData.bestOdds).forEach(([outcome, data]) => {
            console.log(`   ${outcome}: ${data.odds} (${data.bookmaker})`);
          });
        }
        console.log('');
      });
    } else {
      console.log(`❌ No hay odds disponibles para este fixture`);
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Verificar argumentos
const arg = process.argv[2];

if (arg && arg.length > 10) {
  // Si es un ID de fixture (UUID), analizarlo específicamente
  testSpecificFixture(arg);
} else {
  // Buscar fixtures con más odds
  findFixturesWithMostOdds();
}

// Ejemplos de uso:
// node find-best-odds.js                           // Buscar mejores fixtures
// node find-best-odds.js FIXTURE_ID                // Analizar fixture específico