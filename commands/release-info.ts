import path from "node:path";
import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import type { z } from "zod";
import { parseEnv, pathFinder, writeGithubOutputs } from "./misc/lib";
import {
  pullRequestEventSchema,
  releaseInfoEnvSchema,
  validationMetadataSchema,
} from "./misc/schemas";

export async function run(_: string[]): ResultAsync<true, Error> {
  const parsedEnv = parseEnv(releaseInfoEnvSchema);

  if (parsedEnv.isError) {
    return errResult(new Error("error loading env vars", { cause: parsedEnv.error }));
  }

  const env = parsedEnv.value;

  const headSha = await getHeadSha(env.GITHUB_EVENT_PATH);

  if (headSha.isError) {
    return errResult(headSha.error);
  }

  const metadata = await getValidationMetadata();

  if (metadata.isError) {
    return errResult(metadata.error);
  }

  if (metadata.value.headSha !== headSha.value) {
    return errResult(
      new Error(
        `successful validation was for ${metadata.value.headSha}, but release head is ${headSha.value}`,
      ),
    );
  }

  return writeGithubOutputs(env.GITHUB_OUTPUT, {
    distros: JSON.stringify(metadata.value.distros),
    candidate_tag: metadata.value.candidateTag,
    image_version: metadata.value.imageVersion,
  });
}

async function getHeadSha(eventPath: string): ResultAsync<string, Error> {
  try {
    const event = pullRequestEventSchema.parse(await Bun.file(eventPath).json());

    return okResult(event.pull_request.head.sha);
  } catch (err) {
    return errResult(new Error("could not parse pull request event", { cause: err }));
  }
}

async function getValidationMetadata(): ResultAsync<
  z.infer<typeof validationMetadataSchema>,
  Error
> {
  try {
    const metadataFile = path.join(pathFinder.validationMetadataDir(), "metadata.json");

    const metadata = validationMetadataSchema.parse(await Bun.file(metadataFile).json());

    return okResult(metadata);
  } catch (err) {
    return errResult(new Error("could not read validation metadata", { cause: err }));
  }
}
