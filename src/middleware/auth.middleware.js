const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const logger = require('../utils/logger');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    // Si no hay token, continuar sin usuario (rutas públicas)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(token, jwtConfig.secret);
      
      // Simular datos de usuario (en producción vendría de Backend 1 o DB)
      req.user = {
        id: decoded.id,
        email: decoded.email,
        isAdmin: decoded.isAdmin || false,
        isPremium: decoded.isPremium || false
      };
      
      logger.info(`Usuario autenticado: ${decoded.email} (Admin: ${decoded.isAdmin})`);
      
    } catch (jwtError) {
      logger.warn(`Token inválido: ${jwtError.message}`);
      // No retornar error, solo continuar sin usuario
    }

    next();
  } catch (error) {
    logger.error('Error en middleware de autenticación:', error);
    next(); // Continuar sin usuario en caso de error
  }
};