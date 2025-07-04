// 📄 src/controllers/odds.controller.js - VERSIÓN MEJORADA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const oddsSync = require('../services/oddsSync.service');
const { Fixture, League, Team, BettingMarket, Odds } = require('../models');
const { Op, Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// ✅ FUNCIÓN HELPER PARA FORMATEAR FECHA
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
    return new Date(date).toLocaleString('es-PE');
  }
}

class ImprovedOddsController {
  constructor() {
    // Bind all methods to ensure 'this' context
    this.getFixtureOdds = this.getFixtureOdds.bind(this);
    this.getBestFixtureOdds = this.getBestFixtureOdds.bind(this);
    this.compareFixtureOdds = this.compareFixtureOdds.bind(this);
    this.getPopularMarkets = this.getPopularMarkets.bind(this);
    this.getTodayOdds = this.getTodayOdds.bind(this);
    this.getAvailableMarkets = this.getAvailableMarkets.bind(this);
    this.forceSyncOdds = this.forceSyncOdds.bind(this);
    this.getOddsStats = this.getOddsStats.bind(this);
    this.getBookmakers = this.getBookmakers.bind(this);
    this.getOddsCategories = this.getOddsCategories.bind(this);
    
    // Bind helper methods
    this.formatMarketsForResponse = this.formatMarketsForResponse.bind(this);
    this.extractValues = this.extractValues.bind(this);
    this.getAvailableBookmakers = this.getAvailableBookmakers.bind(this);
    
    logger.info('✅ ImprovedOddsController initialized with all methods bound');
  }

