import { assert } from 'chai';
import * as RxMe from '../lib/rxme';

class MyTest {
  public test: number = 77;
}

describe('rxme', () => {

  it('passthrough', () => {
    const inp = new RxMe.Subject<Number>();
    const out = new RxMe.Subject<Number>();
    let count = 0;
    out.subscribe(obs => {
      if (obs.isError()) {
          assert.equal(obs.asError()._error, 'Hello World');
          count++;
          // console.log(obs);
      }
      if (obs.isLogMsg()) {
          assert.equal(obs.asLogMsg().level, 'hello');
          assert.deepEqual(obs.asLogMsg().parts, ['world']);
          count++;
          // console.log(obs);
      }
      // console.log(obs, obs.asKind() instanceof Number, typeof obs.asKind(), typeof Number);
      if (obs.isKind(MyTest)) {
        assert.equal(obs.asKind<MyTest>().test, 77);
        count++;
      }
      if (obs.isKind(RxMe.Match.NUMBER)) {
        if (count == 0) {
          assert.equal(obs.asKind<Number>(), 42);
        } else {
          assert.equal(obs.asKind<Number>(), 43);
        }
        count++;
      }
    });

    inp.subscribe(obs => obs.passthrough(out));
    inp.next(RxMe.data(42));
    inp.next(RxMe.data(43));
    inp.next(RxMe.data(new MyTest()));
    inp.next(RxMe.logMsg('hello', 'world'));
    inp.next(RxMe.error('Hello World'));
    inp.complete();
    assert.equal(5, count);
  });

  it('forward', () => {
    const inp = new RxMe.Subject<Number>();
    const out = new RxMe.Subject<Number>();
    let count = 0;
    out.subscribe(obs => {
      if (obs.isError()) {
          assert.equal(obs.asError()._error, 'Hello World');
          count++;
          return;
      }
      if (obs.isLogMsg()) {
          assert.equal(obs.asLogMsg().level, 'hello');
          assert.deepEqual(obs.asLogMsg().parts, ['world']);
          count++;
          return;
      }
      count++;
    });

    inp.subscribe(obs => {
      if (!obs.forward(out)) {
        if (obs.isKind(MyTest)) {
          assert.equal(obs.asKind<MyTest>().test, 77);
        } else {
          if (count == 0) {
            assert.equal(obs.asKind<Number>(), 42);
          } else {
            assert.equal(obs.asKind<Number>(), 43);
          }
        }
          count++;
      }
    });
    inp.next(RxMe.data(42));
    inp.next(RxMe.data(43));
    inp.next(RxMe.data(new MyTest()));
    inp.next(RxMe.logMsg('hello', 'world'));
    inp.next(RxMe.error('Hello World'));
    inp.complete();
    assert.equal(5, count);
  });

});
