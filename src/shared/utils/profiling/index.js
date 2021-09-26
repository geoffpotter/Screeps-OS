import {
  profiler as prof,
  profile as decorator,
  profile_test as pt
} from "./profiler";

export let profileTest = pt;
export let profiler = prof;
export let profile = decorator;