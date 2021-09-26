


export class functionQueueArray {
    funcs:Array<Function>;
    private numFuncs;
    private initialSize;
    private doneFuncs:WeakSet<Function>;
    private numDoneFuncs:number;
    private resetArray() {
      //let currLen = this.funcs.length;
      this.funcs = Array(this.initialSize)
      //this.funcs = Array(Math.max(this.initialSize,  currLen));
      this.numFuncs = 0;
    }

    constructor(initialSize=10000) {
      this.initialSize = initialSize;
      this.funcs = Array(initialSize);
      this.numFuncs = 0;
      this.doneFuncs = new WeakSet<Function>();
      this.numDoneFuncs = 0;
    }
    addFunc(func:Function) {
      // if(this.numFuncs > this.funcs.length) {
      //   throw new Error("Too many funcs in array!!")
      // }
      this.funcs[this.numFuncs] = func;
      this.numFuncs++;
    }
    processCurrentQueue() {
      //console.log("start processing", this.numFuncs)
      if(this.numFuncs == 0) return;

      let currentQueue = this.funcs;
      let numFuncs = this.numFuncs;
      this.resetArray();

      let currentFunc = 0;
      let func;
      while (currentFunc < numFuncs) {
        func = currentQueue[currentFunc++];
        func();
      }
    }
    processCurrentQueueWithDone() {
      //console.log("start processing", this.numFuncs)
      if(this.numFuncs == 0) return;

      let currentQueue = this.funcs;
      let numFuncs = this.numFuncs;
      this.resetArray();

      let currentFunc = 0;
      let func;
      while (currentFunc < numFuncs) {
        func = currentQueue[currentFunc++];
        let done = func();
        if(done===false) {
          this.addFunc(func);
        }
      }

      // currentQueue.forEach((func)=>{
      //   let done = func();
      //   if(done === false) {
      //     this.addfunc(func);
      //   }
      // })

      // let count = 0;
      // let currentfunc = 0;
      // let numFuncs = this.numFuncs;
      // while (currentfunc < numFuncs) {
      //   let func = this.funcs[currentfunc];
      //   //console.log("running func", currentfunc, numFuncs, func)
      //   let done = func();
      //   if(done !== false) {
      //     funcIndexesToRemove.add(currentfunc)
      //   }
      //   currentfunc++;
      // }
      // this.numFuncs -= funcIndexesToRemove.size;
      // funcIndexesToRemove.forEach(index=>{
      //   this.funcs.splice(index, 1);
      // })
      //this.funcs.splice(0, currentfunc);
      //console.log("done processing", this.numFuncs, "processed", currentfunc)
    }

    processFullQueueWithDone() {
      //if(this.numFuncs <= this.numDoneFuncs) return;
      //console.log("start processing", this.numFuncs)
      if(this.numDoneFuncs > Math.min(Math.max(this.numFuncs * 0.2, 0), 10000000)) {
       let oldFuncs = this.funcs;
        let total = this.numFuncs;
        let current = 0;
        this.resetArray();
        while(current < total) {
          let func = oldFuncs[current];
          if(!this.doneFuncs.has(func)) {
            this.addFunc(func);
          }
          current++;
        }
        this.doneFuncs = new WeakSet();
        this.numDoneFuncs = 0;
      }

      if(this.numFuncs == 0) return;

      let count = 0;
      let currentFunc = 0;
      let func;
      let doneFuncs = this.doneFuncs;
      let funcs = this.funcs;
      while (currentFunc < this.numFuncs) {
        func = funcs[currentFunc];
        if(!doneFuncs.has(func)) {
          if(func() !== false) {
            doneFuncs.add(func);
            this.numDoneFuncs++;
          }
          count++;
        }

        currentFunc++;
      }
      //console.log("done processing", this.numFuncs, "processed", count, "done funcs", this.numDoneFuncs, currentFunc)
    }
    processFullQueue() {
      //console.log("start processing", this.numFuncs)
      //console.log("checking for num done", this.numDoneFuncs, this.numFuncs)
      if(this.numFuncs == 0) return;
      let currentFunc = 0;
      let func;
      let funcs = this.funcs;
      while (currentFunc < this.numFuncs) {
        func = funcs[currentFunc++];
        func();
      }
      this.resetArray();
      //console.log("checking for num done", this.numDoneFuncs, this.numFuncs)
      //console.log("done processing", this.numFuncs, "processed", currentFunc, "done funcs", this.numDoneFuncs)
    }
  }
