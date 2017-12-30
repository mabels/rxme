import * as rx from 'rxjs';

// import Error from './error';
// export { Error } from './error';

export *  from './log';
// import { LogEntry, LogLevel } from './log-msg';

export * from './matcher';
export * from './msg';
export * from './messages';
// export { Data } from './data';
import Msg from './msg';
import { Matcher, MatcherCallback } from './matcher';
import { CompleteMsg } from './messages';

// export enum Match {
//   NUMBER = 'number',
//   BOOLEAN = 'boolean',
//   STRING = 'string',
//   OBJECT = 'object'
// }

// export class Matcher<T> {
//   public readonly type: any;
//   public readonly cb: MatcherCallback<T>;

//   constructor(type: any, cb: MatcherCallback<T>) {
//     this.type = type;
//     this.cb = cb;
//   }
// }

// export class Done {
//   public readonly result: boolean;
//   constructor(result: boolean) {
//     this.result = result;
//   }
// }

// export class Complete {
// }

export class MatcherMixin {
  public readonly objectId: string;
  public readonly obss: Observer[];
  public readonly matcher: MatcherCallback[];
  public readonly _completed: MatcherCallback[];
  // public readonly type: any; // class match
  private subscription: rx.Subscription;

  constructor() {
    // this.type = a;
    this.obss = [];
    this.matcher = [
      // wildcard
      // Matcher.WildCard((data, sub) => {
      //   // console.log(`[${this.objectId}]:[${obs.objectId}]:wildcard:${JSON.stringify(_data)}`);
      //   sub.next(data);
      //   return true;
      // })
    ];
    this._completed = [];
    this.objectId = ('' + (1000000000 + ~~(Math.random() * 1000000000))).slice(1);
  }

  public passTo(sbj: Subject, obs: Observer | Observer[] = null): void {
    let obss: Observer[] = [];
    if (obs instanceof Array) {
      obss = obs;
    } else if (obs) {
      obss = [obs];
    }
    // if (!!obss.find(o => !o)) {
    // console.error(`[${this.objectId}]:NULL:obss`);
    // }
    this.obss.push.apply(this.obss, obss);
    // console.log(`[${obss}]:[${this.obss}]`);
    if (!this.subscription) {
      // console.log(`[${this.objectId}]:passTo:[${this.subscription}]`);
      let gotCompleted = false;
      this.subscription = sbj.subscribe(myobs => {
        // console.log(`[${this.objectId}]:Matcher:${JSON.stringify(myobs)}`);
        gotCompleted = gotCompleted || myobs.data instanceof CompleteMsg;
        searchMatcher(this, 0, myobs, false);
      }, (err) => {
        // console.log('passTo:Error', err);
        searchMatcher(this, 0, Msg.Error(err), false);
      }, () => {
        // console.log('passTo:Completed');
        if (!gotCompleted) {
          searchMatcher(this, 0, Msg.Complete(), false);
        }
      });
    }
  }

  public match(cb: MatcherCallback): void {
    this.matcher.push(cb);
    // console.log('Match:', this.objectId, this.matcher.length);
    // this make the wildcard the last in match chain
    // const swap = this.matcher[this.matcher.length - 1];
    // this.matcher[this.matcher.length - 1] = this.matcher[this.matcher.length - 2];
    // this.matcher[this.matcher.length - 2] = swap;
    // console.log('Match:push:', this.matcher.length);
  }

  public completed(cb: MatcherCallback): void {
    this._completed.push(cb);
  }

}

export class Subject extends rx.Subject<RxMe> {
  private readonly mixin: MatcherMixin;
  // public nextLog: Logger<T>;

  constructor() {
    // const a = new T();
    super();
    this.mixin = new MatcherMixin();
    // this.nextLog = new Logger(this);
  }

  public completed(cb: MatcherCallback): Subject {
    this.mixin.completed(cb);
    return this;
  }

  public stopPass(result: boolean): Subject {
    this.next(Msg.Boolean(result));
    return this;
  }

  public passTo(obs: Observer | Observer[] = null): Subject {
    this.mixin.passTo(this, obs);
    return this;
  }

  public match(cb: MatcherCallback): Subject {
    this.mixin.match(cb);
    return this;
  }

  // public matchType<A = T>(typ: any, cb: MatcherCallback<A>): Subject<T> {
  //   this.mixin.matchType(typ, cb);
  //   return this;
  // }

  // public matchError(cb: MatcherCallback<Error>): Subject<T> {
  //   this.mixin.matchType(Error, cb);
  //   return this;
  // }

  // public matchLogMsg(cb: MatcherCallback<LogMsg>): Subject<T> {
  //   this.mixin.matchType(LogMsg, cb);
  //   return this;
  // }

  // public matchDone(cb: MatcherCallback<Done>): Subject<T> {
  //   this.mixin.matchType(Done, cb);
  //   return this;
  // }

  // public matchComplete(cb: MatcherCallback<Complete>): Subject<T> {
  //   this.mixin.matchType(Complete, cb);
  //   return this;
  // }

  // public wildCard(cb: MatcherCallback<any>): Subject<T> {
  //   this.mixin.matchType(null, cb);
  //   return this;
  // }

}

export interface Observer extends rx.Observer<RxMe> {
}

export interface ObserverCb {
  (_: Observer): any;
}

export class Observable {
  private readonly observerCb: ObserverCb;
  private subject: Subject;

  public static create(obsCb: ObserverCb): Observable {
    const ret = new Observable(obsCb);
    return ret;
  }

  constructor(obsCb: ObserverCb) {
    this.observerCb = obsCb;
    this.subject = new Subject();
  }

