import * as rx from 'rxjs';
import _LogMsg from './log-msg';
import _Error from './error';

export class Error extends _Error { }
export class LogMsg extends _LogMsg { }

export enum Match {
  NUMBER = 'number'
}

export class Subject<T = void> extends rx.Subject<RxMe<T>> {
}

export interface Observer<T = void> extends rx.Observer<RxMe<T>> {
}

export class Observable<T = void> extends rx.Observable<RxMe<T>> {
}

export class RxMe<T = void> {
  private readonly data: any;

  constructor(_data: any) {
    this.data = _data;
  }

  public passthrough(obs: Observer<RxMe>): boolean {
    obs.next(this);
    return true;
  }
  public forward(obs: Observer<RxMe>): boolean {
    if (this.isError() || this.isLogMsg()) {
      obs.next(this);
      return true;
    }
    return false;
  }
  public isLogMsg(): boolean {
    return this.isKind(LogMsg);
  }

  public asLogMsg(): LogMsg {
    if (!this.isLogMsg()) {
      throw 'could not convert to LogMesg';
    }
    return this.asKind<LogMsg>();
  }

  public isError(): boolean {
    return this.isKind(Error);
  }
  public asError(): Error {
    if (!this.isError()) {
      throw 'could not convert to LogMesg';
    }
    return this.data;
  }

  public isKind(a: any): boolean {
    if (typeof(a) == 'function') {
      return this.data instanceof a;
    } else {
      return typeof(this.data) == a;
    }
  }
  public asKind<A = T>(): A {
    return this.data as A;
  }
}

export function data<T>(t: T): RxMe {
  return new RxMe(t);
}

export function logMsg(level: string, ...parts: any[]): RxMe {
  return data(new LogMsg(level, parts));
}

export function error(a: any): RxMe {
  return data(new Error(a));
}

export default RxMe;
