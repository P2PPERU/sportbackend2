// 📄 src/services/apiFootballService.js - CON TIMEZONE AUTOMÁTICO PARA PERÚ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const axios = require('axios');
const apiFootballConfig = require('../config/apiFootball');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class ApiFootballService {
  constructor() {
    this.client = apiFootballConfig.getClient();
    this.requestCount = 0;
    this.dailyLimit = apiFootballConfig.rateLimit;
    
    // ✅ TIMEZONE POR DEFECTO PARA PERÚ
    this.defaultTimezone = process.env.TIMEZONE || 'America/Lima';
    
    logger.info(`🕐 ApiFootballService initialized with timezone: ${this.defaultTimezone}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // MÉTODO PRINCIPAL PARA HACER REQUESTS CON TIMEZONE AUTOMÁTICO
  // ═══════════════════════════════════════════════════════════════════
  async makeRequest(endpoint, params = {}, useCache = true) {
    try {
      // Verificar rate limit
      if (!apiFootballConfig.canMakeRequest()) {
        throw new Error(`Rate limit exceeded. Used ${apiFootballConfig.requestCount}/${apiFootballConfig.rateLimit} requests today.`);
      }

      // ✅ AGREGAR TIMEZONE AUTOMÁTICAMENTE A TODOS LOS REQUESTS DE FIXTURES
      if (endpoint === '/fixtures' && !params.timezone) {
        params.timezone = this.defaultTimezone;
        logger.debug(`🕐 Auto-added timezone ${this.defaultTimezone} to fixtures request`);
      }

      // Generar clave de cache (incluye timezone en la clave)
      const cacheKey = this.generateCacheKey(endpoint, params);
      
      // Intentar obtener del cache primero
      if (useCache) {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.info(`📦 Cache hit for ${endpoint}`, { params });
          return cached;
        }
      }

      // Hacer request a API-Football
      logger.info(`📡 API-Football request: ${endpoint}`, { 
        params,
        timezone: params.timezone || 'not specified'
      });
      
      const response = await this.client.get(endpoint, { params });
      
      // Incrementar contador
      apiFootballConfig.incrementRequestCount();
      
      // Verificar respuesta
      if (response.status !== 200) {
        throw new Error(`API-Football error: ${response.status} - ${response.statusText}`);
      }

      const data = response.data;
      
      // Log de información de rate limiting desde headers
      const rateLimitInfo = {
        remaining: response.headers['x-ratelimit-requests-remaining'],
        limit: response.headers['x-ratelimit-requests-limit']
      };
      
      logger.apiFootball(endpoint, response.status, rateLimitInfo.remaining);

      // ✅ LOG ADICIONAL PARA FIXTURES CON TIMEZONE
      if (endpoint === '/fixtures' && data.response && data.response.length > 0) {
        const firstFixture = data.response[0];
        logger.info(`🕐 Fixture timezone info: ${firstFixture.fixture?.timezone || 'not specified'} - Date: ${firstFixture.fixture?.date}`);
      }

      // Guardar en cache con TTL apropiado
      if (useCache) {
        const ttl = this.getCacheTTL(endpoint);
        await cacheService.set(cacheKey, data, ttl);
      }

      return data;

    } catch (error) {
      logger.error(`❌ API-Football error for ${endpoint}:`, error.message);
      
      // Si es error de rate limit, intentar obtener del cache aunque esté expirado
      if (error.message.includes('Rate limit') && useCache) {
        const cacheKey = this.generateCacheKey(endpoint, params);
        const staleData = await cacheService.get(cacheKey + ':stale');
        if (staleData) {
          logger.warn(`⚠️ Using stale cache data for ${endpoint} due to rate limit`);
          return staleData;
        }
      }
      
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // ENDPOINTS ESPECÍFICOS CON SOPORTE COMPLETO DE TIMEZONE
  // ═══════════════════════════════════════════════════════════════════

  // Obtener ligas
  async getLeagues(season = 2024) {
    return await this.makeRequest('/leagues', { season });
  }

  // Obtener equipos de una liga
  async getTeamsByLeague(leagueId, season = 2024) {
    return await this.makeRequest('/teams', { 
      league: leagueId, 
      season 
    });
  }

  // ✅ CORREGIDO: Obtener fixtures por fecha CON TIMEZONE
  async getFixturesByDate(date, timezone = null) {
    const effectiveTimezone = timezone || this.defaultTimezone;
    
    logger.info(`📅 Getting fixtures for date ${date} with timezone ${effectiveTimezone}`);
    
    return await this.makeRequest('/fixtures', { 
      date,
      status: 'NS-1H-HT-2H-ET-FT', // Todos los estados relevantes
      timezone: effectiveTimezone
    });
  }

  // ✅ CORREGIDO: Obtener fixtures de hoy CON TIMEZONE
  async getTodayFixtures(timezone = null) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const effectiveTimezone = timezone || this.defaultTimezone;
    
    logger.info(`📅 Getting today's fixtures (${today}) with timezone ${effectiveTimezone}`);
    
    return await this.getFixturesByDate(today, effectiveTimezone);
  }

  // ✅ CORREGIDO: Obtener fixtures de una liga CON TIMEZONE
  async getFixturesByLeague(leagueId, season = 2024, from = null, to = null, timezone = null) {
    const effectiveTimezone = timezone || this.defaultTimezone;
    
    const params = { 
      league: leagueId, 
      season,
      timezone: effectiveTimezone
    };
    
    if (from) params.from = from;
    if (to) params.to = to;
    
    logger.info(`🏆 Getting league ${leagueId} fixtures with timezone ${effectiveTimezone}`, {
      season, from, to
    });
    
    return await this.makeRequest('/fixtures', params);
  }

  // ✅ NUEVO: Obtener fixtures con parámetros personalizados y timezone
  async getFixturesWithTimezone(params, timezone = null) {
    const effectiveTimezone = timezone || this.defaultTimezone;
    
    const requestParams = {
      ...params,
      timezone: effectiveTimezone
    };
    
    logger.info(`🎯 Getting fixtures with custom params and timezone ${effectiveTimezone}`, params);
    
    return await this.makeRequest('/fixtures', requestParams);
  }

  // ✅ NUEVO: Obtener fixtures por rango de fechas CON TIMEZONE
  async getFixturesByDateRange(from, to, timezone = null, additionalParams = {}) {
    const effectiveTimezone = timezone || this.defaultTimezone;
    
    const params = {
      from,
      to,
      timezone: effectiveTimezone,
      ...additionalParams
    };
    
    logger.info(`📅 Getting fixtures from ${from} to ${to} with timezone ${effectiveTimezone}`);
    
    return await this.makeRequest('/fixtures', params);
  }

  // ✅ CORREGIDO: Obtener cuotas de un fixture (TODAS las casas de apuestas por defecto)
  async getFixtureOdds(fixtureId, bookmaker = null) {
    const params = { fixture: fixtureId };
    
    // Solo agregar bookmaker si se especifica uno en particular
    if (bookmaker && bookmaker !== 'all') {
      params.bookmaker = bookmaker;
    }
    
    logger.info(`💰 Getting odds for fixture ${fixtureId}`, { 
      bookmaker: bookmaker || 'all bookmakers'
    });
    
    return await this.makeRequest('/odds', params);
  }

  // Método para obtener odds de un bookmaker específico
  async getFixtureOddsByBookmaker(fixtureId, bookmakerId) {
    logger.info(`💰 Getting odds for fixture ${fixtureId} from bookmaker ${bookmakerId}`);
    
    return await this.makeRequest('/odds', { 
      fixture: fixtureId,
      bookmaker: bookmakerId
    });
  }

  // Obtener todas las odds disponibles para un fixture
  async getAllFixtureOdds(fixtureId) {
    logger.info(`💰 Getting ALL odds for fixture ${fixtureId}`);
    
    return await this.makeRequest('/odds', { 
      fixture: fixtureId
      // Sin especificar bookmaker = obtiene todas las casas
    });
  }

  // Obtener odds con filtros específicos
  async getFixtureOddsWithFilters(fixtureId, options = {}) {
    const params = { fixture: fixtureId };
    
    // Opciones disponibles según la documentación de API-Football
    if (options.bookmaker) params.bookmaker = options.bookmaker;
    if (options.bet) params.bet = options.bet;        // ID del tipo de apuesta
    if (options.league) params.league = options.league;
    if (options.season) params.season = options.season;
    
    logger.info(`💰 Getting filtered odds for fixture ${fixtureId}`, options);
    
    return await this.makeRequest('/odds', params);
  }

  // Obtener tabla de posiciones
  async getStandings(leagueId, season = 2024) {
    logger.info(`📊 Getting standings for league ${leagueId}, season ${season}`);
    
    return await this.makeRequest('/standings', { 
      league: leagueId, 
      season 
    });
  }

  // Obtener estadísticas de equipos
  async getTeamStatistics(teamId, leagueId, season = 2024) {
    logger.info(`📈 Getting team statistics for team ${teamId} in league ${leagueId}`);
    
    return await this.makeRequest('/teams/statistics', {
      team: teamId,
      league: leagueId,
      season
    });
  }

  // Test de conexión
  async testConnection() {
    try {
      logger.info('🧪 Testing API-Football connection...');
      
      const data = await this.makeRequest('/status', {}, false);
      
      const result = {
        success: true,
        data,
        rateLimitInfo: apiFootballConfig.getRateLimitInfo(),
        currentTimezone: this.defaultTimezone
      };
      
      logger.info('✅ API-Football connection test successful', {
        timezone: this.defaultTimezone,
        requests: result.rateLimitInfo
      });
      
      return result;
    } catch (error) {
      logger.error('❌ API-Football connection test failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        rateLimitInfo: apiFootballConfig.getRateLimitInfo(),
        currentTimezone: this.defaultTimezone
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // NUEVOS MÉTODOS PARA MANEJO DINÁMICO DE TIMEZONE
  // ═══════════════════════════════════════════════════════════════════

  // ✅ Cambiar timezone por defecto dinámicamente
  setDefaultTimezone(timezone) {
    const previousTimezone = this.defaultTimezone;
    this.defaultTimezone = timezone;
    
    logger.info(`🕐 Timezone changed from ${previousTimezone} to ${timezone}`);
    
    return {
      previous: previousTimezone,
      current: timezone,
      changed: true
    };
  }

  // ✅ Obtener timezone actual
  getCurrentTimezone() {
    return this.defaultTimezone;
  }

  // ✅ Verificar si un timezone es válido
  isValidTimezone(timezone) {
    try {
      Intl.DateTimeFormat('en', { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }

  // ✅ Obtener información de timezone
  getTimezoneInfo() {
    const now = new Date();
    
    try {
      const localTime = now.toLocaleString('es-PE', {
        timeZone: this.defaultTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const offset = now.toLocaleString('en', {
        timeZone: this.defaultTimezone,
        timeZoneName: 'longOffset'
      }).split(' ').pop();
      
      return {
        timezone: this.defaultTimezone,
        localTime,
        offset,
        utcTime: now.toISOString(),
        isValid: true
      };
    } catch (error) {
      return {
        timezone: this.defaultTimezone,
        error: error.message,
        isValid: false
      };
    }
  }

  // ✅ Convertir fecha a timezone específico
  convertDateToTimezone(date, timezone = null) {
    const targetTimezone = timezone || this.defaultTimezone;
    
    try {
      const dateObj = new Date(date);
      
      return {
        original: date,
        timezone: targetTimezone,
        converted: dateObj.toLocaleString('es-PE', {
          timeZone: targetTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        iso: dateObj.toISOString()
      };
    } catch (error) {
      return {
        original: date,
        timezone: targetTimezone,
        error: error.message,
        converted: null
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS
  // ═══════════════════════════════════════════════════════════════════

  generateCacheKey(endpoint, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `api_football:${endpoint}:${sortedParams}`;
  }

  getCacheTTL(endpoint) {
    const ttlMap = {
      '/leagues': 6 * 60 * 60,      // 6 horas
      '/teams': 2 * 60 * 60,        // 2 horas  
      '/fixtures': 5 * 60,          // 5 minutos
      '/odds': 2 * 60,              // 2 minutos
      '/standings': 30 * 60,        // 30 minutos
      '/teams/statistics': 60 * 60  // 1 hora
    };
    
    return ttlMap[endpoint] || 30 * 60; // Default 30 min
  }

  // ✅ Obtener estadísticas de uso de timezone
  getTimezoneStats() {
    return {
      defaultTimezone: this.defaultTimezone,
      isValid: this.isValidTimezone(this.defaultTimezone),
      requestCount: this.requestCount,
      rateLimitInfo: apiFootballConfig.getRateLimitInfo(),
      supportedEndpoints: [
        '/fixtures (with auto timezone)',
        '/odds (timezone independent)',
        '/standings (timezone independent)',
        '/teams (timezone independent)',
        '/leagues (timezone independent)'
      ]
    };
  }
}

module.exports = new ApiFootballService();