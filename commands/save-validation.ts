import fs from "node:fs/promises";
import path from "node:path";
import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { z } from "zod";

import { parseArgs, pathFinder } from "./misc/lib";
import { validationMetadataSchema } from "./misc/schemas";

export async function run(args: string[]): ResultAsync<true, Error> {
  const parsedArgs = parseArgs(
    {
      distros: "string",
      candidateTag: "string",
      imageVersion: "string",
      headSha: "string",
    },
    z.strictObject({
      distros: z.string().transform((value) => JSON.parse(value)),
      candidateTag: validationMetadataSchema.shape.candidateTag,
      imageVersion: validationMetadataSchema.shape.imageVersion,
      headSha: validationMetadataSchema.shape.headSha,
    }),
    args,
  );

  if (parsedArgs.isError) {
    return errResult(parsedArgs.error);
  }

  try {
    const metadata = validationMetadataSchema.parse({
      distros: parsedArgs.value.distros,
      candidateTag: parsedArgs.value.candidateTag,
      imageVersion: parsedArgs.value.imageVersion,
      headSha: parsedArgs.value.headSha,
    });
    const outputDir = pathFinder.validationMetadataDir();

    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(outputDir, { recursive: true });
    await Bun.write(path.join(outputDir, "metadata.json"), JSON.stringify(metadata));

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not save validation metadata", { cause: err }));
  }
}
