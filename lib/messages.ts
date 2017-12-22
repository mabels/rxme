export class DoneMsg {
  public readonly result: boolean;
  constructor(result: boolean) {
    this.result = result;
  }
}

export class CompleteMsg {
  // // need this for instanceOf
  // public readonly completed: boolean;
  // constructor() {
  //   this.completed = true;
  // }
}

export class ErrorContainer {
  public readonly error: any;
  constructor(error: any) {
    this.error = error;
  }
}
