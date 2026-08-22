import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import dayjs from "dayjs";
import { parseEnv, writeGithubOutputs } from "./misc/lib";
import { detectChangesEnvSchema, distroList, pullRequestEventSchema } from "./misc/schemas";

export async function run(_: string[]): ResultAsync<true, Error> {
  const parsedEnv = parseEnv(detectChangesEnvSchema);
  if (parsedEnv.isError) {
    return errResult(new Error("error loading env vars", { cause: parsedEnv.error }));
  }

  const env = parsedEnv.value;
  const changedFiles = await getChangedFiles(env.GITHUB_EVENT_PATH);
  if (changedFiles.isError) {
    return errResult(changedFiles.error);
  }

  const changedDistros = getChangedDistros(changedFiles.value);

  return writeGithubOutputs(env.GITHUB_OUTPUT, {
    candidate_tag: `ci-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`,
    image_version: dayjs().format("YYYY.M.D-H.m.s"),
    distros: JSON.stringify(changedDistros),
  });
}

async function getChangedFiles(eventPath: string): ResultAsync<string[], Error> {
  try {
    const event = pullRequestEventSchema.parse(await Bun.file(eventPath).json());
    const baseSha = event.pull_request.base.sha;
    const headSha = event.pull_request.head.sha;
    const output = await Bun.$`git diff --name-only ${baseSha}...${headSha}`.text();

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
