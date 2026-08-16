import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process, { exit } from "node:process";
import url from "node:url";
import bun, { $ } from "bun";
import { cleanup } from "./cleanup";
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
const testSuiteFile = path.join(testSuitesDir, "test.ts");

if (!(await bun.file(testSuiteFile).exists())) {
  console.error(`no test suite for ${distro} exists`);
  exit(1);
}

// checks
if (!(await dirExists(templateOutputDir))) {
  console.error(`template for ${distro} was not created`);
  exit(1);
}
if (!(await bun.file(testSuiteFile).exists())) {
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
    await $`ssh-keygen -q -t ed25519 -N "" -f ${signingKey}`;
    cleanup.defer(() => fs.unlink(signingKey));
    cleanup.defer(() => fs.unlink(`${signingKey}.pub`));
  }

  if (!process.env["SSH_AUTH_SOCK"]) {
    const sshAgentOutput = await $`ssh-agent -s`.text();

    const authSock = sshAgentOutput.match(/SSH_AUTH_SOCK=([^;]+)/)?.[1];
    const agentPid = sshAgentOutput.match(/SSH_AGENT_PID=([0-9]+)/)?.[1];
    cleanup.defer(async () => {
      await $`kill ${agentPid}`.quiet();
    });

    if (!(authSock && agentPid)) {
      throw new Error("Could not start ssh-agent");
    }

    process.env["SSH_AUTH_SOCK"] = authSock;
    process.env["SSH_AGENT_PID"] = agentPid;
  }

  await $`ssh-add ${signingKey}`;
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
  for (const script of ["up.sh", "down.sh", "remove.sh"]) {
    await fs.chmod(path.join(testExecutionDir, ".devcontainer", script), 0o755);
  }
}

// do the deed
async function runTests() {
  const project = path.basename(testExecutionDir);
  const container = `mise-devcontainer-${distro}-${project}`;

  cleanup.defer(async () => {
    await $`${testExecutionDir}/.devcontainer/remove.sh`;
  });
  await $`${testExecutionDir}/.devcontainer/up.sh`;
  await $`docker exec ${container} sh -c 'cat /home/dev/.ssh/authorized_keys 2>/dev/null || echo "NO AUTHORIZED KEYS"'`;
  await $`docker exec ${container} sh -c 'SSH_AUTH_SOCK=/ssh-agent ssh-add -L || true'`;

  console.log("==> Waiting for SSH...");

  const attempts = 4;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await $`ssh \
    -o BatchMode=yes \
    -o ConnectionAttempts=1 \
    -o ConnectTimeout=2 \
    ${container} \
    true`
      .quiet()
      .nothrow();

    if (result.exitCode === 0) {
      break;
    }

    if (attempt === attempts - 1) {
      console.error("==> Fedora auth configuration:");
      await $`docker exec ${container} sh -c \
  'cat /etc/pam.d/sshd; echo "--- passwd ---"; getent passwd dev; echo "--- shadow ---"; passwd -S dev || true'`.nothrow();

      console.error("==> SSH diagnostics:");
      await $`ssh \
    -vvv \
    -o BatchMode=yes \
    -o ConnectionAttempts=1 \
    -o ConnectTimeout=2 \
    ${container} \
    true`.nothrow();

      throw new Error("SSH did not become ready");
    }

    await bun.sleep(2000);
  }

  const remote = async (command: string) => {
    const result = await $`ssh ${container} ${command}`.quiet().nothrow();

    return {
      exitCode: result.exitCode,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  };

  const testModule = await import(url.pathToFileURL(testSuiteFile).href);
  await testModule.runTests(remote);
}

try {
  await setupHost();
  await setupTestExecution();
  await runTests();
} finally {
  await cleanup.run();
}
