// 🧪 SCRIPT DE PRUEBA COMPLETO PARA TIMEZONE PERÚ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Archivo: test-timezone-complete.js
// Ejecutar: node test-timezone-complete.js

require('dotenv').config();
const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════
const API_KEY = process.env.API_FOOTBALL_KEY;
const API_HOST = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io';
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';

const headers = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': API_HOST
};

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

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES DE TESTING
// ═══════════════════════════════════════════════════════════════════

async function testApiFootballConnection() {
  console.log(`${colors.cyan}🔌 Testing connection to API-Football...${colors.reset}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/status`, { headers });
    
    if (response.status === 200) {
      console.log(`${colors.green}✅ API-Football connection: OK${colors.reset}`);
      console.log(`   Account: ${response.data.account?.firstname || 'Unknown'}`);
      console.log(`   Plan: ${response.data.subscription?.plan || 'Unknown'}`);
      console.log(`   Requests: ${response.data.requests?.current || 0}/${response.data.requests?.limit_day || 'Unknown'}`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}❌ API-Football connection failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testTimezoneRequest() {
  console.log(`\n${colors.cyan}🕐 Testing timezone requests...${colors.reset}`);
  
  const today = new Date().toISOString().split('T')[0];
  const timezones = ['UTC', 'America/Lima', 'Europe/London'];
  
  for (const timezone of timezones) {
    try {
      console.log(`\n📍 Testing timezone: ${colors.yellow}${timezone}${colors.reset}`);
      
      const response = await axios.get(`${BASE_URL}/fixtures`, {
        headers,
        params: {
          date: today,
          timezone: timezone,
          league: 39 // Premier League como ejemplo
        }
      });
      
      if (response.data.response && response.data.response.length > 0) {
        const fixture = response.data.response[0];
        console.log(`   ✅ Fixtures found: ${response.data.response.length}`);
        console.log(`   🏆 Example: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
        console.log(`   📅 Date: ${fixture.fixture.date}`);
        console.log(`   🕐 Timezone: ${fixture.fixture.timezone}`);
        
        // Convertir a hora local de Peru para comparar
        const peruTime = new Date(fixture.fixture.date).toLocaleString('es-PE', {
          timeZone: 'America/Lima',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        console.log(`   🇵🇪 Peru time: ${peruTime}`);
        
      } else {
        console.log(`   ⚠️ No fixtures found for today in timezone ${timezone}`);
      }
      
      // Pausa para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`   ${colors.red}❌ Error with timezone ${timezone}: ${error.message}${colors.reset}`);
    }
  }
}

async function testLocalServerEndpoints() {
  console.log(`\n${colors.cyan}🖥️ Testing local server endpoints...${colors.reset}`);
  
  const serverUrl = 'http://localhost:3002';
  const endpoints = [
    '/health',
    '/api/fixtures/today',
    '/api/fixtures/today?timezone=America/Lima'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing: ${colors.yellow}${endpoint}${colors.reset}`);
      
      const response = await axios.get(`${serverUrl}${endpoint}`);
      
      if (response.status === 200) {
        console.log(`   ✅ Status: ${response.status}`);
        
        if (endpoint.includes('fixtures')) {
          const data = response.data;
          console.log(`   📊 Fixtures count: ${data.data?.count || 0}`);
          console.log(`   🕐 Response timezone: ${data.data?.timezone || 'not specified'}`);
          console.log(`   📅 Date: ${data.data?.date || 'not specified'}`);
          
          if (data.data?.fixtures && data.data.fixtures.length > 0) {
            const fixture = data.data.fixtures[0];
            console.log(`   🏆 Example fixture: ${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name}`);
            console.log(`   🕒 Original date: ${fixture.date}`);
            console.log(`   🕕 Local date: ${fixture.dateLocal || 'not provided'}`);
          }
        }
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`   ${colors.red}❌ Server not running on localhost:3002${colors.reset}`);
      } else {
        console.log(`   ${colors.red}❌ Error: ${error.message}${colors.reset}`);
      }
    }
  }
}

async function testTimezoneComparison() {
  console.log(`\n${colors.cyan}🔍 Testing timezone comparison...${colors.reset}`);
  
  const testDate = new Date(); // Fecha actual
  const timezones = [
    'UTC',
    'America/Lima',
    'America/New_York',
    'Europe/Madrid',
    'Asia/Tokyo'
  ];
  
  console.log(`\n📅 Current time in different timezones:`);
  console.log(`   Base time: ${testDate.toISOString()}`);
  
  timezones.forEach(timezone => {
    try {
      const localTime = testDate.toLocaleString('es-PE', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const offset = testDate.toLocaleString('en', {
        timeZone: timezone,
        timeZoneName: 'longOffset'
      }).split(' ').pop();
      
      console.log(`   ${timezone}: ${localTime} (${offset})`);
      
    } catch (error) {
      console.log(`   ${timezone}: ${colors.red}Error - ${error.message}${colors.reset}`);
    }
  });
}

async function generateTimezoneTestReport() {
  console.log(`\n${colors.cyan}📋 Generating timezone test report...${colors.reset}`);
  
  const report = {
    timestamp: new Date().toISOString(),
    peruTime: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
    tests: {
      apiConnection: false,
      timezoneRequests: false,
      localServer: false
    },
    recommendations: []
  };
  
  try {
    // Test API connection
    report.tests.apiConnection = await testApiFootballConnection();
    
    // Test timezone requests
    try {
      await testTimezoneRequest();
      report.tests.timezoneRequests = true;
    } catch (error) {
      report.recommendations.push('Check API-Football timezone parameter support');
    }
    
    // Test local server
    try {
      await testLocalServerEndpoints();
      report.tests.localServer = true;
    } catch (error) {
      report.recommendations.push('Start local development server on port 3002');
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Error generating report: ${error.message}${colors.reset}`);
  }
  
  // Add specific recommendations
  if (!report.tests.apiConnection) {
    report.recommendations.push('Verify API_FOOTBALL_KEY in .env file');
  }
  
  if (!report.tests.timezoneRequests) {
    report.recommendations.push('Implement timezone parameter in API requests');
  }
  
  if (!report.tests.localServer) {
    report.recommendations.push('Update controllers to return timezone information');
  }
  
  // Display report
  console.log(`\n${colors.bright}📊 TIMEZONE TEST REPORT${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  console.log(`📅 Generated: ${report.timestamp}`);
  console.log(`🇵🇪 Peru time: ${report.peruTime}`);
  console.log(`\n🧪 Test Results:`);
  console.log(`   API Connection: ${report.tests.apiConnection ? '✅' : '❌'}`);
  console.log(`   Timezone Requests: ${report.tests.timezoneRequests ? '✅' : '❌'}`);
  console.log(`   Local Server: ${report.tests.localServer ? '✅' : '❌'}`);
  
  if (report.recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
async function runTimezoneTests() {
  console.log(`${colors.bright}🧪 TIMEZONE TESTING SUITE FOR PERU${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  // Verificar configuración
  if (!API_KEY) {
    console.log(`${colors.red}❌ API_FOOTBALL_KEY not found in environment variables${colors.reset}`);
    console.log(`💡 Add API_FOOTBALL_KEY=your_key_here to your .env file`);
    return;
  }
  
  try {
    // Ejecutar todas las pruebas
    await testApiFootballConnection();
    await testTimezoneRequest();
    await testTimezoneComparison();
    await testLocalServerEndpoints();
    await generateTimezoneTestReport();
    
    // Instrucciones finales
    console.log(`\n${colors.bright}🎯 NEXT STEPS${colors.reset}`);
    console.log(`1. Verify API-Football requests include timezone=America/Lima`);
    console.log(`2. Update your server to handle timezone parameters`);
    console.log(`3. Test your frontend with the new timezone-aware API`);
    console.log(`4. Monitor logs for timezone-related issues`);
    
    console.log(`\n${colors.green}✅ Timezone testing completed!${colors.reset}`);
    
  } catch (error) {
    console.log(`${colors.red}❌ Testing failed: ${error.message}${colors.reset}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// EJECUTAR TESTS
// ═══════════════════════════════════════════════════════════════════
if (require.main === module) {
  runTimezoneTests();
}

module.exports = {
  testApiFootballConnection,
  testTimezoneRequest,
  testLocalServerEndpoints,
  testTimezoneComparison,
  runTimezoneTests
};