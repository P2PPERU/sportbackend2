const { League, Fixture, Team } = require('../models');
const { topLeaguesConfig } = require('../config/TopLeagues.config');
const topLeaguesSync = require('../services/TopLeaguesSync.service');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class LeaguesController {
  // GET /api/leagues - Listar todas las ligas
  async getAllLeagues(req, res) {
    try {
      const { continent, priority = 0, active = true, limit = 100 } = req.query;

      logger.info('🏆 Solicitud: Listar ligas');

      const whereClause = {};
      if (active === 'true') {
        whereClause.isActive = true;
      }
      if (priority > 0) {
        whereClause.priority = { [Op.gte]: parseInt(priority) };
      }

      let leagues = await League.findAll({
        where: whereClause,
        attributes: [
          'id', 'apiFootballId', 'name', 'shortName', 'code', 
          'country', 'countryCode', 'logo', 'flag', 'season', 
          'type', 'priority', 'lastSyncAt'
        ],
        order: [['priority', 'DESC'], ['name', 'ASC']],
        limit: parseInt(limit)
      });

      // Filtrar por continente si se especifica
      if (continent && continent !== 'ALL') {
        const continentLeagues = topLeaguesConfig.getLeaguesByContinent(continent);
        const continentIds = continentLeagues.map(l => l.id);
        leagues = leagues.filter(league => 
          continentIds.includes(league.apiFootballId)
        );
      }

      // Agrupar por continente/región
      const groupedLeagues = {};
      leagues.forEach(league => {
        const leagueInfo = topLeaguesConfig.getLeagueInfo(league.apiFootballId);
        const continent = leagueInfo?.continent || 'OTHER';
        
        if (!groupedLeagues[continent]) {
          groupedLeagues[continent] = [];
        }
        
        groupedLeagues[continent].push({
          id: league.id,
          apiFootballId: league.apiFootballId,
          name: league.name,
          shortName: league.shortName,
          code: league.code,
          country: league.country,
          countryCode: league.countryCode,
          logo: league.logo,
          flag: league.flag,
          season: league.season,
          type: league.type,
          priority: league.priority,
          continent: continent,
          lastSync: league.lastSyncAt
        });
      });

      res.json({
        success: true,
        message: `${leagues.length} ligas encontradas`,
        data: {
          total: leagues.length,
          groupedByContinents: groupedLeagues,
          continents: Object.keys(groupedLeagues),
          filters: {
            continent: continent || 'ALL',
            minPriority: parseInt(priority),
            activeOnly: active === 'true'
          }
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('❌ Error obteniendo ligas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo ligas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/leagues/top - Solo ligas top mundiales
  async getTopLeagues(req, res) {
    try {
      const { continent = 'ALL' } = req.query;

      logger.info(`🌟 Solicitud: Ligas top (continente: ${continent})`);

      let topLeagues;
      if (continent === 'ALL') {
        topLeagues = topLeaguesConfig.getAllTopLeagues();
      } else {
        topLeagues = topLeaguesConfig.getLeaguesByContinent(continent);
      }

      // Buscar info en nuestra BD
      const leagueIds = topLeagues.map(l => l.id);
      const dbLeagues = await League.findAll({
        where: { apiFootballId: { [Op.in]: leagueIds } },
        attributes: [
          'id', 'apiFootballId', 'name', 'shortName', 'logo', 
          'country', 'flag', 'priority', 'lastSyncAt'
        ]
      });

      // Combinar datos de configuración con BD
      const enrichedLeagues = topLeagues.map(configLeague => {
        const dbLeague = dbLeagues.find(db => db.apiFootballId === configLeague.id);
        
        return {
          id: dbLeague?.id || null,
          apiFootballId: configLeague.id,
          name: configLeague.name,
          shortName: dbLeague?.shortName || configLeague.name.substring(0, 20),
          logo: dbLeague?.logo || null,
          country: configLeague.country || 'International',
          flag: dbLeague?.flag || null,
          continent: configLeague.continent,
          priority: configLeague.priority,
          inDatabase: !!dbLeague,
          lastSync: dbLeague?.lastSyncAt || null
        };
      });

      // Agrupar por continente
      const groupedByContinent = {};
      enrichedLeagues.forEach(league => {
        const cont = league.continent;
        if (!groupedByContinent[cont]) {
          groupedByContinent[cont] = [];
        }
        groupedByContinent[cont].push(league);
      });

      res.json({
        success: true,
        message: `${enrichedLeagues.length} ligas top encontradas`,
        data: {
          continent,
          total: enrichedLeagues.length,
          inDatabase: enrichedLeagues.filter(l => l.inDatabase).length,
          groupedByContinents: groupedByContinent,
          availableContinents: Object.keys(groupedByContinent)
        },
        meta: {
          timestamp: new Date().toISOString(),
          featuredContinents: {
            'EUROPE': 'Ligas europeas top',
            'SOUTH_AMERICA': 'Fútbol sudamericano',
            'NORTH_AMERICA': 'MLS y Liga MX',
            'ASIA': 'Ligas asiáticas',
            'WORLD': 'Competiciones mundiales'
          }
        }
      });

    } catch (error) {
      logger.error('❌ Error obteniendo ligas top:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo ligas top',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/leagues/premium - Solo ligas premium (prioridad >= 85)
  async getPremiumLeagues(req, res) {
    try {
      logger.info('💎 Solicitud: Ligas premium');

      const premiumLeagues = topLeaguesConfig.getPremiumLeagues();
      const leagueIds = premiumLeagues.map(l => l.id);

      const leagues = await League.findAll({
        where: { 
          apiFootballId: { [Op.in]: leagueIds },
          priority: { [Op.gte]: 85 }
        },
        attributes: [
          'id', 'apiFootballId', 'name', 'shortName', 'logo', 
          'country', 'flag', 'priority', 'lastSyncAt'
        ],
        order: [['priority', 'DESC']]
      });

      const enrichedLeagues = leagues.map(league => {
        const configInfo = topLeaguesConfig.getLeagueInfo(league.apiFootballId);
        return {
          id: league.id,
          apiFootballId: league.apiFootballId,
          name: league.name,
          shortName: league.shortName,
          logo: league.logo,
          country: league.country,
          flag: league.flag,
          continent: configInfo?.continent || 'OTHER',
          priority: league.priority,
          lastSync: league.lastSyncAt
        };
      });

      res.json({
        success: true,
        message: `${enrichedLeagues.length} ligas premium encontradas`,
        data: {
          total: enrichedLeagues.length,
          leagues: enrichedLeagues,
          categories: {
            international: enrichedLeagues.filter(l => 
              l.name.includes('Champions') || l.name.includes('Copa') || l.name.includes('World')
            ),
            european: enrichedLeagues.filter(l => l.continent === 'EUROPE'),
            southAmerican: enrichedLeagues.filter(l => l.continent === 'SOUTH_AMERICA')
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          minPriority: 85
        }
      });

    } catch (error) {
      logger.error('❌ Error obteniendo ligas premium:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo ligas premium',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/leagues/south-america - Ligas sudamericanas
  async getSouthAmericanLeagues(req, res) {
    try {
      logger.info('🌎 Solicitud: Ligas sudamericanas');

      const southAmericanLeagues = topLeaguesConfig.getSouthAmericanLeagues();
      const leagueIds = southAmericanLeagues.map(l => l.id);

      const leagues = await League.findAll({
        where: { apiFootballId: { [Op.in]: leagueIds } },
        attributes: [
          'id', 'apiFootballId', 'name', 'shortName', 'logo', 
          'country', 'flag', 'priority', 'lastSyncAt'
        ],
        order: [['priority', 'DESC']]
      });

      // Categorizar ligas
      const categorized = {
        international: [],
        national: []
      };

      leagues.forEach(league => {
        if (league.name.includes('Copa') || league.name.includes('America')) {
          categorized.international.push({
            id: league.id,
            apiFootballId: league.apiFootballId,
            name: league.name,
            shortName: league.shortName,
            logo: league.logo,
            country: league.country,
            priority: league.priority,
            lastSync: league.lastSyncAt
          });
        } else {
          categorized.national.push({
            id: league.id,
            apiFootballId: league.apiFootballId,
            name: league.name,
            shortName: league.shortName,
            logo: league.logo,
            country: league.country,
            priority: league.priority,
            lastSync: league.lastSyncAt
          });
        }
      });

      res.json({
        success: true,
        message: `${leagues.length} ligas sudamericanas encontradas`,
        data: {
          total: leagues.length,
          international: {
            count: categorized.international.length,
            leagues: categorized.international
          },
          national: {
            count: categorized.national.length,
            leagues: categorized.national
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          featured: [
            'Copa Libertadores',
            'Copa Sudamericana',
            'Brasileirão Serie A',
            'Primera División (Argentina)',
            'Primera A (Colombia)'
          ]
        }
      });

    } catch (error) {
      logger.error('❌ Error obteniendo ligas sudamericanas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo ligas sudamericanas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // GET /api/leagues/:id - Información detallada de una liga
  async getLeagueById(req, res) {
    try {
      const { id } = req.params;
      const { includeFixtures = false, days = 7 } = req.query;

      logger.info(`🔍 Solicitud: Liga ${id} (includeFixtures: ${includeFixtures})`);

      const league = await League.findByPk(id);

      if (!league) {
        return res.status(404).json({
          success: false,
          message: 'Liga no encontrada'
        });
      }

      // Información básica de la liga
      const leagueInfo = topLeaguesConfig.getLeagueInfo(league.apiFootballId);
      const leagueData = {
        id: league.id,
        apiFootballId: league.apiFootballId,
        name: league.name,
        shortName: league.shortName,
        code: league.code,
        country: league.country,
        countryCode: league.countryCode,
        logo: league.logo,
        flag: league.flag,
        season: league.season,
        type: league.type,
        priority: league.priority,
        continent: leagueInfo?.continent || 'OTHER',
        isTopLeague: topLeaguesConfig.isTopLeague(league.apiFootballId),
        lastSync: league.lastSyncAt
      };

      const response = {
        success: true,
        data: {
          league: leagueData
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };

      // Incluir fixtures si se solicita
      if (includeFixtures === 'true') {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 3);
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + parseInt(days));

        const fixtures = await Fixture.findAll({
          where: {
            leagueId: id,
            fixtureDate: { [Op.between]: [fromDate, toDate] }
          },
          include: [
            { model: Team, as: 'homeTeam', attributes: ['name', 'logo'] },
            { model: Team, as: 'awayTeam', attributes: ['name', 'logo'] }
          ],
          order: [['fixtureDate', 'ASC']],
          limit: 50
        });

        response.data.fixtures = {
          count: fixtures.length,
          recent: fixtures.map(fixture => ({
            id: fixture.id,
            date: fixture.fixtureDate,
            status: fixture.status,
            round: fixture.round,
            homeTeam: fixture.homeTeam.name,
            awayTeam: fixture.awayTeam.name,
            score: {
              home: fixture.homeScore,
              away: fixture.awayScore
            }
          }))
        };
      }

      res.json(response);

    } catch (error) {
      logger.error(`❌ Error obteniendo liga ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo información de la liga',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // POST /api/leagues/sync - Sincronizar ligas top (admin)
  async syncTopLeagues(req, res) {
    try {
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Se requieren permisos de administrador'
        });
      }

      logger.info(`🔄 Sincronización de ligas top iniciada por admin: ${req.user.email}`);

      const result = await topLeaguesSync.syncTopLeagues();

      res.json({
        success: true,
        message: 'Sincronización de ligas top completada exitosamente',
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          triggeredBy: req.user.email
        }
      });

    } catch (error) {
      logger.error('❌ Error en sincronización de ligas top:', error);
      res.status(500).json({
        success: false,
        message: 'Error en sincronización de ligas top',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }
}

module.exports = new LeaguesController();