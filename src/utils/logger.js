const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Crear directorio de logs si no existe
const logDir = process.env.LOG_DIR || './logs';
require('fs').mkdirSync(logDir, { recursive: true });

// Formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Configuración de rotación de archivos
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  format: customFormat
});

const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  format: customFormat
});

// Crear logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { 
    service: process.env.APP_NAME || 'predictmaster-sports-backend',
    pid: process.pid 
  },
  transports: [
    fileRotateTransport,
    errorFileRotateTransport
  ]
});

// En desarrollo, agregar consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Agregar método para logs de API
logger.apiRequest = (method, url, status, duration) => {
  logger.info(`API Request: ${method} ${url} - ${status} (${duration}ms)`);
};

// Agregar método para logs de API-Football
logger.apiFootball = (endpoint, status, remaining) => {
  logger.info(`API-Football: ${endpoint} - ${status} (Remaining: ${remaining})`);
};

module.exports = logger;
