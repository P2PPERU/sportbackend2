const oddsSync = require('../services/oddsSync.service');
const { Fixture, League, Team, BettingMarket, Odds } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class OddsController {
  // GET /api/odds/fixture/:id - Odds de un fixture específico
  async getFixtureOdds(req, res) {
    try {
      const { id } = req.params;
      const { bookmaker = 'Average' } = req.query;

      logger.info(`📊 Solicitud odds fixture ${id} (bookmaker: ${bookmaker})`);

      // Verificar que el fixture existe
      const fixture = await Fixture.findByPk(id, {
        include: [
          { model: League, as: 'league', attributes: ['name', 'logo'] },
          { model: Team, as: 'homeTeam', attributes: ['name', 'logo'] },
          { model: Team, as: 'awayTeam', attributes: ['name', 'logo'] }
        ]
      });

      if (!fixture) {
        return res.status(404).json({
          success: false,
          message: 'Fixture no encontrado'
        });
      }

      // Obtener odds
      const oddsData = await oddsSync.getFixtureOdds(id, bookmaker);

      if (!oddsData.markets || Object.keys(oddsData.markets).length === 0) {
        // Intentar sincronizar odds si no existen
        try {
          await oddsSync.syncFixtureOdds(fixture.apiFootballId);
          const retryOdds = await oddsSync.getFixtureOdds(id, bookmaker);
          
          if (!retryOdds.markets || Object.keys(retryOdds.markets).length === 0) {
            return res.json({
              success: true,
              message: 'Odds no disponibles para este fixture',
              data: {
                fixture: {
                  id: fixture.id,
                  homeTeam: fixture.homeTeam.name,
                  awayTeam: fixture.awayTeam.name,
                  league: fixture.league.name,
                  date: fixture.fixtureDate,
                  status: fixture.status
                },
                odds: null,
                availableBookmakers: []
              }
            });
          }
          
          oddsData.markets = retryOdds.markets;
        } catch (syncError) {
          logger.warn(`No se pudieron sincronizar odds para fixture ${id}:`, syncError.message);
        }
      }

      // Obtener bookmakers disponibles
      const availableBookmakers = await Odds.findAll({
        where: { fixtureId: id, isActive: true },
        attributes: ['bookmaker'],
        group: ['bookmaker']
      });

      res.json({
        success: true,
        message: 'Odds obtenidas exitosamente',
        data: {
          fixture: {
            id: fixture.id,
            homeTeam: fixture.homeTeam.name,
            awayTeam: fixture.awayTeam.name,
            league: fixture.league.name,
            date: fixture.fixtureDate,
            status: fixture.status
          },
          odds: oddsData.markets,
          bookmaker: bookmaker,
          availableBookmakers: availableBookmakers.map(b => b.bookmaker),
          lastSync: oddsData.lastSync
        },
        meta: {
          timestamp: new Date().toISOString(),
          marketsCount: Object.keys(oddsData.markets || {}).length
        }
      });

    } catch (error) {
      logger.error(`❌ Error obteniendo odds de fixture ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo odds del fixture',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/odds/fixture/:id/best - Mejores odds de un fixture
  async getBestFixtureOdds(req, res) {
    try {
      const { id } = req.params;

      logger.info(`🎯 Solicitud mejores odds fixture ${id}`);

      const fixture = await Fixture.findByPk(id, {
        include: [
          { model: League, as: 'league', attributes: ['name', 'logo'] },
          { model: Team, as: 'homeTeam', attributes: ['name', 'logo'] },
          { model: Team, as: 'awayTeam', attributes: ['name', 'logo'] }
        ]
      });

      if (!fixture) {
        return res.status(404).json({
          success: false,
          message: 'Fixture no encontrado'
        });
      }

      const bestOdds = await oddsSync.getBestOdds(id);

      res.json({
        success: true,
        message: 'Mejores odds obtenidas exitosamente',
        data: {
          fixture: {
            id: fixture.id,
            homeTeam: fixture.homeTeam.name,
            awayTeam: fixture.awayTeam.name,
            league: fixture.league.name,
            date: fixture.fixtureDate,
            status: fixture.status
          },
          bestOdds: bestOdds.bestOdds,
          lastSync: bestOdds.lastSync
        },
        meta: {
          timestamp: new Date().toISOString(),
          marketsCount: Object.keys(bestOdds.bestOdds || {}).length
        }
      });

    } catch (error) {
      logger.error(`❌ Error obteniendo mejores odds de fixture ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo mejores odds',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/odds/today - Odds de fixtures de hoy (ligas top)
  async getTodayOdds(req, res) {
    try {
      const { league, market = '1X2', bookmaker = 'Average' } = req.query;

      logger.info('📅 Solicitud odds de fixtures de hoy');

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
          where: { priority: { [Op.gte]: 75 } }, // Solo ligas importantes
          attributes: ['id', 'name', 'logo', 'country', 'priority']
        },
        { model: Team, as: 'homeTeam', attributes: ['name', 'logo'] },
        { model: Team, as: 'awayTeam', attributes: ['name', 'logo'] }
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
        limit: 50
      });

      // Obtener odds para cada fixture
      const fixturesWithOdds = [];

      for (const fixture of fixtures) {
        try {
          const odds = await Odds.findAll({
            where: {
              fixtureId: fixture.id,
              bookmaker,
              isActive: true
            },
            include: [
              {
                model: BettingMarket,
                as: 'market',
                where: { key: market },
                attributes: ['key', 'name']
              }
            ]
          });

          if (odds.length > 0) {
            const oddsObj = {};
            odds.forEach(odd => {
              oddsObj[odd.outcome] = {
                odds: parseFloat(odd.odds),
                impliedProbability: parseFloat(odd.impliedProbability)
              };
            });

            fixturesWithOdds.push({
              id: fixture.id,
              homeTeam: fixture.homeTeam.name,
              awayTeam: fixture.awayTeam.name,
              league: fixture.league.name,
              date: fixture.fixtureDate,
              status: fixture.status,
              odds: oddsObj,
              market: odds[0].market.name
            });
          }
        } catch (oddError) {
          // Continuar si no hay odds para este fixture
          continue;
        }
      }

      res.json({
        success: true,
        message: `${fixturesWithOdds.length} fixtures con odds encontrados`,
        data: {
          date: startOfDay.toISOString().split('T')[0],
          market: market,
          bookmaker: bookmaker,
          fixtures: fixturesWithOdds
        },
        meta: {
          timestamp: new Date().toISOString(),
          totalFixtures: fixtures.length,
          fixturesWithOdds: fixturesWithOdds.length
        }
      });

    } catch (error) {
      logger.error('❌ Error obteniendo odds de hoy:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo odds de hoy',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/odds/markets - Listar mercados disponibles
  async getAvailableMarkets(req, res) {
    try {
      logger.info('📋 Solicitud mercados de apuestas disponibles');

      const markets = await BettingMarket.findAll({
        where: { isActive: true },
        attributes: ['id', 'key', 'name', 'description', 'category', 'possibleOutcomes', 'priority'],
        order: [['priority', 'DESC'], ['name', 'ASC']]
      });

      // Agrupar por categoría
      const groupedMarkets = {};
      markets.forEach(market => {
        const category = market.category;
        if (!groupedMarkets[category]) {
          groupedMarkets[category] = [];
        }
        groupedMarkets[category].push({
          id: market.id,
          key: market.key,
          name: market.name,
          description: market.description,
          possibleOutcomes: market.possibleOutcomes,
          priority: market.priority
        });
      });

      res.json({
        success: true,
        message: `${markets.length} mercados de apuestas disponibles`,
        data: {
          markets: groupedMarkets,
          categories: Object.keys(groupedMarkets),
          totalMarkets: markets.length
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('❌ Error obteniendo mercados:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo mercados de apuestas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // POST /api/odds/sync - Forzar sincronización de odds (admin)
  async forceSyncOdds(req, res) {
    try {
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Se requieren permisos de administrador'
        });
      }

      const { fixtureId } = req.body;

      logger.info(`🔄 Sincronización forzada de odds iniciada por admin: ${req.user.email}`);

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

      res.json({
        success: true,
        message: 'Sincronización de odds completada exitosamente',
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          triggeredBy: req.user.email
        }
      });

    } catch (error) {
      logger.error('❌ Error en sincronización forzada de odds:', error);
      res.status(500).json({
        success: false,
        message: 'Error en sincronización de odds',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/odds/stats - Estadísticas de odds
  async getOddsStats(req, res) {
    try {
      logger.info('📈 Solicitud estadísticas de odds');

      const stats = await oddsSync.getOddsStats();

      res.json({
        success: true,
        message: 'Estadísticas de odds obtenidas',
        data: stats,
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('❌ Error obteniendo estadísticas de odds:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/odds/bookmakers - Listar bookmakers disponibles
  async getBookmakers(req, res) {
    try {
      const { fixtureId } = req.query;

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
        order: [
          [Odds.sequelize.fn('COUNT', Odds.sequelize.col('id')), 'DESC']
        ]
      });

      res.json({
        success: true,
        message: `${bookmakers.length} bookmakers disponibles`,
        data: {
          bookmakers: bookmakers.map(b => ({
            name: b.bookmaker,
            oddsCount: parseInt(b.dataValues.oddsCount),
            lastUpdate: b.dataValues.lastUpdate
          })),
          ...(fixtureId && { fixtureId })
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('❌ Error obteniendo bookmakers:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo bookmakers',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }
}

module.exports = new OddsController();