import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process, { exit } from "node:process";
import bun, { $ } from "bun";
import { cleanup } from "./cleanup";
import { env } from "./env";
import { dirExists, getArgs, values } from "./lib";
import { distroSchema } from "./schemas";

// parse args
const args = getArgs({ distro: "string" }, distroSchema);
if (args.isError) {
  console.error(args.error.message);
  process.exit(1);
}

// vars
const { distro } = args.value;
const templateOutputDir = values.publishTemplateDir(distro);
const testSuitesDir = values.testSuitesDir(distro);
const testExecutionDir = values.testExecutionDir(distro);

// checks
if (!(await dirExists(templateOutputDir))) {
  console.error(`template for ${distro} was not created`);
  exit(1);
}
if (!(await dirExists(testSuitesDir))) {
  console.error(`no test suite for ${distro} exists`);
  exit(1);
}

// setup host environment
async function setupHost(): Promise<void> {
  await fs.mkdir(path.join(os.homedir(), ".ssh"), { recursive: true });
  const gitConfig = path.join(os.homedir(), ".gitconfig");
  const signingKey = path.join(os.homedir(), ".ssh", "id_ed25519_signing");

  if (!(await bun.file(gitConfig).exists())) {
    await bun.write(gitConfig, "");
    cleanup.defer(() => fs.unlink(gitConfig));
  }

  if (!(await bun.file(signingKey).exists())) {
    await bun.write(signingKey, "");
    cleanup.defer(() => fs.unlink(signingKey));
  }

  if (!env.SSH_AUTH_SOCK) {
    await $`eval "$(ssh-agent -s)" >dev/null`;
    cleanup.defer(async () => {
      await $`ssh-agent -k >dev/nul`;
    });
  }
}

// setup test execution
async function setupTestExecution() {
  await fs.rm(testExecutionDir, { recursive: true, force: true });
  await fs.mkdir(testExecutionDir, { recursive: true });
  await fs.cp(
    path.join(templateOutputDir, ".devcontainer"),
    path.join(testExecutionDir, ".devcontainer"),
    {
      recursive: true,
      force: true,
    },
  );
  await fs.cp(values.testSuitesDir("_common"), path.join(testExecutionDir, "_common"), {
    recursive: true,
    force: true,
  });
  await fs.cp(path.join(testSuitesDir, "test.sh"), path.join(testExecutionDir, "test.sh"), {
    recursive: true,
    force: true,
  });
  await fs.chmod(path.join(testExecutionDir, "test.sh"), 0o755);
}

// do the deed
async function runTests() {
  const project = path.dirname(testExecutionDir);
  const container = `mise-devcontainer-${distro}-${project}`;

  cleanup.defer(async () => {
    await $`${testExecutionDir}/.devcontainer/remove.sh`;
  });
  await $`${testExecutionDir}/.devcontainer/up.sh`;
}

try {
  await setupHost();
  await setupTestExecution();
  await runTests();
} finally {
  cleanup.run();
}
