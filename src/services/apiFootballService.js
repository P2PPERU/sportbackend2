const axios = require('axios');
const apiFootballConfig = require('../config/apiFootball');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class ApiFootballService {
  constructor() {
    this.client = apiFootballConfig.getClient();
    this.requestCount = 0;
    this.dailyLimit = apiFootballConfig.rateLimit;
  }

  // ═══════════════════════════════════════════════════════════════════
  // MÉTODO PRINCIPAL PARA HACER REQUESTS
  // ═══════════════════════════════════════════════════════════════════
  async makeRequest(endpoint, params = {}, useCache = true) {
    try {
      // Verificar rate limit
      if (!apiFootballConfig.canMakeRequest()) {
        throw new Error(`Rate limit exceeded. Used ${apiFootballConfig.requestCount}/${apiFootballConfig.rateLimit} requests today.`);
      }

      // Generar clave de cache
      const cacheKey = this.generateCacheKey(endpoint, params);
      
      // Intentar obtener del cache primero
      if (useCache) {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.info(`Cache hit for ${endpoint}`, { params });
          return cached;
        }
      }

      // Hacer request a API-Football
      logger.info(`API-Football request: ${endpoint}`, { params });
      
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

      // Guardar en cache con TTL apropiado
      if (useCache) {
        const ttl = this.getCacheTTL(endpoint);
        await cacheService.set(cacheKey, data, ttl);
      }

      return data;

    } catch (error) {
      logger.error(`API-Football error for ${endpoint}:`, error.message);
      
      // Si es error de rate limit, intentar obtener del cache aunque esté expirado
      if (error.message.includes('Rate limit') && useCache) {
        const cacheKey = this.generateCacheKey(endpoint, params);
        const staleData = await cacheService.get(cacheKey + ':stale');
        if (staleData) {
          logger.warn(`Using stale cache data for ${endpoint} due to rate limit`);
          return staleData;
        }
      }
      
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // ENDPOINTS ESPECÍFICOS
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

  // Obtener fixtures por fecha
  async getFixturesByDate(date) {
    return await this.makeRequest('/fixtures', { 
      date,
      status: 'NS-1H-HT-2H-ET-FT' // Todos los estados relevantes
    });
  }

  // Obtener fixtures de hoy
  async getTodayFixtures() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return await this.getFixturesByDate(today);
  }

  // Obtener fixtures de una liga
  async getFixturesByLeague(leagueId, season = 2024, from = null, to = null) {
    const params = { league: leagueId, season };
    if (from) params.from = from;
    if (to) params.to = to;
    
    return await this.makeRequest('/fixtures', params);
  }

  // Obtener cuotas de un fixture
  async getFixtureOdds(fixtureId) {
    return await this.makeRequest('/odds', { 
      fixture: fixtureId,
      bookmaker: '8' // Bet365 como referencia
    });
  }

  // Obtener tabla de posiciones
  async getStandings(leagueId, season = 2024) {
    return await this.makeRequest('/standings', { 
      league: leagueId, 
      season 
    });
  }

  // Obtener estadísticas de equipos
  async getTeamStatistics(teamId, leagueId, season = 2024) {
    return await this.makeRequest('/teams/statistics', {
      team: teamId,
      league: leagueId,
      season
    });
  }

  // Test de conexión
  async testConnection() {
    try {
      const data = await this.makeRequest('/status', {}, false);
      return {
        success: true,
        data,
        rateLimitInfo: apiFootballConfig.getRateLimitInfo()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        rateLimitInfo: apiFootballConfig.getRateLimitInfo()
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
}

module.exports = new ApiFootballService();