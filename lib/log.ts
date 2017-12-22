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

export function Log(level: LogLevel, ...arg: any[]): RxMe {
  return new RxMe(new LogEntry(level, arg));
}

export function LogInfo(...arg: any[]): RxMe {
  return Log(LogLevel.INFO, arg);
}

export function LogWarn(...arg: any[]): RxMe {
  return Log(LogLevel.WARN, arg);
}

export function LogDebug(...arg: any[]): RxMe {
  return Log(LogLevel.DEBUG, arg);
}

export function LogError(...arg: any[]): RxMe {
  return Log(LogLevel.ERROR, arg);
}

export default LogEntry;
