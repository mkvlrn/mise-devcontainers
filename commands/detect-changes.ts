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
  const baseOutputs = processBaseOutputs(env, githubOutputFile);
  if (baseOutputs.isError) {
    return errResult(baseOutputs.error);
  }

  const changedFiles = await getChangedFiles(env);
  if (changedFiles.isError) {
    return errResult(changedFiles.error);
  }

  const changedDistros = getChangedDistros(changedFiles.value);
  const writeDistros = writeDistrosOutput(githubOutputFile, changedDistros);
  if (writeDistros.isError) {
    return errResult(writeDistros.error);
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

async function getChangedFiles(env: z.infer<typeof envSchema>): ResultAsync<string[], Error> {
  try {
    const event = await Bun.file(env.GITHUB_EVENT_PATH).json();
    const baseSha = event.pull_request.base.sha;
    const headSha = event.pull_request.head.sha;
    const output = await $`git diff --name-only ${baseSha}...${headSha}`.text();

    return okResult(
      output
        .trim()
        .split("\n")
        .filter((file) => file.length > 0),
    );
  } catch (err) {
    return errResult(new Error("could not get changed files", { cause: err }));
  }
}

function getChangedDistros(changedFiles: string[]): string[] {
  if (changesAffectAllDistros(changedFiles)) {
    return distroList;
  }

  return distroList.filter((distro) => changesAffectDistro(changedFiles, distro));
}

function changesAffectAllDistros(changedFiles: string[]): boolean {
  return changedFiles.some(
    (file) =>
      file.startsWith("distros/_common/") ||
      file.startsWith("templates/_common/") ||
      file === ".rebuild-all",
  );
}

function changesAffectDistro(changedFiles: string[], distro: string): boolean {
  return changedFiles.some(
    (file) => file.startsWith(`distros/${distro}/`) || file.startsWith(`templates/${distro}/`),
  );
}

function writeDistrosOutput(outputFile: Bun.FileSink, distros: string[]): Result<true, Error> {
  try {
    outputFile.write(`distros=${JSON.stringify(distros)}\n`);

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not write distros output", { cause: err }));
  }
}
