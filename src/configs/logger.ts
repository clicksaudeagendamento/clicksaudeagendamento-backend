import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '{msg}',
    },
  },
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'clicksaudeagendamento-backend',
  },
});

export default logger;
