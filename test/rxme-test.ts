import { assert } from 'chai';
import * as RxMe from '../lib/rxme';

class MyTest {
  public readonly test: number;
  public readonly objectId: string;

  constructor(test: number = 77) {
    this.test = test;
    this.objectId = ('' + (1000000000 + ~~(Math.random() * 1000000000))).slice(1);
  }
}

describe('rxme', () => {

  it('sync', () => {
    // const x = new RxMe.Error('');
    const inp = new RxMe.Subject<Number>(RxMe.Match.NUMBER);
    const out = new RxMe.Subject<Number>(RxMe.Match.NUMBER);
    let count = 0;
    let wcount = 0;
    out.passTo().wildCard((obs, any) => {
      // console.log(`[${obs.objectId}]:out:wildcard:`);
      wcount++;
      return false;
    }).matchError((obs, err) => {
      // console.log(`[${obs.objectId}]:out:matchError`);
      assert.equal(err._error, 'Hello World');
      count++;
      return false;
      // console.log(obs);
    }).matchComplete((obs, complete) => {
      // console.log(`[${obs.objectId}]:out:matchCompleted`);
      count++;
      return false;
    }).matchLogMsg((obs, log) => {
      // console.log(`[${obs.objectId}]:out:matchLogMsg`);
      assert.equal(log.level, 'hello');
      assert.deepEqual(log.parts, ['world']);
      count++;
      return false;
      // console.log(obs);
    }).matchType<MyTest>(MyTest, (obs, data) => {
      // console.log(`[${obs.objectId}]:out:match:MyTest`);
      assert.equal(data.test, 77);
      count++;
      return false;
    }).matchType(RxMe.Match.NUMBER, (obs, data) => {
      // console.log(`[${obs.objectId}]:out:match:Number`);
      assert.equal(data, 42);
      count++;
      return false;
    });

    // console.log(`sync:`, inp.objectId, out.objectId);
    let completed = 0;
    inp.passTo(out)
      .matchError((obs, err) => {
        // console.log(`[${obs.objectId}]:inp:matchError`);
        count++;
        return err._error == 'Start World';
      })
      .matchComplete((obs, complete) => {
        // console.log(`[${obs.objectId}]:inp:matchCompleted`);
        count++;
        return true;
      })
      .matchLogMsg((obs, log) => {
        // console.log(`[${obs.objectId}]:inp:matchLogMsg`);
        count++;
        return log.level == 'start';
      })
      .matchType<MyTest>(MyTest, (obs, data) => {
        // console.log(`[${obs.objectId}]:inp:match:MyTest`);
        count++;
        return data.test == 88;
      })
      .completed((obs, data) => {
        return !!++completed;
      });
    inp.next(RxMe.error('Start World'));
    inp.next(RxMe.logMsg('start', 'world'));
    inp.next(RxMe.data(new MyTest(88)));

    inp.next(RxMe.data(42));
    inp.next(RxMe.data(42));
    inp.next(RxMe.data(new MyTest()));
    inp.next(RxMe.logMsg('hello', 'world'));
    inp.next(RxMe.error('Hello World'));
    inp.complete();
    assert.equal(9, completed, 'Total Completed');
    assert.equal(6, wcount, 'Total WCount');
    assert.equal(13, count, 'Total Count');
  });

  it('async', async () => {
    const inp = new RxMe.Subject<MyTest>(MyTest);
    const out = new RxMe.Subject<MyTest>(MyTest);
    return Promise.all([
      new Promise((rs, rj) => {
        let completed = 0;
        let ocount = 0;
        let wcount = 0;
        out.passTo().wildCard((obs, any) => {
          // console.log(`[${obs.objectId}]:out:wildcard:`, any);
          wcount++;
          setTimeout(() => obs.done(false), 1);
          return obs;
        }).matchError((obs, err) => {
          // console.log(`[${obs.objectId}]:matchError`);
          try {
            assert.equal(err._error, 'Hello World');
          } catch (e) {
            rj(e);
          }
          ocount++;
          setTimeout(() => obs.done(true), 1);
          return obs;
          // console.log(obs);
        }).matchComplete((obs, log) => {
          // console.log(`[${obs.objectId}]:matchComplete`);
          ocount++;
          setTimeout(() => obs.done(true), 1);
          return obs;
          // console.log(obs);
        }).matchLogMsg((obs, log) => {
          // console.log(`[${obs.objectId}]:matchLogMsg`);
          try {
            assert.equal(log.level, 'hello');
            assert.deepEqual(log.parts, ['world']);
          } catch (e) {
            rj(e);
          }
          ocount++;
          setTimeout(() => obs.done(true), 1);
          return obs;
          // console.log(obs);
        }).match((obs, data) => {
          // console.log(`[${obs.objectId}]:match:MyTest`);
          try {
            assert.equal(data.test, 77);
          } catch (e) {
            rj(e);
          }
          ocount++;
          setTimeout(() => obs.done(true), 1);
          return obs;
        }).matchType<number>(RxMe.Match.NUMBER, (obs, data) => {
          // console.log(`[${obs.objectId}]:match:Number`);
          try {
            assert.equal(data, 42);
          } catch (e) {
            rj(e);
          }
          ocount++;
          setTimeout(() => obs.done(true), 1);
          return obs;
        }).completed((obs, data) => {
          if (++completed >= 6) {
            try {
              assert.equal(6, completed, 'O-Total Completed');
              assert.equal(6, wcount, 'O-Total WCount');
              assert.equal(6, ocount, `O-Total Count:${ocount}:${completed}`);
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
        inp.passTo(out)
          .matchError((obs, err) => {
            // console.log(`[${obs.objectId}]:inp:matchError:${JSON.stringify(err)}`);
            icount++;
            setTimeout(() => obs.done(err._error == 'Start World'), 1);
            return obs;
          })
          .matchComplete((obs, log) => {
            // console.log(`[${obs.objectId}]:inp:matchLogMsg:${JSON.stringify(log)}`);
            icount++;
            setTimeout(() => obs.done(true), 1);
            return obs;
          })
          .matchLogMsg((obs, log) => {
            // console.log(`[${obs.objectId}]:inp:matchLogMsg:${JSON.stringify(log)}`);
            icount++;
            setTimeout(() => obs.done(log.level == 'start'), 1);
            return obs;
          })
          .matchType<MyTest>(MyTest, (obs, data) => {
            // console.log(`[${obs.objectId}]:inp:match<MyTest>:${JSON.stringify(data)}`);
            icount++;
            setTimeout(() => obs.done(data.test == 88), 1);
            return obs;
          })
          .completed((obs, data) => {
            if (++completed >= 9) {
              try {
                assert.equal(7, icount, `I-Total Count:${icount}:${completed}`);
                assert.equal(9, completed, 'I-Total Completed');
                rs();
              } catch (e) {
                rj(e);
              }
            }
            return !!completed;
          });
        // console.log(`[${inp.objectId}]:inp:preNext`);
        inp.next(RxMe.error('Start World'));
        inp.next(RxMe.logMsg('start', 'world'));
        inp.next(RxMe.data(new MyTest(88)));

        inp.next(RxMe.data(42));
        inp.next(RxMe.data(42));
        inp.next(RxMe.data(new MyTest()));
        inp.next(RxMe.logMsg('hello', 'world'));
        inp.next(RxMe.error('Hello World'));
        inp.complete();
      })]);
  });

});
