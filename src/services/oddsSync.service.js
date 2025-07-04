// 📄 src/services/oddsSync.service.js - VERSIÓN MEJORADA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { Odds, BettingMarket, Fixture, League, Team } = require('../models');
const { Op } = require('sequelize');
const apiFootballService = require('./apiFootballService');
const dynamicOddsMapper = require('../utils/dynamicOddsMapper.service');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');

class ImprovedOddsSyncService {
  constructor() {
    logger.info('🎯 ImprovedOddsSyncService initialized - Estructura preservada');
    
    // Estadísticas mejoradas
    this.stats = {
      totalMarketsProcessed: 0,
      totalOddsProcessed: 0,
      newMarketsCreated: 0,
      bookmakersSynced: new Set(),
      marketsSeen: new Set(),
      errorsEncountered: 0,
      startTime: new Date()
    };
  }

  // ✅ SINCRONIZAR ODDS DE UN FIXTURE - PRESERVANDO ESTRUCTURA
  async syncFixtureOdds(fixtureApiId) {
    try {
      logger.info(`🎯 Sincronización estructurada para fixture ${fixtureApiId}...`);

      // Buscar fixture en nuestra BD
      const fixture = await Fixture.findOne({
        where: { apiFootballId: fixtureApiId },
        include: ['league', 'homeTeam', 'awayTeam']
      });

      if (!fixture) {
        throw new Error(`Fixture ${fixtureApiId} no encontrado en BD`);
      }

      // ✅ OBTENER TODAS LAS ODDS DE API-FOOTBALL
      const response = await apiFootballService.makeRequest('/odds', {
        fixture: fixtureApiId
      });

      if (!response.response || response.response.length === 0) {
        logger.warn(`⚠️ No hay odds disponibles para fixture ${fixtureApiId}`);
        return this.createEmptyResult('No odds available');
      }

      // Datos de respuesta
      const oddsData = response.response[0];
      
      logger.info(`📊 Respuesta de API-Football:
        🎯 Fixture: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}
        🏆 Liga: ${fixture.league.name}
        📅 Fecha: ${oddsData.fixture.date}
        🎲 Bookmakers: ${oddsData.bookmakers.length}
        📚 Total mercados: ${oddsData.bookmakers.reduce((sum, b) => sum + b.bets.length, 0)}`);

      // ✅ PROCESAR CADA BOOKMAKER
      const results = {
        fixture: {
          id: fixture.id,
          apiId: fixture.apiFootballId,
          teams: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
          date: fixture.fixtureDate
        },
        bookmakers: {},
        summary: {
          totalBookmakers: oddsData.bookmakers.length,
          totalMarkets: 0,
          totalOdds: 0,
          newMarkets: 0,
          errors: 0
        }
      };

      // Procesar cada bookmaker
      for (const bookmaker of oddsData.bookmakers) {
        const bookmakerResult = await this.processBookmaker(
          fixture.id,
          bookmaker
        );
        
        results.bookmakers[bookmaker.name] = bookmakerResult;
        results.summary.totalMarkets += bookmakerResult.markets;
        results.summary.totalOdds += bookmakerResult.odds;
        results.summary.newMarkets += bookmakerResult.newMarkets;
        results.summary.errors += bookmakerResult.errors;
        
        this.stats.bookmakersSynced.add(bookmaker.name);
      }

      // ✅ CALCULAR ODDS PROMEDIO
      await this.calculateStructuredAverageOdds(fixture.id);

      // Log resumen
      logger.info(`✅ Sincronización completada para ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}:
        📊 ${results.summary.totalBookmakers} bookmakers
        🎯 ${results.summary.totalMarkets} mercados (${results.summary.newMarkets} nuevos)
        💾 ${results.summary.totalOdds} odds guardadas
        ❌ ${results.summary.errors} errores`);

      return results;

    } catch (error) {
      logger.error(`❌ Error en sincronización para fixture ${fixtureApiId}:`, error);
      this.stats.errorsEncountered++;
      throw error;
    }
  }

