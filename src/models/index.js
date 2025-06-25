const sequelize = require('../config/database');

// Importar todos los modelos
const League = require('./League');
const Team = require('./Team');
const Fixture = require('./Fixture');
const BettingMarket = require('./BettingMarket');
const Odds = require('./Odds');
const TeamStatistics = require('./TeamStatistics');
const Standing = require('./Standing');
const FixtureResult = require('./FixtureResult');
const ApiCache = require('./ApiCache');

// ═══════════════════════════════════════════════════════════════════
// RELACIONES ENTRE MODELOS
// ═══════════════════════════════════════════════════════════════════

// League ↔ Team (muchos a muchos a través de participación en ligas)
League.belongsToMany(Team, { 
  through: 'LeagueTeams', 
  as: 'teams',
  foreignKey: 'league_id',
  otherKey: 'team_id'
});
Team.belongsToMany(League, { 
  through: 'LeagueTeams', 
  as: 'leagues',
  foreignKey: 'team_id',
  otherKey: 'league_id'
});

// Fixture ↔ League (muchos a uno)
Fixture.belongsTo(League, { foreignKey: 'league_id', as: 'league' });
League.hasMany(Fixture, { foreignKey: 'league_id', as: 'fixtures' });

// Fixture ↔ Team (muchos a uno para local y visitante)
Fixture.belongsTo(Team, { foreignKey: 'home_team_id', as: 'homeTeam' });
Fixture.belongsTo(Team, { foreignKey: 'away_team_id', as: 'awayTeam' });
Team.hasMany(Fixture, { foreignKey: 'home_team_id', as: 'homeFixtures' });
Team.hasMany(Fixture, { foreignKey: 'away_team_id', as: 'awayFixtures' });

// Odds ↔ Fixture (muchos a uno)
Odds.belongsTo(Fixture, { foreignKey: 'fixture_id', as: 'fixture' });
Fixture.hasMany(Odds, { foreignKey: 'fixture_id', as: 'odds' });

// Odds ↔ BettingMarket (muchos a uno)
Odds.belongsTo(BettingMarket, { foreignKey: 'market_id', as: 'market' });
BettingMarket.hasMany(Odds, { foreignKey: 'market_id', as: 'odds' });

// TeamStatistics ↔ Team (muchos a uno)
TeamStatistics.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });
Team.hasMany(TeamStatistics, { foreignKey: 'team_id', as: 'statistics' });

// TeamStatistics ↔ League (muchos a uno)
TeamStatistics.belongsTo(League, { foreignKey: 'league_id', as: 'league' });
League.hasMany(TeamStatistics, { foreignKey: 'league_id', as: 'teamStatistics' });

// Standing ↔ League (muchos a uno)
Standing.belongsTo(League, { foreignKey: 'league_id', as: 'league' });
League.hasMany(Standing, { foreignKey: 'league_id', as: 'standings' });

// Standing ↔ Team (muchos a uno)
Standing.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });
Team.hasMany(Standing, { foreignKey: 'team_id', as: 'standings' });

// FixtureResult ↔ Fixture (uno a uno)
FixtureResult.belongsTo(Fixture, { foreignKey: 'fixture_id', as: 'fixture' });
Fixture.hasOne(FixtureResult, { foreignKey: 'fixture_id', as: 'result' });

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN PARA CREAR DATOS INICIALES
// ═══════════════════════════════════════════════════════════════════
const createDefaultBettingMarkets = async () => {
  const defaultMarkets = [
    {
      key: '1X2',
      name: 'Match Winner',
      description: 'Predicción del ganador del partido',
      category: 'MATCH_RESULT',
      possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
      priority: 1
    },
    {
      key: 'OVER_UNDER_2_5',
      name: 'Over/Under 2.5 Goals',
      description: 'Total de goles mayor o menor a 2.5',
      category: 'GOALS',
      possibleOutcomes: ['OVER', 'UNDER'],
      parameters: { line: 2.5 },
      priority: 2
    },
    {
      key: 'BTTS',
      name: 'Both Teams To Score',
      description: 'Ambos equipos anotan al menos un gol',
      category: 'GOALS',
      possibleOutcomes: ['YES', 'NO'],
      priority: 3
    },
    {
      key: 'DOUBLE_CHANCE',
      name: 'Double Chance',
      description: 'Dos de tres posibles resultados',
      category: 'MATCH_RESULT',
      possibleOutcomes: ['1X', 'X2', '12'],
      priority: 4
    },
    {
      key: 'OVER_UNDER_1_5',
      name: 'Over/Under 1.5 Goals',
      description: 'Total de goles mayor o menor a 1.5',
      category: 'GOALS',
      possibleOutcomes: ['OVER', 'UNDER'],
      parameters: { line: 1.5 },
      priority: 5
    },
    {
      key: 'OVER_UNDER_3_5',
      name: 'Over/Under 3.5 Goals',
      description: 'Total de goles mayor o menor a 3.5',
      category: 'GOALS',
      possibleOutcomes: ['OVER', 'UNDER'],
      parameters: { line: 3.5 },
      priority: 6
    },
    {
      key: 'HT_1X2',
      name: 'Halftime Result',
      description: 'Resultado al medio tiempo',
      category: 'HALFTIME',
      possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
      priority: 7
    }
  ];

  for (const market of defaultMarkets) {
    await BettingMarket.findOrCreate({
      where: { key: market.key },
      defaults: market
    });
  }

  console.log('✅ Mercados de apuestas por defecto creados');
};

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN DE SINCRONIZACIÓN
// ═══════════════════════════════════════════════════════════════════
const syncDatabase = async () => {
  try {
    // Sincronizar modelos
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Todos los modelos sincronizados');
    
    // Crear datos iniciales
    await createDefaultBettingMarkets();
    
    return true;
  } catch (error) {
    console.error('❌ Error sincronizando base de datos:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════
// EXPORTACIONES
// ═══════════════════════════════════════════════════════════════════
module.exports = {
  sequelize,
  
  // Modelos principales
  League,
  Team,
  Fixture,
  BettingMarket,
  Odds,
  TeamStatistics,
  Standing,
  FixtureResult,
  ApiCache,
  
  // Funciones
  createDefaultBettingMarkets,
  syncDatabase
};