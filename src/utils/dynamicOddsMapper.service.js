const logger = require('./logger');

class DynamicOddsMapper {
  constructor() {
    // ✅ PATRONES PARA DETECTAR CATEGORÍAS AUTOMÁTICAMENTE
    this.categoryPatterns = {
      'MATCH_RESULT': [
        /match winner/i, /1x2/i, /home.*away/i, /double chance/i, 
        /draw no bet/i, /result/i, /winner/i
      ],
      'GOALS': [
        /goals.*over.*under/i, /total goals/i, /goals/i, /over.*under/i,
        /btts/i, /both teams.*score/i, /exact.*goals/i
      ],
      'HALFTIME': [
        /first half/i, /half.*time/i, /1st half/i, /ht/i, /halftime/i
      ],
      'SECOND_HALF': [
        /second half/i, /2nd half/i, /st winner/i
      ],
      'CORNERS': [
        /corner/i, /corners/i
      ],
      'CARDS': [
        /card/i, /cards/i, /yellow/i, /red/i, /booking/i
      ],
      'EXACT_SCORE': [
        /exact.*score/i, /correct.*score/i, /score/i
      ],
      'HANDICAP': [
        /handicap/i, /asian.*handicap/i, /european.*handicap/i
      ],
      'SPECIALS': [
        /odd.*even/i, /clean.*sheet/i, /win.*nil/i, /first.*goal/i, 
        /last.*goal/i, /own.*goal/i, /penalty/i
      ],
      'PLAYER_PROPS': [
        /anytime.*scorer/i, /first.*scorer/i, /last.*scorer/i,
        /player/i, /assists/i, /shots/i
      ],
      'COMBINED': [
        /result.*btts/i, /ht.*ft/i, /halftime.*fulltime/i, /double/i
      ],
      'TIME_SPECIFIC': [
        /\d+.*min/i, /minutes/i, /first.*\d+/i
      ]
    };

    // ✅ NORMALIZADORES DE OUTCOMES
    this.outcomeNormalizers = {
      // Resultados básicos
      'Home': 'HOME',
      'Away': 'AWAY', 
      'Draw': 'DRAW',
      'X': 'DRAW',
      '1': 'HOME',
      '2': 'AWAY',
      
      // Over/Under
      'Over': 'OVER',
      'Under': 'UNDER',
      'O': 'OVER',
      'U': 'UNDER',
      
      // Yes/No
      'Yes': 'YES',
      'No': 'NO',
      'Y': 'YES',
      'N': 'NO',
      
      // Odd/Even
      'Odd': 'ODD',
      'Even': 'EVEN',
      'E': 'EVEN',
      
      // Double Chance
      '1X': '1X',
      'X2': 'X2', 
      '12': '12',
      
      // Específicos
      'Both': 'BOTH',
      'Neither': 'NEITHER',
      'Other': 'OTHER',
      'None': 'NONE'
    };
  }

  // ✅ FUNCIÓN PRINCIPAL: MAPEAR MERCADO DINÁMICAMENTE
  async mapMarketDynamically(apiFootballBet) {
    try {
      const marketData = {
        apiFootballId: apiFootballBet.id,
        name: apiFootballBet.name,
        key: this.generateMarketKey(apiFootballBet.name, apiFootballBet.id),
        category: this.detectCategory(apiFootballBet.name),
        description: `Auto-generated market: ${apiFootballBet.name}`,
        possibleOutcomes: this.extractOutcomes(apiFootballBet.values),
        parameters: this.extractParameters(apiFootballBet.name, apiFootballBet.values),
        priority: this.calculatePriority(apiFootballBet.name),
        originalData: {
          id: apiFootballBet.id,
          name: apiFootballBet.name,
          values: apiFootballBet.values,
          detectedAt: new Date().toISOString()
        },
        usageCount: 1,
        lastSeenAt: new Date()
      };

      logger.debug(`📊 Mercado mapeado dinámicamente:`, {
        id: marketData.apiFootballId,
        name: marketData.name,
        key: marketData.key,
        category: marketData.category,
        outcomes: marketData.possibleOutcomes.length
      });

      return marketData;

    } catch (error) {
      logger.error(`❌ Error mapeando mercado dinámicamente:`, error);
      
      // ✅ FALLBACK: Crear mercado básico si falla el mapeo
      return {
        apiFootballId: apiFootballBet.id,
        name: apiFootballBet.name,
        key: `MARKET_${apiFootballBet.id}`,
        category: 'OTHER',
        description: `Fallback market: ${apiFootballBet.name}`,
        possibleOutcomes: apiFootballBet.values?.map(v => v.value) || [],
        parameters: {},
        priority: 10,
        originalData: apiFootballBet,
        usageCount: 1,
        lastSeenAt: new Date()
      };
    }
  }

  // ✅ GENERAR CLAVE ÚNICA PARA EL MERCADO
  generateMarketKey(marketName, marketId) {
    // Normalizar nombre a clave
    let key = marketName
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Quitar caracteres especiales
      .replace(/\s+/g, '_') // Espacios a guiones bajos
      .substring(0, 50); // Limitar longitud

    // Agregar ID para garantizar unicidad
    if (key.length < 10) {
      key = `${key}_${marketId}`;
    }

    // Asegurar que no esté vacío
    if (!key || key.length < 3) {
      key = `MARKET_${marketId}`;
    }

    return key;
  }

