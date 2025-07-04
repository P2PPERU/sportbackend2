// 📄 src/utils/dynamicOddsMapper.service.js - VERSIÓN MEJORADA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const logger = require('./logger');

class ImprovedDynamicOddsMapper {
  constructor() {
    // ✅ MAPEO MÁS INTELIGENTE DE CATEGORÍAS
    this.categoryPatterns = {
      'MATCH_RESULT': [
        /^match winner$/i, /^1x2$/i, /^home\/away$/i, /^double chance$/i, 
        /^draw no bet$/i, /^result$/i, /^winner$/i
      ],
      'GOALS': [
        /^goals over\/under$/i, /^total goals$/i, /^goals/i, 
        /over.*under(?!.*half|team)/i, /^both teams.*score$/i, /^exact.*goals/i
      ],
      'HALFTIME': [
        /first half/i, /half.*time/i, /1st half/i, /^ht/i
      ],
      'SECOND_HALF': [
        /second half/i, /2nd half/i, /st winner/i
      ],
      'HANDICAP': [
        /^(asian |european )?handicap/i, /^handicap result/i
      ],
      'CORNERS': [
        /corner/i
      ],
      'CARDS': [
        /card/i, /booking/i, /yellow/i, /red card/i
      ],
      'EXACT_SCORE': [
        /^(exact|correct) score/i
      ],
      'PLAYER_PROPS': [
        /goal scorer/i, /player/i, /assists/i, /shots/i
      ],
      'SPECIALS': [
        /odd.*even/i, /clean sheet/i, /win.*nil/i, /own goal/i, 
        /penalty/i, /highest scoring/i, /team to score/i
      ],
      'COMBINED': [
        /result.*btts/i, /ht.*ft/i, /halftime.*fulltime/i
      ],
      'TIME_SPECIFIC': [
        /first \d+ min/i, /minutes/i, /\d+ min/i
      ]
    };

    // ✅ ESTADÍSTICAS DE MAPEO
    this.stats = {
      totalMapped: 0,
      categoriesDetected: {},
      unknownMarkets: []
    };
  }

  // ✅ FUNCIÓN PRINCIPAL MEJORADA: MAPEAR MERCADO MANTENIENDO ESTRUCTURA
  async mapMarketDynamically(apiFootballBet) {
    try {
      // Detectar categoría
      const category = this.detectCategory(apiFootballBet.name);
      
      // ✅ CREAR KEY ÚNICO PERO LEGIBLE
      const marketKey = this.generateSmartKey(apiFootballBet.name, apiFootballBet.id);
      
      // ✅ PRESERVAR ESTRUCTURA ORIGINAL DE VALUES
      const structuredOutcomes = this.structureOutcomes(apiFootballBet.values);
      
      const marketData = {
        // IDs
        apiFootballId: apiFootballBet.id,
        key: marketKey,
        
        // Información básica
        name: apiFootballBet.name,
        category: category,
        description: this.generateDescription(apiFootballBet.name, category),
        
        // ✅ OUTCOMES ESTRUCTURADOS CORRECTAMENTE
        possibleOutcomes: structuredOutcomes,
        
        // Parámetros extraídos inteligentemente
        parameters: this.extractSmartParameters(apiFootballBet),
        
        // Prioridad calculada
        priority: this.calculateSmartPriority(apiFootballBet.name, category),
        
        // Metadata
        originalData: {
          id: apiFootballBet.id,
          name: apiFootballBet.name,
          valuesCount: apiFootballBet.values.length,
          firstDetected: new Date().toISOString()
        },
        
        // Control
        isActive: true,
        usageCount: 1,
        lastSeenAt: new Date()
      };

      // Actualizar estadísticas
      this.updateStats(category, apiFootballBet.name);
      
      logger.debug(`✅ Mercado mapeado correctamente:`, {
        id: marketData.apiFootballId,
        name: marketData.name,
        key: marketData.key,
        category: marketData.category,
        outcomes: structuredOutcomes.length
      });

      return marketData;

    } catch (error) {
      logger.error(`❌ Error mapeando mercado ${apiFootballBet.name}:`, error);
      
      // Fallback mejorado
      return this.createFallbackMarket(apiFootballBet);
    }
  }

