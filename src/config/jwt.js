module.exports = {
  secret: process.env.JWT_SECRET || 'tu-super-secret-jwt-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  issuer: 'predictmaster-backend-1',
  audience: ['predictmaster-frontend', 'predictmaster-backend-2'],
  algorithm: 'HS256'
};