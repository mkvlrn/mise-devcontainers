import { runBaseTests } from "../_common/base";
import { type Remote, reportResults } from "../_common/util";

export async function runTests(remote: Remote): Promise<void> {
  await runBaseTests(remote);

  // distro-specific tests go here

  reportResults();
}