  // ✅ DETECTAR CATEGORÍA AUTOMÁTICAMENTE
  detectCategory(marketName) {
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(marketName)) {
          return category;
        }
      }
    }
    return 'OTHER';
  }

  // ✅ EXTRAER OUTCOMES NORMALIZADOS
  extractOutcomes(apiValues) {
    if (!apiValues || !Array.isArray(apiValues)) {
      return [];
    }

    return apiValues.map(value => {
      const originalOutcome = value.value;
      const normalizedOutcome = this.normalizeOutcome(originalOutcome);
      
      return {
        original: originalOutcome,
        normalized: normalizedOutcome,
        detected: true
      };
    });
  }

  // ✅ NORMALIZAR OUTCOME INDIVIDUAL
  normalizeOutcome(outcome) {
    if (!outcome) return 'UNKNOWN';

    // Limpiar outcome
    const cleaned = outcome.toString().trim();
    
    // Buscar en normalizadores exactos
    if (this.outcomeNormalizers[cleaned]) {
      return this.outcomeNormalizers[cleaned];
    }

    // Buscar case-insensitive
    const lowerCleaned = cleaned.toLowerCase();
    for (const [key, value] of Object.entries(this.outcomeNormalizers)) {
      if (key.toLowerCase() === lowerCleaned) {
        return value;
      }
    }

    // ✅ DETECTAR PATRONES ESPECIALES
    
    // Resultados exactos (0-0, 1-1, 2-1, etc.)
    if (/^\d+[-:]\d+$/.test(cleaned)) {
      return cleaned.replace(/[-:]/, '_');
    }

    // Rangos numéricos (0.5, 1.5, 2.5, etc.)
    if (/^\d+\.5$/.test(cleaned)) {
      return `LINE_${cleaned.replace('.', '_')}`;
    }

    // Números simples (0, 1, 2, 3, etc.)
    if (/^\d+$/.test(cleaned)) {
      return `VALUE_${cleaned}`;
    }

    // Rangos (4+, 5+, etc.)
    if (/^\d+\+$/.test(cleaned)) {
      return `PLUS_${cleaned.replace('+', '')}`;
    }

    // Fallback: normalizar string
    return cleaned
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30) || 'UNKNOWN';
  }

  // ✅ EXTRAER PARÁMETROS DEL MERCADO
  extractParameters(marketName, apiValues) {
    const params = {};

    // Detectar líneas (Over/Under X.5)
    const lineMatch = marketName.match(/(\d+\.?\d*)/);
    if (lineMatch) {
      params.line = parseFloat(lineMatch[1]);
    }

    // Detectar time frames (First 10 minutes, etc.)
    const timeMatch = marketName.match(/(\d+)\s*min/i);
    if (timeMatch) {
      params.timeframe = parseInt(timeMatch[1]);
    }

    // Detectar equipos específicos
    if (/home/i.test(marketName)) {
      params.team = 'home';
    } else if (/away/i.test(marketName)) {
      params.team = 'away';
    }

    // Detectar periodo específico
    if (/first.*half|1st.*half|ht/i.test(marketName)) {
      params.period = 'first_half';
    } else if (/second.*half|2nd.*half/i.test(marketName)) {
      params.period = 'second_half';
    }

    // Estadísticas de valores
    if (apiValues && apiValues.length > 0) {
      params.outcomeCount = apiValues.length;
      params.hasNumericValues = apiValues.some(v => /\d/.test(v.value));
    }

    return params;
  }

  // ✅ CALCULAR PRIORIDAD AUTOMÁTICAMENTE
  calculatePriority(marketName) {
    const name = marketName.toLowerCase();
    
    // Mercados premium (prioridad alta)
    if (/match winner|1x2|result/i.test(name)) return 100;
    if (/over.*under.*2\.?5/i.test(name)) return 95;
    if (/both teams.*score|btts/i.test(name)) return 90;
    if (/double chance/i.test(name)) return 85;
    
    // Mercados populares (prioridad media-alta)
    if (/exact.*score|correct.*score/i.test(name)) return 80;
    if (/first.*half|halftime/i.test(name)) return 75;
    if (/over.*under/i.test(name)) return 70;
    if (/corners/i.test(name)) return 65;
    
    // Mercados especializados (prioridad media)
    if (/cards|booking/i.test(name)) return 60;
    if (/clean.*sheet|win.*nil/i.test(name)) return 55;
    if (/odd.*even/i.test(name)) return 50;
    
    // Mercados de jugadores (prioridad media-baja)
    if (/player|scorer|assists/i.test(name)) return 45;
    
    // Mercados muy específicos (prioridad baja)
    if (/\d+.*minutes/i.test(name)) return 40;
    
    // Default
    return 30;
  }

  // ✅ MAPEAR OUTCOME A NUESTRO SISTEMA
  mapOutcomeForStorage(apiValue, marketKey, marketName) {
    const originalOutcome = apiValue.value;
    const normalizedOutcome = this.normalizeOutcome(originalOutcome);
    
    return {
      outcome: normalizedOutcome,
      value: this.extractNumericValue(originalOutcome),
      odds: parseFloat(apiValue.odd),
      originalValue: originalOutcome,
      marketContext: {
        key: marketKey,
        name: marketName
      }
    };
  }

  // ✅ EXTRAER VALOR NUMÉRICO SI EXISTE
  extractNumericValue(value) {
    if (!value) return null;
    
    const match = value.toString().match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }

  // ✅ OBTENER ESTADÍSTICAS DEL MAPEO
  getMappingStats() {
    return {
      supportedCategories: Object.keys(this.categoryPatterns).length,
      outcomeNormalizers: Object.keys(this.outcomeNormalizers).length,
      dynamicMapping: true,
      version: '2.0.0'
    };
  }
}

module.exports = new DynamicOddsMapper();