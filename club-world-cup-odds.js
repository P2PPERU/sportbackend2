// 🏆 ODDS DEL FIFA CLUB WORLD CUP - SCRIPT ESPECÍFICO
// Ejecutar: node club-world-cup-odds.js

const axios = require('axios');
const BASE_URL = 'http://localhost:3002';

// Colores para mejor visualización
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

// IDs de los partidos del Mundial de Clubes de hoy
const clubWorldCupFixtures = [
  {
    id: 'a45e00a7-1776-445a-a854-83d47db9c97f',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Fluminense',
    time: '02:00 PM',
    stadium: 'Hard Rock Stadium',
    city: 'Miami Gardens, Florida',
    referee: 'Anthony Taylor'
  },
  {
    id: '767058ef-45c6-4751-afb3-472ec58d3faa',
    homeTeam: 'Borussia Dortmund',
    awayTeam: 'Ulsan Hyundai FC',
    time: '02:00 PM',
    stadium: 'TQL Stadium',
    city: 'Cincinnati, Ohio',
    referee: 'Tori Penso'
  }
];

// Función para mostrar odds de un partido
async function showMatchOdds(fixture) {
  console.log(`${colors.bright}⚽ ${fixture.homeTeam} vs ${fixture.awayTeam}${colors.reset}`);
  console.log(`${colors.cyan}🏟️ ${fixture.stadium} - ${fixture.city}${colors.reset}`);
  console.log(`${colors.cyan}⏰ ${fixture.time} | 👨‍⚖️ ${fixture.referee}${colors.reset}`);
  console.log(`${colors.cyan}🆔 ${fixture.id}${colors.reset}`);
  console.log('-'.repeat(60));
  
  try {
    // Obtener mejores odds
    console.log(`${colors.yellow}🏆 MEJORES ODDS DISPONIBLES:${colors.reset}\n`);
    const bestResponse = await axios.get(`${BASE_URL}/api/odds/fixture/${fixture.id}/best`);
    
    if (bestResponse.data.data?.bestOdds) {
      const markets = bestResponse.data.data.bestOdds;
      
      // 1X2 - Resultado del partido
      if (markets['1X2']) {
        console.log(`${colors.green}💰 RESULTADO DEL PARTIDO (1X2):${colors.reset}`);
        const market1X2 = markets['1X2'].bestOdds;
        if (market1X2.HOME) console.log(`   🏠 ${fixture.homeTeam}: ${market1X2.HOME.odds} (${market1X2.HOME.bookmaker})`);
        if (market1X2.DRAW) console.log(`   ⚖️ Empate: ${market1X2.DRAW.odds} (${market1X2.DRAW.bookmaker})`);
        if (market1X2.AWAY) console.log(`   ✈️ ${fixture.awayTeam}: ${market1X2.AWAY.odds} (${market1X2.AWAY.bookmaker})`);
        console.log('');
      }
      
      // Both Teams to Score
      if (markets['BTTS']) {
        console.log(`${colors.green}⚽ AMBOS EQUIPOS MARCAN:${colors.reset}`);
        const btts = markets['BTTS'].bestOdds;
        if (btts.YES) console.log(`   ✅ Sí: ${btts.YES.odds} (${btts.YES.bookmaker})`);
        if (btts.NO) console.log(`   ❌ No: ${btts.NO.odds} (${btts.NO.bookmaker})`);
        console.log('');
      }
      
      // Over/Under 2.5
      if (markets['OVER_UNDER_2_5']) {
        console.log(`${colors.green}📊 MÁS/MENOS 2.5 GOLES:${colors.reset}`);
        const ou25 = markets['OVER_UNDER_2_5'].bestOdds;
        if (ou25.OVER) console.log(`   📈 Más de 2.5: ${ou25.OVER.odds} (${ou25.OVER.bookmaker})`);
        if (ou25.UNDER) console.log(`   📉 Menos de 2.5: ${ou25.UNDER.odds} (${ou25.UNDER.bookmaker})`);
        console.log('');
      }
      
      // Primer tiempo
      if (markets['HT_1X2']) {
        console.log(`${colors.green}🕐 RESULTADO PRIMER TIEMPO:${colors.reset}`);
        const ht1x2 = markets['HT_1X2'].bestOdds;
        if (ht1x2.HOME) console.log(`   🏠 ${fixture.homeTeam}: ${ht1x2.HOME.odds} (${ht1x2.HOME.bookmaker})`);
        if (ht1x2.DRAW) console.log(`   ⚖️ Empate: ${ht1x2.DRAW.odds} (${ht1x2.DRAW.bookmaker})`);
        if (ht1x2.AWAY) console.log(`   ✈️ ${fixture.awayTeam}: ${ht1x2.AWAY.odds} (${ht1x2.AWAY.bookmaker})`);
        console.log('');
      }
      
      // Half Time / Full Time
      if (markets['HT_FT']) {
        console.log(`${colors.green}🔄 DESCANSO/FINAL (HT/FT):${colors.reset}`);
        const htft = markets['HT_FT'].bestOdds;
        if (htft.HOME_HOME) console.log(`   🏠/🏠 ${fixture.homeTeam}/${fixture.homeTeam}: ${htft.HOME_HOME.odds} (${htft.HOME_HOME.bookmaker})`);
        if (htft.DRAW_HOME) console.log(`   ⚖️/🏠 Empate/${fixture.homeTeam}: ${htft.DRAW_HOME.odds} (${htft.DRAW_HOME.bookmaker})`);
        if (htft.AWAY_AWAY) console.log(`   ✈️/✈️ ${fixture.awayTeam}/${fixture.awayTeam}: ${htft.AWAY_AWAY.odds} (${htft.AWAY_AWAY.bookmaker})`);
        console.log('');
      }
      
      // Corners
      if (markets['CORNERS_1X2']) {
        console.log(`${colors.green}🚩 GANADOR DE CORNERS:${colors.reset}`);
        const corners = markets['CORNERS_1X2'].bestOdds;
        if (corners.HOME) console.log(`   🏠 ${fixture.homeTeam}: ${corners.HOME.odds} (${corners.HOME.bookmaker})`);
        if (corners.DRAW) console.log(`   ⚖️ Empate: ${corners.DRAW.odds} (${corners.DRAW.bookmaker})`);
        if (corners.AWAY) console.log(`   ✈️ ${fixture.awayTeam}: ${corners.AWAY.odds} (${corners.AWAY.bookmaker})`);
        console.log('');
      }
      
      // Primer gol
      if (markets['FIRST_GOAL']) {
        console.log(`${colors.green}🥅 PRIMER GOL:${colors.reset}`);
        const firstGoal = markets['FIRST_GOAL'].bestOdds;
        if (firstGoal.HOME) console.log(`   🏠 ${fixture.homeTeam}: ${firstGoal.HOME.odds} (${firstGoal.HOME.bookmaker})`);
        if (firstGoal.AWAY) console.log(`   ✈️ ${fixture.awayTeam}: ${firstGoal.AWAY.odds} (${firstGoal.AWAY.bookmaker})`);
        console.log('');
      }
      
      // Win to Nil
      if (markets['WIN_TO_NIL']) {
        console.log(`${colors.green}🛡️ GANAR SIN ENCAJAR:${colors.reset}`);
        const wtn = markets['WIN_TO_NIL'].bestOdds;
        if (wtn.HOME) console.log(`   🏠 ${fixture.homeTeam}: ${wtn.HOME.odds} (${wtn.HOME.bookmaker})`);
        if (wtn.AWAY) console.log(`   ✈️ ${fixture.awayTeam}: ${wtn.AWAY.odds} (${wtn.AWAY.bookmaker})`);
        console.log('');
      }
      
      // Mostrar todos los mercados disponibles
      const allMarkets = Object.keys(markets);
      console.log(`${colors.cyan}📋 MERCADOS DISPONIBLES (${allMarkets.length}):${colors.reset}`);
      console.log(`   ${allMarkets.join(', ')}`);
      
    } else {
      console.log(`${colors.red}❌ No hay odds disponibles para este partido${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Error obteniendo odds: ${error.message}${colors.reset}`);
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// Función para comparar odds entre partidos
async function compareMatchOdds() {
  console.log(`${colors.bright}📊 COMPARACIÓN DE ODDS ENTRE PARTIDOS:${colors.reset}\n`);
  
  const comparison = {};
  
  for (const fixture of clubWorldCupFixtures) {
    try {
      const response = await axios.get(`${BASE_URL}/api/odds/fixture/${fixture.id}/best`);
      
      if (response.data.data?.bestOdds?.['1X2']) {
        const odds1X2 = response.data.data.bestOdds['1X2'].bestOdds;
        comparison[fixture.homeTeam + ' vs ' + fixture.awayTeam] = {
          home: odds1X2.HOME?.odds || 'N/A',
          draw: odds1X2.DRAW?.odds || 'N/A',
          away: odds1X2.AWAY?.odds || 'N/A'
        };
      }
    } catch (error) {
      console.log(`Error con ${fixture.homeTeam} vs ${fixture.awayTeam}: ${error.message}`);
    }
  }
  
  console.log('🏆 COMPARACIÓN 1X2:');
  Object.entries(comparison).forEach(([match, odds]) => {
    console.log(`   ${match}:`);
    console.log(`     Local: ${odds.home} | Empate: ${odds.draw} | Visitante: ${odds.away}`);
  });
}

// Función principal
async function showClubWorldCupOdds() {
  console.log(`${colors.bright}🏆 FIFA CLUB WORLD CUP - ODDS DE HOY${colors.reset}`);
  console.log(`${colors.cyan}📅 ${new Date().toLocaleDateString('es-ES')} | Group Stage - Round 3${colors.reset}`);
  console.log('='.repeat(80) + '\n');
  
  // Mostrar odds de cada partido
  for (const fixture of clubWorldCupFixtures) {
    await showMatchOdds(fixture);
    // Pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Comparar odds
  await compareMatchOdds();
  
  console.log(`\n${colors.bright}💡 CONSEJOS:${colors.reset}`);
  console.log('   🎯 Usa las mejores odds de cada bookmaker');
  console.log('   📊 Compara probabilidades implícitas');
  console.log('   🏆 Mundial de Clubes = odds competitivas');
  console.log('   ⚡ Odds pueden cambiar cerca del partido');
  
  console.log(`\n${colors.cyan}🔗 Para más detalles:${colors.reset}`);
  clubWorldCupFixtures.forEach(fixture => {
    console.log(`   curl "${BASE_URL}/api/odds/fixture/${fixture.id}/best"`);
  });
}

// Función para solo mostrar odds rápidas
async function quickOdds() {
  console.log(`${colors.bright}⚡ ODDS RÁPIDAS - FIFA CLUB WORLD CUP${colors.reset}\n`);
  
  for (const fixture of clubWorldCupFixtures) {
    try {
      const response = await axios.get(`${BASE_URL}/api/odds/fixture/${fixture.id}/best`);
      
      console.log(`🏆 ${fixture.homeTeam} vs ${fixture.awayTeam}`);
      
      if (response.data.data?.bestOdds?.['1X2']) {
        const odds1X2 = response.data.data.bestOdds['1X2'].bestOdds;
        console.log(`   1X2: ${odds1X2.HOME?.odds || 'N/A'} - ${odds1X2.DRAW?.odds || 'N/A'} - ${odds1X2.AWAY?.odds || 'N/A'}`);
      }
      
      if (response.data.data?.bestOdds?.['BTTS']) {
        const btts = response.data.data.bestOdds['BTTS'].bestOdds;
        console.log(`   BTTS: Sí ${btts.YES?.odds || 'N/A'} | No ${btts.NO?.odds || 'N/A'}`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${fixture.homeTeam} vs ${fixture.awayTeam}: Error`);
    }
  }
}

// Verificar argumentos de línea de comandos
const arg = process.argv[2];

if (arg === 'quick' || arg === 'q') {
  quickOdds();
} else if (arg === 'compare' || arg === 'c') {
  compareMatchOdds();
} else {
  showClubWorldCupOdds();
}

// Ejemplos de uso:
// node club-world-cup-odds.js          // Odds detalladas
// node club-world-cup-odds.js quick    // Odds rápidas
// node club-world-cup-odds.js compare  // Solo comparación