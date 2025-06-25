const fixtureSync = require('../services/fixtureSync.service');
const apiFootballService = require('../services/apiFootballService');
const { Fixture, League, Team } = require('../models');
const logger = require('../utils/logger');

class FixturesController {
  // GET /api/fixtures/today - Obtener partidos de hoy
  async getTodayFixtures(req, res) {
    try {
      logger.info('📅 Solicitud: Fixtures de hoy');

      // Primero intentar sincronizar datos frescos (si no ha sido hecho recientemente)
      try {
        await fixtureSync.syncTodayFixtures();
      } catch (syncError) {
        logger.warn('⚠️ Error sincronizando datos frescos, usando datos locales:', syncError.message);
      }

      // Obtener fixtures desde base de datos
      const fixtures = await fixtureSync.getTodayFixtures();

      // Respuesta formateada
      const response = {
        success: true,
        message: `${fixtures.length} partidos encontrados para hoy`,
        data: {
          date: new Date().toISOString().split('T')[0],
          count: fixtures.length,
          fixtures: fixtures.map(fixture => ({
            id: fixture.id,
            apiFootballId: fixture.apiFootballId,
            date: fixture.fixtureDate,
            status: fixture.status,
            statusLong: fixture.statusLong,
            elapsed: fixture.elapsed,
            round: fixture.round,
            venue: fixture.venue,
            city: fixture.city,
            referee: fixture.referee,
            league: {
              id: fixture.league.id,
              name: fixture.league.name,
              shortName: fixture.league.shortName,
              logo: fixture.league.logo,
              country: fixture.league.country
            },
            homeTeam: {
              id: fixture.homeTeam.id,
              name: fixture.homeTeam.name,
              shortName: fixture.homeTeam.shortName,
              logo: fixture.homeTeam.logo
            },
            awayTeam: {
              id: fixture.awayTeam.id,
              name: fixture.awayTeam.name,
              shortName: fixture.awayTeam.shortName,
              logo: fixture.awayTeam.logo
            },
            score: {
              home: fixture.homeScore,
              away: fixture.awayScore,
              halftime: {
                home: fixture.homeScoreHt,
                away: fixture.awayScoreHt
              }
            },
            isAvailableForTournament: fixture.isAvailableForTournament
          }))
        },
        meta: {
          timestamp: new Date().toISOString(),
          source: 'api-football',
          cached: false
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error obteniendo fixtures de hoy:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/fixtures/search - Buscar fixtures con filtros
  async searchFixtures(req, res) {
    try {
      const { date, leagueId, teamId, status, limit } = req.query;

      logger.info('🔍 Búsqueda de fixtures:', { date, leagueId, teamId, status });

      const criteria = {};
      if (date) criteria.date = date;
      if (leagueId) criteria.leagueId = leagueId;
      if (teamId) criteria.teamId = teamId;
      if (status) criteria.status = status;
      if (limit) criteria.limit = parseInt(limit);

      const fixtures = await fixtureSync.searchFixtures(criteria);

      res.json({
        success: true,
        message: `${fixtures.length} partidos encontrados`,
        data: {
          criteria,
          count: fixtures.length,
          fixtures: fixtures.map(fixture => ({
            id: fixture.id,
            apiFootballId: fixture.apiFootballId,
            date: fixture.fixtureDate,
            status: fixture.status,
            statusLong: fixture.statusLong,
            elapsed: fixture.elapsed,
            round: fixture.round,
            venue: fixture.venue,
            league: fixture.league,
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            score: {
              home: fixture.homeScore,
              away: fixture.awayScore,
              halftime: {
                home: fixture.homeScoreHt,
                away: fixture.awayScoreHt
              }
            },
            isAvailableForTournament: fixture.isAvailableForTournament
          }))
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('❌ Error buscando fixtures:', error);
      res.status(500).json({
        success: false,
        message: 'Error en búsqueda de fixtures',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // POST /api/fixtures/sync - Forzar sincronización
  async forceSyncFixtures(req, res) {
    try {
      // Verificar que el usuario sea admin
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Se requieren permisos de administrador'
        });
      }

      logger.info('🔄 Sincronización forzada iniciada por admin:', req.user.email);

      const result = await fixtureSync.syncTodayFixtures();

      res.json({
        success: true,
        message: 'Sincronización completada exitosamente',
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          triggeredBy: req.user.email
        }
      });

    } catch (error) {
      logger.error('❌ Error en sincronización forzada:', error);
      res.status(500).json({
        success: false,
        message: 'Error en sincronización',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/fixtures/live - Obtener partidos en vivo
  async getLiveFixtures(req, res) {
    try {
      logger.info('🔴 Solicitud: Fixtures en vivo');

      const liveStatuses = ['1H', 'HT', '2H', 'ET'];
      const fixtures = await fixtureSync.searchFixtures({ 
        status: liveStatuses 
      });

      res.json({
        success: true,
        message: `${fixtures.length} partidos en vivo`,
        data: {
          count: fixtures.length,
          fixtures: fixtures.map(fixture => ({
            id: fixture.id,
            apiFootballId: fixture.apiFootballId,
            date: fixture.fixtureDate,
            status: fixture.status,
            statusLong: fixture.statusLong,
            elapsed: fixture.elapsed,
            league: fixture.league,
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            score: {
              home: fixture.homeScore,
              away: fixture.awayScore
            }
          }))
        },
        meta: {
          timestamp: new Date().toISOString(),
          refreshInterval: '30s'
        }
      });

    } catch (error) {
      logger.error('❌ Error obteniendo fixtures en vivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo partidos en vivo',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/fixtures/:id - Obtener un fixture específico
  async getFixtureById(req, res) {
    try {
      const { id } = req.params;
      logger.info(`🎯 Solicitud: Fixture ${id}`);

      const fixture = await Fixture.findByPk(id, {
        include: [
          {
            model: League,
            as: 'league',
            attributes: ['id', 'name', 'shortName', 'logo', 'country']
          },
          {
            model: Team,
            as: 'homeTeam',
            attributes: ['id', 'name', 'shortName', 'logo']
          },
          {
            model: Team,
            as: 'awayTeam',
            attributes: ['id', 'name', 'shortName', 'logo']
          }
        ]
      });

      if (!fixture) {
        return res.status(404).json({
          success: false,
          message: 'Fixture no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          id: fixture.id,
          apiFootballId: fixture.apiFootballId,
          date: fixture.fixtureDate,
          status: fixture.status,
          statusLong: fixture.statusLong,
          elapsed: fixture.elapsed,
          round: fixture.round,
          venue: fixture.venue,
          city: fixture.city,
          referee: fixture.referee,
          league: fixture.league,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          score: {
            home: fixture.homeScore,
            away: fixture.awayScore,
            halftime: {
              home: fixture.homeScoreHt,
              away: fixture.awayScoreHt
            },
            extratime: {
              home: fixture.homeScoreEt,
              away: fixture.awayScoreEt
            },
            penalty: {
              home: fixture.homeScorePen,
              away: fixture.awayScorePen
            }
          },
          isAvailableForTournament: fixture.isAvailableForTournament,
          lastSync: fixture.lastSyncAt
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error(`❌ Error obteniendo fixture ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo fixture',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/fixtures/league/:leagueId - Obtener fixtures de una liga
  async getFixturesByLeague(req, res) {
    try {
      const { leagueId } = req.params;
      const { days = 7 } = req.query;

      logger.info(`🏆 Solicitud: Fixtures de liga ${leagueId}`);

      const fixtures = await fixtureSync.searchFixtures({ 
        leagueId,
        limit: 100 
      });

      res.json({
        success: true,
        message: `${fixtures.length} partidos de la liga`,
        data: {
          leagueId,
          count: fixtures.length,
          fixtures: fixtures.map(fixture => ({
            id: fixture.id,
            apiFootballId: fixture.apiFootballId,
            date: fixture.fixtureDate,
            status: fixture.status,
            round: fixture.round,
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            score: {
              home: fixture.homeScore,
              away: fixture.awayScore
            },
            isAvailableForTournament: fixture.isAvailableForTournament
          }))
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error(`❌ Error obteniendo fixtures de liga ${req.params.leagueId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo fixtures de la liga',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }
}

module.exports = new FixturesController();