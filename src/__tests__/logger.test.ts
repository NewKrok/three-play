import { createLogger } from '../core/utils/logger.js';

describe('Logger', () => {
  it('should create logger with default config', () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should respect log levels', () => {
    const logger = createLogger({ level: 'error' });

    expect(logger.isLevelEnabled('debug')).toBe(false);
    expect(logger.isLevelEnabled('info')).toBe(false);
    expect(logger.isLevelEnabled('warn')).toBe(false);
    expect(logger.isLevelEnabled('error')).toBe(true);
  });

  it('should handle custom prefix and timestamp config', () => {
    const logger = createLogger({
      level: 'debug',
      prefix: '[TEST]',
      timestamp: false,
    });

    expect(logger.isLevelEnabled('debug')).toBe(true);
  });

  it('should handle silent level', () => {
    const logger = createLogger({ level: 'silent' });

    expect(logger.isLevelEnabled('debug')).toBe(false);
    expect(logger.isLevelEnabled('info')).toBe(false);
    expect(logger.isLevelEnabled('warn')).toBe(false);
    expect(logger.isLevelEnabled('error')).toBe(false);
  });
});
