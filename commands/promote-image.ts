import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { $ } from "bun";
import { parseArgs, pathFinder } from "./misc/lib";
import { distroTagImageSchema } from "./misc/schemas";

export async function run(args: string[]): ResultAsync<true, Error> {
  const parse = parseArgs(
    { distro: "string", candidateTag: "string", imageVersion: "string" },
    distroTagImageSchema,
    args,
  );
  if (parse.isError) {
    return errResult(new Error("could not parse template creation args", { cause: parse.error }));
  }

  const { distro, candidateTag, imageVersion } = parse.value;
  const imageRef = pathFinder.imageRef(distro);
  const candidateRef = `${imageRef}:${candidateTag}`;

  try {
    await $`docker buildx imagetools create \
  --prefer-index=false \
  -t ${`${imageRef}:${imageVersion}`} \
  -t ${`${imageRef}:latest`} \
  -t ${`${imageRef}:current`} \
  ${candidateRef}`;

    return okResult(true);
  } catch (err) {
    return errResult(new Error(`could not promote image ${imageVersion}`, { cause: err }));
  }
}