  // ✅ GENERAR KEY INTELIGENTE (más corto y descriptivo)
  generateSmartKey(marketName, marketId) {
    // Casos especiales primero
    const specialCases = {
      'Match Winner': '1X2',
      'Both Teams Score': 'BTTS',
      'Goals Over/Under': 'OVER_UNDER',
      'Double Chance': 'DOUBLE_CHANCE',
      'Exact Score': 'EXACT_SCORE',
      'Half Time/Full Time': 'HT_FT',
      'Draw No Bet': 'DNB',
      'Handicap Result': 'HANDICAP',
      'Asian Handicap': 'ASIAN_HANDICAP',
      'European Handicap': 'EURO_HANDICAP',
      'Clean Sheet - Home': 'CLEAN_SHEET_HOME',
      'Clean Sheet - Away': 'CLEAN_SHEET_AWAY',
      'Odd/Even': 'ODD_EVEN',
      'Correct Score': 'CORRECT_SCORE',
      'Anytime Goal Scorer': 'ANYTIME_SCORER',
      'First Goal Scorer': 'FIRST_SCORER',
      'Last Goal Scorer': 'LAST_SCORER'
    };

    // Si existe caso especial, usar ese
    if (specialCases[marketName]) {
      return specialCases[marketName];
    }

    // Generar key normalizado
    let key = marketName
      .toUpperCase()
      .replace(/[^\w\s-]/g, '') // Mantener guiones
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // Limitar longitud pero mantener legibilidad
    if (key.length > 30) {
      key = key.substring(0, 30);
    }

    // Si es muy corto o vacío, usar ID
    if (!key || key.length < 3) {
      key = `MARKET_${marketId}`;
    }

    return key;
  }

  // ✅ ESTRUCTURAR OUTCOMES PRESERVANDO RELACIONES
  structureOutcomes(apiValues) {
    if (!apiValues || !Array.isArray(apiValues)) {
      return [];
    }

    return apiValues.map(value => {
      const outcome = {
        // Preservar valor original
        original: value.value,
        
        // Normalizar para búsquedas pero sin perder contexto
        normalized: this.normalizeOutcomePreservingContext(value.value),
        
        // Detectar tipo
        type: this.detectOutcomeType(value.value),
        
        // Extraer componentes
        components: this.extractOutcomeComponents(value.value)
      };

      return outcome;
    });
  }

  // ✅ NORMALIZAR PRESERVANDO CONTEXTO
  normalizeOutcomePreservingContext(value) {
    if (!value) return 'UNKNOWN';
    
    const str = value.toString().trim();
    
    // Para resultados exactos, mantener formato
    if (/^\d+:\d+$/.test(str)) {
      return str.replace(':', '_');
    }
    
    // Para handicaps, preservar signo y valor
    if (/^(Home|Away|Draw)\s+[+-]\d+(\.\d+)?$/.test(str)) {
      return str.toUpperCase().replace(/\s+/g, '_');
    }
    
    // Para over/under con valores
    if (/^(Over|Under)\s+\d+(\.\d+)?$/.test(str)) {
      return str.toUpperCase().replace(/\s+/g, '_');
    }
    
    // Para rangos
    if (/^\d+-\d+$/.test(str) || /^more\s+\d+$/i.test(str)) {
      return str.toUpperCase().replace(/\s+/g, '_').replace('-', '_TO_');
    }
    
    // Default: normalización simple
    return str.toUpperCase()
      .replace(/[^\w\s+-]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .trim();
  }

  // ✅ DETECTAR TIPO DE OUTCOME
  detectOutcomeType(value) {
    const str = value.toString().trim();
    
    if (/^(Home|Away|Draw|1|2|X)$/i.test(str)) return 'RESULT';
    if (/^\d+:\d+$/.test(str)) return 'EXACT_SCORE';
    if (/[+-]\d+(\.\d+)?/.test(str)) return 'HANDICAP';
    if (/^(Over|Under)\s+\d+(\.\d+)?$/i.test(str)) return 'TOTAL';
    if (/^(Yes|No)$/i.test(str)) return 'BOOLEAN';
    if (/^(Odd|Even)$/i.test(str)) return 'PARITY';
    if (/^\d+-\d+$/.test(str)) return 'RANGE';
    if (/^more\s+\d+$/i.test(str)) return 'MORE_THAN';
    
    return 'CUSTOM';
  }

  // ✅ EXTRAER COMPONENTES DEL OUTCOME
  extractOutcomeComponents(value) {
    const components = {};
    const str = value.toString().trim();
    
    // Extraer equipo (Home/Away/Draw)
    const teamMatch = str.match(/^(Home|Away|Draw)/i);
    if (teamMatch) {
      components.team = teamMatch[1].toUpperCase();
    }
    
    // Extraer handicap
    const handicapMatch = str.match(/([+-]\d+(?:\.\d+)?)/);
    if (handicapMatch) {
      components.handicap = parseFloat(handicapMatch[1]);
    }
    
    // Extraer valor numérico
    const valueMatch = str.match(/\b(\d+(?:\.\d+)?)\b/);
    if (valueMatch && !components.handicap) {
      components.value = parseFloat(valueMatch[1]);
    }
    
    // Extraer scores
    const scoreMatch = str.match(/^(\d+):(\d+)$/);
    if (scoreMatch) {
      components.homeScore = parseInt(scoreMatch[1]);
      components.awayScore = parseInt(scoreMatch[2]);
    }
    
    // Extraer rango
    const rangeMatch = str.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      components.min = parseInt(rangeMatch[1]);
      components.max = parseInt(rangeMatch[2]);
    }
    
    return components;
  }

