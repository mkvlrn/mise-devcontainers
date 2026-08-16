const tasks: (() => Promise<void>)[] = [];

export function defer(fn: () => Promise<void>) {
  tasks.push(fn);
}

export async function run() {
  for (const fn of tasks.reverse()) {
    await fn();
  }
}

export const cleanup = {
  defer,
  run,
} as const;
