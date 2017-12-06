import * as rx from 'rxjs';

import Error from './error';
export { Error } from './error';

import LogMsg, { LogLevel } from './log-msg';
export { LogLevel } from './log-msg';

export enum Match {
  NUMBER = 'number'
}

export interface MatcherCallback<T> {
  (obs: Subject<any>, data: T): boolean | Subject<any>;
}

export class Matcher<T> {
  public readonly type: any;
  public readonly cb: MatcherCallback<T>;

  constructor(type: any, cb: MatcherCallback<T>) {
    this.type = type;
    this.cb = cb;
  }
}

export class Done {
  public readonly result: boolean;
  constructor(result: boolean) {
    this.result = result;
  }
}

export class Complete {
}

export class MatcherMixin<T> {
  public readonly objectId: string;
  public readonly obss: Observer<any>[];
  public readonly matcher: Matcher<any>[];
  public readonly _completed: MatcherCallback<any>[];
  public readonly type: any; // class match
  private subscription: rx.Subscription;

  constructor(a: T | Match) {
    this.type = a;
    this.obss = [];
    this.matcher = [
      // wildcard
      new Matcher(null, (obs, _data) => {
        // console.log(`[${this.objectId}]:[${obs.objectId}]:wildcard:${JSON.stringify(_data)}`);
        obs.next(_data);
        return true;
      })
    ];
    this._completed = [];
    this.objectId = ('' + (1000000000 + ~~(Math.random() * 1000000000))).slice(1);
  }

  public passTo<A = T>(sbj: Subject<T>, obs: Observer<A> | Observer<A>[] = null): void {
    let obss: Observer<A>[];
    if (obs instanceof Array) {
      obss = obs;
    } else {
      obss = [obs];
    }
    // if (!!obss.find(o => !o)) {
    // console.error(`[${this.objectId}]:NULL:obss`);
    // }
    this.obss.push.apply(this.obss, obss);
    // console.log(`[${obss}]:[${this.obss}]`);
    if (!this.subscription) {
      // console.log(`[${this.objectId}]:passTo:[${this.subscription}]`);
      this.subscription = sbj.subscribe(myobs => {
        // console.log(`[${this.objectId}]:Matcher:${JSON.stringify(myobs)}`);
        searchMatcher(this, 0, 0, myobs, false);
      }, (err) => {
        searchMatcher(this, 0, 0, error(err), false);
      }, () => {
        searchMatcher(this, 0, 0, complete(), false);
      });
    }
  }

  public matchType<A = T>(typ: any, cb: MatcherCallback<A>): void {
    this.matcher.push(new Matcher(typ, cb));
    // this make the wildcard the last in match chain
    const swap = this.matcher[this.matcher.length - 1];
    this.matcher[this.matcher.length - 1] = this.matcher[this.matcher.length - 2];
    this.matcher[this.matcher.length - 2] = swap;
    // console.log('Match:push:', this.matcher.length);
  }

  public completed(cb: MatcherCallback<any>): void {
    this._completed.push(cb);
  }

}

export class Logger<T> {
  private readonly out: Observer<T>;

  constructor(out: Observer<T>) {
    this.out = out;
  }

  public info(...arg: any[]): void {
    this.out.next(logMsg(LogLevel.INFO, arg));
  }

  public warn(...arg: any[]): void {
    this.out.next(logMsg(LogLevel.WARN, arg));
  }

  public debug(...arg: any[]): void {
    this.out.next(logMsg(LogLevel.DEBUG, arg));
  }

  public error(...arg: any[]): void {
    this.out.next(logMsg(LogLevel.ERROR, arg));
  }

}

export class Subject<T = void> extends rx.Subject<RxMe<T>> {
  private readonly mixin: MatcherMixin<T>;
  public nextLog: Logger<T>;

  constructor(a: any) {
    // const a = new T();
    super();
    this.mixin = new MatcherMixin<T>(a);
    this.nextLog = new Logger(this);
  }

  public completed(cb: MatcherCallback<any>): Subject<T> {
    this.mixin.completed(cb);
    return this;
  }

  public done(result: boolean): Subject<T> {
    this.next(done(result));
    return this;
  }

  public passTo<A = T>(obs: Observer<A> | Observer<A>[] = null): Subject<T> {
    this.mixin.passTo(this, obs);
    return this;
  }

  public match(cb: MatcherCallback<T>): Subject<T> {
    this.mixin.matchType(this.mixin.type, cb);
    return this;
  }

  public matchType<A = T>(typ: any, cb: MatcherCallback<A>): Subject<T> {
    this.mixin.matchType(typ, cb);
    return this;
  }

  public matchError(cb: MatcherCallback<Error>): Subject<T> {
    this.mixin.matchType(Error, cb);
    return this;
  }

  public matchLogMsg(cb: MatcherCallback<LogMsg>): Subject<T> {
    this.mixin.matchType(LogMsg, cb);
    return this;
  }

  public matchDone(cb: MatcherCallback<Done>): Subject<T> {
    this.mixin.matchType(Done, cb);
    return this;
  }

