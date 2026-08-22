import path from "node:path";

import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { z } from "zod";

import { parseEnv, pathFinder } from "./misc/lib";
import { validationMetadataSchema } from "./misc/schemas";

const eventSchema = z.object({
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

  try {
    const event = eventSchema.parse(await Bun.file(env.GITHUB_EVENT_PATH).json());

    const metadataFile = path.join(pathFinder.validationMetadataDir(), "metadata.json");
    const metadata = validationMetadataSchema.parse(await Bun.file(metadataFile).json());

    if (metadata.headSha !== event.pull_request.head.sha) {
      return errResult(
        new Error(
          `successful validation was for ${metadata.headSha}, but merged PR head is ${event.pull_request.head.sha}`,
        ),
      );
    }

    const githubOutputFile = Bun.file(env.GITHUB_OUTPUT).writer();

    githubOutputFile.write(`distros=${JSON.stringify(metadata.distros)}\n`);
    githubOutputFile.write(`candidate_tag=${metadata.candidateTag}\n`);
    githubOutputFile.write(`image_version=${metadata.imageVersion}\n`);
    githubOutputFile.end();

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not process release info", { cause: err }));
  }
}
