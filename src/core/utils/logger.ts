/**
 * Log levels supported by the THREE Play logging system
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Configuration for the logger
 */
export type LoggerConfig = {
  /** Minimum log level to output */
  level: LogLevel;
  /** Prefix to add to all log messages */
  prefix?: string;
  /** Whether to include timestamp in log messages */
  timestamp?: boolean;
};

/**
 * Logger interface for THREE Play engine
 */
export interface Logger {
  /** Log debug information (lowest priority) */
  debug(message: string, ...args: any[]): void;
  /** Log general information */
  info(message: string, ...args: any[]): void;
  /** Log warnings */
  warn(message: string, ...args: any[]): void;
  /** Log errors (highest priority) */
  error(message: string, ...args: any[]): void;
  /** Check if a log level is enabled */
  isLevelEnabled(level: LogLevel): boolean;
}

/**
 * Default logger configuration
 */
const defaultLoggerConfig: LoggerConfig = {
  level: 'warn',
  prefix: '[THREE-Play]',
  timestamp: true,
};

/**
 * Log level priorities for comparison
 */
const logLevelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/**
 * Creates a logger instance with the given configuration
 */
export const createLogger = (config: Partial<LoggerConfig> = {}): Logger => {
  const finalConfig: LoggerConfig = { ...defaultLoggerConfig, ...config };

  /**
   * Formats a log message with optional timestamp and prefix
   */
  const formatMessage = (level: LogLevel, message: string): string => {
    let formatted = '';
    
    if (finalConfig.timestamp) {
      const now = new Date();
      const timestamp = now.toISOString().substring(11, 23); // HH:mm:ss.SSS
      formatted += `[${timestamp}] `;
    }
    
    if (finalConfig.prefix) {
      formatted += `${finalConfig.prefix} `;
    }
    
    formatted += `[${level.toUpperCase()}] ${message}`;
    
    return formatted;
  };

  /**
   * Checks if a log level should be output based on configuration
   */
  const shouldLog = (level: LogLevel): boolean => {
    return logLevelPriority[level] >= logLevelPriority[finalConfig.level];
  };

  /**  
   * Logs a message at the specified level
   */
  const log = (level: LogLevel, message: string, ...args: any[]): void => {
    if (!shouldLog(level)) return;

    const formattedMessage = formatMessage(level, message);
    
    // Use appropriate console method based on log level
    switch (level) {
      case 'debug':
      case 'info':
        console.log(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'error':
        console.error(formattedMessage, ...args);
        break;
    }
  };

  return {
    debug: (message: string, ...args: any[]) => log('debug', message, ...args),
    info: (message: string, ...args: any[]) => log('info', message, ...args),
    warn: (message: string, ...args: any[]) => log('warn', message, ...args),
    error: (message: string, ...args: any[]) => log('error', message, ...args),
    isLevelEnabled: (level: LogLevel) => shouldLog(level),
  };
};

/**
 * Logger utilities namespace
 */
export const LoggerUtils = {
  createLogger,
  defaultConfig: defaultLoggerConfig,
  levels: logLevelPriority,
};