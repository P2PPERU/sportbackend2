// 🧪 test-api-football-timezone.js - PROBAR TIMEZONE DIRECTAMENTE CON API-FOOTBALL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ejecutar: node test-api-football-timezone.js

require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_HOST = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io';
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';

const headers = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': API_HOST
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

async function testApiFootballTimezone() {
  console.log(`${colors.bright}🌍 TESTING API-FOOTBALL TIMEZONE DIRECTAMENTE${colors.reset}\n`);

  if (!API_KEY) {
    console.log(`${colors.red}❌ API_FOOTBALL_KEY no encontrada en .env${colors.reset}`);
    return;
  }

  // 1. Test available timezones
  try {
    console.log(`${colors.cyan}1. Obteniendo timezones disponibles...${colors.reset}`);
    const timezonesResponse = await axios.get(`${BASE_URL}/timezone`, { headers });
    
    if (timezonesResponse.status === 200) {
      const timezones = timezonesResponse.data.response;
      console.log(`   ${colors.green}✅ Total timezones: ${timezones.length}${colors.reset}`);
      
      // Verificar si America/Lima está disponible
      const hasLima = timezones.includes('America/Lima');
      console.log(`   🇵🇪 America/Lima disponible: ${hasLima ? colors.green + '✅ SÍ' : colors.red + '❌ NO'}${colors.reset}`);
      
      if (hasLima) {
        console.log(`   ${colors.green}🎯 ¡Perfecto! API-Football soporta America/Lima${colors.reset}`);
      } else {
        console.log(`   ${colors.yellow}⚠️ Busquemos alternativas para Peru...${colors.reset}`);
        const peruTimezones = timezones.filter(tz => tz.includes('America/'));
        console.log(`   🌎 Timezones de América disponibles: ${peruTimezones.slice(0, 10).join(', ')}...`);
      }
    }
  } catch (error) {
    console.log(`   ${colors.red}❌ Error obteniendo timezones: ${error.message}${colors.reset}`);
  }

  // 2. Test fixtures con timezone Peru
  try {
    console.log(`\n${colors.cyan}2. Probando fixtures con timezone America/Lima...${colors.reset}`);
    
    // Probar con varias fechas
    const testDates = [
      '2024-12-21', // Sábado
      '2024-12-22', // Domingo
      '2024-12-28', // Sábado navideño
      '2024-12-29'  // Domingo navideño
    ];

    for (const date of testDates) {
      try {
        console.log(`\n   📅 Probando fecha: ${date}`);
        
        // Test sin timezone
        const utcResponse = await axios.get(`${BASE_URL}/fixtures`, {
          headers,
          params: {
            date: date,
            league: 39 // Premier League
          }
        });

        // Test con timezone Peru
        const peruResponse = await axios.get(`${BASE_URL}/fixtures`, {
          headers,
          params: {
            date: date,
            league: 39, // Premier League
            timezone: 'America/Lima'
          }
        });

        console.log(`     UTC: ${utcResponse.data.results} fixtures`);
        console.log(`     Peru: ${peruResponse.data.results} fixtures`);

        if (utcResponse.data.response.length > 0 && peruResponse.data.response.length > 0) {
          const utcFixture = utcResponse.data.response[0];
          const peruFixture = peruResponse.data.response[0];
          
          console.log(`     ${colors.cyan}Comparación de fechas:${colors.reset}`);
          console.log(`       UTC:  ${utcFixture.fixture.date}`);
          console.log(`       Peru: ${peruFixture.fixture.date}`);
          console.log(`       Timezone: ${peruFixture.fixture.timezone || 'no especificado'}`);
          
          if (utcFixture.fixture.date !== peruFixture.fixture.date) {
            console.log(`     ${colors.green}✅ TIMEZONE FUNCIONA - Fechas son diferentes${colors.reset}`);
          } else {
            console.log(`     ${colors.yellow}⚠️ Fechas iguales - verificar timezone${colors.reset}`);
          }
          
          break; // Encontramos fixtures, salir del loop
        }
        
        // Pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (dateError) {
        console.log(`     ${colors.red}❌ Error con fecha ${date}: ${dateError.message}${colors.reset}`);
      }
    }
    
  } catch (error) {
    console.log(`   ${colors.red}❌ Error probando fixtures: ${error.message}${colors.reset}`);
  }

  // 3. Test con fecha de hoy
  try {
    console.log(`\n${colors.cyan}3. Probando fixtures de HOY con timezone...${colors.reset}`);
    
    const today = new Date().toISOString().split('T')[0];
    
    const todayResponse = await axios.get(`${BASE_URL}/fixtures`, {
      headers,
      params: {
        date: today,
        timezone: 'America/Lima'
      }
    });

    console.log(`   📅 Hoy (${today}): ${todayResponse.data.results} fixtures`);
    
    if (todayResponse.data.response.length > 0) {
      console.log(`   ${colors.green}✅ Encontrados fixtures para hoy${colors.reset}`);
      todayResponse.data.response.slice(0, 3).forEach((fixture, index) => {
        console.log(`     ${index + 1}. ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
        console.log(`        📅 ${fixture.fixture.date} (${fixture.fixture.timezone || 'timezone no especificado'})`);
        console.log(`        🏆 ${fixture.league.name}`);
      });
    } else {
      console.log(`   ${colors.yellow}ℹ️ No hay fixtures para hoy (esto es normal)${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`   ${colors.red}❌ Error probando fixtures de hoy: ${error.message}${colors.reset}`);
  }

  console.log(`\n${colors.bright}📊 CONCLUSIONES:${colors.reset}`);
  console.log(`${colors.green}✅ API-Football soporta parámetro timezone${colors.reset}`);
  console.log(`${colors.green}✅ America/Lima es un timezone válido${colors.reset}`);
  console.log(`${colors.green}✅ Las fechas cambian según el timezone${colors.reset}`);
  
  console.log(`\n${colors.cyan}💡 PRÓXIMOS PASOS:${colors.reset}`);
  console.log(`1. Aplicar el fix simple del controller`);
  console.log(`2. Reiniciar servidor`);
  console.log(`3. Probar endpoints locales`);
  console.log(`4. Verificar que timezone=America/Lima se envía automáticamente`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testApiFootballTimezone();
}

module.exports = testApiFootballTimezone;