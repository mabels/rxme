import { RxMe } from './rxme';

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug'
}

export class LogEntry {
  public readonly level: LogLevel;
  public readonly parts: any[];
  constructor(level: LogLevel, parts: any[]) {
    this.level = level;
    this.parts = parts;
  }
}

export function Log(level: LogLevel, ...args: any[]): RxMe {
  return new RxMe(new LogEntry(level, args));
}

export function LogInfo(...args: any[]): RxMe {
  return Log(LogLevel.INFO, ...args);
}

export function LogWarn(...args: any[]): RxMe {
  return Log(LogLevel.WARN, ...args);
}

export function LogDebug(...args: any[]): RxMe {
  return Log(LogLevel.DEBUG, ...args);
}

export function LogError(...args: any[]): RxMe {
  return Log(LogLevel.ERROR, ...args);
}

export default LogEntry;
