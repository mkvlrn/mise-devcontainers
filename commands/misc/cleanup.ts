import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";

const tasks: (() => Promise<void>)[] = [];

export function defer(fn: () => Promise<void>) {
  tasks.push(fn);
}

export async function run(): ResultAsync<true, Error> {
  try {
    for await (const fn of tasks.reverse()) {
      await fn();
    }

    return okResult(true);
  } catch (err) {
    return errResult(new Error("test cleanup failed", { cause: err }));
  } finally {
    tasks.length = 0;
  }
}

export const cleanup = {
  defer,
  run,
} as const;
