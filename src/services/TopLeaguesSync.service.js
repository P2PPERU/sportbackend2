const { topLeaguesConfig } = require('../config/TopLeagues.config');
const apiFootballService = require('./apiFootballService');
const fixtureSync = require('./fixtureSync.service');
const leagueSync = require('./leagueSync.service');
const { League, Fixture, Team } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class TopLeaguesSyncService {
  // 🏆 SINCRONIZAR SOLO LIGAS TOP MUNDIALES
  async syncTopLeagues() {
    try {
      logger.info('🏆 Iniciando sincronización de LIGAS TOP MUNDIALES...');

      const topLeagueIds = topLeaguesConfig.getTopLeagueIds();
      logger.info(`📋 Sincronizando ${topLeagueIds.length} ligas top mundiales`);

      const results = {
        leagues: { created: 0, updated: 0, errors: 0 },
        fixtures: { created: 0, updated: 0, errors: 0 },
        teams: { created: 0, updated: 0, errors: 0 }
      };

      // Sincronizar ligas en lotes para no saturar API
      const batchSize = 5;
      for (let i = 0; i < topLeagueIds.length; i += batchSize) {
        const batch = topLeagueIds.slice(i, i + batchSize);
        
        logger.info(`🔄 Procesando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(topLeagueIds.length/batchSize)}`);
        
        for (const leagueId of batch) {
          try {
            // Pausa para rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const leagueInfo = topLeaguesConfig.getLeagueInfo(leagueId);
            logger.info(`   📡 Sincronizando: ${leagueInfo.name} (ID: ${leagueId})`);
            
            // 1. Sincronizar información de la liga
            const leagueResult = await this.syncSingleLeague(leagueId);
            results.leagues.created += leagueResult.created ? 1 : 0;
            results.leagues.updated += leagueResult.updated ? 1 : 0;
            
            // 2. Sincronizar fixtures recientes de la liga (últimos 7 días + próximos 7 días)
            const fixturesResult = await this.syncLeagueFixtures(leagueId);
            results.fixtures.created += fixturesResult.created;
            results.fixtures.updated += fixturesResult.updated;
            results.fixtures.errors += fixturesResult.errors;
            
            logger.info(`   ✅ ${leagueInfo.name}: ${fixturesResult.created + fixturesResult.updated} fixtures`);
            
          } catch (error) {
            logger.error(`❌ Error específico con liga ${leagueId}:`, error.message, error.stack);
            results.leagues.errors++;
          }
        }
        
        // Pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Marcar ligas top con prioridad alta
      await this.updateLeaguePriorities();

      logger.info('🎉 Sincronización de ligas TOP completada:', results);
      return results;

    } catch (error) {
      logger.error('❌ Error en sincronización de ligas top:', error);
      throw error;
    }
  }

  // Sincronizar una liga específica
  async syncSingleLeague(leagueApiId) {
    try {
      const response = await apiFootballService.makeRequest('/leagues', {
        id: leagueApiId,
        season: 2025
      });

      // ✅ DEBUG COMPLETO DE LA RESPUESTA
      logger.info(`🔍 DEBUG Liga ${leagueApiId} - Response COMPLETA:`, {
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : 'null',
        results: response?.results,
        errors: response?.errors,
        paging: response?.paging,
        responseLength: response?.response?.length,
        firstItem: response?.response?.[0],
        fullResponse: JSON.stringify(response)
      });

      // ✅ CONSOLE LOG DIRECTO PARA VER EN TERMINAL
      console.log('🔍 CONSOLE LOG DIRECTO Liga', leagueApiId, ':', response);

      // ✅ VERIFICAR ERRORES EN LA RESPUESTA DE API-FOOTBALL
      if (response.errors && response.errors.length > 0) {
        throw new Error(`API-Football errors para liga ${leagueApiId}: ${JSON.stringify(response.errors)}`);
      }

      // ✅ VERIFICAR SI HAY RESPUESTA
      if (!response.response || response.response.length === 0) {
        throw new Error(`Liga ${leagueApiId} - sin datos en respuesta. Results: ${response.results}, Errors: ${JSON.stringify(response.errors)}`);
      }

      // ✅ VERIFICAR QUE NO SEA OBJETO VACÍO
      const leagueData = response.response[0];
      console.log('🔍 PRIMER ITEM:', leagueData);
      
      if (!leagueData || Object.keys(leagueData).length === 0) {
        throw new Error(`Liga ${leagueApiId} - respuesta vacía: ${JSON.stringify(leagueData)}`);
      }

      // ✅ VERIFICAR ESTRUCTURA DE DATOS
      if (!leagueData.league || !leagueData.league.id) {
        throw new Error(`Liga ${leagueApiId} - estructura de datos inválida. Datos recibidos: ${JSON.stringify(leagueData)}`);
      }

      // ✅ VALIDAR DATOS CRÍTICOS ANTES DE MAPEAR
      if (!leagueData.league.name) {
        throw new Error(`Liga ${leagueApiId} - nombre faltante en respuesta`);
      }

      const leagueInfo = topLeaguesConfig.getLeagueInfo(leagueApiId);
      
      // ✅ LOG ANTES DE MAPEAR
      console.log('📋 DATOS A MAPEAR:', {
        leagueId: leagueData.league.id,
        leagueName: leagueData.league.name,
        country: leagueData.country?.name,
        seasons: leagueData.seasons,
        priority: leagueInfo?.priority
      });
      
      // Mapear datos con prioridad desde configuración
      const mappedData = {
        apiFootballId: leagueData.league.id,
        name: leagueData.league.name,
        shortName: leagueData.league.name.length > 20 ? 
          leagueData.league.name.substring(0, 20) : leagueData.league.name,
        code: leagueData.league.name.substring(0, 10).toUpperCase(),
        country: leagueData.country?.name || 'Unknown',
        countryCode: leagueData.country?.code || 'XX',
        logo: leagueData.league.logo,
        flag: leagueData.country?.flag,
        season: leagueData.seasons?.[0]?.year || 2025,
        type: leagueData.league.type === 'Cup' ? 'Cup' : 'League',
        isActive: true,
        priority: leagueInfo?.priority || 50, // Usar prioridad de configuración
        lastSyncAt: new Date()
      };

      // ✅ LOG DATOS MAPEADOS
      console.log('💾 DATOS MAPEADOS para liga', leagueApiId, ':', mappedData);

      const [league, created] = await League.findOrCreate({
        where: { apiFootballId: mappedData.apiFootballId },
        defaults: mappedData
      });

      if (!created) {
        console.log('🔄 ACTUALIZANDO liga existente:', league.id);
        await league.update(mappedData);
        return { updated: true, league };
      }

      console.log('➕ CREANDO nueva liga:', league.id);
      return { created: true, league };

    } catch (error) {
      // ✅ LOGGING DETALLADO DE ERRORES
      logger.error(`❌ Error detallado liga ${leagueApiId}:`, {
        message: error.message,
        stack: error.stack,
        data: error.data || 'No data',
        errorType: error.constructor.name
      });
      
      // ✅ CONSOLE LOG PARA DEBUG INMEDIATO
      console.error('❌ ERROR CONSOLE para liga', leagueApiId, ':', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3) // Solo primeras 3 líneas del stack
      });
      
      throw error;
    }
  }

  // Sincronizar fixtures de una liga (últimos 7 días + próximos 14 días)
  async syncLeagueFixtures(leagueApiId, daysBack = 3, daysForward = 14) {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysBack);
      const from = fromDate.toISOString().split('T')[0];
      
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + daysForward);
      const to = toDate.toISOString().split('T')[0];

      const response = await apiFootballService.makeRequest('/fixtures', {
        league: leagueApiId,
        season: 2025,
        from,
        to
      });

      if (!response.response || response.response.length === 0) {
        return { created: 0, updated: 0, errors: 0 };
      }

      const results = { created: 0, updated: 0, errors: 0 };

      for (const fixtureData of response.response) {
        try {
          const processResult = await fixtureSync.processFixture(fixtureData);
          
          if (processResult.created) results.created++;
          else if (processResult.updated) results.updated++;
          
        } catch (error) {
          results.errors++;
        }
      }

      return results;

    } catch (error) {
      logger.error(`Error sincronizando fixtures de liga ${leagueApiId}:`, error.message);
      return { created: 0, updated: 0, errors: 1 };
    }
  }

  // Actualizar prioridades de ligas según configuración
  async updateLeaguePriorities() {
    try {
      const topLeagues = topLeaguesConfig.getAllTopLeagues();
      
      for (const leagueConfig of topLeagues) {
        await League.update(
          { 
            priority: leagueConfig.priority,
            isActive: true 
          },
          { 
            where: { apiFootballId: leagueConfig.id } 
          }
        );
      }
      
      logger.info('✅ Prioridades de ligas actualizadas');
    } catch (error) {
      logger.error('❌ Error actualizando prioridades:', error.message);
    }
  }

  // 🌎 OBTENER FIXTURES DE LIGAS TOP POR CONTINENTE
  async getTopFixturesByContinent(continent = 'ALL', days = 7) {
    try {
      let leagueIds;
      
      if (continent === 'ALL') {
        leagueIds = topLeaguesConfig.getTopLeagueIds();
      } else {
        const continentLeagues = topLeaguesConfig.getLeaguesByContinent(continent);
        leagueIds = continentLeagues.map(l => l.id);
      }

      // Buscar ligas en nuestra BD
      const leagues = await League.findAll({
        where: { apiFootballId: { [Op.in]: leagueIds } }
      });

      if (leagues.length === 0) {
        return [];
      }

      const leagueUUIDs = leagues.map(l => l.id);

      // Buscar fixtures
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 1);
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + days);

      const fixtures = await Fixture.findAll({
        where: {
          leagueId: { [Op.in]: leagueUUIDs },
          fixtureDate: { [Op.between]: [fromDate, toDate] }
        },
        include: [
          {
            model: League,
            as: 'league',
            attributes: ['id', 'name', 'shortName', 'logo', 'country', 'priority']
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
        ],
        order: [
          ['league', 'priority', 'DESC'],
          ['fixtureDate', 'ASC']
        ]
      });

      return fixtures;

    } catch (error) {
      logger.error('❌ Error obteniendo fixtures top por continente:', error);
      throw error;
    }
  }

  // 🏆 OBTENER SOLO FIXTURES DE LIGAS PREMIUM (prioridad >= 85)
  async getPremiumFixtures(days = 7) {
    try {
      const premiumLeagues = topLeaguesConfig.getPremiumLeagues();
      const premiumIds = premiumLeagues.map(l => l.id);

      const leagues = await League.findAll({
        where: { 
          apiFootballId: { [Op.in]: premiumIds },
          priority: { [Op.gte]: 85 }
        }
      });

      const leagueUUIDs = leagues.map(l => l.id);

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 1);
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + days);

      const fixtures = await Fixture.findAll({
        where: {
          leagueId: { [Op.in]: leagueUUIDs },
          fixtureDate: { [Op.between]: [fromDate, toDate] }
        },
        include: [
          {
            model: League,
            as: 'league',
            attributes: ['id', 'name', 'shortName', 'logo', 'country', 'priority']
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
        ],
        order: [
          ['league', 'priority', 'DESC'],
          ['fixtureDate', 'ASC']
        ]
      });

      return fixtures;

    } catch (error) {
      logger.error('❌ Error obteniendo fixtures premium:', error);
      throw error;
    }
  }
}

module.exports = new TopLeaguesSyncService();