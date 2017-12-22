import { RxMe } from './rxme';

import * as Log from './log';
import { ErrorContainer, CompleteMsg } from './messages';

export class DoneMsg {
  public readonly done: boolean;
  constructor(result: boolean) {
    this.done = result;
  }
}

export class Msg {
  public static Number(nr: number): RxMe {
    return new RxMe(nr);
  }

  public static Boolean(is: boolean): RxMe {
    return new RxMe(is);
  }

  public static Done(result: boolean): RxMe {
    return new RxMe(new DoneMsg(result));
  }

  public static Complete(): RxMe {
    return new RxMe(new CompleteMsg());
  }

  public static Type<T>(t: T): RxMe {
    return new RxMe(t);
  }

  public static Log(level: Log.LogLevel, ...arg: any[]): RxMe {
    return Log.Log(level, arg);
  }

  public static LogInfo(...arg: any[]): RxMe {
    return Log.LogInfo(arg);
  }

  public static LogWarn(...arg: any[]): RxMe {
    return Log.LogWarn(arg);
  }

  public static LogDebug(...arg: any[]): RxMe {
    return Log.LogDebug(arg);
  }

  public static LogError(...arg: any[]): RxMe {
    return Log.LogError(arg);
  }

  public static Error(...arg: any[]): RxMe {
    return new RxMe(new ErrorContainer(arg.length == 1 ? arg[0] : arg));
  }
}

export default Msg;
