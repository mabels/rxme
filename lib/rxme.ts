import * as rx from 'rxjs';

import Error from './error';
export { Error } from './error';

import LogMsg from './log-msg';
export { LogMsg } from './log-msg';

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

export class Subject<T = void> extends rx.Subject<RxMe<T>> {
  public readonly objectId: string;
  private readonly obss: Subject<any>[];
  private readonly matcher: Matcher<any>[];
  private readonly _completed: MatcherCallback<any>[];
  private subscription: rx.Subscription;

  constructor() {
    super();
    this.obss = [];
    this.matcher = [
      new Matcher(null, (obs, _data) => {
        // console.log(`[${this.objectId}]:[${obs.objectId}]:wildcard:${JSON.stringify(_data)}`);
        obs.next(_data);
        return true;
      })
    ];
    this._completed = [];
    this.objectId = ('' + (1000000000 + ~~(Math.random() * 1000000000))).slice(1);
  }

  public done(result: boolean): Subject<T> {
    this.next(done(result));
    return this;
  }

  private searchMatcher(matcherIdx: number, obssIdx: number, rxme: RxMe<T>, found: boolean): void {
    // console.log(`[${this.objectId}]:enter:${!!this._done}`);
    if (matcherIdx >= this.matcher.length) {
      this._completed.forEach(cd => cd(null, rxme));
      return;
    }
    const match = this.matcher[matcherIdx];
    if (rxme.isKind(match.type)) {
      if (obssIdx >= this.obss.length || (found && obssIdx == this.obss.length - 1)) {
        this.searchMatcher(matcherIdx + 1, 0, rxme, found);
        return;
      }
      const os = this.obss[obssIdx];
      const doneFilter = new Subject<T>();
      const isCompleted = rxme.isKind(Complete);
      const doneFilterSubscription = doneFilter.subscribe(obs => {
        if (obs.data instanceof Done) {
          doneFilterSubscription.unsubscribe();
          // if (isCompleted && os) {
          //   os.next(rxme);
          //   // console.log('matchDone', this.objectId, os.objectId, isCompleted, rxme);
          // }
          this.searchMatcher(matcherIdx, obssIdx + 1, rxme, (found || obs.data.result) && !isCompleted);
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
      this.searchMatcher(matcherIdx + 1, 0, rxme, found);
    }
    // console.log(`[${this.objectId}]:leave:${!!this._done}`);
  }

  public passTo<A = T>(obs: Subject<A> | Subject<A>[] = null): Subject<T> {
    let obss: Subject<A>[];
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
      this.subscription = this.subscribe(myobs => {
        // console.log(`[${this.objectId}]:Matcher:${JSON.stringify(myobs)}`);
        this.searchMatcher(0, 0, myobs, false);
      }, (err) => {
        this.searchMatcher(0, 0, error(err), false);
      }, () => {
        this.searchMatcher(0, 0, complete(), false);
      });
    }
    return this;
  }

  public completed(cb: MatcherCallback<any>): Subject<T> {
    this._completed.push(cb);
    return this;
  }

  public wildCard(cb: MatcherCallback<any>): Subject<T> {
    this.match(null, cb);
    return this;
  }

  public match<A = T>(typ: any, cb: MatcherCallback<A>): Subject<T> {
    this.matcher.push(new Matcher(typ, cb));
    // this make the wildcard the last in match chain
    const swap = this.matcher[this.matcher.length - 1];
    this.matcher[this.matcher.length - 1] = this.matcher[this.matcher.length - 2];
    this.matcher[this.matcher.length - 2] = swap;
    // console.log('Match:push:', this.matcher.length);
    return this;
  }

  public matchError(cb: MatcherCallback<Error>): Subject<T> {
    this.match(Error, cb);
    return this;
  }

  public matchLogMsg(cb: MatcherCallback<LogMsg>): Subject<T> {
    this.match(LogMsg, cb);
    return this;
  }

  public matchDone(cb: MatcherCallback<Done>): Subject<T> {
    this.match(Done, cb);
    return this;
  }

  public matchComplete(cb: MatcherCallback<Complete>): Subject<T> {
    this.match(Complete, cb);
    return this;
  }

}

export interface Observer<T = void> extends rx.Observer<RxMe<T>> {
}

export class Observable<T = void> extends rx.Observable<RxMe<T>> {
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

  public asKind<A = T>(a: any): A {
    return this.data as A;
  }

  public asKindAny<A = T>(a: any): any {
    if (!a) {
      return this;
    }
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

export function done(a: boolean): RxMe {
  return data(new Done(a));
}

export function complete(): RxMe {
  return data(new Complete());
}

export default RxMe;
