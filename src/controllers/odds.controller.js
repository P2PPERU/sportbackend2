// 📄 src/controllers/odds.controller.js - CONSISTENTE CON TU ESTILO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const oddsSync = require('../services/oddsSync.service'); // Tu servicio actual por ahora
const { Fixture, League, Team, BettingMarket, Odds } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// ✅ FUNCIÓN HELPER FUERA DE LA CLASE PARA EVITAR PROBLEMAS CON 'THIS'
function formatDateForTimezone(date, timezone = 'America/Lima') {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(date));
  } catch (error) {
    logger.error(`❌ Error formateando fecha para timezone ${timezone}:`, error.message);
    return new Date(date).toLocaleString('es-PE'); // Fallback simple
  }
}

// ✅ FUNCIÓN HELPER PARA DESCRIPCIÓN DE CATEGORÍAS
function getCategoryDescription(category) {
  const descriptions = {
    'MATCH_RESULT': 'Resultados del partido (1X2, Double Chance)',
    'GOALS': 'Mercados relacionados con goles (Over/Under, BTTS)',
    'HALFTIME': 'Mercados del primer tiempo',
    'SECOND_HALF': 'Mercados del segundo tiempo',
    'CORNERS': 'Mercados de corners/esquinas',
    'CARDS': 'Mercados de tarjetas amarillas/rojas',
    'EXACT_SCORE': 'Resultados exactos',
    'HANDICAP': 'Hándicaps asiáticos y europeos',
    'SPECIALS': 'Mercados especiales (Clean Sheet, etc.)',
    'PLAYER_PROPS': 'Props de jugadores',
    'COMBINED': 'Mercados combinados',
    'TIME_SPECIFIC': 'Mercados de tiempo específico',
    'OTHER': 'Otros mercados detectados'
  };
  
  return descriptions[category] || 'Categoría detectada automáticamente';
}

