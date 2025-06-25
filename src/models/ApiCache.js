const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ApiCache = sequelize.define('ApiCache', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  endpoint: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Endpoint de la API llamado'
  },
  params: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Parámetros de la llamada'
  },
  cacheKey: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
    field: 'cache_key',
    comment: 'Clave única para el cache'
  },
  response: {
    type: DataTypes.JSONB,
    comment: 'Respuesta de la API'
  },
  status: {
    type: DataTypes.INTEGER,
    comment: 'Status HTTP de la respuesta'
  },
  requestCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'request_count',
    comment: 'Número de veces que se ha solicitado'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
    comment: 'Cuándo expira el cache'
  },
  lastRequestAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_request_at'
  }
}, {
  tableName: 'api_cache',
  indexes: [
    { fields: ['cache_key'] },
    { fields: ['endpoint'] },
    { fields: ['expires_at'] },
    { fields: ['last_request_at'] }
  ]
});

module.exports = ApiCache;