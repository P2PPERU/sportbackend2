const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Team = sequelize.define('Team', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  apiFootballId: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: false,
    field: 'api_football_id',
    comment: 'ID del equipo en API-Football'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nombre completo del equipo'
  },
  shortName: {
    type: DataTypes.STRING(50),
    field: 'short_name',
    comment: 'Nombre corto'
  },
  code: {
    type: DataTypes.STRING(10),
    comment: 'Código de 3 letras (ej: MUN)'
  },
  country: {
    type: DataTypes.STRING(100),
    comment: 'País del equipo'
  },
  logo: {
    type: DataTypes.STRING(500),
    comment: 'URL del logo del equipo'
  },
  founded: {
    type: DataTypes.INTEGER,
    comment: 'Año de fundación'
  },
  venue: {
    type: DataTypes.STRING(255),
    comment: 'Estadio/sede del equipo'
  },
  venueCapacity: {
    type: DataTypes.INTEGER,
    field: 'venue_capacity',
    comment: 'Capacidad del estadio'
  },
  isNational: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_national',
    comment: 'Si es selección nacional'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Si el equipo está activo'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    field: 'last_sync_at',
    comment: 'Última sincronización con API'
  }
}, {
  tableName: 'teams',
  indexes: [
    { fields: ['api_football_id'] },
    { fields: ['name'] },
    { fields: ['country'] },
    { fields: ['is_active'] }
  ]
});

module.exports = Team;