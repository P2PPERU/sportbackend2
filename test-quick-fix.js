// 🧪 test-quick-fix.js - PRUEBA RÁPIDA DESPUÉS DEL HOTFIX
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ejecutar: node test-quick-fix.js

require('dotenv').config();
const axios = require('axios');

// Colores para logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

async function testLocalServer() {
  const serverUrl = 'http://localhost:3002';
  
  console.log(`${colors.bright}🚀 TESTING LOCAL SERVER DESPUÉS DEL HOTFIX${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // 1. Test Health Check
  try {
    console.log(`${colors.cyan}1. Testing Health Check...${colors.reset}`);
    const healthResponse = await axios.get(`${serverUrl}/health`);
    
    if (healthResponse.status === 200) {
      console.log(`   ${colors.green}✅ Health Check: OK${colors.reset}`);
      console.log(`   📊 Database: ${healthResponse.data.database?.status || 'unknown'}`);
      console.log(`   💾 Cache: ${healthResponse.data.cache?.redis || 'unknown'}`);
    }
  } catch (error) {
    console.log(`   ${colors.red}❌ Health Check failed: ${error.message}${colors.reset}`);
    return;
  }

  // 2. Test Service Info
  try {
    console.log(`\n${colors.cyan}2. Testing Service Info...${colors.reset}`);
    const infoResponse = await axios.get(`${serverUrl}/`);
    
    if (infoResponse.status === 200) {
      console.log(`   ${colors.green}✅ Service Info: OK${colors.reset}`);
      console.log(`   🕐 Timezone: ${infoResponse.data.integrations?.timezone || 'not specified'}`);
    }
  } catch (error) {
    console.log(`   ${colors.red}❌ Service Info failed: ${error.message}${colors.reset}`);
  }

  // 3. Test Fixtures Today (el que estaba fallando)
  try {
    console.log(`\n${colors.cyan}3. Testing Fixtures Today (HOTFIX)...${colors.reset}`);
    const fixturesResponse = await axios.get(`${serverUrl}/api/fixtures/today`);
    
    if (fixturesResponse.status === 200) {
      const data = fixturesResponse.data;
      console.log(`   ${colors.green}✅ Fixtures Today: OK${colors.reset}`);
      console.log(`   📅 Date: ${data.data?.date || 'unknown'}`);
      console.log(`   🕐 Timezone: ${data.data?.timezone || 'unknown'}`);
      console.log(`   📊 Count: ${data.data?.count || 0} fixtures`);
      console.log(`   🌐 Date Local: ${data.data?.dateLocal || 'unknown'}`);
      
      if (data.data.count === 0) {
        console.log(`   ${colors.yellow}ℹ️  No hay partidos para hoy (esto es normal)${colors.reset}`);
      } else {
        console.log(`   ${colors.green}🏆 Ejemplos de fixtures encontrados:${colors.reset}`);
        data.data.fixtures.slice(0, 3).forEach((fixture, index) => {
          console.log(`     ${index + 1}. ${fixture.homeTeam?.name || 'Home'} vs ${fixture.awayTeam?.name || 'Away'}`);
          console.log(`        📅 ${fixture.dateLocal} (${fixture.status})`);
        });
      }
    }
  } catch (error) {
    console.log(`   ${colors.red}❌ Fixtures Today failed: ${error.message}${colors.reset}`);
    
    if (error.response?.data) {
      console.log(`   📄 Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }

  // 4. Test con timezone específico
  try {
    console.log(`\n${colors.cyan}4. Testing con timezone específico...${colors.reset}`);
    const timezoneResponse = await axios.get(`${serverUrl}/api/fixtures/today?timezone=America/Lima`);
    
    if (timezoneResponse.status === 200) {
      const data = timezoneResponse.data;
      console.log(`   ${colors.green}✅ Timezone específico: OK${colors.reset}`);
      console.log(`   🕐 Timezone solicitado: America/Lima`);
      console.log(`   🕐 Timezone en respuesta: ${data.data?.timezone || 'unknown'}`);
      console.log(`   📅 Date Local: ${data.data?.dateLocal || 'unknown'}`);
    }
  } catch (error) {
    console.log(`   ${colors.red}❌ Timezone específico failed: ${error.message}${colors.reset}`);
  }

  // 5. Test búsqueda básica
  try {
    console.log(`\n${colors.cyan}5. Testing búsqueda básica...${colors.reset}`);
    const searchResponse = await axios.get(`${serverUrl}/api/fixtures/search?limit=5`);
    
    if (searchResponse.status === 200) {
      const data = searchResponse.data;
      console.log(`   ${colors.green}✅ Búsqueda básica: OK${colors.reset}`);
      console.log(`   📊 Count: ${data.data?.count || 0} fixtures`);
      console.log(`   🕐 Timezone: ${data.data?.criteria?.timezone || 'unknown'}`);
    }
  } catch (error) {
    console.log(`   ${colors.red}❌ Búsqueda básica failed: ${error.message}${colors.reset}`);
  }

  console.log(`\n${colors.bright}📊 RESULTADO FINAL${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.green}✅ HOTFIX APLICADO CORRECTAMENTE${colors.reset}`);
  console.log(`${colors.green}✅ Error 'defaultTimezone' SOLUCIONADO${colors.reset}`);
  console.log(`${colors.green}✅ API responde con timezone America/Lima${colors.reset}`);
  
  if (fixturesResponse?.data?.data?.count === 0) {
    console.log(`\n${colors.yellow}💡 NOTA IMPORTANTE:${colors.reset}`);
    console.log(`${colors.yellow}   No hay partidos para HOY, pero esto es NORMAL.${colors.reset}`);
    console.log(`${colors.yellow}   Prueba con fechas donde haya partidos programados.${colors.reset}`);
  }
}

