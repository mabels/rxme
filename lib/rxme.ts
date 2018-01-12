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
import { CompleteMsg, ErrorSource, DoneMsg } from './messages';
import { Othingy, IfOthing, IsOthing } from 'othing';

export declare type ObserverCbRet = void | (() => void);

export interface ObserverCb {
  (_: Observer): ObserverCbRet;
}

export class MatcherMixin extends Othingy {
  // public readonly objectId: string;
  public readonly obss: Observer[];
  public readonly matcher: MatcherCallback[];
  public readonly _completed: MatcherCallback[];
  // public readonly type: any; // class match
  private subscription: rx.Subscription;
  private unsubscribeCb: ObserverCbRet;

  constructor() {
    super();
    // this.type = a;
    this.obss = [];
    this.matcher = [];
    this._completed = [];
    // this.objectId = ('' + (1000000000 + ~~(Math.random() * 1000000000))).slice(1);
  }

  public unsubscribe(): void {
    if (this.subscription) {
      if (this.unsubscribeCb) {
        this.unsubscribeCb();
      }
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  public setUnsubscribeCb(cb: ObserverCbRet): MatcherMixin {
    this.unsubscribeCb = cb;
    return this;
  }

  public unPassTo(sbj: Subject, obs: Observer | Observer[]): MatcherMixin {
    let obss: Observer[];
    if (obs instanceof Array) {
      obss = obs.slice();
    } else if (obs) {
      obss = [obs];
    }
    let idx = 0;
    while (obss.length && idx < this.obss.length) {
      const fidx = obss.indexOf(this.obss[idx++]);
      if (fidx >= 0) {
        --idx;
        obss.splice(fidx, 1);
        this.obss.splice(idx, 1);
      }
    }
    return this;
  }

  public passTo(sbj: Subject, obs: Observer | Observer[] = null): MatcherMixin {
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
    return this;
  }

  public match(cb: MatcherCallback): void {
    this.matcher.push(cb);
  }

  public completed(cb: MatcherCallback): void {
    this._completed.push(cb);
  }

}

export enum MatchingState {
  ALL = 'all',
  STOP = 'stop'
}

@IsOthing()
export class Subject extends rx.Subject<RxMe> implements IfOthing {
  private readonly mixin: MatcherMixin;
  public readonly objectId: string;
  public matchingState: MatchingState = MatchingState.ALL;

  constructor() {
    super();
    this.mixin = new MatcherMixin();
  }

  public completed(cb: MatcherCallback): Subject {
    this.mixin.completed(cb);
    return this;
  }

  public stopPass(result: boolean): Subject {
    this.next(Msg.Done(result));
    this.complete();
    return this;
  }

  public stopMatching(): Subject {
    this.matchingState = MatchingState.STOP;
    return this;
  }

  public unPassTo(obs: Observer | Observer[]): Subject {
    this.mixin.unPassTo(this, obs);
    return this;
  }

  public passTo(obs: Observer | Observer[] = null): Subject {
    this.mixin.passTo(this, obs);
    return this;
  }

  public start(): Subject {
    this.passTo();
    return this;
  }

  public match(cb: MatcherCallback): Subject {
    this.mixin.match(cb);
    return this;
  }

  public setUnsubscribeCb(cb: ObserverCbRet): Subject {
    this.mixin.setUnsubscribeCb(cb);
    return this;
  }

  public unsubscribe(): Subject {
    this.mixin.unsubscribe();
    return this;
  }

}

export interface Observer extends rx.Observer<RxMe> {
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

  public unsubscribe(): Observable {
    this.subject.unsubscribe();
    return this;
  }

  public passTo(pobs: Observer | Observer[] = null): Observable {
    this.subject.passTo(pobs);
    try {
      this.subject.setUnsubscribeCb(this.observerCb(this.subject));
    } catch (e) {
      // console.log(`Subscribe:${e}`);
      this.subject.next(Msg.Error(e, ErrorSource.EXCEPTION));
      this.subject.complete();
    }
    return this;
  }

  public start(): Observable {
    this.passTo();
    return this;
  }

}

export class RxMe extends Othingy {
  // public readonly objectId: string;
  public readonly data: any;

  constructor(_data: any) {
    super();
    // this.objectId = ('' + (1000000000 + ~~(Math.random() * 1000000000))).slice(1);
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
  const doneFilterSubscription = doneFilter.subscribe(msg => {
    // console.log(`Obs:${JSON.stringify(msg)}`);
    let processed = false;
    Matcher.Type<DoneMsg>(DoneMsg, (pass) => {
      processed = true;
      // console.log(`GotDone:${doneFilter.objectId}:${JSON.stringify(pass)}`);
      doneFilterSubscription.unsubscribe();
      searchMatcher(mymm,
        doneFilter.matchingState == MatchingState.STOP ? mymm.matcher.length : matcherIdx + 1,
        rxme, /* !isCompleted && */ (dontPassTo || pass.result));
    })(msg, null);
    if (!processed) {
      mymm.obss.forEach(obs => obs.next(msg));
    }
  }, err => {
    console.log(`Error:${doneFilter.objectId}:${err}`);
  }, () => {
    console.log(`Completed:${doneFilter.objectId}`);
  });
  // console.log(`${rxme.objectId}:${matcherIdx}:${isCompleted}:${JSON.stringify(rxme)}`);
  try {
    const o = match(rxme, doneFilter);
    if (o !== doneFilter) {
      doneFilter.stopPass(!!o);
      // console.log(`Sync-DoneFilter-Complete`, doneFilter.objectId);
      // doneFilter.complete();
    }
  } catch (e) {
    doneFilter.stopPass(false);
    const rxexp = Msg.Error(e, ErrorSource.EXCEPTION);
    searchMatcher(mymm, 0, rxexp, false);
    // mymm.obss.forEach(obs => obs.next(rxexp));
    // console.log(`WTF:${doneFilter.objectId}:${e}`);
  }
}

export default RxMe;
