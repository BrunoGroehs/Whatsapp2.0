import pino from 'pino';

const isPretty = process.env.LOG_PRETTY === '1' || (process.env.NODE_ENV !== 'production' && process.env.LOG_PRETTY !== '0');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: null,
  ...(isPretty
    ? { transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true, translateTime: 'SYS:standard' } } }
    : {})
});

export default logger;
