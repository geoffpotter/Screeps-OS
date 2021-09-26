



export class functionQueueSet {
    funcs:Set<Function>;
    addFunc:(func:Function)=>void
    private resetSet() {
      this.funcs = new Set<Function>();
      this.addFunc = this.funcs.add.bind(this.funcs)
    }

    constructor() {
      this.funcs = new Set<Function>();
      this.addFunc = this.funcs.add.bind(this.funcs)
    }


    processCurrentQueueWithDone() {
      //console.log("start processing", this.funcs.size)
      if(this.funcs.size == 0) return;
      let funcs = this.funcs;
      this.resetSet();
      let count = 0;
      funcs.forEach((func)=>{
        //console.log("running func", funcs.size, this.funcs.size)
        let done = func();
        if(done===false) {
          this.addFunc(func);
        }
        count++;
      })
      //console.log("done processing", this.funcs.size, "processed", count)
    }
    processCurrentQueue() {
      //console.log("start processing", this.funcs.size)
      if(this.funcs.size == 0) return;
      let funcs = this.funcs;
      this.resetSet();
      let count = 0;
      funcs.forEach((func)=>{
        //console.log("running func", funcs.size, this.funcs.size)
        func();
        count++;
      })
      //console.log("done processing", this.funcs.size, "processed", count)
    }

    processFullQueueWithDone() {
      //console.log("start processing", this.funcs.size)
      if(this.funcs.size == 0) return;
      let count = 0;
      this.funcs.forEach((func)=>{
        let done = func();
        if(done!==false) {
          this.funcs.delete(func);
        }
        count++;
      })
      //console.log("done processing", this.funcs.size, "processed", count)
    }
    processFullQueue() {
      //console.log("start processing", this.funcs.size)
      if(this.funcs.size == 0) return;
      let count = 0;
      this.funcs.forEach((func)=>{
        func();
        count++;
      })
      this.funcs.clear();
      //console.log("done processing", this.funcs.size, "processed", count)
    }
  }