  // ✅ PROCESAR UN BOOKMAKER COMPLETO
  async processBookmaker(fixtureId, bookmakerData) {
    const result = {
      name: bookmakerData.name,
      id: bookmakerData.id,
      markets: 0,
      odds: 0,
      newMarkets: 0,
      errors: 0,
      processedBets: []
    };

    logger.info(`🏪 Procesando ${bookmakerData.name}: ${bookmakerData.bets.length} mercados`);

    for (const bet of bookmakerData.bets) {
      try {
        const betResult = await this.processMarketBet(
          fixtureId,
          bookmakerData.name,
          bet
        );
        
        result.markets++;
        result.odds += betResult.oddsCount;
        if (betResult.isNewMarket) result.newMarkets++;
        
        result.processedBets.push({
          id: bet.id,
          name: bet.name,
          odds: betResult.oddsCount,
          new: betResult.isNewMarket
        });
        
        this.stats.marketsSeen.add(`${bet.id}:${bet.name}`);
        
      } catch (error) {
        logger.error(`❌ Error procesando mercado ${bet.name}:`, error.message);
        result.errors++;
      }
    }

    return result;
  }

  // ✅ PROCESAR UN MERCADO ESPECÍFICO
  async processMarketBet(fixtureId, bookmakerName, bet) {
    // Buscar o crear mercado
    let market = await BettingMarket.findOne({
      where: { apiFootballId: bet.id }
    });

    let isNewMarket = false;

    if (!market) {
      // Crear nuevo mercado usando el mapper mejorado
      const marketData = await dynamicOddsMapper.mapMarketDynamically(bet);
      market = await BettingMarket.create(marketData);
      isNewMarket = true;
      this.stats.newMarketsCreated++;
      
      logger.info(`🆕 Nuevo mercado creado: ${market.name} (${market.key})`);
    } else {
      // Actualizar mercado existente
      await market.update({
        usageCount: market.usageCount + 1,
        lastSeenAt: new Date()
      });
    }

    // ✅ PROCESAR TODOS LOS VALUES DEL MERCADO
    let oddsCount = 0;
    const oddsToCreate = [];
    const oddsToUpdate = [];

    for (const value of bet.values) {
      const mappedOdd = dynamicOddsMapper.mapOutcomeForStorage(
        value,
        market.key,
        market.name
      );

      const oddData = {
        fixtureId,
        marketId: market.id,
        bookmaker: bookmakerName,
        outcome: mappedOdd.outcome,
        value: mappedOdd.value,
        odds: mappedOdd.odds,
        impliedProbability: this.calculateImpliedProbability(mappedOdd.odds),
        isActive: true,
        lastUpdated: new Date()
      };

      // Buscar odd existente
      const existingOdd = await Odds.findOne({
        where: {
          fixtureId,
          marketId: market.id,
          outcome: mappedOdd.outcome,
          bookmaker: bookmakerName
        }
      });

      if (existingOdd) {
        oddsToUpdate.push({ id: existingOdd.id, data: oddData });
      } else {
        oddsToCreate.push(oddData);
      }

      oddsCount++;
    }

    // Crear/actualizar odds en lote
    if (oddsToCreate.length > 0) {
      await Odds.bulkCreate(oddsToCreate);
      this.stats.totalOddsProcessed += oddsToCreate.length;
    }

    if (oddsToUpdate.length > 0) {
      for (const update of oddsToUpdate) {
        await Odds.update(update.data, { where: { id: update.id } });
      }
      this.stats.totalOddsProcessed += oddsToUpdate.length;
    }

    this.stats.totalMarketsProcessed++;

    return {
      marketId: market.id,
      marketKey: market.key,
      oddsCount,
      isNewMarket
    };
  }

