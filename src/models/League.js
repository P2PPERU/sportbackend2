const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const League = sequelize.define('League', {
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
    comment: 'ID de la liga en API-Football'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nombre de la liga (ej: Premier League)'
  },
  shortName: {
    type: DataTypes.STRING(50),
    field: 'short_name',
    comment: 'Nombre corto (ej: PL)'
  },
  code: {
    type: DataTypes.STRING(10),
    comment: 'Código de 3 letras (ej: EPL)'
  },
  country: {
    type: DataTypes.STRING(100),
    comment: 'País de la liga'
  },
  countryCode: {
    type: DataTypes.STRING(3),
    field: 'country_code',
    comment: 'Código ISO del país (ej: GB)'
  },
  logo: {
    type: DataTypes.STRING(500),
    comment: 'URL del logo de la liga'
  },
  flag: {
    type: DataTypes.STRING(500),
    comment: 'URL de la bandera del país'
  },
  season: {
    type: DataTypes.INTEGER,
    defaultValue: 2024,
    comment: 'Temporada actual'
  },
  type: {
    type: DataTypes.ENUM('League', 'Cup'),
    defaultValue: 'League',
    comment: 'Tipo de competición'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Si la liga está activa para torneos'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Prioridad para mostrar (mayor = más importante)'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    field: 'last_sync_at',
    comment: 'Última sincronización con API'
  }
}, {
  tableName: 'leagues',
  indexes: [
    { fields: ['api_football_id'] },
    { fields: ['country'] },
    { fields: ['is_active'] },
    { fields: ['priority'] },
    { fields: ['season'] }
  ]
});

module.exports = League;