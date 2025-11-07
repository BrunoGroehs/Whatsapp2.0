import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
// Pretty only in development. Even if LOG_PRETTY=1 in production, we disable to avoid missing dev deps in container.
const wantPretty = process.env.LOG_PRETTY === '1' || (!isProd && process.env.LOG_PRETTY !== '0');
const isPretty = !isProd && wantPretty;

const allowedLevels = new Set(['fatal','error','warn','info','debug','trace','silent']);
const envLevelRaw = (process.env.LOG_LEVEL || 'info').toLowerCase();
const mappedLevel = envLevelRaw === 'dev' ? 'debug' : envLevelRaw;
const finalLevel = allowedLevels.has(mappedLevel) ? mappedLevel : 'info';

const common = {
  level: finalLevel,
  base: null
};

let logger;
if (isPretty) {
  // Use transport only when running locally (dev) where pino-pretty is installed as a devDependency.
  logger = pino({
    ...common,
    transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true, translateTime: 'SYS:standard' } }
  });
} else {
  // JSON logs to stdout (recommended for containers)
  logger = pino(common);
}

export default logger;
