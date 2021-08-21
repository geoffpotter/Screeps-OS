import { queueMicroTask } from "./tasks";
import { profiler, profile } from "profiler";

//Describe to TS how I want my types structured, hopefully this will keep me from fucking up.

//Main types
type Resolvable<T> = thenable<T> | T;
type Executor<T> = (
  resolve: ResolveHandler<T>,
  reject: RejectHandler<T>
) => void;
interface thenable<T> {
  then<TResult>(onSuccess?: OnSuccess<T, TResult>, onFailure?: OnFailure<TResult>): Resolvable<TResult>;
  catch?<CResult>(onFailure: OnFailure<CResult>): Resolvable<CResult>;
  finally?<FResult>(onSuccess: OnSuccess<T, FResult>): Resolvable<FResult>;
}

//callback types
type OnSuccess<T, TResult> = (value: T) => Resolvable<TResult>;
type OnFailure<TResult> = (reason: any) => Resolvable<TResult>;
type ResolveHandler<T> = (value?: Resolvable<T>) => void;
type RejectHandler<T> = (reason: any) => void;

enum PromiseState {
  Pending,
  Resolved,
  Rejected
}




export class Promise<T> implements thenable<T> {
  //static functions
  static resolve<T>(value: T) {
    return new Promise<T>((resolve) => {
      resolve(value);
    })
  }
  static reject<T>(value: T) {
    return new Promise<T>((_, reject) => {
      reject(value);
    })
  }


  private callbacks: Function[] = [];
  private state = PromiseState.Pending;
  public reasonOrValue: any;
  constructor(executor: Executor<T>) {
    //Run resolver immediatly
    let lastProfiledName = profiler.getCurrentProfileTarget();
    if (!lastProfiledName) {
      lastProfiledName = "global"
    }
    profiler.startCall("Promise:construct:" + lastProfiledName)
    executor(this.resolveHandler.bind(this), this.rejectHandler.bind(this));
    profiler.endCall("Promise:construct:" + lastProfiledName)
  }
  /**
  * Calls onSuccess or onFailure when this promise object is resolved or rejected, respectivly.
  * @param onSuccess handler for when promise is resolved, can return a thenable
  * @param onFailure handler for when promise is rejected, can return a thenable
  * @returns {Promise} New Promise object that will resolve after the promsie returned from the called handler
  */
  public then<TResult>(onSuccess?: OnSuccess<T, TResult>, onFailure?: OnFailure<TResult>): Promise<TResult> {
    let lastProfiledName = profiler.getCurrentProfileTarget();
    if (!lastProfiledName) {
      lastProfiledName = "global"
    }
    profiler.startCall("Promise:then")
    //console.log("then called", this.state, lastProfiledName)
    let thenPromise = new Promise<TResult>((resolve, reject) => {
      //make a callback for later.
      this.callbacks.push(() => {
        profiler.startCall("Promise:callback:" + lastProfiledName);
        //by now the promise should be resolved.
        //console.log("handle this then function, pstate:", this.state, this.reasonOrValue, typeof onSuccess);
        try {
          // //no wait, need to call onSuccess first, then handle the resolve algo
          let callbackResult: Resolvable<TResult> | undefined = undefined;
          try {
            if (this.state == PromiseState.Resolved) {
              if (onSuccess)
                callbackResult = onSuccess(this.reasonOrValue);
              else
                callbackResult = this.reasonOrValue;

            } else if (this.state == PromiseState.Rejected) {
              if (onFailure)
                callbackResult = onFailure(this.reasonOrValue);
              else
                callbackResult = this.reasonOrValue
            } else {
              throw new TypeError("Processing callbacks on unresolved Promise, that seems wrong..")
            }

          } catch (e2) {
            reject(e2);
          }



          // //ok, og promise has resolved, callback called.
          // //need to do promise resolve algo with result.
          //@ts-ignore
          if (this === callbackResult) {
            throw new TypeError("A promsie can't resolve to itself")
          }
          if (callbackResult instanceof Promise) {
            //console.log("resolving promise for then with another promise")
            while ((callbackResult instanceof Promise) && callbackResult.state !== PromiseState.Pending) {
              //console.log("moving up a level to an unresolved promise, or the end, old value:", JSON.stringify(callbackResult))
              //console.log("weird", callbackResult.reasonOrValue.reasonOrValue)
              callbackResult = callbackResult.reasonOrValue;
            }
            //console.log("this",JSON.stringify(this))
            //console.log("res", JSON.stringify(callbackResult))
            //console.log(this == callbackResult)
            //if they returned a promise, adopt state of it
            //@ts-ignore
            callbackResult.then(resolve, reject);// is that it??
            //@ts-ignore
          } else if ((typeof callbackResult === "object" || typeof callbackResult === "function") && typeof callbackResult.next === "function") {
            //console.log("resolving promise for then with a thenable")
            //console.log(callbackResult)
            //the point here is to handle promiselike objects or functions
            // (promise like functions? promise factory? whatever, I'm just following rules)
            //if makes sure object/func has a then function, we'll just assume it behaves correctly and adopt it's state
            //@ts-ignore
            callbackResult.then(resolve, reject);

          } else {
            //console.log("resolving promise with basic value", callbackResult)
            //not a promise or thenable, we can just resolve(in a microtask to detach from current execution)
            queueMicroTask(() => {
              resolve(callbackResult);
            });

          }
        } catch (e) {
          //reject(e);
          throw e;
        }

        profiler.endCall("Promise:callback:" + lastProfiledName);
      })


    });
    //if promise is already resolved, this will re-run the resolvePromise method
    if (this.state != PromiseState.Pending) {
      this.resolvePromise();
    }
    profiler.endCall("Promise:then")
    //console.log("then done")
    return thenPromise;

  }

  @profile("Promise")
  private resolveHandler<T>(value?: Resolvable<T>): void {
    //only handle once
    if (this.state != PromiseState.Pending) return;
    //set promise resolved
    this.state = PromiseState.Resolved;
    this.reasonOrValue = value;
    this.resolvePromise();
  }
  @profile("Promise")
  private rejectHandler<T>(reason: any): void {
    //only handle once
    if (this.state != PromiseState.Pending) return;
    this.state = PromiseState.Rejected;
    this.reasonOrValue = reason;
    this.resolvePromise();
  }
  @profile("Promise")
  private resolvePromise() {
    //console.log("resolve promise called", this.state)
    //only run callbacks if we're resolved.
    if (this.state == PromiseState.Pending) return;
    //console.log("queuing resolve task", queueMicroTask)
    queueMicroTask(() => {
      //console.log("in promise microtask", this.callbacks.length, JSON.stringify((new Error().stack)))
      let nextCallback: Function | undefined;
      while (nextCallback = this.callbacks.shift()) {
        //console.log("running callback")
        nextCallback();
      }
    })

  }

}