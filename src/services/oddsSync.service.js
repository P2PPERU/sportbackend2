const { Odds, BettingMarket, Fixture, League, Team } = require('../models');
const { Op } = require('sequelize');
const apiFootballService = require('./apiFootballService');
const dynamicOddsMapper = require('../utils/dynamicOddsMapper.service');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');

class DynamicOddsSyncService {
  constructor() {
    // ✅ SIN MAPEO MANUAL - TODO ES DINÁMICO
    logger.info('🎯 DynamicOddsSyncService initialized - Mapeo 100% automático');
    
    // Estadísticas de rendimiento
    this.stats = {
      totalMarketsProcessed: 0,
      totalOddsProcessed: 0,
      newMarketsCreated: 0,
      errorsEncountered: 0
    };
  }

  // ✅ SINCRONIZAR ODDS DE UN FIXTURE - COMPLETAMENTE DINÁMICO
  async syncFixtureOdds(fixtureApiId) {
    try {
      logger.info(`🎯 SINCRONIZACIÓN DINÁMICA para fixture ${fixtureApiId}...`);

      // Buscar fixture en nuestra BD
      const fixture = await Fixture.findOne({
        where: { apiFootballId: fixtureApiId },
        include: ['league', 'homeTeam', 'awayTeam']
      });

      if (!fixture) {
        throw new Error(`Fixture ${fixtureApiId} no encontrado en BD`);
      }

      // ✅ OBTENER TODAS LAS ODDS DE API-FOOTBALL (SIN FILTROS)
      logger.info(`📡 Obteniendo TODAS las odds de API-Football para fixture ${fixtureApiId}...`);
      
      const response = await apiFootballService.makeRequest('/odds', {
        fixture: fixtureApiId
        // ✅ SIN PARÁMETROS ADICIONALES = OBTIENE TODO
      });

      if (!response.response || response.response.length === 0) {
        logger.warn(`⚠️ No hay odds disponibles para fixture ${fixtureApiId}`);
        return { 
          created: 0, 
          updated: 0, 
          errors: 0, 
          markets: 0, 
          bookmakers: 0,
          message: 'No odds available' 
        };
      }

      // ✅ LOG DETALLADO DE LO QUE RECIBIMOS
      const oddsData = response.response[0];
      logger.info(`📊 ✅ RESPUESTA EXITOSA:
        🎯 Fixture: ${oddsData.fixture.id} (${fixture.homeTeam.name} vs ${fixture.awayTeam.name})
        🏆 Liga: ${oddsData.league.name}
        📅 Fecha: ${oddsData.fixture.date}
        🎲 Total bookmakers: ${oddsData.bookmakers.length}
        📋 Bookmakers: ${oddsData.bookmakers.map(b => b.name).join(', ')}`);

      const results = {
        created: 0,
        updated: 0,
        errors: 0,
        markets: 0,
        bookmakers: oddsData.bookmakers.length,
        newMarkets: 0,
        processedMarkets: new Set()
      };

      // ✅ PROCESAR CADA BOOKMAKER Y SUS MERCADOS
      for (const bookmaker of oddsData.bookmakers) {
        logger.info(`🏪 Procesando ${bookmaker.name}: ${bookmaker.bets.length} mercados`);
        
        try {
          for (const bet of bookmaker.bets) {
            // ✅ PROCESAR MERCADO DINÁMICAMENTE
            const marketResult = await this.processDynamicMarket(
              fixture.id,
              bookmaker.name,
              bet
            );
            
            // Actualizar estadísticas
            results.created += marketResult.created || 0;
            results.updated += marketResult.updated || 0;
            results.errors += marketResult.errors || 0;
            
            if (marketResult.newMarket) {
              results.newMarkets++;
            }
            
            results.processedMarkets.add(bet.id);
            results.markets++;
            
            // Log progreso cada 5 mercados
            if (results.markets % 5 === 0) {
              logger.debug(`📈 Progreso: ${results.markets} mercados procesados`);
            }
          }
        } catch (bookmakerError) {
          logger.error(`❌ Error procesando bookmaker ${bookmaker.name}:`, bookmakerError.message);
          results.errors++;
        }
      }

      // ✅ CALCULAR ODDS PROMEDIO DINÁMICAMENTE
      logger.info(`🧮 Calculando odds promedio para ${results.processedMarkets.size} mercados únicos...`);
      await this.calculateDynamicAverageOdds(fixture.id, Array.from(results.processedMarkets));

      // ✅ ACTUALIZAR ESTADÍSTICAS GLOBALES
      this.stats.totalMarketsProcessed += results.markets;
      this.stats.totalOddsProcessed += results.created + results.updated;
      this.stats.newMarketsCreated += results.newMarkets;
      this.stats.errorsEncountered += results.errors;

      const successMessage = `✅ SINCRONIZACIÓN DINÁMICA COMPLETADA:
        🎯 Fixture: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}
        🎲 ${results.bookmakers} bookmakers procesados
        📊 ${results.markets} mercados procesados (${results.newMarkets} nuevos)
        💾 ${results.created + results.updated} odds guardadas (${results.created} nuevas, ${results.updated} actualizadas)
        ❌ ${results.errors} errores
        🆕 ${results.processedMarkets.size} mercados únicos detectados`;
      
      logger.info(successMessage);
      return results;

    } catch (error) {
      logger.error(`❌ ERROR EN SINCRONIZACIÓN DINÁMICA para fixture ${fixtureApiId}:`, error);
      this.stats.errorsEncountered++;
      throw error;
    }
  }

