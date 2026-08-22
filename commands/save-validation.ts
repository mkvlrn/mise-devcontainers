import fs from "node:fs/promises";
import path from "node:path";
import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { z } from "zod";
import { parseArgs, pathFinder } from "./misc/lib";
import { validationMetadataSchema } from "./misc/schemas";

const distrosArgSchema = z
  .string()
  .transform((value, context) => {
    try {
      return JSON.parse(value);
    } catch {
      context.addIssue({
        code: "custom",
        message: "distros must be valid JSON",
      });

      return z.NEVER;
    }
  })
  .pipe(validationMetadataSchema.shape.distros);

const argsSchema = validationMetadataSchema.extend({
  distros: distrosArgSchema,
});

export async function run(args: string[]): ResultAsync<true, Error> {
  const parsedArgs = parseArgs(
    {
      distros: "string",
      candidateTag: "string",
      imageVersion: "string",
      headSha: "string",
    },
    argsSchema,
    args,
  );
  if (parsedArgs.isError) {
    return errResult(parsedArgs.error);
  }

  try {
    const outputDir = pathFinder.validationMetadataDir();

    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(outputDir, { recursive: true });
    await Bun.write(path.join(outputDir, "metadata.json"), JSON.stringify(parsedArgs.value));

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not save validation metadata", { cause: err }));
  }
}
