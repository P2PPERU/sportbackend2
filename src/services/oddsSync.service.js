const { Odds, BettingMarket, Fixture, League, Team } = require('../models');
const { Op } = require('sequelize');
const apiFootballService = require('./apiFootballService');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');

class OddsSyncService {
  constructor() {
    // 📊 MAPEO COMPLETO DE MERCADOS API-Football → Nuestros mercados
    this.marketMapping = {
      // ═══════════════════════════════════════════════════════════════════
      // MERCADOS PRINCIPALES - RESULTADO
      // ═══════════════════════════════════════════════════════════════════
      
      // 1X2 (Match Winner)
      1: {
        ourKey: '1X2',
        name: 'Match Winner',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW', 
          'Away': 'AWAY'
        }
      },
      
      // Double Chance
      9: {
        ourKey: 'DOUBLE_CHANCE',
        name: 'Double Chance',
        outcomes: {
          'Home/Draw': '1X',
          'Home/Away': '12',
          'Draw/Away': 'X2'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // MERCADOS DE GOLES - TIEMPO COMPLETO
      // ═══════════════════════════════════════════════════════════════════
      
      // Over/Under 0.5 Goals
      4: {
        ourKey: 'OVER_UNDER_0_5',
        name: 'Over/Under 0.5 Goals',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },
      
      // Over/Under 1.5 Goals
      6: {
        ourKey: 'OVER_UNDER_1_5',
        name: 'Over/Under 1.5 Goals',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },
      
      // Over/Under 2.5 Goals
      5: {
        ourKey: 'OVER_UNDER_2_5',
        name: 'Over/Under 2.5 Goals',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },
      
      // Over/Under 3.5 Goals
      7: {
        ourKey: 'OVER_UNDER_3_5',
        name: 'Over/Under 3.5 Goals', 
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Over/Under 4.5 Goals
      10: {
        ourKey: 'OVER_UNDER_4_5',
        name: 'Over/Under 4.5 Goals',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Over/Under 5.5 Goals
      11: {
        ourKey: 'OVER_UNDER_5_5',
        name: 'Over/Under 5.5 Goals',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },
      
      // Both Teams to Score
      8: {
        ourKey: 'BTTS',
        name: 'Both Teams To Score',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // EXACT SCORE (Resultado Exacto)
      // ═══════════════════════════════════════════════════════════════════
      
      // Exact Score
      52: {
        ourKey: 'EXACT_SCORE',
        name: 'Exact Score',
        outcomes: {
          '0-0': '0_0',
          '1-0': '1_0',
          '0-1': '0_1',
          '1-1': '1_1',
          '2-0': '2_0',
          '0-2': '0_2',
          '2-1': '2_1',
          '1-2': '1_2',
          '2-2': '2_2',
          '3-0': '3_0',
          '0-3': '0_3',
          '3-1': '3_1',
          '1-3': '1_3',
          '3-2': '3_2',
          '2-3': '2_3',
          '3-3': '3_3',
          '4-0': '4_0',
          '0-4': '0_4',
          '4-1': '4_1',
          '1-4': '1_4',
          '4-2': '4_2',
          '2-4': '2_4',
          '4-3': '4_3',
          '3-4': '3_4',
          '4-4': '4_4',
          'Other': 'OTHER'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // PRIMER TIEMPO (HALFTIME)
      // ═══════════════════════════════════════════════════════════════════
      
      // Halftime Result (1X2)
      20: {
        ourKey: 'HT_1X2',
        name: 'Halftime Result',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW',
          'Away': 'AWAY'
        }
      },

      // Halftime Double Chance
      21: {
        ourKey: 'HT_DOUBLE_CHANCE',
        name: 'Halftime Double Chance',
        outcomes: {
          'Home/Draw': '1X',
          'Home/Away': '12',
          'Draw/Away': 'X2'
        }
      },

      // Halftime Over/Under 0.5
      22: {
        ourKey: 'HT_OVER_UNDER_0_5',
        name: 'Halftime Over/Under 0.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Halftime Over/Under 1.5
      23: {
        ourKey: 'HT_OVER_UNDER_1_5',
        name: 'Halftime Over/Under 1.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Halftime Both Teams to Score
      24: {
        ourKey: 'HT_BTTS',
        name: 'Halftime Both Teams To Score',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // Halftime Exact Score
      25: {
        ourKey: 'HT_EXACT_SCORE',
        name: 'Halftime Exact Score',
        outcomes: {
          '0-0': '0_0',
          '1-0': '1_0',
          '0-1': '0_1',
          '1-1': '1_1',
          '2-0': '2_0',
          '0-2': '0_2',
          '2-1': '2_1',
          '1-2': '1_2',
          '2-2': '2_2',
          'Other': 'OTHER'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // SEGUNDO TIEMPO
      // ═══════════════════════════════════════════════════════════════════

      // Second Half Winner
      26: {
        ourKey: 'ST_1X2',
        name: 'Second Half Winner',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW',
          'Away': 'AWAY'
        }
      },

      // Second Half Over/Under 0.5
      27: {
        ourKey: 'ST_OVER_UNDER_0_5',
        name: 'Second Half Over/Under 0.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Second Half Over/Under 1.5
      28: {
        ourKey: 'ST_OVER_UNDER_1_5',
        name: 'Second Half Over/Under 1.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Second Half Both Teams to Score
      29: {
        ourKey: 'ST_BTTS',
        name: 'Second Half Both Teams To Score',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // CORNERS (Esquinas)
      // ═══════════════════════════════════════════════════════════════════
      
      // Total Corners Over/Under 7.5
      30: {
        ourKey: 'CORNERS_OVER_UNDER_7_5',
        name: 'Corners Over/Under 7.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Total Corners Over/Under 8.5
      31: {
        ourKey: 'CORNERS_OVER_UNDER_8_5',
        name: 'Corners Over/Under 8.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Total Corners Over/Under 9.5
      32: {
        ourKey: 'CORNERS_OVER_UNDER_9_5',
        name: 'Corners Over/Under 9.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Total Corners Over/Under 10.5
      33: {
        ourKey: 'CORNERS_OVER_UNDER_10_5',
        name: 'Corners Over/Under 10.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Total Corners Over/Under 11.5
      34: {
        ourKey: 'CORNERS_OVER_UNDER_11_5',
        name: 'Corners Over/Under 11.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Corner 1X2 (Quién gana más corners)
      35: {
        ourKey: 'CORNERS_1X2',
        name: 'Corners 1X2',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW',
          'Away': 'AWAY'
        }
      },

      // First Half Corners
      36: {
        ourKey: 'HT_CORNERS_OVER_UNDER_3_5',
        name: 'First Half Corners Over/Under 3.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // CARDS (Tarjetas)
      // ═══════════════════════════════════════════════════════════════════
      
      // Total Cards Over/Under 2.5
      37: {
        ourKey: 'CARDS_OVER_UNDER_2_5',
        name: 'Cards Over/Under 2.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Total Cards Over/Under 3.5
      38: {
        ourKey: 'CARDS_OVER_UNDER_3_5',
        name: 'Cards Over/Under 3.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Total Cards Over/Under 4.5
      39: {
        ourKey: 'CARDS_OVER_UNDER_4_5',
        name: 'Cards Over/Under 4.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Total Cards Over/Under 5.5
      40: {
        ourKey: 'CARDS_OVER_UNDER_5_5',
        name: 'Cards Over/Under 5.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Total Cards Over/Under 6.5
      41: {
        ourKey: 'CARDS_OVER_UNDER_6_5',
        name: 'Cards Over/Under 6.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Red Card (Tarjeta Roja)
      42: {
        ourKey: 'RED_CARD',
        name: 'Red Card',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // Both Teams Cards
      43: {
        ourKey: 'BOTH_TEAMS_CARDS',
        name: 'Both Teams To Get Cards',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // Home Team Cards Over/Under 1.5
      44: {
        ourKey: 'HOME_CARDS_OVER_UNDER_1_5',
        name: 'Home Team Cards Over/Under 1.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // Away Team Cards Over/Under 1.5
      45: {
        ourKey: 'AWAY_CARDS_OVER_UNDER_1_5',
        name: 'Away Team Cards Over/Under 1.5',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // MERCADOS COMBINADOS
      // ═══════════════════════════════════════════════════════════════════

      // Full Time Result/Both Teams to Score
      46: {
        ourKey: 'FT_BTTS_COMBO',
        name: 'Full Time Result/Both Teams to Score',
        outcomes: {
          'Home/Yes': 'HOME_YES',
          'Home/No': 'HOME_NO',
          'Draw/Yes': 'DRAW_YES',
          'Draw/No': 'DRAW_NO',
          'Away/Yes': 'AWAY_YES',
          'Away/No': 'AWAY_NO'
        }
      },

      // Halftime/Fulltime
      47: {
        ourKey: 'HT_FT',
        name: 'Halftime/Fulltime',
        outcomes: {
          'Home/Home': 'HOME_HOME',
          'Home/Draw': 'HOME_DRAW',
          'Home/Away': 'HOME_AWAY',
          'Draw/Home': 'DRAW_HOME',
          'Draw/Draw': 'DRAW_DRAW',
          'Draw/Away': 'DRAW_AWAY',
          'Away/Home': 'AWAY_HOME',
          'Away/Draw': 'AWAY_DRAW',
          'Away/Away': 'AWAY_AWAY'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // MERCADOS ESPECIALES
      // ═══════════════════════════════════════════════════════════════════

      // To Win to Nil (Ganar sin recibir goles)
      48: {
        ourKey: 'WIN_TO_NIL',
        name: 'To Win To Nil',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY'
        }
      },

      // To Score First
      49: {
        ourKey: 'FIRST_GOAL',
        name: 'To Score First',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY'
        }
      },

      // To Score Last
      50: {
        ourKey: 'LAST_GOAL',
        name: 'To Score Last',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY'
        }
      },

      // Clean Sheet
      51: {
        ourKey: 'CLEAN_SHEET',
        name: 'Clean Sheet',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY',
          'Neither': 'NEITHER'
        }
      }
    };

    // Bookmakers prioritarios
    this.priorityBookmakers = [
      'Bet365',
      'William Hill', 
      'Betfair',
      'Unibet',
      'Pinnacle',
      'Betway',
      '1xBet'
    ];
  }

  // 📊 SINCRONIZAR ODDS DE UN FIXTURE
  async syncFixtureOdds(fixtureApiId) {
    try {
      logger.info(`📊 Sincronizando odds para fixture ${fixtureApiId}...`);

      // Buscar fixture en nuestra BD
      const fixture = await Fixture.findOne({
        where: { apiFootballId: fixtureApiId },
        include: ['league', 'homeTeam', 'awayTeam']
      });

      if (!fixture) {
        throw new Error(`Fixture ${fixtureApiId} no encontrado en BD`);
      }

      // Obtener odds de API-Football
      const response = await apiFootballService.makeRequest('/odds', {
        fixture: fixtureApiId
      });

      if (!response.response || response.response.length === 0) {
        logger.warn(`No hay odds disponibles para fixture ${fixtureApiId}`);
        return { created: 0, updated: 0, errors: 0 };
      }

      const results = { created: 0, updated: 0, errors: 0, markets: 0 };

      for (const oddsData of response.response) {
        try {
          for (const bookmaker of oddsData.bookmakers) {
            for (const bet of bookmaker.bets) {
              const processResult = await this.processOddsData(
                fixture.id,
                bookmaker.name,
                bet
              );
              
              if (processResult.created) results.created++;
              else if (processResult.updated) results.updated++;
              
              results.markets++;
            }
          }
        } catch (error) {
          logger.error(`Error procesando odds:`, error.message);
          results.errors++;
        }
      }

      // Calcular odds promedio
      await this.calculateAverageOdds(fixture.id);

      logger.info(`✅ Odds sincronizados para ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}: ${results.created + results.updated} odds`);
      return results;

    } catch (error) {
      logger.error(`❌ Error sincronizando odds para fixture ${fixtureApiId}:`, error);
      throw error;
    }
  }

  // Procesar datos de odds individuales
  async processOddsData(fixtureId, bookmakerName, betData) {
    try {
      const marketMapping = this.marketMapping[betData.id];
      
      if (!marketMapping) {
        // Mercado no soportado - log para debug
        logger.debug(`Mercado no soportado: ${betData.id} - ${betData.name}`);
        return { skipped: true };
      }

      // Buscar nuestro mercado
      const market = await BettingMarket.findOne({
        where: { key: marketMapping.ourKey }
      });

      if (!market) {
        logger.warn(`Mercado ${marketMapping.ourKey} no encontrado en BD`);
        return { skipped: true };
      }

      const results = { created: 0, updated: 0 };

      // Procesar cada valor de odds
      for (const value of betData.values) {
        const outcome = marketMapping.outcomes[value.value];
        
        if (!outcome) {
          logger.debug(`Outcome no mapeado: ${value.value} en mercado ${marketMapping.ourKey}`);
          continue;
        }

        // Datos de la odd
        const oddData = {
          fixtureId,
          marketId: market.id,
          bookmaker: bookmakerName,
          outcome,
          value: this.extractNumericValue(value.value), // Extraer valor numérico si aplica
          odds: parseFloat(value.odd),
          impliedProbability: this.calculateImpliedProbability(parseFloat(value.odd)),
          isActive: true,
          lastUpdated: new Date()
        };

        // Crear o actualizar odd
        const [odd, created] = await Odds.findOrCreate({
          where: {
            fixtureId,
            marketId: market.id,
            outcome,
            bookmaker: bookmakerName
          },
          defaults: oddData
        });

        if (!created) {
          await odd.update(oddData);
          results.updated++;
        } else {
          results.created++;
        }
      }

      return results;

    } catch (error) {
      logger.error('Error procesando odd individual:', error);
      throw error;
    }
  }

  // Calcular odds promedio para un fixture
  async calculateAverageOdds(fixtureId) {
    try {
      const markets = await BettingMarket.findAll();
      
      for (const market of markets) {
        // Obtener todas las odds de este mercado para el fixture
        const odds = await Odds.findAll({
          where: {
            fixtureId,
            marketId: market.id,
            isActive: true,
            bookmaker: { [Op.ne]: 'Average' } // Excluir Average para evitar bucle
          }
        });

        // Agrupar por outcome
        const outcomeGroups = {};
        odds.forEach(odd => {
          if (!outcomeGroups[odd.outcome]) {
            outcomeGroups[odd.outcome] = [];
          }
          outcomeGroups[odd.outcome].push(odd.odds);
        });

        // Calcular promedio para cada outcome
        for (const [outcome, oddsList] of Object.entries(outcomeGroups)) {
          if (oddsList.length === 0) continue;
          
          const avgOdds = oddsList.reduce((sum, odd) => sum + parseFloat(odd), 0) / oddsList.length;
          const avgImpliedProb = this.calculateImpliedProbability(avgOdds);

          // Crear/actualizar odd promedio
          const [averageOdd, created] = await Odds.findOrCreate({
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
          });

          if (!created) {
            await averageOdd.update({
              odds: parseFloat(avgOdds.toFixed(2)),
              impliedProbability: parseFloat(avgImpliedProb.toFixed(2)),
              lastUpdated: new Date()
            });
          }
        }
      }

    } catch (error) {
      logger.error('Error calculando odds promedio:', error);
    }
  }

  // 🎯 SINCRONIZAR ODDS DE FIXTURES HOY (solo ligas top)
  async syncTodayOdds() {
    try {
      logger.info('🎯 Sincronizando odds de fixtures de hoy (ligas top)...');

      // Buscar fixtures de hoy de ligas con prioridad >= 80
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const fixtures = await Fixture.findAll({
        where: {
          fixtureDate: { [Op.between]: [startOfDay, endOfDay] },
          status: { [Op.in]: ['NS', '1H', 'HT', '2H'] } // Solo fixtures activos
        },
        include: [
          {
            model: League,
            as: 'league',
            where: { priority: { [Op.gte]: 80 } }, // Solo ligas importantes
            attributes: ['id', 'name', 'priority']
          }
        ],
        limit: 20 // Limitar para no gastar muchas requests
      });

      if (fixtures.length === 0) {
        logger.info('No hay fixtures de ligas top para sincronizar odds hoy');
        return { totalFixtures: 0, totalOdds: 0 };
      }

      const results = {
        totalFixtures: fixtures.length,
        totalOdds: 0,
        errors: 0
      };

      for (const fixture of fixtures) {
        try {
          // Pausa para rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const oddsResult = await this.syncFixtureOdds(fixture.apiFootballId);
          results.totalOdds += oddsResult.created + oddsResult.updated;
          
        } catch (error) {
          logger.error(`Error sincronizando odds de fixture ${fixture.apiFootballId}:`, error.message);
          results.errors++;
        }
      }

      logger.info(`✅ Sincronización de odds completada: ${results.totalOdds} odds de ${results.totalFixtures} fixtures`);
      return results;

    } catch (error) {
      logger.error('❌ Error en sincronización de odds de hoy:', error);
      throw error;
    }
  }

  // 📈 OBTENER ODDS DE UN FIXTURE
  async getFixtureOdds(fixtureId, bookmaker = 'Average') {
    try {
      const cacheKey = `odds:fixture:${fixtureId}:${bookmaker}`;
      
      // Intentar obtener del cache
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

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
            attributes: ['id', 'key', 'name', 'category', 'possibleOutcomes']
          }
        ],
        order: [['market', 'priority', 'DESC']]
      });

      // Agrupar por mercado
      const groupedOdds = {};
      odds.forEach(odd => {
        const marketKey = odd.market.key;
        
        if (!groupedOdds[marketKey]) {
          groupedOdds[marketKey] = {
            market: {
              id: odd.market.id,
              key: odd.market.key,
              name: odd.market.name,
              category: odd.market.category,
              possibleOutcomes: odd.market.possibleOutcomes
            },
            odds: {}
          };
        }
        
        groupedOdds[marketKey].odds[odd.outcome] = {
          value: odd.value,
          odds: parseFloat(odd.odds),
          impliedProbability: parseFloat(odd.impliedProbability),
          lastUpdated: odd.lastUpdated
        };
      });

      const result = {
        fixtureId,
        bookmaker,
        markets: groupedOdds,
        lastSync: new Date().toISOString()
      };

      // Guardar en cache por 5 minutos
      await cacheService.set(cacheKey, result, 300);
      
      return result;

    } catch (error) {
      logger.error(`Error obteniendo odds de fixture ${fixtureId}:`, error);
      throw error;
    }
  }

  // 📊 OBTENER MEJORES ODDS DE UN FIXTURE
  async getBestOdds(fixtureId) {
    try {
      const cacheKey = `odds:best:${fixtureId}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const markets = await BettingMarket.findAll({
        where: { isActive: true },
        order: [['priority', 'DESC']]
      });

      const bestOdds = {};

      for (const market of markets) {
        const odds = await Odds.findAll({
          where: {
            fixtureId,
            marketId: market.id,
            isActive: true,
            bookmaker: { [Op.ne]: 'Average' }
          }
        });

        const outcomeGroups = {};
        odds.forEach(odd => {
          if (!outcomeGroups[odd.outcome]) {
            outcomeGroups[odd.outcome] = [];
          }
          outcomeGroups[odd.outcome].push({
            odds: parseFloat(odd.odds),
            bookmaker: odd.bookmaker,
            lastUpdated: odd.lastUpdated
          });
        });

        // Encontrar mejores odds para cada outcome
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
              category: market.category
            },
            bestOdds: marketBest
          };
        }
      }

      const result = {
        fixtureId,
        bestOdds,
        lastSync: new Date().toISOString()
      };

      // Cache por 2 minutos
      await cacheService.set(cacheKey, result, 120);
      
      return result;

    } catch (error) {
      logger.error(`Error obteniendo mejores odds de fixture ${fixtureId}:`, error);
      throw error;
    }
  }

  // Utilidades
  calculateImpliedProbability(odds) {
    return (1 / odds) * 100;
  }

  extractNumericValue(value) {
    const match = value.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }

  // Obtener estadísticas de odds
  async getOddsStats() {
    try {
      const stats = await Odds.findAll({
        attributes: [
          'bookmaker',
          [Odds.sequelize.fn('COUNT', Odds.sequelize.col('id')), 'count'],
          [Odds.sequelize.fn('MAX', Odds.sequelize.col('last_updated')), 'lastUpdate']
        ],
        group: ['bookmaker'],
        order: [[Odds.sequelize.fn('COUNT', Odds.sequelize.col('id')), 'DESC']]
      });

      return {
        bookmakers: stats,
        totalOdds: stats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0),
        lastUpdate: stats.length > 0 ? stats[0].dataValues.lastUpdate : null
      };

    } catch (error) {
      logger.error('Error obteniendo estadísticas de odds:', error);
      throw error;
    }
  }

  // 🆕 OBTENER MERCADOS DISPONIBLES PARA UN FIXTURE
  async getAvailableMarkets(fixtureId) {
    try {
      const markets = await Odds.findAll({
        where: { fixtureId, isActive: true },
        attributes: ['marketId'],
        group: ['marketId'],
        include: [
          {
            model: BettingMarket,
            as: 'market',
            attributes: ['key', 'name', 'category']
          }
        ]
      });

      return markets.map(odd => ({
        key: odd.market.key,
        name: odd.market.name,
        category: odd.market.category
      }));

    } catch (error) {
      logger.error('Error obteniendo mercados disponibles:', error);
      return [];
    }
  }
}

module.exports = new OddsSyncService();