import winston from 'winston';

const { combine, timestamp, json, errors } = winston.format;

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'dailymotion-api' },
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development' 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : undefined
    }),
  ],
});

if (process.env.NODE_ENV === 'production') {
  // In production, you might want to add file transports or cloud logging
  // logger.add(new winston.transports.File({ filename: 'error.log', level: 'error' }));
  // logger.add(new winston.transports.File({ filename: 'combined.log' }));
}
