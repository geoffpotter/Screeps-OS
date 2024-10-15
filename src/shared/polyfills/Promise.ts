import { queueMicroTask } from "./tasks";
import { profiler, profile, profileClass } from "shared/utils/profiling/profiler";
import { setTimeout } from "shared/polyfills/setTimeout";

import Logger from "shared/utils/logger";
let logger = new Logger("Promise");
logger.color = COLOR_GREEN
// logger.enabled = false;
//Describe to TS how I want my types structured, hopefully this will keep me from fucking up.

//Main types
type Resolvable<T> = thenable<T> | T;
type Executor<T> = (
  resolve: ResolveHandler<T>,
  reject: RejectHandler
) => void;
interface thenable<T> {
  then<TResult extends Resolvable<T>>(onSuccess: OnSuccess<T, TResult>, onFailure: OnFailure<TResult>): Resolvable<TResult>;
  catch?<CResult extends Resolvable<T>>(onFailure: OnFailure<CResult>): Resolvable<CResult>;
  finally?<FResult extends Resolvable<T>>(onSuccess: OnSuccess<T, FResult>): Resolvable<FResult>;
}

// ((value: void) => TResult | PromiseLike<TResult>) | null | undefined
// Type '((value: TResult) => TResult1 | PromiseLike<TResult1>) | null | undefined' is not assignable to type 'OnSuccess<TResult, TResult2> | undefined'.
//Type 'null' is not assignable to type 'OnSuccess<TResult, TResult2> | undefined'.

//'<TResult1 = string, TResult2 = never>(onfulfilled?: ((value: string) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<...>) | null | undefined) => Promise<...>' is not assignable to type '<TResult>(onSuccess: OnSuccess<string, TResult>, onFailure: OnFailure<TResult>) => Resolvable<TResult>'.
//callback types
type OnSuccess<T, TResult extends Resolvable<T>> = ((value: T) => Resolvable<TResult> | undefined | void);
type OnFailure<TResult> = (reason: any) => Resolvable<TResult> | undefined | void;
type ResolveHandler<T> = (value?: Resolvable<T>) => void;
type RejectHandler = (reason: any) => void;

export function isThenable(obj:any) {
  return (typeof obj === "object") && typeof obj.then === "function";
}
export function asThenable<T>(obj:any):thenable<T>|false {
  if( (typeof obj === "object") && typeof obj.then === "function") {
    return obj;
  }
  return false;
}

enum PromiseState {
  Pending,
  Resolved,
  Rejected
}

// declare global {
//   interface Promise<T> {
//     then<TResult extends Resolvable<T>>(onSuccess: OnSuccess<T, TResult>, onFailure: OnFailure<TResult>): Resolvable<TResult>
//   }
// }


export default class PromisePoly<T> implements thenable<T> {
  //static functions
  static resolve<T>(value: T) {
    return new PromisePoly<T>((resolve) => {
      resolve(value);
    })
  }
  static reject<T>(value: T) {
    return new PromisePoly<T>((_, reject) => {
      reject(value);
    })
  }


  private callbacks: Function[] = [];
  private state = PromiseState.Pending;
  public reasonOrValue: any;

  constructor(executor: Executor<T>) {
    // this.profilerContext = profiler.stack.slice();
    let startContext = profiler.stack.slice();
    try {
      executor(this.resolveHandler.bind(this), this.rejectHandler.bind(this));
    } catch (e) {
      logger.error("error in executor", e, (e as Error).stack);
      this.rejectHandler(e);
    }
    profiler.pauseContext();
    profiler.resumeContext(startContext);
  }

  public then<TResult extends Resolvable<T>>(onSuccess?: OnSuccess<T, TResult>, onFailure?: OnFailure<TResult>): PromisePoly<TResult> {
    let thenProfilerContext = profiler.stack.slice();

    let thenPromise = new PromisePoly<TResult>((resolve, reject) => {
      this.callbacks.push(() => {
        const runCallback = (callback: Function | undefined, value: any) => {
          let oldContext = profiler.pauseContext();
          profiler.resumeContext(thenProfilerContext);

          try {
            const result = callback ? callback(value) : value;
            this.handleCallbackResult(result, resolve, reject);
          } catch (e) {
            logger.error("error in then callback", e, (e as Error).stack);
            reject(e);
          } finally {
            profiler.pauseContext();
            // profiler.resumeContext(oldContext);
          }
        };

        if (this.state === PromiseState.Resolved) {
          runCallback(onSuccess, this.reasonOrValue);
        } else if (this.state === PromiseState.Rejected) {
          runCallback(onFailure, this.reasonOrValue);
        }
      });
    });

    if (this.state !== PromiseState.Pending) {
      this.resolvePromise();
    }

    return thenPromise;
  }

  public catch<CResult extends Resolvable<T>>(onFailure: OnFailure<CResult>): PromisePoly<CResult> {
    return this.then<CResult>(undefined, onFailure);
  }

  public finally<FResult extends Resolvable<T>>(onSuccess: OnSuccess<T, FResult>): PromisePoly<FResult> {
    let finallyFunc = (value:T ): void => {
      onSuccess(value);
    }
    return this.then<FResult>(finallyFunc, (reason) => {
      finallyFunc(reason);
      return reason;
    });
  }

  private handleCallbackResult<TResult>(result: Resolvable<TResult>, resolve: ResolveHandler<TResult>, reject: RejectHandler) {
    if (result instanceof PromisePoly) {
      result.then(resolve, reject);
    } else if (isThenable(result)) {
      const thenable = asThenable<TResult>(result);
      if (thenable) {
        thenable.then(resolve, reject);
      }
    } else {
      queueMicroTask(() => {
        resolve(result as TResult);
      });
    }
  }

  private resolveHandler<T>(value?: Resolvable<T>): void {
    if (this.state != PromiseState.Pending) return;
    this.state = PromiseState.Resolved;
    this.reasonOrValue = value;
    this.resolvePromise();
  }

  private rejectHandler<T>(reason: any): void {
    logger.error("rejectHandler", reason, (reason as Error).stack);
    if (this.state != PromiseState.Pending) return;
    this.state = PromiseState.Rejected;
    this.reasonOrValue = reason;
    this.resolvePromise();
  }

  private resolvePromise() {
    if (this.state == PromiseState.Pending) return;

    let nextCallback: Function | undefined;
    while (nextCallback = this.callbacks.shift()) {
      let callback = nextCallback;
      queueMicroTask(() => {
          callback();
      });
    }
  }
}

//@ts-ignore  Override global.Promise with our PromisePoly
global.Promise = PromisePoly