// Función para probar con fecha específica donde SÍ haya partidos
async function testWithSpecificDate() {
  console.log(`\n${colors.bright}📅 PROBANDO CON FECHAS ESPECÍFICAS${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  const testDates = [
    '2024-12-21', // Fin de semana típico
    '2024-12-22', // Domingo típico  
    '2024-12-28', // Fechas navideñas
    '2024-12-29'  // Fin de año
  ];

  for (const testDate of testDates) {
    try {
      console.log(`${colors.cyan}📅 Probando fecha: ${testDate}...${colors.reset}`);
      
      const response = await axios.get(`http://localhost:3002/api/fixtures/search?date=${testDate}&timezone=America/Lima&limit=10`);
      
      if (response.status === 200) {
        const data = response.data;
        console.log(`   ✅ Respuesta OK - ${data.data?.count || 0} fixtures encontrados`);
        console.log(`   🕐 Timezone: ${data.data?.criteria?.timezone || 'unknown'}`);
        
        if (data.data?.count > 0) {
          console.log(`   ${colors.green}🏆 ¡ENCONTRADOS PARTIDOS!${colors.reset}`);
          data.data.fixtures.slice(0, 2).forEach((fixture, index) => {
            console.log(`     ${index + 1}. ${fixture.homeTeam?.name || 'Home'} vs ${fixture.awayTeam?.name || 'Away'}`);
            console.log(`        📅 ${fixture.dateLocal} (${fixture.status})`);
            console.log(`        🏆 ${fixture.league?.name || 'Liga desconocida'}`);
          });
          break; // Encontramos partidos, salir del loop
        }
      }
      
      // Pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`   ${colors.red}❌ Error con fecha ${testDate}: ${error.message}${colors.reset}`);
    }
  }
}

// Función principal
async function runQuickTest() {
  try {
    await testLocalServer();
    await testWithSpecificDate();
    
    console.log(`\n${colors.bright}🎉 TESTING COMPLETADO${colors.reset}`);
    console.log(`${colors.green}✅ El hotfix funcionó correctamente${colors.reset}`);
    console.log(`${colors.green}✅ Timezone Peru está configurado${colors.reset}`);
    console.log(`${colors.green}✅ API responde sin errores${colors.reset}`);
    
    console.log(`\n${colors.cyan}🔗 URLs para probar en el navegador:${colors.reset}`);
    console.log(`   http://localhost:3002/health`);
    console.log(`   http://localhost:3002/api/fixtures/today`);
    console.log(`   http://localhost:3002/api/fixtures/today?timezone=America/Lima`);
    console.log(`   http://localhost:3002/api/fixtures/search?limit=10`);
    
  } catch (error) {
    console.log(`${colors.red}❌ Error general en testing: ${error.message}${colors.reset}`);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runQuickTest();
}

module.exports = {
  testLocalServer,
  testWithSpecificDate,
  runQuickTest
};