  // ✅ PROCESAR UN MERCADO DINÁMICAMENTE
  async processDynamicMarket(fixtureId, bookmakerName, apiBet) {
    try {
      logger.debug(`🔄 Procesando mercado dinámico: ${apiBet.name} (ID: ${apiBet.id})`);

      // ✅ BUSCAR O CREAR MERCADO DINÁMICAMENTE
      let market = await BettingMarket.findOne({
        where: { apiFootballId: apiBet.id }
      });

      let isNewMarket = false;

      if (!market) {
        // ✅ CREAR MERCADO NUEVO DINÁMICAMENTE
        logger.info(`🆕 Creando nuevo mercado: ${apiBet.name} (ID: ${apiBet.id})`);
        
        const marketData = await dynamicOddsMapper.mapMarketDynamically(apiBet);
        
        market = await BettingMarket.create(marketData);
        isNewMarket = true;
        
        logger.info(`✅ Mercado creado dinámicamente: ${market.key} (${market.name})`);
      } else {
        // ✅ ACTUALIZAR MERCADO EXISTENTE
        await market.update({
          usageCount: market.usageCount + 1,
          lastSeenAt: new Date(),
          // Actualizar outcomes si han cambiado
          possibleOutcomes: dynamicOddsMapper.extractOutcomes(apiBet.values)
        });
        
        logger.debug(`🔄 Mercado actualizado: ${market.key}`);
      }

      const results = { 
        created: 0, 
        updated: 0, 
        errors: 0, 
        newMarket: isNewMarket 
      };

      // ✅ PROCESAR TODAS LAS ODDS DEL MERCADO
      for (const apiValue of apiBet.values) {
        try {
          const oddResult = await this.processDynamicOdd(
            fixtureId,
            market,
            bookmakerName,
            apiValue
          );
          
          if (oddResult.created) results.created++;
          else if (oddResult.updated) results.updated++;
          
        } catch (oddError) {
          logger.error(`❌ Error procesando odd: ${oddError.message}`);
          results.errors++;
        }
      }

      return results;

    } catch (error) {
      logger.error(`❌ Error procesando mercado dinámico: ${error.message}`);
      return { created: 0, updated: 0, errors: 1, newMarket: false };
    }
  }

