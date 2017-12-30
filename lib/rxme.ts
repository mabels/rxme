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
    this.matcher = [];
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
      if (rxme.data instanceof CompleteMsg) {
        // console.log(`pass complete:${rxme.objectId}`);
        mymm.obss.forEach(os => os.complete());
      }
    }
    mymm._completed.forEach(cd => cd(rxme, null));
    return;
  }
  const match = mymm.matcher[matcherIdx];
  const doneFilter = new Subject();
  // const isCompleted = rxme.data instanceof CompleteMsg;
  const doneFilterSubscription = doneFilter.subscribe(obs => {
    Matcher.Boolean((pass) => {
      doneFilterSubscription.unsubscribe();
      searchMatcher(mymm, matcherIdx + 1, rxme,
        /* !isCompleted && */ (dontPassTo || obs.data));
    })(obs, null);
  });
  // console.log(`${rxme.objectId}:${matcherIdx}:${isCompleted}:${JSON.stringify(rxme)}`);
  const o = match(rxme, doneFilter);
  if (o !== doneFilter) {
    doneFilter.stopPass(!!o);
  }
}

export default RxMe;
