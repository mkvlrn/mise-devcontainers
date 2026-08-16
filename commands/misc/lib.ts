import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs as nodeParseArgs } from "node:util";
import { errResult, okResult, type Result } from "@mkvlrn/result";
import type { ZodType, z } from "zod";
import { envSchema, root } from "./schemas";

type ArgType = "string" | "boolean";

type ParsedArgs<R extends Record<string, ArgType>> = {
  [K in keyof R]: R[K] extends "boolean" ? boolean : string;
};

export function parseArgs<R extends Record<string, ArgType>>(
  record: R,
  schema: ZodType<ParsedArgs<R>>,
  args: string[],
): Result<ParsedArgs<R>, Error> {
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

export function parseEnv(): Result<z.infer<typeof envSchema>, Error> {
  const parse = envSchema.safeParse(process.env);
  if (parse.error) {
    return errResult(new Error("could not parse env vars", { cause: parse.error }));
  }

  return okResult(parse.data);
}

export async function readJsonc<T>(filePath: string): Promise<T> {
  const module = await import(filePath, {
    with: { type: "jsonc" },
  });

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
  publishCollectionDir: () => path.join(root, ".tmp", ".publish-collection"),
} as const;