  // ✅ PROCESAR UNA ODD INDIVIDUAL DINÁMICAMENTE
  async processDynamicOdd(fixtureId, market, bookmakerName, apiValue) {
    try {
      // ✅ MAPEAR OUTCOME DINÁMICAMENTE
      const mappedOdd = dynamicOddsMapper.mapOutcomeForStorage(
        apiValue, 
        market.key, 
        market.name
      );

      // ✅ DATOS DE LA ODD
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

      // ✅ CREAR O ACTUALIZAR ODD
      const [odd, created] = await Odds.findOrCreate({
        where: {
          fixtureId,
          marketId: market.id,
          outcome: mappedOdd.outcome,
          bookmaker: bookmakerName
        },
        defaults: oddData
      });

      if (!created) {
        await odd.update(oddData);
        return { updated: true, odd };
      }

      return { created: true, odd };

    } catch (error) {
      logger.error(`❌ Error procesando odd individual: ${error.message}`);
      throw error;
    }
  }

  // ✅ CALCULAR ODDS PROMEDIO DINÁMICAMENTE
  async calculateDynamicAverageOdds(fixtureId, marketApiIds) {
    try {
      // Obtener todos los mercados únicos para este fixture
      const markets = await BettingMarket.findAll({
        where: { apiFootballId: { [Op.in]: marketApiIds } }
      });

      for (const market of markets) {
        // Obtener todas las odds de este mercado (excluyendo Average)
        const odds = await Odds.findAll({
          where: {
            fixtureId,
            marketId: market.id,
            isActive: true,
            bookmaker: { [Op.ne]: 'Average' }
          }
        });

        if (odds.length === 0) {
          logger.warn(`⚠️ No odds found for market ${market.id} in fixture ${fixtureId}`);
          continue;
        }

        // Agrupar por outcome
        const outcomeGroups = {};
        odds.forEach(odd => {
          if (!outcomeGroups[odd.outcome]) {
            outcomeGroups[odd.outcome] = [];
          }
          outcomeGroups[odd.outcome].push(parseFloat(odd.odds));
        });

        // Calcular promedio para cada outcome
        for (const [outcome, oddsList] of Object.entries(outcomeGroups)) {
          if (oddsList.length === 0) continue;
          
          const avgOdds = oddsList.reduce((sum, odd) => sum + odd, 0) / oddsList.length;
          const avgImpliedProb = this.calculateImpliedProbability(avgOdds);

          // Crear/actualizar odd promedio
          await Odds.findOrCreate({
            where: {
              fixtureId,
              marketId: market.id,
              outcome,
              bookmaker: 'Average'
            },
            defaults: {
              fixtureId,
              marketId: market.id,
              bookmaker: 'Average',
              outcome,
              value: null,
              odds: parseFloat(avgOdds.toFixed(2)),
              impliedProbability: parseFloat(avgImpliedProb.toFixed(2)),
              isActive: true,
              lastUpdated: new Date()
            }
          }).then(([averageOdd, created]) => {
            if (!created) {
              return averageOdd.update({
                odds: parseFloat(avgOdds.toFixed(2)),
                impliedProbability: parseFloat(avgImpliedProb.toFixed(2)),
                lastUpdated: new Date()
              });
            }
          });
        }
      }

      logger.debug(`✅ Odds promedio calculadas para ${markets.length} mercados`);

    } catch (error) {
      logger.error('❌ Error calculando odds promedio dinámicamente:', error);
    }
  }