  public matchComplete(cb: MatcherCallback<Complete>): Subject<T> {
    this.mixin.matchType(Complete, cb);
    return this;
  }

  public wildCard(cb: MatcherCallback<any>): Subject<T> {
    this.mixin.matchType(null, cb);
    return this;
  }

}

export interface Observer<T = void> extends rx.Observer<RxMe<T>> {
}

export interface ObserverCb<T> {
  (_: Observer<T>): any;
}

export class Observable<T = void> {
  private readonly observerCb: ObserverCb<T>;
  private subject: Subject<T>;

  public static create<T>(typ: any, obsCb: ObserverCb<T>): Observable<T> {
    const ret = new Observable<T>(typ, obsCb);
    return ret;
  }

  constructor(typ: any, obsCb: ObserverCb<T>) {
    this.observerCb = obsCb;
    this.subject = new Subject<T>(typ);
  }

  public match(cb: MatcherCallback<T>): Observable<T> {
    this.subject.match(cb);
    return this;
  }

  public matchType<A = T>(typ: any, cb: MatcherCallback<A>): Observable<T> {
    this.subject.matchType(typ, cb);
    return this;
  }

  public matchError(cb: MatcherCallback<Error>): Observable<T> {
    this.subject.matchType(Error, cb);
    return this;
  }

  public matchLogMsg(cb: MatcherCallback<LogMsg>): Observable<T> {
    this.subject.matchType(LogMsg, cb);
    return this;
  }

  public matchDone(cb: MatcherCallback<Done>): Observable<T> {
    this.subject.matchType(Done, cb);
    return this;
  }

  public matchComplete(cb: MatcherCallback<Complete>): Observable<T> {
    this.subject.matchType(Complete, cb);
    return this;
  }

  public wildCard(cb: MatcherCallback<any>): Observable<T> {
    this.subject.matchType(null, cb);
    return this;
  }

  public completed(cb: MatcherCallback<T>): Observable<T> {
    this.subject.completed(cb);
    return this;
  }

  public passTo(pobs: Observer<T> | Observer<T>[] = null): Observable<T> {
    this.subject.passTo(pobs);
    this.observerCb(this.subject);
    // this.subscribe(obs => {
    //   ret.next(obs);
    // });
    return this;
  }

}

export class RxMe<T = void> {
  public readonly objectId: string;
  public readonly data: any;

  constructor(_data: any) {
    this.objectId = ('' + (1000000000 + ~~(Math.random() * 1000000000))).slice(1);
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
    return this.data;
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
    if (!a) {
      return true;
    } else if (typeof (a) == 'function') {
      return this.data instanceof a;
    } else {
      return typeof (this.data) == a;
    }
  }

  public asKind<A = T>(): A {
    return this.data as A;
  }

  public asKindAny<A = T>(a: any): any {
    if (!a) {
      return this;
    }
    return this.data as A;
  }
}

// the lint has some problems with forward declarations
function searchMatcher<T>(mymm: MatcherMixin<T>, matcherIdx: number,
  obssIdx: number, rxme: RxMe<T>, found: boolean): void {
  // console.log(`[${this.objectId}]:enter:${!!this._done}`);
  if (matcherIdx >= mymm.matcher.length) {
    mymm._completed.forEach(cd => cd(null, rxme));
    return;
  }
  const match = mymm.matcher[matcherIdx];
  if (rxme.isKind(match.type)) {
    if (obssIdx >= mymm.obss.length || (found && obssIdx == mymm.obss.length - 1)) {
      searchMatcher(mymm, matcherIdx + 1, 0, rxme, found);
      return;
    }
    const os = mymm.obss[obssIdx];
    const doneFilter = new Subject<T>(mymm.type);
    const isCompleted = rxme.isKind(Complete);
    const doneFilterSubscription = doneFilter.subscribe(obs => {
      if (obs.data instanceof Done) {
        doneFilterSubscription.unsubscribe();
        // if (isCompleted && os) {
        //   os.next(rxme);
        //   // console.log('matchDone', this.objectId, os.objectId, isCompleted, rxme);
        // }
        searchMatcher(mymm, matcherIdx, obssIdx + 1, rxme, (found || obs.data.result) && !isCompleted);
      } else {
        if (os) {
          os.next(obs);
        }
      }
    });
    // console.log(`[${this.objectId}]:preMatch:cb:${!!this._done}`);
    const o = match.cb(doneFilter, rxme.asKindAny(match.type));
    if (!(o instanceof Subject)) {
      doneFilter.done(o);
    }
  } else {
    searchMatcher(mymm, matcherIdx + 1, 0, rxme, found);
  }
  // console.log(`[${this.objectId}]:leave:${!!this._done}`);
}

export function data<T>(t: T): RxMe {
  return new RxMe(t);
}

export function logMsg(level: LogLevel, ...parts: any[]): RxMe {
  return data(new LogMsg(level, parts));
}

export function error(a: any): RxMe {
  return data(new Error(a));
}

export function done(a: boolean): RxMe {
  return data(new Done(a));
}

export function complete(): RxMe {
  return data(new Complete());
}

export default RxMe;
