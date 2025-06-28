// 🔥 juventus-vs-city-odds.js - ODDS COMPLETAS DEL PARTIDAZO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ejecutar: node juventus-vs-city-odds.js

const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Datos del partido encontrado
const FIXTURE_DATA = {
  id: "52ee8142-6c68-4f32-8508-7094cfdd8cd7",
  apiFootballId: 1321724,
  homeTeam: "Juventus",
  awayTeam: "Manchester City",
  league: "FIFA Club World Cup",
  date: "26/06/2025, 14:00",
  venue: "Camping World Stadium",
  city: "Orlando, Florida",
  round: "Group Stage - 3"
};

async function getJuventusCityOdds() {
  console.log(`${colors.bright}🔥 JUVENTUS vs MANCHESTER CITY - ODDS DEL PARTIDAZO${colors.reset}\n`);
  
  console.log(`${colors.cyan}📋 INFORMACIÓN DEL PARTIDO:${colors.reset}`);
  console.log(`   🏠 Local: ${colors.bright}${FIXTURE_DATA.homeTeam}${colors.reset}`);
  console.log(`   ✈️  Visitante: ${colors.bright}${FIXTURE_DATA.awayTeam}${colors.reset}`);
  console.log(`   🏆 Competición: ${colors.yellow}${FIXTURE_DATA.league}${colors.reset}`);
  console.log(`   📅 Fecha y Hora: ${colors.green}${FIXTURE_DATA.date} (Perú)${colors.reset}`);
  console.log(`   🏟️  Estadio: ${FIXTURE_DATA.venue}, ${FIXTURE_DATA.city}`);
  console.log(`   🎯 Fase: ${FIXTURE_DATA.round}`);
  console.log(`   🔢 ID Backend: ${FIXTURE_DATA.id}`);
  console.log(`   🌐 API-Football ID: ${FIXTURE_DATA.apiFootballId}\n`);

  const baseUrl = 'http://localhost:3002';

  // 1. Obtener odds promedio (bookmaker: Average)
  try {
    console.log(`${colors.cyan}1. 💰 OBTENIENDO ODDS PROMEDIO...${colors.reset}`);
    
    const avgOddsResponse = await axios.get(`${baseUrl}/api/odds/fixture/${FIXTURE_DATA.id}?bookmaker=Average`);
    
    if (avgOddsResponse.data.success && avgOddsResponse.data.data.odds) {
      console.log(`   ${colors.green}✅ Odds promedio encontradas!${colors.reset}\n`);
      displayOddsData(avgOddsResponse.data.data, "PROMEDIO");
    } else {
      console.log(`   ${colors.yellow}⚠️  No hay odds promedio disponibles${colors.reset}`);
    }
    
  } catch (avgError) {
    console.log(`   ${colors.red}❌ Error obteniendo odds promedio: ${avgError.message}${colors.reset}`);
    
    if (avgError.response?.status === 404) {
      console.log(`   💡 Fixture no encontrado en sistema de odds`);
      console.log(`   🔄 Intentando sincronizar odds desde API-Football...`);
      
      // Intentar forzar sincronización (requiere admin)
      // await syncFixtureOdds();
    }
  }

  // 2. Obtener mejores odds
  try {
    console.log(`\n${colors.cyan}2. 🎯 OBTENIENDO MEJORES ODDS...${colors.reset}`);
    
    const bestOddsResponse = await axios.get(`${baseUrl}/api/odds/fixture/${FIXTURE_DATA.id}/best`);
    
    if (bestOddsResponse.data.success && bestOddsResponse.data.data.bestOdds) {
      console.log(`   ${colors.green}✅ Mejores odds encontradas!${colors.reset}\n`);
      displayBestOdds(bestOddsResponse.data.data.bestOdds);
    } else {
      console.log(`   ${colors.yellow}⚠️  No hay mejores odds disponibles${colors.reset}`);
    }
    
  } catch (bestError) {
    console.log(`   ${colors.red}❌ Error obteniendo mejores odds: ${bestError.message}${colors.reset}`);
  }

  // 3. Intentar con bookmakers específicos
  const bookmakers = ['Bet365', 'William Hill', 'Betfair', 'Unibet', 'Pinnacle'];
  
  for (const bookmaker of bookmakers) {
    try {
      console.log(`\n${colors.cyan}3. 🏪 ODDS DE ${bookmaker.toUpperCase()}...${colors.reset}`);
      
      const bookmakerOdds = await axios.get(`${baseUrl}/api/odds/fixture/${FIXTURE_DATA.id}?bookmaker=${bookmaker}`);
      
      if (bookmakerOdds.data.success && bookmakerOdds.data.data.odds) {
        console.log(`   ${colors.green}✅ ${bookmaker} - Odds encontradas!${colors.reset}`);
        displayOddsData(bookmakerOdds.data.data, bookmaker.toUpperCase());
        break; // Solo mostrar el primero que tenga datos
      } else {
        console.log(`   ${colors.yellow}⚠️  ${bookmaker} - Sin odds${colors.reset}`);
      }
      
    } catch (bookmakerError) {
      console.log(`   ${colors.red}❌ ${bookmaker} - Error: ${bookmakerError.message}${colors.reset}`);
    }
  }

  // 4. Información adicional
  console.log(`\n${colors.cyan}4. 📊 ANÁLISIS DEL PARTIDO:${colors.reset}`);
  console.log(`   ${colors.bright}⭐ EQUIPOS DE ALTO NIVEL:${colors.reset}`);
  console.log(`      🇮🇹 Juventus: Gigante italiano, múltiple campeón`);
  console.log(`      🏴󠁧󠁢󠁥󠁮󠁧󠁿 Manchester City: Actual campeón de Premier League`);
  console.log(`   ${colors.bright}🎯 EXPECTATIVAS:${colors.reset}`);
  console.log(`      📈 Partido muy disputado entre dos potencias`);
  console.log(`      ⚽ Probable muchos goles (ambos equipos ofensivos)`);
  console.log(`      🎪 Gran espectáculo en Orlando`);

  // 5. URLs para verificar manualmente
  console.log(`\n${colors.cyan}5. 🔗 URLS PARA VERIFICAR MANUALMENTE:${colors.reset}`);
  console.log(`   💰 Odds promedio: ${baseUrl}/api/odds/fixture/${FIXTURE_DATA.id}`);
  console.log(`   🎯 Mejores odds: ${baseUrl}/api/odds/fixture/${FIXTURE_DATA.id}/best`);
  console.log(`   🏪 Bet365: ${baseUrl}/api/odds/fixture/${FIXTURE_DATA.id}?bookmaker=Bet365`);
  console.log(`   📊 Info fixture: ${baseUrl}/api/fixtures/${FIXTURE_DATA.id}`);

  // 6. Troubleshooting si no hay odds
  console.log(`\n${colors.cyan}6. 🔧 SI NO HAY ODDS DISPONIBLES:${colors.reset}`);
  console.log(`   ${colors.yellow}💡 Posibles razones:${colors.reset}`);
  console.log(`      1. Odds aún no sincronizadas desde API-Football`);
  console.log(`      2. Competición muy nueva (Mundial Clubes 2025)`);
  console.log(`      3. Partido muy lejano (las odds aparecen más cerca)`);
  console.log(`      4. API-Football no tiene odds para esta competición`);
  
  console.log(`\n   ${colors.green}✅ Soluciones:${colors.reset}`);
  console.log(`      1. Ejecutar sincronización manual (admin)`);
  console.log(`      2. Verificar directamente en API-Football`);
  console.log(`      3. Esperar más cerca del partido`);
  console.log(`      4. Revisar otros partidos del día con odds`);

  console.log(`\n${colors.bright}🎊 ¡DISFRUTA DEL PARTIDAZO JUVENTUS vs CITY! 🏆${colors.reset}`);
}

