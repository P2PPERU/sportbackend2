const axios = require('axios');
const logger = require('../utils/logger');

class ApiFootballConfig {
  constructor() {
    this.apiKey = process.env.API_FOOTBALL_KEY;
    this.host = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io';
    this.baseURL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';
    this.rateLimit = parseInt(process.env.API_FOOTBALL_RATE_LIMIT) || 100;
    
    this.headers = {
      'X-RapidAPI-Key': this.apiKey,
      'X-RapidAPI-Host': this.host
    };

    // Contador de requests para rate limiting
    this.requestCount = 0;
    this.resetTime = new Date();
    this.resetTime.setHours(this.resetTime.getHours() + 24);
  }

  // Cliente HTTP configurado
  getClient() {
    return axios.create({
      baseURL: this.baseURL,
      headers: this.headers,
      timeout: 10000,
      validateStatus: (status) => status < 500
    });
  }

  // Verificar rate limit
  canMakeRequest() {
    const now = new Date();
    
    // Reset contador si ha pasado un día
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = new Date();
      this.resetTime.setHours(this.resetTime.getHours() + 24);
    }

    return this.requestCount < this.rateLimit;
  }

  // Incrementar contador
  incrementRequestCount() {
    this.requestCount++;
    logger.info(`API-Football requests hoy: ${this.requestCount}/${this.rateLimit}`);
  }

  // Obtener información de rate limiting
  getRateLimitInfo() {
    return {
      requestCount: this.requestCount,
      rateLimit: this.rateLimit,
      resetTime: this.resetTime,
      remainingRequests: this.rateLimit - this.requestCount,
      canMakeRequest: this.canMakeRequest()
    };
  }

  // Validar configuración
  isConfigured() {
    return !!(this.apiKey && this.host && this.baseURL);
  }

  // Test de conexión
  async testConnection() {
    if (!this.isConfigured()) {
      throw new Error('API-Football no está configurada. Verifica las variables de entorno.');
    }

    try {
      const client = this.getClient();
      const response = await client.get('/status');
      
      this.incrementRequestCount();
      
      if (response.status === 200 && response.data) {
        logger.info('✅ Conexión a API-Football exitosa');
        return {
          success: true,
          data: response.data,
          rateLimitInfo: this.getRateLimitInfo()
        };
      } else {
        throw new Error(`Respuesta inesperada: ${response.status}`);
      }
    } catch (error) {
      logger.error('❌ Error conectando a API-Football:', error.message);
      throw error;
    }
  }
}

module.exports = new ApiFootballConfig();