  // ✅ CALCULAR ODDS PROMEDIO MANTENIENDO ESTRUCTURA
  async calculateStructuredAverageOdds(fixtureId) {
    try {
      // Obtener todos los mercados con odds para este fixture
      const markets = await BettingMarket.findAll({
        include: [{
          model: Odds,
          as: 'odds',
          where: {
            fixtureId,
            isActive: true,
            bookmaker: { [Op.ne]: 'Average' }
          },
          required: true
        }]
      });

      logger.debug(`📊 Calculando promedios para ${markets.length} mercados`);

      for (const market of markets) {
        // Agrupar odds por outcome
        const outcomeGroups = {};
        
        market.odds.forEach(odd => {
          if (!outcomeGroups[odd.outcome]) {
            outcomeGroups[odd.outcome] = {
              values: [],
              originalValue: odd.value
            };
          }
          outcomeGroups[odd.outcome].values.push(parseFloat(odd.odds));
        });

        // Calcular y guardar promedio para cada outcome
        for (const [outcome, data] of Object.entries(outcomeGroups)) {
          if (data.values.length === 0) continue;
          
          const avgOdds = data.values.reduce((sum, odd) => sum + odd, 0) / data.values.length;
          const avgImpliedProb = this.calculateImpliedProbability(avgOdds);

          await Odds.upsert({
            fixtureId,
            marketId: market.id,
            bookmaker: 'Average',
            outcome,
            value: data.originalValue,
            odds: parseFloat(avgOdds.toFixed(2)),
            impliedProbability: parseFloat(avgImpliedProb.toFixed(2)),
            isActive: true,
            lastUpdated: new Date()
          });
        }
      }

      logger.debug(`✅ Promedios calculados para fixture ${fixtureId}`);

    } catch (error) {
      logger.error('❌ Error calculando odds promedio:', error);
    }
  }

  // ✅ OBTENER ODDS ESTRUCTURADAS DE UN FIXTURE
  async getFixtureOdds(fixtureId, bookmaker = 'Average') {
    try {
      const cacheKey = `odds:structured:${fixtureId}:${bookmaker}`;
      
      // Intentar cache primero
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`📦 Cache hit para odds estructuradas ${fixtureId}`);
        return cached;
      }

      // ✅ CONSULTA OPTIMIZADA CON ESTRUCTURA CORRECTA
      const odds = await Odds.findAll({
        where: {
          fixtureId,
          bookmaker,
          isActive: true
        },
        include: [{
          model: BettingMarket,
          as: 'market',
          attributes: [
            'id', 'apiFootballId', 'key', 'name', 
            'category', 'priority', 'possibleOutcomes', 
            'parameters'
          ]
        }],
        order: [
          ['market', 'priority', 'DESC'],
          ['market', 'name', 'ASC'],
          ['outcome', 'ASC']
        ]
      });

      // ✅ ESTRUCTURAR CORRECTAMENTE POR CATEGORÍA Y MERCADO
      const structured = this.structureOddsResponse(odds);

      const result = {
        fixtureId,
        bookmaker,
        structure: structured,
        summary: {
          totalCategories: Object.keys(structured.categorizedMarkets).length,
          totalMarkets: structured.totalMarkets,
          totalOdds: odds.length,
          bookmakerCount: structured.bookmakerCount
        },
        lastSync: new Date().toISOString()
      };

      // Cache por 2 minutos
      await cacheService.set(cacheKey, result, 120);
      
