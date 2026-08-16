import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";

const tasks: (() => Promise<void>)[] = [];

export function defer(fn: () => Promise<void>) {
  tasks.push(fn);
}

export async function run(): ResultAsync<true, Error> {
  const errors: unknown[] = [];

  for await (const fn of tasks.reverse()) {
    try {
      await fn();
    } catch (err) {
      errors.push(err);
    }
  }

  tasks.length = 0;

  if (errors.length > 0) {
    return errResult(new AggregateError(errors, "test cleanup failed"));
  }

  return okResult(true);
}

export const cleanup = {
  defer,
  run,
} as const;
