import { errResult, okResult, type Result, type ResultAsync } from "@mkvlrn/result";
import { z } from "zod";
import { parseEnv } from "./misc/lib";

const eventSchema = z.object({
  pull_request: z.object({
    number: z.number(),
  }),
});

const workflowRunsSchema = z.object({
  workflow_runs: z.array(
    z.object({
      id: z.number(),
      pull_requests: z.array(
        z.object({
          number: z.number(),
        }),
      ),
    }),
  ),
});

export async function run(_: string[]): ResultAsync<true, Error> {
  const parsedEnv = parseEnv();

  if (parsedEnv.isError) {
    return errResult(new Error("error loading env vars", { cause: parsedEnv.error }));
  }

  const pullRequestNumber = await getPullRequestNumber(parsedEnv.value.GITHUB_EVENT_PATH);

  if (pullRequestNumber.isError) {
    return errResult(pullRequestNumber.error);
  }

  const validationRunId = await findValidationRun(
    parsedEnv.value.GITHUB_REPOSITORY,
    parsedEnv.value.GHCR_TOKEN,
    pullRequestNumber.value,
  );

  if (validationRunId.isError) {
    return errResult(validationRunId.error);
  }

  const writeOutput = writeRunId(parsedEnv.value.GITHUB_OUTPUT, validationRunId.value);

  if (writeOutput.isError) {
    return errResult(writeOutput.error);
  }

  return okResult(true);
}

async function getPullRequestNumber(eventPath: string): ResultAsync<number, Error> {
  try {
    const event = eventSchema.parse(await Bun.file(eventPath).json());

    return okResult(event.pull_request.number);
  } catch (err) {
    return errResult(new Error("could not parse pull request event", { cause: err }));
  }
}

async function findValidationRun(
  repository: string,
  token: string,
  pullRequestNumber: number,
): ResultAsync<number, Error> {
  const response = await getValidationRuns(repository, token);

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

  const validationRun = parsedRuns.data.workflow_runs.find((workflowRun) =>
    workflowRun.pull_requests.some((pullRequest) => pullRequest.number === pullRequestNumber),
  );

  if (!validationRun) {
    return errResult(
      new Error(`could not find successful validation for PR #${pullRequestNumber}`),
    );
  }

  return okResult(validationRun.id);
}

async function getValidationRuns(repository: string, token: string): ResultAsync<unknown, Error> {
  try {
    const response = await fetch(getValidationRunsUrl(repository), {
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

function getValidationRunsUrl(repository: string): URL {
  const url = new URL(
    `https://api.github.com/repos/${repository}/actions/workflows/validate.yml/runs`,
  );

  url.searchParams.set("event", "pull_request");
  url.searchParams.set("status", "success");
  url.searchParams.set("per_page", "100");

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