  // ✅ DETECTAR CATEGORÍA MEJORADA
  detectCategory(marketName) {
    // Limpiar nombre para mejor detección
    const cleanName = marketName.trim().toLowerCase();
    
    // Buscar coincidencia exacta primero
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(cleanName)) {
          return category;
        }
      }
    }
    
    // Detección secundaria por palabras clave
    if (cleanName.includes('goal') && !cleanName.includes('scorer')) return 'GOALS';
    if (cleanName.includes('score') && cleanName.includes('exact')) return 'EXACT_SCORE';
    if (cleanName.includes('half') && cleanName.includes('first')) return 'HALFTIME';
    if (cleanName.includes('half') && cleanName.includes('second')) return 'SECOND_HALF';
    
    return 'OTHER';
  }

  // ✅ EXTRAER PARÁMETROS INTELIGENTEMENTE
  extractSmartParameters(apiFootballBet) {
    const params = {};
    const name = apiFootballBet.name;
    
    // Línea de goles/puntos
    const lineMatch = name.match(/(\d+\.?\d*)/);
    if (lineMatch && name.match(/over|under/i)) {
      params.line = parseFloat(lineMatch[1]);
      params.type = 'TOTAL';
    }
    
    // Handicap
    if (name.match(/handicap/i)) {
      params.type = 'HANDICAP';
      const values = apiFootballBet.values.map(v => v.value);
      params.availableHandicaps = this.extractHandicapValues(values);
    }
    
    // Tiempo específico
    const timeMatch = name.match(/(\d+)\s*min/i);
    if (timeMatch) {
      params.minutes = parseInt(timeMatch[1]);
      params.type = 'TIME_BASED';
    }
    
    // Equipo específico
    if (name.includes('Home')) params.team = 'HOME';
    else if (name.includes('Away')) params.team = 'AWAY';
    
    // Periodo
    if (name.match(/first.*half|1st.*half/i)) params.period = 'FIRST_HALF';
    else if (name.match(/second.*half|2nd.*half/i)) params.period = 'SECOND_HALF';
    else if (name.match(/full.*time|90.*min/i)) params.period = 'FULL_TIME';
    
    // Información de valores
    params.outcomeCount = apiFootballBet.values.length;
    params.hasNumericOutcomes = apiFootballBet.values.some(v => /\d/.test(v.value));
    
    return params;
  }

  // ✅ EXTRAER VALORES DE HANDICAP
  extractHandicapValues(values) {
    const handicaps = new Set();
    
    values.forEach(value => {
      const match = value.match(/([+-]?\d+(?:\.\d+)?)/);
      if (match) {
        handicaps.add(parseFloat(match[1]));
      }
    });
    
    return Array.from(handicaps).sort((a, b) => a - b);
  }

  // ✅ CALCULAR PRIORIDAD INTELIGENTE
  calculateSmartPriority(marketName, category) {
    // Prioridades base por categoría
    const categoryPriorities = {
      'MATCH_RESULT': 90,
      'GOALS': 80,
      'EXACT_SCORE': 75,
      'HANDICAP': 70,
      'HALFTIME': 65,
      'CORNERS': 60,
      'CARDS': 55,
      'SECOND_HALF': 50,
      'PLAYER_PROPS': 45,
      'SPECIALS': 40,
      'COMBINED': 35,
      'TIME_SPECIFIC': 30,
      'OTHER': 20
    };
    
    let priority = categoryPriorities[category] || 20;
    
    // Bonus por mercados populares específicos
    const name = marketName.toLowerCase();
    if (name === 'match winner' || name === '1x2') priority += 10;
    if (name === 'both teams score') priority += 8;
    if (name.includes('over/under') && name.includes('2.5')) priority += 7;
    if (name === 'double chance') priority += 5;
    if (name === 'exact score' || name === 'correct score') priority += 5;
    
    // Máximo 100
    return Math.min(priority, 100);
  }

  // ✅ GENERAR DESCRIPCIÓN AUTOMÁTICA
  generateDescription(marketName, category) {
    const descriptions = {
      'MATCH_RESULT': 'Apuesta al resultado del partido',
      'GOALS': 'Apuesta relacionada con la cantidad de goles',
      'EXACT_SCORE': 'Apuesta al marcador exacto del partido',
      'HANDICAP': 'Apuesta con ventaja/desventaja virtual',
      'HALFTIME': 'Apuesta sobre el primer tiempo',
      'CORNERS': 'Apuesta sobre tiros de esquina',
      'CARDS': 'Apuesta sobre tarjetas amarillas/rojas',
      'PLAYER_PROPS': 'Apuesta sobre rendimiento de jugadores',
      'SPECIALS': 'Apuesta especial del partido',
      'COMBINED': 'Apuesta combinada de múltiples resultados',
      'TIME_SPECIFIC': 'Apuesta sobre periodo específico del partido',
      'OTHER': 'Otro tipo de apuesta'
    };
    
    return `${descriptions[category] || 'Apuesta detectada automáticamente'} - ${marketName}`;
  }

  // ✅ MAPEAR OUTCOME PARA ALMACENAMIENTO
  mapOutcomeForStorage(apiValue, marketKey, marketName) {
    const components = this.extractOutcomeComponents(apiValue.value);
    
    return {
      // Preservar valor original
      originalValue: apiValue.value,
      
      // Outcome normalizado pero con contexto
      outcome: this.normalizeOutcomePreservingContext(apiValue.value),
      
      // Valor numérico si existe
      value: components.value || components.handicap || null,
      
      // Cuota
      odds: parseFloat(apiValue.odd),
      
      // Metadata
      type: this.detectOutcomeType(apiValue.value),
      components: components,
      
      // Contexto del mercado
      marketContext: {
        key: marketKey,
        name: marketName
      }
    };
  }

  // ✅ CREAR MERCADO FALLBACK MEJORADO
  createFallbackMarket(apiFootballBet) {
    logger.warn(`⚠️ Usando fallback para mercado: ${apiFootballBet.name}`);
    
    return {
      apiFootballId: apiFootballBet.id,
      key: `DYNAMIC_${apiFootballBet.id}`,
      name: apiFootballBet.name,
      category: 'OTHER',
      description: `Mercado detectado automáticamente: ${apiFootballBet.name}`,
      possibleOutcomes: apiFootballBet.values?.map(v => ({
        original: v.value,
        normalized: this.normalizeOutcomePreservingContext(v.value),
        type: 'DYNAMIC'
      })) || [],
      parameters: {
        isDynamic: true,
        originalId: apiFootballBet.id
      },
      priority: 10,
      originalData: apiFootballBet,
      isActive: true,
      usageCount: 1,
      lastSeenAt: new Date()
    };
  }

  // ✅ ACTUALIZAR ESTADÍSTICAS
  updateStats(category, marketName) {
    this.stats.totalMapped++;
    
    if (!this.stats.categoriesDetected[category]) {
      this.stats.categoriesDetected[category] = 0;
    }
    this.stats.categoriesDetected[category]++;
    
    if (category === 'OTHER') {
      this.stats.unknownMarkets.push(marketName);
    }
  }

  // ✅ OBTENER ESTADÍSTICAS DE MAPEO
  getMappingStats() {
    return {
      ...this.stats,
      supportedCategories: Object.keys(this.categoryPatterns).length,
      dynamicMapping: true,
      version: '3.0.0',
      lastUnknownMarkets: this.stats.unknownMarkets.slice(-10)
    };
  }

  // ✅ LIMPIAR ESTADÍSTICAS
  clearStats() {
    this.stats = {
      totalMapped: 0,
      categoriesDetected: {},
      unknownMarkets: []
    };
  }
}

module.exports = new ImprovedDynamicOddsMapper();