const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TeamStatistics = sequelize.define('TeamStatistics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  teamId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'team_id',
    references: {
      model: 'teams',
      key: 'id'
    }
  },
  leagueId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'league_id',
    references: {
      model: 'leagues',
      key: 'id'
    }
  },
  season: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2025
  },
  // Estadísticas generales
  matchesPlayed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'matches_played'
  },
  wins: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  draws: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  losses: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  goalsFor: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'goals_for'
  },
  goalsAgainst: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'goals_against'
  },
  goalDifference: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'goal_difference'
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  position: {
    type: DataTypes.INTEGER,
    comment: 'Posición en la tabla'
  },
  // Estadísticas como local
  homeStats: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'home_stats',
    comment: 'Estadísticas jugando en casa'
  },
  // Estadísticas como visitante
  awayStats: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'away_stats',
    comment: 'Estadísticas jugando fuera'
  },
  // Forma reciente
  form: {
    type: DataTypes.STRING(10),
    comment: 'Últimos 5 partidos (WWDLL)'
  },
  // Estadísticas avanzadas
  avgGoalsFor: {
    type: DataTypes.DECIMAL(4, 2),
    defaultValue: 0.00,
    field: 'avg_goals_for'
  },
  avgGoalsAgainst: {
    type: DataTypes.DECIMAL(4, 2),
    defaultValue: 0.00,
    field: 'avg_goals_against'
  },
  cleanSheets: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'clean_sheets'
  },
  failedToScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'failed_to_score'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    field: 'last_sync_at'
  }
}, {
  tableName: 'team_statistics',
  indexes: [
    { unique: true, fields: ['team_id', 'league_id', 'season'] },
    { fields: ['league_id', 'season', 'position'] },
    { fields: ['points'] },
    { fields: ['goal_difference'] }
  ]
});

module.exports = TeamStatistics;