import { Subject, RxMe, Observer } from './rxme';
import { LogEntry } from './log';
import { ErrorContainer, CompleteMsg, DoneMsg } from './messages';

export type MatchReturn = Subject | boolean | void;

export interface MatcherCallback<T = RxMe> {
  (data: T, sub: Subject, rxme?: RxMe): MatchReturn;
}

export class Matcher {
  public static TypeOf<T>(typeOf: string, cb: (lm: T, sub?: Subject, rxme?: RxMe) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      if (typeof(rxme.data) == typeOf) {
        return cb(rxme.data, sub, rxme);
      }
      return false;
    };
  }

  public static Number(cb: (lm: number, sub?: Subject, rxme?: RxMe) => MatchReturn): MatcherCallback {
    return this.TypeOf('number', cb);
  }

  public static Boolean(cb: (lm: boolean, sub?: Subject, rxme?: RxMe) => MatchReturn): MatcherCallback {
    return this.TypeOf('boolean', cb);
  }

  public static String(cb: (lm: string, sub?: Subject, rxme?: RxMe) => MatchReturn): MatcherCallback {
    return this.TypeOf('string', cb);
  }

  public static WildCard(cb: MatcherCallback): MatcherCallback {
    return cb;
  }

  public static Error(cb: (err: any, sub?: Subject, rxme?: RxMe) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      if (rxme.data instanceof ErrorContainer) {
        return cb(rxme.data.error, sub, rxme);
      }
      return false;
    };
  }

  public static Done(cb: (res: boolean, sub?: Subject, rxme?: RxMe) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      console.log('Done:', rxme);
      if (rxme.data instanceof DoneMsg) {
        return cb(rxme.data.result, sub, rxme);
      }
      return false;
    };
  }

  public static Complete(cb: (sub?: Subject, rxme?: RxMe) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      if (rxme.data instanceof CompleteMsg) {
        return cb(sub, rxme);
      }
      return false;
    };
  }

  public static Observer(cb: (obs: Observer, sub?: Subject, rxme?: RxMe) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      if (rxme.data.next && rxme.data.complete && rxme.data.error) {
        return cb(rxme.data, sub, rxme);
      }
      return false;
    };
  }

  public static Type<T>(typ: any, cb: (t: T, sub?: Subject, rxme?: RxMe) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      if (rxme.data instanceof typ) {
        return cb(rxme.data, sub, rxme);
      }
      return false;
    };
  }

  public static ArrayOf<T>(typ: any, cb: (t: T[], sub?: Subject, rxme?: RxMe) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      if (Array.isArray(rxme.data) && (rxme.data.length == 0 || (rxme.data[0] instanceof typ))) {
        return cb(rxme.data, sub, rxme);
      }
      return false;
    };
  }

  public static Log(cb: MatcherCallback<LogEntry>): MatcherCallback {
    return (rxme, sub) => {
      const ret = rxme.data instanceof LogEntry;
      if (ret) {
        return cb(rxme.data, sub, rxme);
      }
      return false;
    };
  }

}
