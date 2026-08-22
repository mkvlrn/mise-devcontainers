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

export const distroTagCacheSchema = z.strictObject({
  distro: distroSchema.shape.distro,
  candidateTag: z.string({ error: "candidateTag is required" }),
  "no-cache": z.boolean().default(false),
});

export const distroTagImageSchema = z.strictObject({
  distro: distroSchema.shape.distro,
  candidateTag: distroTagCacheSchema.shape.candidateTag,
  imageVersion: z.string({ error: "imageVersion is required" }),
});

export const distroTagSchema = distroTagImageSchema.omit({ imageVersion: true });

export const validationMetadataSchema = z.strictObject({
  distros: z.array(distroSchema.shape.distro),
  candidateTag: distroTagCacheSchema.shape.candidateTag,
  imageVersion: distroTagImageSchema.shape.imageVersion,
  headSha: z.string(),
});

export const envSchema = z.object({
  GHCR_TOKEN: z.string(),
  GHCR_USERNAME: z.string(),
  GITHUB_ACTIONS: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
  GITHUB_REPOSITORY: z.string(),
  GITHUB_RUN_ID: z.string(),
  GITHUB_RUN_ATTEMPT: z.coerce.number(),
  GITHUB_OUTPUT: z.string(),
  GITHUB_EVENT_NAME: z.string(),
  GITHUB_EVENT_PATH: z.string(),
  SSH_AUTH_SOCK: z.string().optional(),
  DETECT_CHANGES_RESULT: z.enum(["success", "failure", "cancelled", "skipped"]).optional(),
  BUILD_IMAGE_RESULT: z.enum(["success", "failure", "cancelled", "skipped"]).optional(),
  CREATE_TEMPLATE_RESULT: z.enum(["success", "failure", "cancelled", "skipped"]).optional(),
  TEST_TEMPLATE_RESULT: z.enum(["success", "failure", "cancelled", "skipped"]).optional(),
  INPUT_HEAD_SHA: z.string().optional(),
});
