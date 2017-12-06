
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug'
}

export class LogMsg {
  public readonly level: LogLevel;
  public readonly parts: any[];
  constructor(level: LogLevel, parts: any[]) {
    this.level = level;
    this.parts = parts;
  }
}

export default LogMsg;
