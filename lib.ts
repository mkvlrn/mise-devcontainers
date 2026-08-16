import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { errResult, okResult, type Result } from "@mkvlrn/result";
import bun from "bun";
import type { ZodType } from "zod";

type Args = Record<string, "string" | "boolean">;

export function getArgs<T>(
  record: Args,
  schema: ZodType<T>,
  args: string[] = bun.argv.slice(2),
): Result<T, Error> {
  const { values } = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    options: Object.fromEntries(Object.entries(record).map(([key, type]) => [key, { type }])),
  });
  const parse = schema.safeParse(values);

  if (parse.error) {
    return errResult(new Error(`invalid arguments: ${parse.error.issues.map((i) => i.message)}`));
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

const root = import.meta.dirname;

export const values = {
  root,
  distros: (await fs.readdir(path.join(root, "src"))).filter((d) => d !== "_common"),
  imageName: (distro: string) => `mkvlrn/mise-devcontainers-${distro}`,
  imageRef: (distro: string) => `ghcr.io/mkvlrn/mise-devcontainers-${distro}`,
  srcDir: (distro: string) => path.join(root, "src", distro),
  templatesDir: (distro: string) => path.join(root, "templates", distro),
  buildImageDir: (distro: string) => path.join(root, ".build-image", distro),
  publishTemplateDir: (distro: string) => path.join(root, ".publish-template", distro),
  testSuitesDir: (distro: string) => path.join(root, "test", distro),
  testExecutionDir: (distro: string) => path.join(root, ".test-execution", distro),
} as const;
