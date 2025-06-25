const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Standing = sequelize.define('Standing', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  teamId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'team_id',
    references: {
      model: 'teams',
      key: 'id'
    }
  },
  season: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2024
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Posición actual en la tabla'
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
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
  form: {
    type: DataTypes.STRING(10),
    comment: 'Últimos 5 partidos'
  },
  status: {
    type: DataTypes.STRING(50),
    comment: 'Estado en la tabla (Champions, Europa, Relegation, etc.)'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Descripción del status'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    field: 'last_sync_at'
  }
}, {
  tableName: 'standings',
  indexes: [
    { unique: true, fields: ['league_id', 'team_id', 'season'] },
    { fields: ['league_id', 'season', 'position'] },
    { fields: ['points'] }
  ]
});

module.exports = Standing;
