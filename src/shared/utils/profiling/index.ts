import {
  profiler as prof,
  profile as decorator,
} from "./profiler";

export let profiler = prof;
export let profile = decorator;