  // ✅ GET /api/odds/fixture/:id - ESTRUCTURA PRESERVADA
  async getFixtureOdds(req, res) {
    try {
      const { id } = req.params;
      const { bookmaker = 'Average', timezone = 'America/Lima' } = req.query;

      logger.info(`📊 Solicitud: Odds estructuradas de fixture ${id}`, { bookmaker, timezone });

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

      // ✅ OBTENER ODDS CON ESTRUCTURA PRESERVADA
      let oddsData;
      try {
        oddsData = await oddsSync.getFixtureOdds(id, bookmaker);
      } catch (oddsError) {
        logger.warn(`⚠️ Error obteniendo odds para fixture ${id}:`, oddsError.message);
        oddsData = {
          structure: { categorizedMarkets: {} },
          summary: { totalMarkets: 0, totalCategories: 0, totalOdds: 0 }
        };
      }

      // ✅ TRANSFORMAR ESTRUCTURA PARA RESPUESTA CLARA
      const formattedMarkets = this.formatMarketsForResponse(oddsData.structure.categorizedMarkets);

      // Obtener bookmakers disponibles
      const availableBookmakers = await this.getAvailableBookmakers(id);

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
            dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone),
            timezone: timezone,
            status: fixture.status
          },
          odds: {
            bookmaker: bookmaker,
            markets: formattedMarkets,
            categorizedMarkets: oddsData.structure.categorizedMarkets,
            summary: oddsData.summary
          },
          meta: {
            availableBookmakers: availableBookmakers,
            lastSync: oddsData.lastSync || new Date().toISOString(),
            timestamp: new Date().toISOString(),
            timezone: timezone
          }
        }
      };

      res.json(response);

    } catch (error) {
      logger.error(`❌ Error obteniendo odds de fixture ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo odds del fixture',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ✅ FORMATEAR MERCADOS PARA RESPUESTA MÁS CLARA
  formatMarketsForResponse(categorizedMarkets) {
    const formatted = [];
    
    Object.entries(categorizedMarkets).forEach(([category, markets]) => {
      Object.entries(markets).forEach(([marketKey, marketData]) => {
        formatted.push({
          id: marketData.id || marketData.apiFootballId,
          name: marketData.name,
          category: category,
          key: marketKey,
          values: marketData.values ? marketData.values : this.extractValues(marketData),
          priority: marketData.priority || 50
        });
      });
    });
    
    return formatted.sort((a, b) => b.priority - a.priority);
  }

  // ✅ EXTRAER VALORES DE DIFERENTES ESTRUCTURAS
  extractValues(marketData) {
    // Si tiene estructura de values directa
    if (marketData.values && Array.isArray(marketData.values)) {
      return marketData.values;
    }
    
    // Si tiene estructura de odds
    if (marketData.odds && typeof marketData.odds === 'object') {
      return Object.entries(marketData.odds).map(([outcome, data]) => ({
        outcome,
        value: data.value,
        odds: data.odds,
        impliedProbability: data.impliedProbability
      }));
    }
    
    // Si tiene estructura de bestOdds
    if (marketData.bestOdds && Array.isArray(marketData.bestOdds)) {
      return marketData.bestOdds;
    }
    
    return [];
  }

  // ✅ GET /api/odds/fixture/:id/best - MEJORES ODDS ESTRUCTURADAS
  async getBestFixtureOdds(req, res) {
    try {
      const { id } = req.params;
      const { timezone = 'America/Lima' } = req.query;

      logger.info(`🎯 Solicitud: Mejores odds estructuradas de fixture ${id}`);

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

      // Obtener mejores odds estructuradas
      let bestOdds;
      try {
        bestOdds = await oddsSync.getBestOdds(id);
      } catch (oddsError) {
        logger.warn(`⚠️ Error obteniendo mejores odds:`, oddsError.message);
        bestOdds = { bestOdds: { categorizedMarkets: {} }, summary: {} };
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
            dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone),
            timezone: timezone,
            status: fixture.status
          },
          bestOdds: bestOdds.bestOdds,
          summary: bestOdds.summary,
          lastSync: bestOdds.lastSync || new Date().toISOString()
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone
        }
      };

      res.json(response);

    } catch (error) {
      logger.error(`❌ Error obteniendo mejores odds:`, error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo mejores odds',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ✅ GET /api/odds/fixture/:id/compare - COMPARAR ODDS ENTRE BOOKMAKERS
  async compareFixtureOdds(req, res) {
    try {
      const { id } = req.params;
      const { market = '1X2', timezone = 'America/Lima' } = req.query;

      logger.info(`📊 Comparando odds para fixture ${id}, mercado ${market}`);

      const fixture = await Fixture.findByPk(id, {
        include: ['league', 'homeTeam', 'awayTeam']
      });

      if (!fixture) {
        return res.status(404).json({
          success: false,
          message: 'Fixture no encontrado'
        });
      }

      // Buscar mercado específico
      const targetMarket = await BettingMarket.findOne({
        where: {
          [Op.or]: [
            { key: market },
            { name: { [Op.iLike]: `%${market}%` } }
          ]
        }
      });

      if (!targetMarket) {
        return res.status(404).json({
          success: false,
          message: `Mercado ${market} no encontrado`
        });
      }

      // Obtener todas las odds de ese mercado
      const odds = await Odds.findAll({
        where: {
          fixtureId: id,
          marketId: targetMarket.id,
          isActive: true
        },
        order: [
          ['outcome', 'ASC'],
          ['odds', 'DESC']
        ]
      });

      // Agrupar por bookmaker
      const comparison = {};
      const outcomes = new Set();

      odds.forEach(odd => {
        outcomes.add(odd.outcome);
        
        if (!comparison[odd.bookmaker]) {
          comparison[odd.bookmaker] = {};
        }
        
        comparison[odd.bookmaker][odd.outcome] = {
          odds: parseFloat(odd.odds),
          impliedProbability: parseFloat(odd.impliedProbability),
          value: odd.value
        };
      });

      // Encontrar mejores odds por outcome
      const bestByOutcome = {};
      outcomes.forEach(outcome => {
        let best = { odds: 0, bookmaker: null };
        
        Object.entries(comparison).forEach(([bookmaker, data]) => {
          if (data[outcome] && data[outcome].odds > best.odds) {
            best = {
              odds: data[outcome].odds,
              bookmaker: bookmaker,
              impliedProbability: data[outcome].impliedProbability
            };
          }
        });
        
        bestByOutcome[outcome] = best;
      });

      const response = {
        success: true,
        message: 'Comparación de odds completada',
        data: {
          fixture: {
            id: fixture.id,
            teams: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
            date: fixture.fixtureDate,
            dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone)
          },
          market: {
            id: targetMarket.id,
            name: targetMarket.name,
            key: targetMarket.key
          },
          comparison: comparison,
          bestOdds: bestByOutcome,
          summary: {
            bookmakers: Object.keys(comparison).length,
            outcomes: Array.from(outcomes)
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error comparando odds:', error);
      res.status(500).json({
        success: false,
        message: 'Error comparando odds',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ✅ GET /api/odds/markets/popular - MERCADOS MÁS POPULARES
  async getPopularMarkets(req, res) {
    try {
      const { limit = 10 } = req.query;

      const markets = await BettingMarket.findAll({
        attributes: [
          'id', 'key', 'name', 'category', 'priority',
          'usageCount', 'apiFootballId'
        ],
        where: {
          isActive: true,
          usageCount: { [Op.gt]: 0 }
        },
        order: [
          ['priority', 'DESC'],
          ['usageCount', 'DESC']
        ],
        limit: parseInt(limit)
      });

      const response = {
        success: true,
        message: `Top ${markets.length} mercados más populares`,
        data: markets.map(m => ({
          id: m.id,
          key: m.key,
          name: m.name,
          category: m.category,
          priority: m.priority,
          usageCount: m.usageCount,
          apiId: m.apiFootballId
        })),
        meta: {
          timestamp: new Date().toISOString(),
          totalMarkets: await BettingMarket.count({ where: { isActive: true } })
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error obteniendo mercados populares:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo mercados populares',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ✅ FORMATEAR MERCADOS PARA RESPUESTA MÁS CLARA
  formatMarketsForResponse(categorizedMarkets) {
    const formatted = [];
    
    Object.entries(categorizedMarkets).forEach(([category, markets]) => {
      Object.entries(markets).forEach(([marketKey, marketData]) => {
        formatted.push({
          id: marketData.id || marketData.apiFootballId,
          name: marketData.name,
          category: category,
          key: marketKey,
          values: marketData.values ? marketData.values : this.extractValues(marketData),
          priority: marketData.priority || 50
        });
      });
    });
    
    return formatted.sort((a, b) => b.priority - a.priority);
  }

  // ✅ EXTRAER VALORES DE DIFERENTES ESTRUCTURAS
  extractValues(marketData) {
    // Si tiene estructura de values directa
    if (marketData.values && Array.isArray(marketData.values)) {
      return marketData.values;
    }
    
    // Si tiene estructura de odds
    if (marketData.odds && typeof marketData.odds === 'object') {
      return Object.entries(marketData.odds).map(([outcome, data]) => ({
        outcome,
        value: data.value,
        odds: data.odds,
        impliedProbability: data.impliedProbability
      }));
    }
    
    // Si tiene estructura de bestOdds
    if (marketData.bestOdds && Array.isArray(marketData.bestOdds)) {
      return marketData.bestOdds;
    }
    
    return [];
  }

  // ✅ OBTENER BOOKMAKERS DISPONIBLES PARA UN FIXTURE (HELPER)
  async getAvailableBookmakers(fixtureId) {
    try {
      const bookmakers = await Odds.findAll({
        where: { fixtureId, isActive: true },
        attributes: [
          'bookmaker',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'oddsCount']
        ],
        group: ['bookmaker'],
        order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
        raw: true
      });

      return bookmakers.map(b => ({
        name: b.bookmaker,
        oddsCount: parseInt(b.oddsCount)
      }));

    } catch (error) {
      logger.error('❌ Error obteniendo bookmakers:', error);
      return [];
    }
  }

  // ✅ GET /api/odds/today - ODDS DE HOY
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
          where: { priority: { [Op.gte]: parseInt(minPriority) } },
          attributes: ['id', 'name', 'logo', 'country', 'priority']
        },
        { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logo'] },
        { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logo'] }
      ];

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
          const hasOdds = await Odds.findOne({
            where: {
              fixtureId: fixture.id,
              bookmaker,
              isActive: true
            }
          });

          if (hasOdds) {
            const fixtureOdds = await oddsSync.getFixtureOdds(fixture.id, bookmaker);
            
            let selectedMarket = null;
            const markets = this.formatMarketsForResponse(fixtureOdds.structure?.categorizedMarkets || {});
            
            // Buscar mercado específico
            selectedMarket = markets.find(m => 
              m.key === market || m.name.toLowerCase().includes(market.toLowerCase())
            );

            if (selectedMarket && selectedMarket.values.length > 0) {
              fixturesWithOdds.push({
                id: fixture.id,
                apiFootballId: fixture.apiFootballId,
                homeTeam: fixture.homeTeam?.name || 'TBD',
                awayTeam: fixture.awayTeam?.name || 'TBD',
                league: fixture.league?.name || 'Unknown',
                date: fixture.fixtureDate,
                dateLocal: formatDateForTimezone(fixture.fixtureDate, timezone),
                timezone: timezone,
                status: fixture.status,
                market: selectedMarket.name,
                marketKey: selectedMarket.key,
                odds: selectedMarket.values.reduce((acc, val) => {
                  acc[val.outcome] = {
                    odds: val.odds,
                    impliedProbability: val.impliedProbability
                  };
                  return acc;
                }, {})
              });
            }
          }
        } catch (oddError) {
          logger.debug(`⚠️ No hay odds para fixture ${fixture.id}: ${oddError.message}`);
          continue;
        }
      }

      const response = {
        success: true,
        message: `${fixturesWithOdds.length} fixtures con odds encontrados`,
        data: {
          date: startOfDay.toISOString().split('T')[0],
          dateLocal: formatDateForTimezone(startOfDay, timezone),
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
          fixturesWithOdds: fixturesWithOdds.length
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error obteniendo odds de hoy:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo odds de hoy',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // ✅ GET /api/odds/markets - MERCADOS DISPONIBLES
  async getAvailableMarkets(req, res) {
    try {
      const { timezone = 'America/Lima' } = req.query;

      logger.info('📋 Solicitud: Mercados de apuestas disponibles', { timezone });

      const markets = await BettingMarket.findAll({
        where: { isActive: true },
        attributes: [
          'id', 'key', 'name', 'category', 'priority', 
          'description', 'apiFootballId', 'usageCount'
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
          description: market.description,
          usageCount: market.usageCount,
          isDynamic: market.apiFootballId !== null
        });
      });

      stats.categoriesCount = Object.keys(groupedMarkets).length;
      stats.mostUsedMarkets = markets
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10)
        .map(m => ({ 
          key: m.key, 
          name: m.name, 
          priority: m.priority,
          usageCount: m.usageCount
        }));

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

  // ✅ GET /api/odds/bookmakers - BOOKMAKERS DISPONIBLES
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
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'oddsCount'],
          [Sequelize.fn('MAX', Sequelize.col('last_updated')), 'lastUpdate']
        ],
        group: ['bookmaker'],
        order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']]
      });

      const response = {
        success: true,
        message: `${bookmakers.length} bookmakers disponibles`,
        data: {
          bookmakers: bookmakers.map(b => ({
            name: b.bookmaker,
            oddsCount: parseInt(b.dataValues.oddsCount),
            lastUpdate: b.dataValues.lastUpdate,
            lastUpdateLocal: formatDateForTimezone(b.dataValues.lastUpdate, timezone)
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

  // ✅ GET /api/odds/categories - CATEGORÍAS DE MERCADOS
  async getOddsCategories(req, res) {
    try {
      const { timezone = 'America/Lima' } = req.query;

      logger.info('📊 Solicitud: Categorías de mercados', { timezone });

      const categories = await BettingMarket.findAll({
        where: { isActive: true },
        attributes: [
          'category',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'marketCount'],
          [Sequelize.fn('AVG', Sequelize.col('priority')), 'avgPriority'],
          [Sequelize.fn('SUM', Sequelize.col('usage_count')), 'totalUsage']
        ],
        group: ['category'],
        order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
        raw: true
      });

      const categoryDescriptions = {
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

      const enrichedCategories = categories.map(cat => ({
        category: cat.category,
        name: cat.category.replace(/_/g, ' ').toLowerCase()
          .replace(/\b\w/g, l => l.toUpperCase()),
        description: categoryDescriptions[cat.category] || 'Categoría detectada automáticamente',
        marketCount: parseInt(cat.marketCount),
        avgPriority: parseFloat(cat.avgPriority).toFixed(1),
        totalUsage: parseInt(cat.totalUsage || 0)
      }));

      const response = {
        success: true,
        message: `${enrichedCategories.length} categorías de mercados encontradas`,
        data: {
          categories: enrichedCategories,
          totalCategories: enrichedCategories.length,
          mostPopular: enrichedCategories
            .sort((a, b) => b.totalUsage - a.totalUsage)
            .slice(0, 5)
            .map(c => c.category),
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

  // ✅ POST /api/odds/sync - SINCRONIZACIÓN MEJORADA
  async forceSyncOdds(req, res) {
    try {
      const { fixtureId } = req.body;
      const { timezone = 'America/Lima' } = req.query;

      logger.info(`🔄 Sincronización estructurada de odds iniciada`, { fixtureId, timezone });

      let result;
      if (fixtureId) {
        // Sincronizar fixture específico
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
          timestampLocal: formatDateForTimezone(new Date(), timezone),
          timezone: timezone
        },
        meta: {
          service: 'ImprovedOddsSyncService',
          version: '2.0.0'
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

  // ✅ GET /api/odds/stats - ESTADÍSTICAS MEJORADAS
  async getOddsStats(req, res) {
    try {
      const { timezone = 'America/Lima' } = req.query;

      logger.info('📈 Solicitud: Estadísticas mejoradas de odds');

      // Estadísticas generales
      const [marketStats, oddsStats, categoryStats] = await Promise.all([
        // Total de mercados
        BettingMarket.count({ where: { isActive: true } }),
        
        // Total de odds
        Odds.count({ where: { isActive: true } }),
        
        // Estadísticas por categoría
        BettingMarket.findAll({
          attributes: [
            'category',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'marketCount'],
            [Sequelize.fn('AVG', Sequelize.col('usage_count')), 'avgUsage'],
            [Sequelize.fn('MAX', Sequelize.col('priority')), 'maxPriority']
          ],
          where: { isActive: true },
          group: ['category'],
          order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
          raw: true
        })
      ]);

      // Bookmakers más activos
      const activeBookmakers = await Odds.findAll({
        attributes: [
          'bookmaker',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'oddsCount'],
          [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('fixture_id'))), 'fixtureCount'],
          [Sequelize.fn('MAX', Sequelize.col('last_updated')), 'lastActivity']
        ],
        where: { isActive: true },
        group: ['bookmaker'],
        order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true
      });

      // Mercados dinámicos vs estáticos
      const dynamicMarkets = await BettingMarket.count({
        where: {
          isActive: true,
          apiFootballId: { [Op.ne]: null }
        }
      });

      const response = {
        success: true,
        message: 'Estadísticas de odds obtenidas',
        data: {
          overview: {
            totalMarkets: marketStats,
            totalOdds: oddsStats,
            dynamicMarkets: dynamicMarkets,
            staticMarkets: marketStats - dynamicMarkets,
            lastUpdate: new Date().toISOString(),
            lastUpdateLocal: formatDateForTimezone(new Date(), timezone),
            timezone: timezone
          },
          categories: categoryStats.map(cat => ({
            name: cat.category,
            markets: parseInt(cat.marketCount),
            avgUsage: parseFloat(cat.avgUsage).toFixed(2),
            maxPriority: parseInt(cat.maxPriority)
          })),
          bookmakers: activeBookmakers.map(b => ({
            name: b.bookmaker,
            totalOdds: parseInt(b.oddsCount),
            fixtures: parseInt(b.fixtureCount),
            lastActivity: b.lastActivity
          })),
          serviceStats: oddsSync.getServiceStats ? oddsSync.getServiceStats() : null
        },
        meta: {
          timestamp: new Date().toISOString(),
          timezone: timezone
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }
}

// ✅ EXPORTAR INSTANCIA SINGLETON
module.exports = new ImprovedOddsController();