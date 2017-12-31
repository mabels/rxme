import { assert } from 'chai';
import * as RxMe from '../lib/rxme';
import { Matcher } from '../lib/matcher';
import { Msg } from '../lib/msg';
import { Log, LogLevel, LogDebug, LogInfo, LogError, LogWarn } from '../lib/log';

class MyTest {
  public readonly test: number;
  public readonly objectId: string;

  constructor(test: number = 77) {
    this.test = test;
    this.objectId = ('' + (1000000000 + ~~(Math.random() * 1000000000))).slice(1);
  }
}

describe('rxme', () => {

  it('logMsg', () => {
    const subject = new RxMe.Subject();
    const match = ['debug', 'info', 'error', 'warn'];
    let idx = 0;
    subject.match(Matcher.Log((lm) => {
      assert.equal(lm.level, match[idx]);
      assert.deepEqual(lm.parts, [match[idx]]);
      idx++;
      return true;
    }));
    subject.next(LogDebug('debug'));
    subject.next(LogInfo('info'));
    subject.next(LogError('error'));
    subject.next(LogWarn('warn'));
  });

  it('test-subject-obeserver', () => {
    const subject = new RxMe.Subject();
    let count = 0;
    RxMe.Observable.create((obs: RxMe.Observer) => {
      count++;
      subject.passTo(obs);
    }).passTo(subject);
    assert.equal(count, 1);
  });

  it('test-observable', () => {
    const inp = new RxMe.Subject();
    let icount = 0;
    let count = 0;
    inp.passTo().match(Matcher.Number(nr => {
      icount++;
      assert.equal(count, nr);
      return false;
    }));
    const rxo = RxMe.Observable.create((obs: RxMe.Observer) => {
      obs.next(Msg.Number(++count));
      obs.next(Msg.Number(++count));
    });
    assert.equal(count, 0);
    let ocount = 0;
    rxo.match(Matcher.Number(nr => {
      ocount++;
      assert.equal(count, nr);
      return false;
    })).passTo(inp);
    // console.log(`>>>${count}:${icount}:${ocount}`);
    assert.equal(icount, 2, 'icount');
    assert.equal(count, 2, 'count');
    assert.equal(ocount, 2, 'ocount');
  });

  it('sync-multiple-unmaskable-done', () => {
    const calllog: string[] = [];
    const outs = [0, 1].map(i => {
      return (new RxMe.Subject()).passTo()
        .match(Matcher.WildCard((d) => {
          calllog.push(`out.wildcard:${i}`);
          // console.log(d);
          return true;
        })).match(Matcher.Boolean(result => {
          // meno
          calllog.push(`out:done:${i}`);
          return true;
        })).match(Matcher.Complete(() => {
          calllog.push(`out:complete:${i}`);
          return true;
        })).completed(d => {
          calllog.push(`out:completed:${i}`);
          return false;
        });
    });

    const inp = new RxMe.Subject();
    inp.passTo(outs).match(Matcher.WildCard((d) => {
      calllog.push(`inp:wildcard:${JSON.stringify(d.data)}`);
      // console.log(d);
      return false;
    })).match(Matcher.Boolean(result => {
      calllog.push(`inp:done:${result}`);
      return result;
    })).match(Matcher.Complete(() => {
      calllog.push(`inp:complete`);
      return true;
    })).completed(d => {
      calllog.push(`inp:completed`);
    });
    inp.next(Msg.Boolean(false));
    calllog.push('---1---');
    inp.next(Msg.Boolean(true));
    calllog.push('---2---');
    inp.next(Msg.Boolean(false));
    calllog.push('---3---');
    inp.complete();
    calllog.push('---4---');
    assert.deepEqual(calllog, [
      'inp:wildcard:false',
      'inp:done:false',
      'out.wildcard:0',
      'out:done:0',
      'out:completed:0',
      'out.wildcard:1',
      'out:done:1',
      'out:completed:1',
      'inp:completed',
      '---1---',
      'inp:wildcard:true',
      'inp:done:true',
      // 'out.wildcard:0',
      // 'out:done:0',
      // 'out:completed:0',
      // 'out.wildcard:1',
      // 'out:done:1',
      // 'out:completed:1',
      'inp:completed',
      '---2---',
      'inp:wildcard:false',
      'inp:done:false',
      'out.wildcard:0',
      'out:done:0',
      'out:completed:0',
      'out.wildcard:1',
      'out:done:1',
      'out:completed:1',
      'inp:completed',
      '---3---',
      'inp:wildcard:{}',
      'inp:complete',
      // 'out.wildcard:0',
      // 'out:complete:0',
      // 'out:completed:0',
      // 'out.wildcard:1',
      // 'out:complete:1',
      // 'out:completed:1',
      'inp:completed',
      '---4---'
    ]);
  });

  it('stop-complete-pass', () => {
    return new Promise((rs, rj) => {
      const inp = new RxMe.Subject();
      const out = new RxMe.Subject();
      const results = [42, 45];
      out.match(RxMe.Matcher.Complete(() => {
        console.log('out-match-complete');
        try {
          assert.isOk(true);
          rs();
        } catch (e) {
          rj(e);
        }
      })).match(RxMe.Matcher.Number(nr => {
        console.log('out-match-number', nr);
        try {
          assert.equal(results.shift(), nr);
          if (results.length == 0) {
            out.complete();
          }
        } catch (e) {
          rj(e);
        }
      })).passTo();
      inp.match(RxMe.Matcher.Complete(() => {
        console.log('inp-match-complete');
        out.next(RxMe.Msg.Number(45));
        return true;
      })).passTo(out);
      inp.next(RxMe.Msg.Number(42));
      inp.complete();
    });
  });

  it('pass-completed-match', () => {
    return new Promise((rs, rj) => {
      const inp = RxMe.Observable.create(obs => {
        obs.next(RxMe.Msg.Number(42));
        obs.complete();
        console.log('inp-complete');
      });
      const out = new RxMe.Subject();
      out.match(RxMe.Matcher.Complete(() => {
        console.log('match-complete');
        try {
          assert.isOk(true);
          rs();
        } catch (e) {
          rj(e);
        }
      })).match(RxMe.Matcher.Number(nr => {
        console.log('match-number');
        try {
          assert.equal(42, nr);
        } catch (e) {
          rj(e);
        }
      })).passTo();
      inp.passTo(out);
    });
  });

  it('pass-completed-subscribe', () => {
    return new Promise((rs, rj) => {
      const inp = RxMe.Observable.create(obs => {
        obs.next(RxMe.Msg.Number(42));
        obs.complete();
        console.log('inp-complete');
      });
      const out = new RxMe.Subject();
      const result = [
        (a: any) => assert.equal(42, a.data),
        (a: any) => assert.isTrue((a.data instanceof RxMe.CompleteMsg))
      ];
      out.subscribe((a) => {
        console.log('subscribe-rxme', a);
        try {
          result.shift()(a);
        } catch (e) {
          rj(e);
        }
      }, (e) => {
        rj(e);
      }, () => {
        console.log('subscribe-complete');
        try {
          assert.isOk(true);
          rs();
        } catch (e) {
          rj(e);
        }
      });
      inp.passTo(out);
    });
  });

  it('sync', () => {
    // const x = new RxMe.Error('');
    const inp = new RxMe.Subject();
    const out = new RxMe.Subject();
    let count: string[] = [];
    let wcount = 0;
    out.match(Matcher.WildCard(rxme => {
      // console.log(`[${rxme.objectId}]:out:wildcard:`, rxme);
      wcount++;
      return false;
    })).match(Matcher.Error(err => {
      // console.log(`[${obs.objectId}]:out:matchError`);
      assert.equal(err, 'Hello World');
      count.push('out:Error');
      return false;
      // console.log(obs);
    })).match(Matcher.Complete(() => {
      // console.log(`[${obs.objectId}]:out:matchCompleted`);
      count.push('out:Complete');
      return false;
    })).match(Matcher.Log((log) => {
      // console.log(`[${obs.objectId}]:out:matchLogMsg`);
      assert.equal(log.level, LogLevel.INFO, `${JSON.stringify(log)}`);
      assert.deepEqual(log.parts, ['world']);
      count.push('out:Log');
      return false;
      // console.log(obs);
    })).match(Matcher.Type(MyTest, (data: MyTest) => {
      // console.log(`[${obs.objectId}]:out:match:MyTest`);
      assert.equal(data.test, 77);
      count.push('out:Type');
      return false;
    })).match(Matcher.Number(data => {
      // console.log(`[${obs.objectId}]:out:match:Number`);
      assert.equal(data, 42);
      count.push('out:Number');
      return false;
    })).passTo();

    // console.log(`sync:`, inp.objectId, out.objectId);
    let completed = 0;
    inp.passTo(out)
      .match(Matcher.Error(err => {
        // console.log(`[${obs.objectId}]:inp:matchError`);
        count.push('inp:Error');
        return err == 'Start World';
      }))
      .match(Matcher.Complete(() => {
        // console.log(`[${obs.objectId}]:inp:matchCompleted`);
        count.push('inp:Complete');
        return true;
      }))
      .match(Matcher.Log(log => {
        // console.log(`[${obs.objectId}]:inp:matchLogMsg`);
        count.push('inp:Log');
        return log.level == LogLevel.WARN;
      }))
      .match(Matcher.Type<MyTest>(MyTest, (data) => {
        // console.log(`[${obs.objectId}]:inp:match:MyTest`);
        count.push('inp:Type');
        return data.test == 88;
      }))
      .completed((obs, data) => {
        return !!++completed;
      });
    inp.next(Msg.Error('Start World'));
    inp.next(Log(LogLevel.WARN, 'world'));
    inp.next(Msg.Type(new MyTest(88)));

    inp.next(Msg.Number(42));
    inp.next(Msg.Number(42));
    inp.next(Msg.Type(new MyTest()));
    inp.next(Log(LogLevel.INFO, 'world'));
    inp.next(Msg.Error('Hello World'));
    inp.complete();
    assert.equal(9, completed, 'Total Completed');
    assert.equal(5, wcount, 'Total WCount');
    assert.equal(12, count.length, `Total Count:${JSON.stringify(count)}`);
  });

  it('async', async () => {
    const counterPass = { true: 0, false: 0 };
    function countPass(b: boolean): boolean {
      if (b) { counterPass.true++; }
      if (!b) { counterPass.false++; }
      return b;
    }
    const inp = new RxMe.Subject();
    const out = new RxMe.Subject();
    return Promise.all([
      new Promise((rs, rj) => {
        let completed = 0;
        let ocount = 0;
        let wcount = 0;
        out.passTo().match(Matcher.WildCard((any, cpl) => {
          // console.log(`[${any.objectId}]:out:wildcard:`, any);
          wcount++;
          setTimeout(() => cpl.stopPass(false), 1);
          return cpl;
        })).match(Matcher.Error((err, cpl) => {
          // console.log(`[${obs.objectId}]:matchError`);
          try {
            assert.equal(err, 'Hello World');
          } catch (e) {
            rj(e);
          }
          ocount++;
          setTimeout(() => cpl.stopPass(true), 1);
          return cpl;
          // console.log(obs);
        })).match(Matcher.Complete((cpl) => {
          // console.log(`[${obs.objectId}]:matchComplete`);
          ocount++;
          setTimeout(() => cpl.stopPass(true), 1);
          return cpl;
          // console.log(obs);
        })).match(Matcher.Log((log, cpl) => {
          // console.log(`[${obs.objectId}]:matchLogMsg`);
          try {
            assert.equal(log.level, LogLevel.DEBUG);
            assert.deepEqual(log.parts, ['debug-world']);
          } catch (e) {
            rj(e);
          }
          ocount++;
          setTimeout(() => cpl.stopPass(true), 1);
          return cpl;
          // console.log(obs);
        })).match(Matcher.Type(MyTest, (data: MyTest, cpl) => {
          // console.log(`[${obs.objectId}]:match:MyTest`);
          try {
            assert.equal(data.test, 77);
          } catch (e) {
            rj(e);
          }
          ocount++;
          setTimeout(() => cpl.stopPass(true), 1);
          return cpl;
        })).match(Matcher.Number((data, cpl) => {
          // console.log(`[${obs.objectId}]:match:Number`);
          try {
            assert.equal(data, 42);
          } catch (e) {
            rj(e);
          }
          ocount++;
          setTimeout(() => cpl.stopPass(true), 1);
          return cpl;
        })).completed((obs, data) => {
          // console.log('out:completed', completed, obs);
          if (++completed >= 5) {
            try {
              assert.equal(5, ocount, `O-Total Count:${wcount}:${ocount}:${completed}`);
              assert.equal(5, completed, 'O-Total Completed');
              assert.equal(5, wcount, 'O-Total WCount');
              rs();
            } catch (e) {
              rj(e);
            }
          }
          return !!completed;
        });
      }), new Promise((rs, rj) => {
        // console.log(`[${out.objectId}]:out:preNext`);

        let completed = 0;
        let icount = 0;
        let ccount = 0;
        inp.passTo(out)
          .match(RxMe.Matcher.Complete(() => {
            ++ccount;
          }))
          .match(Matcher.Error((err, cpl, rxme) => {
            // console.log(`[${rxme.objectId}]:inp:matchError:${JSON.stringify(err)}`);
            icount++;
            setTimeout(() => cpl.stopPass(countPass(err == 'Start World')), 1);
            return cpl;
          }))
          .match(Matcher.Log((log, cpl) => {
            // console.log(`[${obs.objectId}]:inp:matchLogMsg:${JSON.stringify(log)}`);
            icount++;
            setTimeout(() => cpl.stopPass(countPass(false)), 1);
            return cpl;
          }))
          .match(Matcher.Log((log, cpl, rxme) => {
            // console.log(`[${rxme.objectId}]:inp:matchLogMsg:${JSON.stringify(log)}`);
            icount++;
            setTimeout(() => cpl.stopPass(countPass(log.level == LogLevel.INFO)), 1);
            return cpl;
          }))
          .match(Matcher.Type(MyTest, (data: MyTest, cpl) => {
            // console.log(`[${obs.objectId}]:inp:match<MyTest>:${JSON.stringify(data)}`);
            icount++;
            setTimeout(() => cpl.stopPass(countPass(data.test == 88)), 1);
            return cpl;
          }))
          .completed((obs, data) => {
            // console.log('inp:completed', completed, obs);
            if (completed == 7) {
              setTimeout(() => {
                inp.complete();
                // console.log('imp-completed');
              }, 5);
            }
            if (++completed >= 9) {
              try {
                assert.equal(8, icount, `I-Total Count:${icount}:${completed}`);
                assert.equal(counterPass.false, 5, `count pass false:${JSON.stringify(counterPass)}`);
                assert.equal(counterPass.true, 3, `count pass true:${JSON.stringify(counterPass)}`);
                assert.equal(9, completed, 'I-Total Completed');
                assert.equal(1, ccount, 'I-Total Ccount');
                rs();
              } catch (e) {
                rj(e);
              }
            }
            return !!completed;
          });
        // console.log(`[${inp.objectId}]:inp:preNext`);
        inp.next(Msg.Error('Start World'));
        inp.next(Msg.Log(LogLevel.INFO, 'info-world'));
        inp.next(Msg.Type(new MyTest(88)));
        inp.next(Msg.Number(42));

        inp.next(Msg.Number(42));
        inp.next(Msg.Type(new MyTest(77)));
        inp.next(Msg.Log(LogLevel.DEBUG, 'debug-world'));
        inp.next(Msg.Error('Hello World'));
        // inp.complete();
      })]);
  });

});
