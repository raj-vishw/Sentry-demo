import pino from 'pino';
import { isProduction, isTest } from '../config/env.js';

export const logger = pino({
  level: isTest ? 'silent' : isProduction ? 'info' : 'debug',
  transport: isProduction || isTest ? undefined : { target: 'pino-pretty', options: { colorize: true } },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'confirmPassword',
      'passwordHash',
      'flag',
      'flagHash',
      '*.password',
      '*.passwordHash',
      '*.flag',
      '*.flagHash',
    ],
    censor: '[REDACTED]',
  },
});