      return result;

    } catch (error) {
      logger.error(`❌ Error obteniendo odds estructuradas:`, error);
      throw error;
    }
  }

  // ✅ ESTRUCTURAR RESPUESTA DE ODDS
  structureOddsResponse(odds) {
    const categorizedMarkets = {};
    const marketMap = new Map();
    let totalMarkets = 0;

    // Agrupar por mercado primero
    odds.forEach(odd => {
      const marketKey = odd.market.key;
      
      if (!marketMap.has(marketKey)) {
        marketMap.set(marketKey, {
          market: {
            id: odd.market.id,
            apiFootballId: odd.market.apiFootballId,
            key: odd.market.key,
            name: odd.market.name,
            category: odd.market.category,
            priority: odd.market.priority,
            parameters: odd.market.parameters
          },
          values: []
        });
      }
      
      marketMap.get(marketKey).values.push({
        outcome: odd.outcome,
        value: odd.value,
        odds: parseFloat(odd.odds),
        impliedProbability: parseFloat(odd.impliedProbability)
      });
    });

    // Organizar por categorías
    marketMap.forEach((marketData, marketKey) => {
      const category = marketData.market.category;
      
      if (!categorizedMarkets[category]) {
        categorizedMarkets[category] = {};
      }
      
      categorizedMarkets[category][marketKey] = {
        ...marketData.market,
        values: marketData.values.sort((a, b) => {
          // Ordenar outcomes de manera lógica
          const order = ['HOME', 'DRAW', 'AWAY', 'YES', 'NO', 'OVER', 'UNDER'];
          const aIndex = order.indexOf(a.outcome);
          const bIndex = order.indexOf(b.outcome);
          
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          
          return a.outcome.localeCompare(b.outcome);
        })
      };
      
      totalMarkets++;
    });

    return {
      categorizedMarkets,
      totalMarkets,
      bookmakerCount: new Set(odds.map(o => o.bookmaker)).size
    };
  }

  // ✅ OBTENER MEJORES ODDS ESTRUCTURADAS
  async getBestOdds(fixtureId) {
    try {
      const cacheKey = `odds:best:structured:${fixtureId}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Obtener todas las odds activas (excluyendo Average)
      const allOdds = await Odds.findAll({
        where: {
          fixtureId,
          isActive: true,
          bookmaker: { [Op.ne]: 'Average' }
        },
        include: [{
          model: BettingMarket,
          as: 'market',
          attributes: ['id', 'key', 'name', 'category', 'priority']
        }],
        order: [
          ['market', 'priority', 'DESC'],
          ['odds', 'DESC']
        ]
      });

      // Agrupar por mercado y outcome para encontrar mejores odds
      const bestOddsMap = new Map();

      allOdds.forEach(odd => {
        const key = `${odd.marketId}:${odd.outcome}`;
        
        if (!bestOddsMap.has(key) || odd.odds > bestOddsMap.get(key).odds) {
          bestOddsMap.set(key, {
            marketId: odd.marketId,
            market: odd.market,
            outcome: odd.outcome,
            value: odd.value,
            bestOdds: parseFloat(odd.odds),
            bookmaker: odd.bookmaker,
            impliedProbability: parseFloat(odd.impliedProbability)
          });
        }
      });

      // Estructurar por categoría y mercado
      const structured = this.structureBestOdds(bestOddsMap);

      const result = {
        fixtureId,
        bestOdds: structured,
        summary: {
          totalMarkets: structured.totalMarkets,
          totalOutcomes: bestOddsMap.size,
          bookmakers: structured.bookmakers
        },
        lastSync: new Date().toISOString()
      };

      await cacheService.set(cacheKey, result, 120);
      return result;

    } catch (error) {
      logger.error(`❌ Error obteniendo mejores odds:`, error);
      throw error;
    }
  }

  // ✅ ESTRUCTURAR MEJORES ODDS
  structureBestOdds(bestOddsMap) {
    const categorized = {};
    const bookmakers = new Set();
    let totalMarkets = 0;

    // Agrupar por categoría y mercado
    const marketGroups = new Map();

    bestOddsMap.forEach((data, key) => {
      const market = data.market;
      const marketKey = market.key;
      
      if (!marketGroups.has(marketKey)) {
        marketGroups.set(marketKey, {
          market: {
            id: market.id,
            key: market.key,
            name: market.name,
            category: market.category,
            priority: market.priority
          },
          outcomes: []
        });
      }
      
      marketGroups.get(marketKey).outcomes.push({
        outcome: data.outcome,
        value: data.value,
        odds: data.bestOdds,
        bookmaker: data.bookmaker,
        impliedProbability: data.impliedProbability
      });
      
      bookmakers.add(data.bookmaker);
    });

    // Organizar por categorías
    marketGroups.forEach((marketData) => {
      const category = marketData.market.category;
      
      if (!categorized[category]) {
        categorized[category] = {};
      }
      
      categorized[category][marketData.market.key] = {
        ...marketData.market,
        bestOdds: marketData.outcomes
      };
      
      totalMarkets++;
    });

    return {
      categorizedMarkets: categorized,
      totalMarkets,
      bookmakers: Array.from(bookmakers)
    };
  }

  // ✅ UTILIDADES
  calculateImpliedProbability(odds) {
    return (1 / odds) * 100;
  }

  createEmptyResult(message) {
    return {
      fixture: null,
      bookmakers: {},
      summary: {
        totalBookmakers: 0,
        totalMarkets: 0,
        totalOdds: 0,
        newMarkets: 0,
        errors: 0
      },
      message
    };
  }

  // ✅ OBTENER ESTADÍSTICAS DEL SERVICIO
  getServiceStats() {
    const runtime = Math.round((new Date() - this.stats.startTime) / 1000);
    
    return {
      runtime: `${runtime}s`,
      totalMarketsProcessed: this.stats.totalMarketsProcessed,
      totalOddsProcessed: this.stats.totalOddsProcessed,
      newMarketsCreated: this.stats.newMarketsCreated,
      uniqueBookmakers: Array.from(this.stats.bookmakersSynced),
      uniqueMarkets: this.stats.marketsSeen.size,
      errorsEncountered: this.stats.errorsEncountered,
      averageOddsPerMarket: this.stats.totalMarketsProcessed > 0 
        ? Math.round(this.stats.totalOddsProcessed / this.stats.totalMarketsProcessed)
        : 0
    };
  }

  // ✅ RESETEAR ESTADÍSTICAS
  resetStats() {
    this.stats = {
      totalMarketsProcessed: 0,
      totalOddsProcessed: 0,
      newMarketsCreated: 0,
      bookmakersSynced: new Set(),
      marketsSeen: new Set(),
      errorsEncountered: 0,
      startTime: new Date()
    };
  }

  // ✅ SINCRONIZAR ODDS DE HOY (MEJORADO)
  async syncTodayOdds() {
    try {
      logger.info('🎯 Sincronización estructurada de odds de hoy...');
      
      this.resetStats();

      // Buscar fixtures de hoy
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const fixtures = await Fixture.findAll({
        where: {
          fixtureDate: { [Op.between]: [startOfDay, endOfDay] },
          status: { [Op.in]: ['NS', '1H', 'HT', '2H'] }
        },
        include: [{
          model: League,
          as: 'league',
          where: { priority: { [Op.gte]: 75 } },
          attributes: ['id', 'name', 'priority']
        }, {
          model: Team,
          as: 'homeTeam',
          attributes: ['name']
        }, {
          model: Team,
          as: 'awayTeam',
          attributes: ['name']
        }],
        order: [['league', 'priority', 'DESC']],
        limit: 10
      });

      if (fixtures.length === 0) {
        logger.info('ℹ️ No hay fixtures importantes para sincronizar hoy');
        return { totalFixtures: 0, stats: this.getServiceStats() };
      }

      logger.info(`📊 Encontrados ${fixtures.length} fixtures para sincronizar`);

      const results = [];
      
      for (const fixture of fixtures) {
        try {
          logger.info(`🔄 Sincronizando: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
          
          const syncResult = await this.syncFixtureOdds(fixture.apiFootballId);
          results.push(syncResult);
          
          // Pausa para rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (error) {
          logger.error(`❌ Error en fixture ${fixture.id}: ${error.message}`);
          
          if (error.message.includes('Rate limit')) {
            logger.error('🚨 Rate limit alcanzado, deteniendo sincronización');
            break;
          }
        }
      }

      const finalStats = this.getServiceStats();
      
      logger.info(`✅ Sincronización de hoy completada:`, finalStats);
      
      return {
        totalFixtures: results.length,
        fixtures: results,
        stats: finalStats
      };

    } catch (error) {
      logger.error('❌ Error en sincronización de odds de hoy:', error);
      throw error;
    }
  }
}

module.exports = new ImprovedOddsSyncService();