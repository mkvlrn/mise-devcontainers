import { errResult, okResult, type Result, type ResultAsync } from "@mkvlrn/result";
import { $ } from "bun";
import dayjs from "dayjs";
import type { z } from "zod";
import { parseEnv } from "./misc/lib";
import { distroList, type envSchema } from "./misc/schemas";

export async function run(_: string[]): ResultAsync<true, Error> {
  const parsedEnv = parseEnv();
  if (parsedEnv.isError) {
    return errResult(new Error("error loading env vars", { cause: parsedEnv.error }));
  }

  const env = parsedEnv.value;
  const githubOutputFile = Bun.file(env.GITHUB_OUTPUT).writer();

  const base = processBaseOutputs(env, githubOutputFile);
  if (base.isError) {
    return errResult(base.error);
  }

  const workflowDispatch = processWorkflowDispatch(env, githubOutputFile);
  if (workflowDispatch.isError) {
    return errResult(workflowDispatch.error);
  }
  if (workflowDispatch.value) {
    githubOutputFile.end();

    return okResult(true);
  }

  const changes = await processChanges(env, githubOutputFile);
  if (changes.isError) {
    return errResult(changes.error);
  }

  githubOutputFile.end();

  return okResult(true);
}

function processBaseOutputs(
  env: z.infer<typeof envSchema>,
  outputFile: Bun.FileSink,
): Result<true, Error> {
  try {
    outputFile.write(`candidate_tag=ci-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}\n`);
    outputFile.write(`image_version=${dayjs().format("YYYY.M.D-H.m.s")}\n`);

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not process base outputs", { cause: err }));
  }
}

function processWorkflowDispatch(
  env: z.infer<typeof envSchema>,
  outputFile: Bun.FileSink,
): Result<boolean, Error> {
  try {
    if (env.GITHUB_EVENT_NAME === "workflow_dispatch") {
      if (env.INPUT_DISTRO === "all") {
        outputFile.write(`distros=[${JSON.stringify(distroList)}]\n`);
      } else {
        outputFile.write(`distros=["${env.INPUT_DISTRO}"]\n`);
      }

      return okResult(true);
    }

    return okResult(false);
  } catch (err) {
    return errResult(new Error("could not process workflow dispatch", { cause: err }));
  }
}

async function processChanges(
  env: z.infer<typeof envSchema>,
  outputFile: Bun.FileSink,
): ResultAsync<true, Error> {
  try {
    const event = await Bun.file(env.GITHUB_EVENT_PATH).json();
    const baseSha = event.pull_request.base.sha;
    const mergeSha = event.pull_request.merge_commit_sha;
    const changedFiles = (await $`git diff --name-only ${baseSha} ${mergeSha}`).text();

    // biome-ignore lint/performance/useTopLevelRegex: only called once
    const changesInCommon = /^distros\/_common/;
    if (changesInCommon.test(changedFiles)) {
      outputFile.write(`distros=[${JSON.stringify(distroList)}]`);

      return okResult(true);
    }

    const changedDistros: string[] = [];
    for (const distro of distroList) {
      if (changedFiles.includes(`distros/${distro}`)) {
        changedDistros.push(distro);
      }
    }
    outputFile.write(`distros=[${JSON.stringify(changedDistros)}]`);

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not process changes", { cause: err }));
  }
}
