import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import url from "node:url";
import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { $ } from "bun";
import { cleanup } from "./misc/cleanup";
import { dirExists, parseArgs, pathFinder } from "./misc/lib";
import { distroSchema } from "./misc/schemas";

export async function run(args: string[]): ResultAsync<true, Error> {
  const result = await runWithCleanup(args);

  const cleanupResult = await cleanup.run();
  if (cleanupResult.isError) {
    return cleanupResult;
  }

  return result;
}

async function runWithCleanup(args: string[]): ResultAsync<true, Error> {
  const parse = parseArgs({ distro: "string" }, distroSchema, args);
  if (parse.isError) {
    return errResult(new Error("could not parse image build args", { cause: parse.error }));
  }

  const { distro } = parse.value;
  const templateOutputDir = pathFinder.publishTemplateDir(distro);
  const testSuitesDir = pathFinder.testSuitesDir(distro);
  const testExecutionDir = pathFinder.testExecutionDir(distro);
  const testSuiteFile = path.join(testSuitesDir, "test.ts");

  if (!(await dirExists(templateOutputDir))) {
    return errResult(new Error(`template directory for ${distro} doesn't exist`));
  }

  if (!(await Bun.file(testSuiteFile).exists())) {
    return errResult(new Error(`test suite for ${distro} doesn't exist`));
  }

  const hostSetup = await setupHostEnvironment();
  if (hostSetup.isError) {
    return errResult(hostSetup.error);
  }

  const executionSetup = await setupTestExecution(testExecutionDir, templateOutputDir);
  if (executionSetup.isError) {
    return errResult(executionSetup.error);
  }

  const testRun = await runTests(distro, testExecutionDir, testSuiteFile);
  if (testRun.isError) {
    return errResult(testRun.error);
  }

  return okResult(true);
}

async function setupHostEnvironment(): ResultAsync<true, Error> {
  try {
    await fs.mkdir(path.join(os.homedir(), ".ssh"), { recursive: true });
    const gitConfig = path.join(os.homedir(), ".gitconfig");
    const signingKey = path.join(os.homedir(), ".ssh", "id_ed25519_signing");

    if (!(await Bun.file(gitConfig).exists())) {
      await Bun.write(gitConfig, "");
      cleanup.defer(() => fs.unlink(gitConfig));
    }

    if (!(await Bun.file(signingKey).exists())) {
      await $`ssh-keygen -q -t ed25519 -N "" -f ${signingKey}`;
      cleanup.defer(() => fs.unlink(signingKey));
      cleanup.defer(() => fs.unlink(`${signingKey}.pub`));
    }

    if (!process.env["SSH_AUTH_SOCK"]) {
      const output = await $`ssh-agent -s`.text();
      // biome-ignore lint/performance/useTopLevelRegex: single use
      const authSock = output.match(/SSH_AUTH_SOCK=([^;]+)/)?.[1];
      // biome-ignore lint/performance/useTopLevelRegex: single use
      const agentPid = output.match(/SSH_AGENT_PID=([0-9]+)/)?.[1];

      if (!(authSock && agentPid)) {
        // throwing here to be caught by a proper error handler in catch
        throw new Error("could not start ssh agent for testing");
      }

      cleanup.defer(async () => {
        await $`kill ${agentPid}`.quiet();
      });

      process.env["SSH_AUTH_SOCK"] = authSock;
      process.env["SSH_AGENT_PID"] = agentPid;
    }

    await $`ssh-add ${signingKey}`;

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not setup host environment for testing", { cause: err }));
  }
}

async function setupTestExecution(
  testExecutionDir: string,
  templateOutputDir: string,
): ResultAsync<true, Error> {
  try {
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

    for await (const script of ["up.sh", "down.sh", "remove.sh"]) {
      await fs.chmod(path.join(testExecutionDir, ".devcontainer", script), 0o755);
    }

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not setup test execution", { cause: err }));
  }
}

async function runTests(
  distro: string,
  testExecutionDir: string,
  testSuiteFile: string,
): ResultAsync<true, Error> {
  try {
    const project = path.basename(testExecutionDir);
    const container = `mise-devcontainer-${distro}-${project}`;

    cleanup.defer(async () => {
      await $`${testExecutionDir}/.devcontainer/remove.sh`;
    });
    await $`${testExecutionDir}/.devcontainer/up.sh`;

    console.log("==> Waiting for SSH...");
    const attempts = 4;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: gotta keep trying
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
        console.error("==> Container status:");
        await $`docker ps -a --filter name=${container}`;

        console.error("==> Container logs:");
        await $`docker logs ${container}`.nothrow();

        throw new Error("SSH did not become ready");
      }

      await Bun.sleep(2000);
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

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not run template tests", { cause: err }));
  }
}
