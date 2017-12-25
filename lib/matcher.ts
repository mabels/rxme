import { Subject, RxMe } from './rxme';
import { LogEntry } from './log';
import { ErrorContainer, CompleteMsg, DoneMsg } from './messages';

export type MatchReturn = Subject | boolean | void;

export interface MatcherCallback {
  (data: RxMe, sub: Subject): MatchReturn;
}

export interface LogEntryMatcherCallback {
  (lm: LogEntry, sub?: Subject): MatchReturn;
}

export class Matcher {
  public static TypeOf<T>(typeOf: string, cb: (lm: T, sub?: Subject) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      if (typeof(rxme.data) == typeOf) {
        return cb(rxme.data, sub);
      }
      return false;
    };
  }

  public static Number(cb: (lm: number, sub?: Subject) => MatchReturn): MatcherCallback {
    return this.TypeOf('number', cb);
  }

  public static Boolean(cb: (lm: boolean, sub?: Subject) => MatchReturn): MatcherCallback {
    return this.TypeOf('boolean', cb);
  }

  public static String(cb: (lm: string, sub?: Subject) => MatchReturn): MatcherCallback {
    return this.TypeOf('string', cb);
  }

  public static WildCard(cb: MatcherCallback): MatcherCallback {
    return cb;
  }

  public static Error(cb: (err: any, sub?: Subject) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      if (rxme.data instanceof ErrorContainer) {
        return cb(rxme.data.error, sub);
      }
      return false;
    };
  }

  public static Done(cb: (res: boolean, sub?: Subject) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      console.log('Done:', rxme);
      if (rxme.data instanceof DoneMsg) {
        return cb(rxme.data.result, sub);
      }
      return false;
    };
  }

  public static Complete(cb: (sub?: Subject) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      if (rxme.data instanceof CompleteMsg) {
        return cb(sub);
      }
      return false;
    };
  }

  public static Type<T>(typ: any, cb: (t: T, sub?: Subject) => MatchReturn): MatcherCallback {
    return (rxme, sub) => {
      if (rxme.data instanceof typ) {
        return cb(rxme.data, sub);
      }
      return false;
    };
  }

  public static Log(cb: LogEntryMatcherCallback): MatcherCallback {
    return (rxme, sub) => {
      const ret = rxme.data instanceof LogEntry;
      if (ret) {
        return cb(rxme.data, sub);
      }
      return false;
    };
  }

}