class OddsController {
  // ✅ GET /api/odds/fixture/:id - ULTRA SIMPLE
  async getFixtureOdds(req, res) {
    try {
      const { id } = req.params;
      const { bookmaker = 'Average', timezone = 'America/Lima' } = req.query;

      logger.info(`📊 Solicitud: Odds de fixture ${id} (bookmaker: ${bookmaker}, timezone: ${timezone})`);

      // Verificar que el fixture existe
      const fixture = await Fixture.findByPk(id, {
        include: [
          { model: League, as: 'league', attributes: ['id', 'name', 'logo', 'country'] },
          { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logo'] },
          { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logo'] }
        ]
      });

      if (!fixture) {
        return res.status(404).json({
          success: false,
          message: 'Fixture no encontrado'
        });
      }

      // Obtener odds (usando tu servicio actual)
      let oddsData;
      try {
        // ✅ CUANDO IMPLEMENTES EL DINÁMICO, CAMBIAR ESTA LÍNEA:
        // oddsData = await dynamicOddsSync.getFixtureOdds(id, bookmaker);
        
        // ✅ POR AHORA USA TU SERVICIO ACTUAL:
        oddsData = await oddsSync.getFixtureOdds(id, bookmaker);
      } catch (oddsError) {
        logger.warn(`⚠️ Error obteniendo odds para fixture ${id}:`, oddsError.message);
        oddsData = { categorizedMarkets: {}, totalMarkets: 0, totalCategories: 0 };
      }

      // Obtener bookmakers disponibles
      const availableBookmakers = await Odds.findAll({
        where: { fixtureId: id, isActive: true },
        attributes: ['bookmaker'],
        group: ['bookmaker'],
        raw: true
      });

      const response = {
        success: true,
        message: 'Odds obtenidas exitosamente',
        data: {
          fixture: {
            id: fixture.id,
            apiFootballId: fixture.apiFootballId,
            homeTeam: fixture.homeTeam?.name || 'TBD',
            awayTeam: fixture.awayTeam?.name || 'TBD',
            league: fixture.league?.name || 'Unknown',
            date: fixture.fixtureDate,
            dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone), // ✅ Función externa
            timezone: timezone,
            status: fixture.status
          },
          odds: {
            categorizedMarkets: oddsData.categorizedMarkets || {},
            totalMarkets: oddsData.totalMarkets || 0,
            totalCategories: oddsData.totalCategories || 0
          },
          bookmaker: bookmaker,
          availableBookmakers: availableBookmakers.map(b => b.bookmaker),
          lastSync: oddsData.lastSync || new Date().toISOString()
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone,
          marketsCount: oddsData.totalMarkets || 0,
          categoriesCount: oddsData.totalCategories || 0,
          source: 'api-football'
        }
      };

      res.json(response);

    } catch (error) {
      logger.error(`❌ Error obteniendo odds de fixture ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo odds del fixture',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno',
        timezone: req.query.timezone || 'America/Lima'
      });
    }
  }

  // ✅ GET /api/odds/fixture/:id/best - ULTRA SIMPLE
  async getBestFixtureOdds(req, res) {
    try {
      const { id } = req.params;
      const { timezone = 'America/Lima' } = req.query;

      logger.info(`🎯 Solicitud: Mejores odds de fixture ${id} (timezone: ${timezone})`);

      const fixture = await Fixture.findByPk(id, {
        include: [
          { model: League, as: 'league', attributes: ['id', 'name', 'logo'] },
          { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logo'] },
          { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logo'] }
        ]
      });

      if (!fixture) {
        return res.status(404).json({
          success: false,
          message: 'Fixture no encontrado'
        });
      }

      // Obtener mejores odds
      let bestOdds;
      try {
        // ✅ CUANDO IMPLEMENTES EL DINÁMICO, CAMBIAR ESTA LÍNEA:
        // bestOdds = await dynamicOddsSync.getBestOdds(id);
        
        // ✅ POR AHORA USA TU SERVICIO ACTUAL:
        bestOdds = await oddsSync.getBestOdds(id);
      } catch (oddsError) {
        logger.warn(`⚠️ Error obteniendo mejores odds para fixture ${id}:`, oddsError.message);
        bestOdds = { bestOdds: {}, totalMarkets: 0 };
      }

      const response = {
        success: true,
        message: 'Mejores odds obtenidas exitosamente',
        data: {
          fixture: {
            id: fixture.id,
            homeTeam: fixture.homeTeam?.name || 'TBD',
            awayTeam: fixture.awayTeam?.name || 'TBD',
            league: fixture.league?.name || 'Unknown',
            date: fixture.fixtureDate,
            dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone), // ✅ Función externa
            timezone: timezone,
            status: fixture.status
          },
          bestOdds: bestOdds.bestOdds || {},
          totalMarkets: bestOdds.totalMarkets || 0,
          lastSync: bestOdds.lastSync || new Date().toISOString()
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone,
          marketsCount: bestOdds.totalMarkets || 0
        }
      };

      res.json(response);

    } catch (error) {
      logger.error(`❌ Error obteniendo mejores odds de fixture ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo mejores odds',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ✅ GET /api/odds/today - ULTRA SIMPLE
  async getTodayOdds(req, res) {
    try {
      const { 
        league, 
        market = '1X2', 
        bookmaker = 'Average',
        timezone = 'America/Lima',
        minPriority = 70
      } = req.query;

      logger.info('📅 Solicitud: Odds de fixtures de hoy', { league, market, bookmaker, timezone });

      // Buscar fixtures de hoy con odds
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const whereClause = {
        fixtureDate: { [Op.between]: [startOfDay, endOfDay] }
      };

      const includeClause = [
        { 
          model: League, 
          as: 'league',
          where: { priority: { [Op.gte]: parseInt(minPriority) } }, // Solo ligas importantes
          attributes: ['id', 'name', 'logo', 'country', 'priority']
        },
        { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logo'] },
        { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logo'] }
      ];

      // Filtro opcional por liga
      if (league) {
        includeClause[0].where.id = league;
      }

      const fixtures = await Fixture.findAll({
        where: whereClause,
        include: includeClause,
        order: [
          ['league', 'priority', 'DESC'],
          ['fixtureDate', 'ASC']
        ],
        limit: 30
      });

      // Obtener odds para cada fixture
      const fixturesWithOdds = [];

      for (const fixture of fixtures) {
        try {
          // Buscar si hay odds para este fixture
          const hasOdds = await Odds.findOne({
            where: {
              fixtureId: fixture.id,
              bookmaker,
              isActive: true
            }
          });

          if (hasOdds) {
            // Obtener odds básicas del fixture
            const fixtureOdds = await oddsSync.getFixtureOdds(fixture.id, bookmaker);
            
            // Buscar mercado específico
            let selectedMarket = null;
            if (fixtureOdds && fixtureOdds.categorizedMarkets) {
              for (const [category, markets] of Object.entries(fixtureOdds.categorizedMarkets)) {
                for (const [marketKey, marketData] of Object.entries(markets)) {
                  if (marketKey.includes(market.toUpperCase()) || category === 'MATCH_RESULT') {
                    selectedMarket = {
                      key: marketKey,
                      name: marketData.market?.name || marketKey,
                      odds: marketData.odds || {}
                    };
                    break;
                  }
                }
                if (selectedMarket) break;
              }
            }

            if (selectedMarket && Object.keys(selectedMarket.odds).length > 0) {
              fixturesWithOdds.push({
                id: fixture.id,
                apiFootballId: fixture.apiFootballId,
                homeTeam: fixture.homeTeam?.name || 'TBD',
                awayTeam: fixture.awayTeam?.name || 'TBD',
                league: fixture.league?.name || 'Unknown',
                date: fixture.fixtureDate,
                dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone), // ✅ Función externa
                timezone: timezone,
                status: fixture.status,
                odds: selectedMarket.odds,
                market: selectedMarket.name,
                marketKey: selectedMarket.key
              });
            }
          }
        } catch (oddError) {
          // Continuar si no hay odds para este fixture
          logger.debug(`⚠️ No hay odds para fixture ${fixture.id}: ${oddError.message}`);
          continue;
        }
      }

      const response = {
        success: true,
        message: `${fixturesWithOdds.length} fixtures con odds encontrados`,
        data: {
          date: startOfDay.toISOString().split('T')[0],
          dateLocal: formatDateForTimezone(startOfDay, timezone), // ✅ Función externa
          timezone: timezone,
          market: market,
          bookmaker: bookmaker,
          count: fixturesWithOdds.length,
          fixtures: fixturesWithOdds
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone,
          totalFixtures: fixtures.length,
          fixturesWithOdds: fixturesWithOdds.length,
          source: 'api-football'
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error obteniendo odds de hoy:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo odds de hoy',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno',
        timezone: req.query.timezone || 'America/Lima'
      });
    }
  }

  // ✅ GET /api/odds/markets - ULTRA SIMPLE
  async getAvailableMarkets(req, res) {
    try {
      const { timezone = 'America/Lima' } = req.query;

      logger.info('📋 Solicitud: Mercados de apuestas disponibles', { timezone });

      const markets = await BettingMarket.findAll({
        where: { isActive: true },
        attributes: [
          'id', 'key', 'name', 'category', 'priority', 'description'
        ],
        order: [['priority', 'DESC'], ['name', 'ASC']]
      });

      // Agrupar por categoría
      const groupedMarkets = {};
      const stats = {
        totalMarkets: markets.length,
        categoriesCount: 0,
        mostUsedMarkets: []
      };

      markets.forEach(market => {
        const category = market.category || 'OTHER';
        if (!groupedMarkets[category]) {
          groupedMarkets[category] = [];
        }
        groupedMarkets[category].push({
          id: market.id,
          key: market.key,
          name: market.name,
          priority: market.priority,
          description: market.description
        });
      });

      stats.categoriesCount = Object.keys(groupedMarkets).length;
      stats.mostUsedMarkets = markets
        .slice(0, 10)
        .map(m => ({ key: m.key, name: m.name, priority: m.priority }));

      const response = {
        success: true,
        message: `${markets.length} mercados de apuestas disponibles`,
        data: {
          markets: groupedMarkets,
          categories: Object.keys(groupedMarkets),
          totalMarkets: stats.totalMarkets,
          timezone: timezone
        },
        stats,
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone,
          source: 'database'
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error obteniendo mercados de apuestas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo mercados de apuestas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ✅ POST /api/odds/sync - ULTRA SIMPLE
  async forceSyncOdds(req, res) {
    try {
      const { fixtureId } = req.body;
      const { timezone = 'America/Lima' } = req.query;

      logger.info(`🔄 Sincronización de odds iniciada`, { fixtureId, timezone });

      let result;
      if (fixtureId) {
        // Sincronizar odds de un fixture específico
        const fixture = await Fixture.findByPk(fixtureId);
        if (!fixture) {
          return res.status(404).json({
            success: false,
            message: 'Fixture no encontrado'
          });
        }
        
        result = await oddsSync.syncFixtureOdds(fixture.apiFootballId);
      } else {
        // Sincronizar odds de hoy
        result = await oddsSync.syncTodayOdds();
      }

      const response = {
        success: true,
        message: 'Sincronización de odds completada exitosamente',
        data: {
          ...result,
          timestamp: new Date().toISOString(),
          timestampLocal: formatDateForTimezone(new Date(), timezone), // ✅ Función externa
          timezone: timezone
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone,
          source: 'api-football'
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error en sincronización de odds:', error);
      res.status(500).json({
        success: false,
        message: 'Error en sincronización de odds',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ✅ GET /api/odds/stats - ULTRA SIMPLE
  async getOddsStats(req, res) {
    try {
      const { timezone = 'America/Lima' } = req.query;

      logger.info('📈 Solicitud: Estadísticas de odds', { timezone });

      // Estadísticas básicas
      const [marketCount, oddsCount] = await Promise.all([
        BettingMarket.count({ where: { isActive: true } }),
        Odds.count({ where: { isActive: true } })
      ]);

      // Bookmakers disponibles
      const bookmakers = await Odds.findAll({
        where: { isActive: true },
        attributes: [
          'bookmaker',
          [Odds.sequelize.fn('COUNT', Odds.sequelize.col('id')), 'oddsCount']
        ],
        group: ['bookmaker'],
        order: [[Odds.sequelize.fn('COUNT', Odds.sequelize.col('id')), 'DESC']]
      });

      const response = {
        success: true,
        message: 'Estadísticas de odds obtenidas',
        data: {
          totalMarkets: marketCount,
          totalOdds: oddsCount,
          activeBookmakers: bookmakers.length,
          timezone: timezone,
          lastUpdate: new Date().toISOString(),
          lastUpdateLocal: formatDateForTimezone(new Date(), timezone), // ✅ Función externa
          bookmakers: bookmakers.map(b => ({
            name: b.bookmaker,
            oddsCount: parseInt(b.dataValues.oddsCount)
          }))
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone,
          source: 'database'
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error obteniendo estadísticas de odds:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ✅ GET /api/odds/bookmakers - ULTRA SIMPLE
  async getBookmakers(req, res) {
    try {
      const { fixtureId, timezone = 'America/Lima' } = req.query;

      logger.info('🏪 Solicitud: Bookmakers disponibles', { fixtureId, timezone });

      let whereClause = { isActive: true };
      if (fixtureId) {
        whereClause.fixtureId = fixtureId;
      }

      const bookmakers = await Odds.findAll({
        where: whereClause,
        attributes: [
          'bookmaker',
          [Odds.sequelize.fn('COUNT', Odds.sequelize.col('id')), 'oddsCount'],
          [Odds.sequelize.fn('MAX', Odds.sequelize.col('last_updated')), 'lastUpdate']
        ],
        group: ['bookmaker'],
        order: [[Odds.sequelize.fn('COUNT', Odds.sequelize.col('id')), 'DESC']]
      });

      const response = {
        success: true,
        message: `${bookmakers.length} bookmakers disponibles`,
        data: {
          bookmakers: bookmakers.map(b => ({
            name: b.bookmaker,
            oddsCount: parseInt(b.dataValues.oddsCount),
            lastUpdate: b.dataValues.lastUpdate,
            lastUpdateLocal: formatDateForTimezone(b.dataValues.lastUpdate, timezone) // ✅ Función externa
          })),
          count: bookmakers.length,
          timezone: timezone,
          ...(fixtureId && { fixtureId })
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone,
          source: 'database'
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error obteniendo bookmakers:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo bookmakers',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ✅ GET /api/odds/categories - ULTRA SIMPLE
  async getOddsCategories(req, res) {
    try {
      const { timezone = 'America/Lima' } = req.query;

      logger.info('📊 Solicitud: Categorías de mercados', { timezone });

      const categories = await BettingMarket.findAll({
        where: { isActive: true },
        attributes: [
          'category',
          [BettingMarket.sequelize.fn('COUNT', BettingMarket.sequelize.col('id')), 'marketCount']
        ],
        group: ['category'],
        order: [[BettingMarket.sequelize.fn('COUNT', BettingMarket.sequelize.col('id')), 'DESC']]
      });

      const enrichedCategories = categories.map(cat => ({
        category: cat.category,
        marketCount: parseInt(cat.dataValues.marketCount),
        description: getCategoryDescription(cat.category) // ✅ Función externa
      }));

      const response = {
        success: true,
        message: `${enrichedCategories.length} categorías de mercados encontradas`,
        data: {
          categories: enrichedCategories,
          totalCategories: enrichedCategories.length,
          timezone: timezone
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone,
          source: 'database'
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error obteniendo categorías de mercados:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo categorías',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }
}

module.exports = new OddsController();