function displayOddsData(oddsData, source) {
  const markets = oddsData.odds;
  
  console.log(`   ${colors.bright}📊 ODDS - ${source}:${colors.reset}`);
  console.log(`   ${colors.cyan}Last Updated: ${oddsData.lastSync}${colors.reset}\n`);

  // Mercado 1X2 (Ganador del partido)
  if (markets['1X2']) {
    const market1x2 = markets['1X2'];
    console.log(`   ${colors.yellow}🎯 GANADOR DEL PARTIDO (1X2):${colors.reset}`);
    
    if (market1x2.odds.HOME) {
      const homeOdd = market1x2.odds.HOME;
      console.log(`      🏠 ${FIXTURE_DATA.homeTeam}: ${colors.green}${homeOdd.odds}${colors.reset} (${homeOdd.impliedProbability.toFixed(1)}% prob)`);
    }
    
    if (market1x2.odds.DRAW) {
      const drawOdd = market1x2.odds.DRAW;
      console.log(`      🤝 Empate: ${colors.yellow}${drawOdd.odds}${colors.reset} (${drawOdd.impliedProbability.toFixed(1)}% prob)`);
    }
    
    if (market1x2.odds.AWAY) {
      const awayOdd = market1x2.odds.AWAY;
      console.log(`      ✈️  ${FIXTURE_DATA.awayTeam}: ${colors.blue}${awayOdd.odds}${colors.reset} (${awayOdd.impliedProbability.toFixed(1)}% prob)`);
    }
    console.log();
  }

  // Over/Under 2.5 goles
  if (markets['OVER_UNDER_2_5']) {
    const ouMarket = markets['OVER_UNDER_2_5'];
    console.log(`   ${colors.yellow}⚽ TOTAL DE GOLES (Over/Under 2.5):${colors.reset}`);
    
    if (ouMarket.odds.OVER) {
      const overOdd = ouMarket.odds.OVER;
      console.log(`      📈 Más de 2.5 goles: ${colors.green}${overOdd.odds}${colors.reset} (${overOdd.impliedProbability.toFixed(1)}% prob)`);
    }
    
    if (ouMarket.odds.UNDER) {
      const underOdd = ouMarket.odds.UNDER;
      console.log(`      📉 Menos de 2.5 goles: ${colors.red}${underOdd.odds}${colors.reset} (${underOdd.impliedProbability.toFixed(1)}% prob)`);
    }
    console.log();
  }

  // Both Teams Score
  if (markets['BTTS']) {
    const bttsMarket = markets['BTTS'];
    console.log(`   ${colors.yellow}🥅 AMBOS EQUIPOS MARCAN:${colors.reset}`);
    
    if (bttsMarket.odds.YES) {
      const yesOdd = bttsMarket.odds.YES;
      console.log(`      ✅ Sí marcan: ${colors.green}${yesOdd.odds}${colors.reset} (${yesOdd.impliedProbability.toFixed(1)}% prob)`);
    }
    
    if (bttsMarket.odds.NO) {
      const noOdd = bttsMarket.odds.NO;
      console.log(`      ❌ No marcan: ${colors.red}${noOdd.odds}${colors.reset} (${noOdd.impliedProbability.toFixed(1)}% prob)`);
    }
    console.log();
  }

  // Double Chance
  if (markets['DOUBLE_CHANCE']) {
    const dcMarket = markets['DOUBLE_CHANCE'];
    console.log(`   ${colors.yellow}🛡️  DOBLE OPORTUNIDAD:${colors.reset}`);
    
    if (dcMarket.odds['1X']) {
      console.log(`      🏠X Local o Empate: ${colors.green}${dcMarket.odds['1X'].odds}${colors.reset}`);
    }
    if (dcMarket.odds['X2']) {
      console.log(`      X2️⃣ Empate o Visitante: ${colors.blue}${dcMarket.odds['X2'].odds}${colors.reset}`);
    }
    if (dcMarket.odds['12']) {
      console.log(`      🔥 Local o Visitante: ${colors.magenta}${dcMarket.odds['12'].odds}${colors.reset}`);
    }
    console.log();
  }

  // Mostrar todos los mercados disponibles
  const marketCount = Object.keys(markets).length;
  if (marketCount > 0) {
    console.log(`   ${colors.cyan}📋 Total mercados disponibles: ${marketCount}${colors.reset}`);
    console.log(`   ${colors.cyan}🔗 Ver todos: Ver URL completa arriba${colors.reset}\n`);
  }
}

function displayBestOdds(bestOddsData) {
  console.log(`   ${colors.bright}🏆 MEJORES ODDS (Máxima ganancia):${colors.reset}\n`);
  
  Object.entries(bestOddsData).forEach(([marketKey, marketData]) => {
    console.log(`   ${colors.yellow}${marketData.market.name}:${colors.reset}`);
    
    Object.entries(marketData.bestOdds).forEach(([outcome, oddData]) => {
      const emoji = getOutcomeEmoji(outcome, marketKey);
      console.log(`      ${emoji} ${outcome}: ${colors.bright}${oddData.odds}${colors.reset} en ${colors.cyan}${oddData.bookmaker}${colors.reset}`);
    });
    
    console.log();
  });
}

function getOutcomeEmoji(outcome, marketKey) {
  const emojiMap = {
    'HOME': '🏠',
    'AWAY': '✈️',
    'DRAW': '🤝',
    'OVER': '📈',
    'UNDER': '📉',
    'YES': '✅',
    'NO': '❌',
    '1X': '🛡️',
    'X2': '🔷',
    '12': '🔥'
  };
  
  return emojiMap[outcome] || '⚽';
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  getJuventusCityOdds().catch(console.error);
}

module.exports = getJuventusCityOdds;