  // ✅ SINCRONIZAR ODDS DE HOY (DINÁMICO)
  async syncTodayOdds() {
    try {
      logger.info('🎯 SINCRONIZACIÓN DINÁMICA de odds de hoy...');

      // Buscar fixtures de hoy de ligas importantes
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const fixtures = await Fixture.findAll({
        where: {
          fixtureDate: { [Op.between]: [startOfDay, endOfDay] },
          status: { [Op.in]: ['NS', '1H', 'HT', '2H'] }
        },
        include: [
          {
            model: League,
            as: 'league',
            where: { priority: { [Op.gte]: 75 } }, // Solo ligas importantes
            attributes: ['id', 'name', 'priority']
          },
          {
            model: Team,
            as: 'homeTeam',
            attributes: ['name']
          },
          {
            model: Team,
            as: 'awayTeam',
            attributes: ['name']
          }
        ],
        limit: 15 // Limitar para no gastar muchas requests
      });

      if (fixtures.length === 0) {
        logger.info('ℹ️ No hay fixtures de ligas importantes para sincronizar odds hoy');
        return { totalFixtures: 0, totalOdds: 0 };
      }

      logger.info(`📊 Encontrados ${fixtures.length} fixtures importantes para sincronización dinámica`);

      const results = {
        totalFixtures: fixtures.length,
        totalOdds: 0,
        totalMarkets: 0,
        newMarkets: 0,
        errors: 0,
        processed: 0,
        startTime: new Date()
      };

      for (const fixture of fixtures) {
        try {
          logger.info(`🔄 [${results.processed + 1}/${fixtures.length}] ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
          
          // Pausa para rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const oddsResult = await this.syncFixtureOdds(fixture.apiFootballId);
          
          results.totalOdds += oddsResult.created + oddsResult.updated;
          results.totalMarkets += oddsResult.markets;
          results.newMarkets += oddsResult.newMarkets || 0;
          results.errors += oddsResult.errors;
          results.processed++;
          
        } catch (error) {
          logger.error(`❌ Error en fixture ${fixture.apiFootballId}: ${error.message}`);
          results.errors++;
          results.processed++;
          
          // Si es rate limit, detener
          if (error.message.includes('Rate limit') || error.message.includes('429')) {
            logger.error('🚨 RATE LIMIT - Deteniendo sincronización');
            break;
          }
        }
      }

      const endTime = new Date();
      const duration = Math.round((endTime - results.startTime) / 1000);

      const summaryMessage = `✅ SINCRONIZACIÓN DINÁMICA DE ODDS COMPLETADA:
        ⏱️ Duración: ${duration}s
        📊 ${results.totalOdds} odds de ${results.processed}/${results.totalFixtures} fixtures
        🆕 ${results.newMarkets} nuevos mercados detectados automáticamente
        📈 ${results.totalMarkets} mercados procesados
        ❌ ${results.errors} errores`;
      
      logger.info(summaryMessage);
      
      // ✅ LOG ESTADÍSTICAS GLOBALES
      logger.info(`📊 ESTADÍSTICAS GLOBALES DEL SERVICIO:`, this.stats);
      
      return results;

    } catch (error) {
      logger.error('❌ Error en sincronización dinámica de odds de hoy:', error);
      throw error;
    }
  }

  // ✅ OBTENER ODDS DE UN FIXTURE (DINÁMICO)
  async getFixtureOdds(fixtureId, bookmaker = 'Average') {
    try {
      const cacheKey = `odds:dynamic:${fixtureId}:${bookmaker}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`📦 Cache hit para odds dinámicas fixture ${fixtureId}`);
        return cached;
      }

      // ✅ OBTENER TODAS LAS ODDS SIN FILTRO DE MERCADO
      const odds = await Odds.findAll({
        where: {
          fixtureId,
          bookmaker,
          isActive: true
        },
        include: [
          {
            model: BettingMarket,
            as: 'market',
            attributes: ['id', 'key', 'name', 'category', 'apiFootballId', 'priority', 'possibleOutcomes']
          }
        ],
        order: [
          ['market', 'priority', 'DESC'],
          ['market', 'name', 'ASC']
        ]
      });

      // ✅ AGRUPAR POR CATEGORÍA Y MERCADO
      const groupedOdds = {};
      const categories = {};

      odds.forEach(odd => {
        const category = odd.market.category;
        const marketKey = odd.market.key;
        
        if (!categories[category]) {
          categories[category] = {};
        }
        
        if (!categories[category][marketKey]) {
          categories[category][marketKey] = {
            market: {
              id: odd.market.id,
              apiFootballId: odd.market.apiFootballId,
              key: odd.market.key,
              name: odd.market.name,
              category: odd.market.category,
              priority: odd.market.priority,
              possibleOutcomes: odd.market.possibleOutcomes
            },
            odds: {}
          };
        }
        
        categories[category][marketKey].odds[odd.outcome] = {
          value: odd.value,
          odds: parseFloat(odd.odds),
          impliedProbability: parseFloat(odd.impliedProbability),
          lastUpdated: odd.lastUpdated
        };
      });

      const result = {
        fixtureId,
        bookmaker,
        totalMarkets: Object.values(categories).reduce((sum, cat) => sum + Object.keys(cat).length, 0),
        totalCategories: Object.keys(categories).length,
        categorizedMarkets: categories,
        lastSync: new Date().toISOString(),
        isDynamic: true
      };

      // Cache por 5 minutos
      await cacheService.set(cacheKey, result, 300);
      
      return result;

    } catch (error) {
      logger.error(`❌ Error obteniendo odds dinámicas de fixture ${fixtureId}:`, error);
      throw error;
    }
  }

  // ✅ OBTENER ESTADÍSTICAS DINÁMICAS
  async getOddsStats() {
    try {
      const [marketStats, oddsStats] = await Promise.all([
        BettingMarket.findAll({
          attributes: [
            'category',
            [BettingMarket.sequelize.fn('COUNT', BettingMarket.sequelize.col('id')), 'count'],
            [BettingMarket.sequelize.fn('AVG', BettingMarket.sequelize.col('usage_count')), 'avgUsage'],
            [BettingMarket.sequelize.fn('MAX', BettingMarket.sequelize.col('last_seen_at')), 'lastSeen']
          ],
          group: ['category'],
          order: [[BettingMarket.sequelize.fn('COUNT', BettingMarket.sequelize.col('id')), 'DESC']]
        }),
        Odds.findAll({
          attributes: [
            'bookmaker',
            [Odds.sequelize.fn('COUNT', Odds.sequelize.col('id')), 'count'],
            [Odds.sequelize.fn('MAX', Odds.sequelize.col('last_updated')), 'lastUpdate']
          ],
          group: ['bookmaker'],
          order: [[Odds.sequelize.fn('COUNT', Odds.sequelize.col('id')), 'DESC']]
        })
      ]);

      return {
        isDynamic: true,
        serviceStats: this.stats,
        marketsByCategory: marketStats,
        oddsByBookmaker: oddsStats,
        totalMarkets: marketStats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0),
        totalOdds: oddsStats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0),
        mappingStats: dynamicOddsMapper.getMappingStats(),
        lastUpdate: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Error obteniendo estadísticas dinámicas:', error);
      throw error;
    }
  }

