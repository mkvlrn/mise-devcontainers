import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs as nodeParseArgs } from "node:util";
import { errResult, okResult, type Result } from "@mkvlrn/result";
import type { z } from "zod";
import { root } from "./schemas";

type ArgType = "string" | "boolean";

export function parseArgs<TSchema extends z.ZodType>(
  record: Record<string, ArgType>,
  schema: TSchema,
  args: string[],
): Result<z.output<TSchema>, Error> {
  const { values } = nodeParseArgs({
    args,
    strict: true,
    allowPositionals: false,
    options: Object.fromEntries(Object.entries(record).map(([key, type]) => [key, { type }])),
  });

  const parse = schema.safeParse(values);
  if (parse.error) {
    return errResult(new Error("could not parse command options", { cause: parse.error }));
  }

  return okResult(parse.data);
}

export function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
): Result<z.output<TSchema>, Error> {
  const parse = schema.safeParse(process.env);
  if (parse.error) {
    return errResult(new Error("could not parse env vars", { cause: parse.error }));
  }

  return okResult(parse.data);
}

export function writeGithubOutputs(
  outputPath: string,
  outputs: Record<string, string | number>,
): Result<true, Error> {
  try {
    const outputFile = Bun.file(outputPath).writer();

    for (const [key, value] of Object.entries(outputs)) {
      outputFile.write(`${key}=${value}\n`);
    }

    outputFile.end();

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not write GitHub outputs", { cause: err }));
  }
}

export async function readJsonc<T>(filePath: string): Promise<T> {
  const module = await import(filePath, { with: { type: "jsonc" } });

  return module.default as T;
}

export async function dirExists(filePath: string): Promise<boolean> {
  return await fs
    .stat(filePath)
    .then((stat) => stat.isDirectory())
    .catch(() => false);
}

export const pathFinder = {
  imageName: (distro: string) => `mkvlrn/mise-devcontainer-${distro}`,
  imageRef: (distro: string) => `ghcr.io/mkvlrn/mise-devcontainer-${distro}`,

  distrosDir: (distro: string) => path.join(root, "distros", distro),
  templatesDir: (distro: string) => path.join(root, "templates", distro),
  testSuitesDir: (distro: string) => path.join(root, "test", distro),

  buildImageDir: (distro: string) => path.join(root, ".tmp", `.build-image-${distro}`),
  publishTemplateDir: (distro: string) => path.join(root, ".tmp", `.publish-template-${distro}`),
  testExecutionDir: (distro: string) => path.join(root, ".tmp", `.test-execution-${distro}`),
  validationMetadataDir: () => path.join(root, ".tmp", ".validation-metadata"),
  publishCollectionDir: () => path.join(root, ".tmp", ".publish-collection"),
} as const;

export async function prepareOverlayDir(commonDir: string, distroDir: string, outputDir: string) {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.cp(commonDir, outputDir, { recursive: true, force: true });
  await fs.cp(distroDir, outputDir, { recursive: true, force: true });
}
