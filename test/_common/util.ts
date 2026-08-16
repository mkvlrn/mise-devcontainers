export type Remote = (command: string) => Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}>;

const failures: string[] = [];

export async function check(label: string, test: () => Promise<boolean>): Promise<void> {
  try {
    if (await test()) {
      console.log(`✓ ${label}`);
      return;
    }
  } catch {
    // handled below
  }

  console.error(`✗ ${label}`);
  failures.push(label);
}

export function reportResults(): void {
  if (failures.length > 0) {
    throw new Error(`tests failed: ${failures.join(", ")}`);
  }

  console.log();
  console.log("==> Tests passed!");
}
