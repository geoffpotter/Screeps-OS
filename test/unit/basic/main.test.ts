import {assert} from "chai";
import {loop} from "../../../src/world_benchmark/main";


describe("main", () => {
  before(() => {
    // runs before all test in this block
  });

  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore
    Game.cpu.fakeStartTime = Date.now();
  });

  it("should export a loop function", () => {
    assert.isTrue(typeof loop === "function");
  });

  // it("should return void when called with no context", () => {
  //   assert.isUndefined(loop());
  // });

  // it("Automatically delete memory of missing creeps", () => {
  //   Memory.creeps.persistValue = "any value";
  //   Memory.creeps.notPersistValue = "any value";

  //   Game.creeps.persistValue = new Creep("persistValue" as Id<Creep>);

  //   loop();
  //   assert.isTrue(false);
  //   assert.isDefined(Memory.creeps.persistValue);
  //   assert.isUndefined(Memory.creeps.notPersistValue);
  // });
});
