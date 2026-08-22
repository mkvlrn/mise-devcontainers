import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { cleanup } from "./misc/cleanup";
import { dirExists, parseArgs, pathFinder } from "./misc/lib";
import { distroSchema } from "./misc/schemas";
import { createRemote, setupHostEnvironment } from "./misc/test-host";

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
    return errResult(new Error("could not parse template test args", { cause: parse.error }));
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

  const testRun = await runTests(testExecutionDir, testSuiteFile);
  if (testRun.isError) {
    return errResult(testRun.error);
  }

  return okResult(true);
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
      { recursive: true, force: true },
    );

    for await (const script of ["up.sh", "shell.sh", "down.sh", "remove.sh"]) {
      await fs.chmod(path.join(testExecutionDir, ".devcontainer", script), 0o755);
    }

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not setup test execution", { cause: err }));
  }
}

async function runTests(testExecutionDir: string, testSuiteFile: string): ResultAsync<true, Error> {
  try {
    cleanup.defer(async () => {
      await Bun.$`${testExecutionDir}/.devcontainer/remove.sh`;
    });

    await Bun.$`${testExecutionDir}/.devcontainer/up.sh`;

    const remote = createRemote(testExecutionDir);
    const testModule = await import(url.pathToFileURL(testSuiteFile).href);

    await testModule.runTests(remote);

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not run template tests", { cause: err }));
  }
}
