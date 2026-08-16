import fsSync from "node:fs";
import path from "node:path";
import { z } from "zod";

export const root = path.resolve(import.meta.dirname, "..", "..");

export const distroList = fsSync
  .readdirSync(path.join(root, "distros"), { withFileTypes: true })
  .filter((f) => f.isDirectory())
  .filter((f) => f.name !== "_common")
  .map((f) => f.name);

export const distroSchema = z.strictObject({
  distro: z.enum(distroList, {
    error: (issue) => {
      if (issue.input === undefined) {
        return "distro is required";
      }

      return `distro must be one of ${distroList.join(", ")}`;
    },
  }),
});

export const buildSchema = z.strictObject({
  distro: distroSchema.shape.distro,
  candidateTag: z.string({ error: "candidateTag is required" }),
  "no-cache": z.boolean().default(false),
});

export const publishSchema = z.strictObject({
  distro: distroSchema.shape.distro,
  candidateTag: buildSchema.shape.candidateTag,
  imageVersion: z.string({ error: "imageVersion is required" }),
});

export const envSchema = z.object({
  GHCR_TOKEN: z.string(),
  GHCR_USERNAME: z.string(),
  GITHUB_ACTIONS: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
  GITHUB_RUN_ID: z.string(),
  GITHUB_RUN_ATTEMPT: z.coerce.number(),
  GITHUB_OUTPUT: z.string(),
  GITHUB_EVENT_NAME: z.string(),
  GITHUB_EVENT_PATH: z.string(),
  INPUT_DISTRO: z.enum(["all", ...distroList]),
  SSH_AUTH_SOCK: z.string().optional(),
});
