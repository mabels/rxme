
export class LogMsg {
  public readonly level: string;
  public readonly parts: any[];
  constructor(level: string, parts: any[]) {
    this.level = level;
    this.parts = parts;
  }
}

export default LogMsg;
