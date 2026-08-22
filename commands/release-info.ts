import path from "node:path";

import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { z } from "zod";

import { parseEnv, pathFinder } from "./misc/lib";
import { validationMetadataSchema } from "./misc/schemas";

const pullRequestEventSchema = z.object({
  pull_request: z.object({
    head: z.object({
      sha: z.string(),
    }),
  }),
});

export async function run(_: string[]): ResultAsync<true, Error> {
  const parsedEnv = parseEnv();
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

  const writeOutput = writeReleaseInfo(env.GITHUB_OUTPUT, metadata.value);
  if (writeOutput.isError) {
    return errResult(writeOutput.error);
  }

  return okResult(true);
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

function writeReleaseInfo(outputPath: string, metadata: z.infer<typeof validationMetadataSchema>) {
  try {
    const githubOutputFile = Bun.file(outputPath).writer();

    githubOutputFile.write(`distros=${JSON.stringify(metadata.distros)}\n`);
    githubOutputFile.write(`candidate_tag=${metadata.candidateTag}\n`);
    githubOutputFile.write(`image_version=${metadata.imageVersion}\n`);
    githubOutputFile.end();

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not write release info", { cause: err }));
  }
}