  public match(cb: MatcherCallback): Observable {
    this.subject.match(cb);
    return this;
  }

  // public matchType<A = T>(typ: any, cb: MatcherCallback<A>): Observable<T> {
  //   this.subject.matchType(typ, cb);
  //   return this;
  // }

  // public matchError(cb: MatcherCallback<Error>): Observable<T> {
  //   this.subject.matchType(Error, cb);
  //   return this;
  // }

  // public matchLogMsg(cb: MatcherCallback<LogMsg>): Observable<T> {
  //   this.subject.matchType(LogMsg, cb);
  //   return this;
  // }

  // public matchDone(cb: MatcherCallback<Done>): Observable<T> {
  //   this.subject.matchType(Done, cb);
  //   return this;
  // }

  // public matchComplete(cb: MatcherCallback<Complete>): Observable<T> {
  //   this.subject.matchType(Complete, cb);
  //   return this;
  // }

  // public wildCard(cb: MatcherCallback<any>): Observable<T> {
  //   this.subject.matchType(null, cb);
  //   return this;
  // }

  public completed(cb: MatcherCallback): Observable {
    this.subject.completed(cb);
    return this;
  }

  public passTo(pobs: Observer | Observer[] = null): Observable {
    this.subject.passTo(pobs);
    this.observerCb(this.subject);
    // this.subscribe(obs => {
    //   ret.next(obs);
    // });
    return this;
  }

}

export class RxMe {
  public readonly objectId: string;
  public readonly data: any;

  constructor(_data: any) {
    this.objectId = ('' + (1000000000 + ~~(Math.random() * 1000000000))).slice(1);
    this.data = _data;
  }

  // public passthrough(obs: Observer<RxMe>): boolean {
  //   obs.next(this);
  //   return true;
  // }
  // public forward(obs: Observer<RxMe>): boolean {
  //   if (this.isError() || this.isLogMsg()) {
  //     obs.next(this);
  //     return true;
  //   }
  //   return false;
  // }
  // public isLogMsg(): boolean {
  //   return this.isKind(LogMsg);
  // }

  // public asLogMsg(): LogMsg {
  //   if (!this.isLogMsg()) {
  //     throw 'could not convert to LogMesg';
  //   }
  //   return this.data;
  // }

  // public isError(): boolean {
  //   return this.isKind(Error);
  // }
  // public asError(): Error {
  //   if (!this.isError()) {
  //     throw 'could not convert to LogMesg';
  //   }
  //   return this.data;
  // }

  // public isKind(a: any): boolean {
  //   if (!a) {
  //     return true;
  //   } else if (typeof (a) == 'function') {
  //     return this.data instanceof a;
  //   } else {
  //     return typeof (this.data) == a;
  //   }
  // }

  // public asKind<A = T>(): A {
  //   return this.data as A;
  // }

  // public asKindAny<A = T>(a: any): any {
  //   if (!a) {
  //     return this;
  //   }
  //   return this.data as A;
  // }
}

// the lint has some problems with forward declarations
function searchMatcher(mymm: MatcherMixin, matcherIdx: number,
  rxme: RxMe, dontPassTo: boolean): void {
  // console.log(`[${this.objectId}]:enter:${!!this._done}`);
  if (matcherIdx >= mymm.matcher.length) {
    // console.log('Matcher:completed:', dontPassTo);
    if (!dontPassTo) {
      // console.log(mymm);
      mymm.obss.forEach(os => os.next(rxme));
    }
    if (rxme.data instanceof CompleteMsg) {
      mymm.obss.forEach(os => os.complete());
    }
    mymm._completed.forEach(cd => cd(rxme, null));
    return;
  }
  const match = mymm.matcher[matcherIdx];
  // if (rxme.isKind(match.type)) {
  // if (obssIdx >= mymm.obss.length || (found && obssIdx == mymm.obss.length - 1)) {
  //   console.log(`Next:Matcher:`, matcherIdx, found);
  //   searchMatcher(mymm, matcherIdx + 1, 0, rxme, found);
  //   return;
  // }
  const doneFilter = new Subject();
  const isCompleted = rxme.data instanceof CompleteMsg;
  const doneFilterSubscription = doneFilter.subscribe(obs => {
    Matcher.Boolean((pass) => {
      doneFilterSubscription.unsubscribe();
      // if (isCompleted && os) {
      //   os.next(rxme);
      //   // console.log('matchDone', this.objectId, os.objectId, isCompleted, rxme);
      // }
      // console.log(`Matcher:`, mymm.matcher.length, matcherIdx, dontPassTo, obs.data.done, !isCompleted);
      searchMatcher(mymm, matcherIdx + 1, rxme,
        !isCompleted && (dontPassTo || obs.data));
    })(obs, null);
  });
  // console.log(`${rxme.objectId}:${matcherIdx}:${isCompleted}:${JSON.stringify(rxme)}`);
  const o = match(rxme, doneFilter);
  if (o !== doneFilter) {
    doneFilter.stopPass(!!o);
  }
  // } else {
  //   searchMatcher(mymm, matcherIdx + 1, 0, rxme, found);
  // }
  // console.log(`[${this.objectId}]:leave:${!!this._done}`);
}

// export function data<T>(t: T): RxMe {
//   return new RxMe(t);
// }

// export function logMsg(level: LogLevel, ...parts: any[]): RxMe {
//   return data(new LogMsg(level, parts));
// }

// export function error(a: any): RxMe {
//   return data(new Error(a));
// }

// export function done(a: boolean): RxMe {
//   return data(new Done(a));
// }

// export function complete(): RxMe {
//   return data(new Complete());
// }

export default RxMe;
