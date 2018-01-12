export class DoneMsg {
  public readonly result: boolean;
  constructor(result: boolean) {
    this.result = result;
  }
}

export class CompleteMsg {
}

export enum ErrorSource {
  DIRECT = ':DIRECT',
  EXCEPTION = ':EXCEPTION'
}

export class ErrorContainer {
  public readonly error: any;
  public readonly source: ErrorSource;
  constructor(error: any, source: ErrorSource) {
    this.error = error;
    this.source = source;
  }
}

// export class StopMatching {
// }
