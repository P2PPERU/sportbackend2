// 📄 src/controllers/fixtures.controller.js - ULTRA SIMPLE SIN ERRORES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fixtureSync = require('../services/fixtureSync.service');
const apiFootballService = require('../services/apiFootballService');
const { Fixture, League, Team } = require('../models');
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

class FixturesController {
  // ✅ GET /api/fixtures/today - ULTRA SIMPLE
  async getTodayFixtures(req, res) {
    try {
      const timezone = req.query.timezone || 'America/Lima';
      const minPriority = parseInt(req.query.minPriority) || 0;

      logger.info(`📅 Solicitud: Fixtures de hoy (timezone: ${timezone})`);

      // Sincronizar datos
      try {
        await fixtureSync.syncTodayFixtures();
      } catch (syncError) {
        logger.warn('⚠️ Error sincronizando datos frescos:', syncError.message);
      }

      // Obtener fixtures
      let fixtures = await fixtureSync.getTodayFixtures();

      // Filtrar por prioridad
      if (minPriority > 0) {
        fixtures = fixtures.filter(fixture => 
          fixture.league && fixture.league.priority >= minPriority
        );
      }

      // ✅ USAR FUNCIÓN HELPER EXTERNA
      const now = new Date();
      const dateLocal = formatDateForTimezone(now, timezone);

      const response = {
        success: true,
        message: `${fixtures.length} partidos encontrados para hoy`,
        data: {
          date: now.toISOString().split('T')[0],
          timezone: timezone,
          dateLocal: dateLocal,
          count: fixtures.length,
          fixtures: fixtures.map(fixture => ({
            id: fixture.id,
            apiFootballId: fixture.apiFootballId,
            date: fixture.fixtureDate,
            dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone), // ✅ Función externa
            timezone: timezone,
            status: fixture.status,
            statusLong: fixture.statusLong,
            elapsed: fixture.elapsed,
            round: fixture.round,
            venue: fixture.venue,
            city: fixture.city,
            referee: fixture.referee,
            league: {
              id: fixture.league?.id,
              name: fixture.league?.name,
              shortName: fixture.league?.shortName,
              logo: fixture.league?.logo,
              country: fixture.league?.country,
              priority: fixture.league?.priority
            },
            homeTeam: {
              id: fixture.homeTeam?.id,
              name: fixture.homeTeam?.name,
              shortName: fixture.homeTeam?.shortName,
              logo: fixture.homeTeam?.logo
            },
            awayTeam: {
              id: fixture.awayTeam?.id,
              name: fixture.awayTeam?.name,
              shortName: fixture.awayTeam?.shortName,
              logo: fixture.awayTeam?.logo
            },
            score: {
              home: fixture.homeScore,
              away: fixture.awayScore,
              halftime: {
                home: fixture.homeScoreHt,
                away: fixture.awayScoreHt
              }
            },
            isAvailableForTournament: fixture.isAvailableForTournament,
            isLive: ['1H', 'HT', '2H', 'ET'].includes(fixture.status),
            isFinished: fixture.status === 'FT'
          }))
        },
        meta: {
          timestamp: now.toISOString(),
          timezone: timezone,
          source: 'api-football',
          stats: {
            liveMatches: fixtures.filter(f => ['1H', 'HT', '2H', 'ET'].includes(f.status)).length,
            upcomingMatches: fixtures.filter(f => f.status === 'NS').length,
            finishedMatches: fixtures.filter(f => f.status === 'FT').length
          }
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error obteniendo fixtures de hoy:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno',
        timezone: req.query.timezone || 'America/Lima'
      });
    }
  }

  // ✅ GET /api/fixtures/search - ULTRA SIMPLE
  async searchFixtures(req, res) {
    try {
      const { 
        date, 
        leagueId, 
        teamId, 
        status, 
        limit = 50, 
        timezone = 'America/Lima',
        minPriority = 0
      } = req.query;

      logger.info('🔍 Búsqueda de fixtures:', { date, leagueId, teamId, status, timezone });

      const criteria = {};
      if (date) criteria.date = date;
      if (leagueId) criteria.leagueId = leagueId;
      if (teamId) criteria.teamId = teamId;
      if (status) criteria.status = status;
      if (limit) criteria.limit = parseInt(limit);

      let fixtures = await fixtureSync.searchFixtures(criteria);

      // Filtros adicionales
      if (minPriority > 0) {
        fixtures = fixtures.filter(fixture => 
          fixture.league && fixture.league.priority >= parseInt(minPriority)
        );
      }

      const response = {
        success: true,
        message: `${fixtures.length} partidos encontrados`,
        data: {
          criteria: {
            date,
            leagueId,
            teamId,
            status,
            timezone,
            minPriority: parseInt(minPriority)
          },
          count: fixtures.length,
          fixtures: fixtures.map(fixture => ({
            id: fixture.id,
            apiFootballId: fixture.apiFootballId,
            date: fixture.fixtureDate,
            dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone), // ✅ Función externa
            timezone: timezone,
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
            isAvailableForTournament: fixture.isAvailableForTournament,
            isLive: ['1H', 'HT', '2H', 'ET'].includes(fixture.status)
          }))
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone
        }
      };

      res.json(response);

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
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Se requieren permisos de administrador'
        });
      }

      logger.info(`🔄 Sincronización forzada iniciada por admin: ${req.user.email}`);

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
      const timezone = req.query.timezone || 'America/Lima';
      
      logger.info(`🔴 Solicitud: Fixtures en vivo (timezone: ${timezone})`);

      const liveStatuses = ['1H', 'HT', '2H', 'ET'];
      const fixtures = await fixtureSync.searchFixtures({ 
        status: liveStatuses 
      });

      const response = {
        success: true,
        message: `${fixtures.length} partidos en vivo`,
        data: {
          count: fixtures.length,
          timezone: timezone,
          fixtures: fixtures.map(fixture => ({
            id: fixture.id,
            apiFootballId: fixture.apiFootballId,
            date: fixture.fixtureDate,
            dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone), // ✅ Función externa
            status: fixture.status,
            statusLong: fixture.statusLong,
            elapsed: fixture.elapsed,
            league: fixture.league,
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            score: {
              home: fixture.homeScore,
              away: fixture.awayScore
            },
            venue: fixture.venue,
            referee: fixture.referee
          }))
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone,
          refreshInterval: '30s'
        }
      };

      res.json(response);

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
      const timezone = req.query.timezone || 'America/Lima';
      
      logger.info(`🎯 Solicitud: Fixture ${id} (timezone: ${timezone})`);

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
          dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone), // ✅ Función externa
          timezone: timezone,
          status: fixture.status,
          statusLong: fixture.statusLong,
          elapsed: fixture.elapsed,
          round: fixture.round,
          season: fixture.season,
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
          timestamp: new Date().toISOString(),
          timezone: timezone
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
      const timezone = req.query.timezone || 'America/Lima';

      logger.info(`🏆 Solicitud: Fixtures de liga ${leagueId} (timezone: ${timezone})`);

      const fixtures = await fixtureSync.searchFixtures({ 
        leagueId,
        limit: 100 
      });

      res.json({
        success: true,
        message: `${fixtures.length} partidos de la liga`,
        data: {
          leagueId,
          timezone: timezone,
          count: fixtures.length,
          fixtures: fixtures.map(fixture => ({
            id: fixture.id,
            apiFootballId: fixture.apiFootballId,
            date: fixture.fixtureDate,
            dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone), // ✅ Función externa
            status: fixture.status,
            round: fixture.round,
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            score: {
              home: fixture.homeScore,
              away: fixture.awayScore
            },
            isAvailableForTournament: fixture.isAvailableForTournament,
            venue: fixture.venue
          }))
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone
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