import {profiler} from "shared/utils/profiling/profiler";

export default function (toWaste = 10) {
    //  profiler.startCall("wasteCpu");
    // let context = profiler.pauseContext();
    //   console.log("Wasting CPU", toWaste);
    let start = Game.cpu.getUsed();
    let i = 0;
    while (Game.cpu.getUsed() - start < toWaste) {
        i += Math.sin(i);
    }
    // profiler.resumeContext(context);
      // profiler.endCall("wasteCpu");
    return toWaste;
}
