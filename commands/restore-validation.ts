import { errResult, okResult, type Result, type ResultAsync } from "@mkvlrn/result";
import { z } from "zod";
import { parseEnv } from "./misc/lib";

const pullRequestEventSchema = z.object({
  pull_request: z.object({
    head: z.object({
      sha: z.string(),
    }),
  }),
});

const workflowRunsSchema = z.object({
  workflow_runs: z.array(
    z.object({
      id: z.number(),
    }),
  ),
});

export async function run(_: string[]): ResultAsync<true, Error> {
  const parsedEnv = parseEnv();

  if (parsedEnv.isError) {
    return errResult(new Error("error loading env vars", { cause: parsedEnv.error }));
  }

  const env = parsedEnv.value;
  const headSha = await getHeadSha(
    env.GITHUB_EVENT_NAME,
    env.GITHUB_EVENT_PATH,
    env.INPUT_HEAD_SHA,
  );
  if (headSha.isError) {
    return errResult(headSha.error);
  }

  const validationRunId = await findValidationRun(
    env.GITHUB_REPOSITORY,
    env.GHCR_TOKEN,
    headSha.value,
  );
  if (validationRunId.isError) {
    return errResult(validationRunId.error);
  }

  const writeOutput = writeRunId(env.GITHUB_OUTPUT, validationRunId.value);
  if (writeOutput.isError) {
    return errResult(writeOutput.error);
  }

  return okResult(true);
}

async function getHeadSha(
  eventName: string,
  eventPath: string,
  inputHeadSha?: string,
): ResultAsync<string, Error> {
  if (eventName === "workflow_dispatch") {
    if (!inputHeadSha) {
      return errResult(new Error("head SHA is required for manual release"));
    }

    return okResult(inputHeadSha);
  }

  try {
    const event = pullRequestEventSchema.parse(await Bun.file(eventPath).json());

    return okResult(event.pull_request.head.sha);
  } catch (err) {
    return errResult(new Error("could not parse pull request event", { cause: err }));
  }
}

async function findValidationRun(
  repository: string,
  token: string,
  headSha: string,
): ResultAsync<number, Error> {
  const response = await getValidationRuns(repository, token, headSha);
  if (response.isError) {
    return errResult(response.error);
  }

  const parsedRuns = workflowRunsSchema.safeParse(response.value);
  if (parsedRuns.error) {
    return errResult(
      new Error("could not parse validation runs", {
        cause: parsedRuns.error,
      }),
    );
  }

  const [validationRun] = parsedRuns.data.workflow_runs;
  if (!validationRun) {
    return errResult(new Error(`could not find successful validation for head SHA ${headSha}`));
  }

  return okResult(validationRun.id);
}

async function getValidationRuns(
  repository: string,
  token: string,
  headSha: string,
): ResultAsync<unknown, Error> {
  try {
    const response = await fetch(getValidationRunsUrl(repository, headSha), {
      headers: getGithubHeaders(token),
    });
    if (!response.ok) {
      return errResult(
        new Error(`could not list validation runs: ${response.status} ${response.statusText}`),
      );
    }

    return okResult(await response.json());
  } catch (err) {
    return errResult(new Error("could not list validation runs", { cause: err }));
  }
}

function getValidationRunsUrl(repository: string, headSha: string): URL {
  const url = new URL(
    `https://api.github.com/repos/${repository}/actions/workflows/validate.yml/runs`,
  );
  url.searchParams.set("event", "pull_request");
  url.searchParams.set("status", "success");
  url.searchParams.set("head_sha", headSha);
  url.searchParams.set("per_page", "1");

  return url;
}

function getGithubHeaders(token: string): Bun.HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2026-03-10",
  };
}

function writeRunId(outputPath: string, runId: number): Result<true, Error> {
  try {
    const githubOutputFile = Bun.file(outputPath).writer();
    githubOutputFile.write(`run_id=${runId}\n`);
    githubOutputFile.end();

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not write validation run id", { cause: err }));
  }
}