  // ✅ UTILIDADES
  calculateImpliedProbability(odds) {
    return (1 / odds) * 100;
  }

  // ✅ OBTENER MEJORES ODDS (DINÁMICO)
  async getBestOdds(fixtureId) {
    try {
      const cacheKey = `odds:best:dynamic:${fixtureId}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Obtener todos los mercados para este fixture
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
        }],
        order: [['priority', 'DESC']]
      });

      const bestOdds = {};

      for (const market of markets) {
        const outcomeGroups = {};
        
        market.odds.forEach(odd => {
          if (!outcomeGroups[odd.outcome]) {
            outcomeGroups[odd.outcome] = [];
          }
          outcomeGroups[odd.outcome].push({
            odds: parseFloat(odd.odds),
            bookmaker: odd.bookmaker,
            lastUpdated: odd.lastUpdated
          });
        });

        const marketBest = {};
        for (const [outcome, oddsList] of Object.entries(outcomeGroups)) {
          const best = oddsList.reduce((max, current) => 
            current.odds > max.odds ? current : max
          );
          marketBest[outcome] = best;
        }

        if (Object.keys(marketBest).length > 0) {
          bestOdds[market.key] = {
            market: {
              id: market.id,
              key: market.key,
              name: market.name,
              category: market.category,
              priority: market.priority
            },
            bestOdds: marketBest
          };
        }
      }

      const result = {
        fixtureId,
        bestOdds,
        totalMarkets: Object.keys(bestOdds).length,
        isDynamic: true,
        lastSync: new Date().toISOString()
      };

      await cacheService.set(cacheKey, result, 120);
      return result;

    } catch (error) {
      logger.error(`❌ Error obteniendo mejores odds dinámicas: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new DynamicOddsSyncService();