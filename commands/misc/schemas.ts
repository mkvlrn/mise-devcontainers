import fsSync from "node:fs";
import path from "node:path";
import { z } from "zod";

export const root = path.resolve(import.meta.dirname, "..", "..");

export const distroList = fsSync
  .readdirSync(path.join(root, "distros"), { withFileTypes: true })
  .filter((file) => file.isDirectory())
  .filter((file) => file.name !== "_common")
  .map((file) => file.name);

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

export const pullRequestEventSchema = z.object({
  pull_request: z.object({
    base: z.object({
      sha: z.string(),
    }),
    head: z.object({
      sha: z.string(),
    }),
  }),
});

const githubTokenEnvSchema = z.object({
  GITHUB_TOKEN: z.string(),
});

const githubEventEnvSchema = z.object({
  GITHUB_EVENT_PATH: z.string(),
});

const githubOutputEnvSchema = z.object({
  GITHUB_OUTPUT: z.string(),
});

export const ghcrEnvSchema = githubTokenEnvSchema.extend({
  GHCR_USERNAME: z.string(),
});

export const detectChangesEnvSchema = z.object({
  ...githubEventEnvSchema.shape,
  ...githubOutputEnvSchema.shape,
  GITHUB_RUN_ID: z.string(),
  GITHUB_RUN_ATTEMPT: z.coerce.number(),
});

export const restoreValidationEnvSchema = z.object({
  ...githubTokenEnvSchema.shape,
  ...githubEventEnvSchema.shape,
  ...githubOutputEnvSchema.shape,
  GITHUB_REPOSITORY: z.string(),
});

export const releaseInfoEnvSchema = z.object({
  ...githubEventEnvSchema.shape,
  ...githubOutputEnvSchema.shape,
});

const jobResultSchema = z.enum(["success", "failure", "cancelled", "skipped"]);

export const validationResultEnvSchema = z.object({
  DETECT_CHANGES_RESULT: jobResultSchema,
  BUILD_IMAGE_RESULT: jobResultSchema,
  CREATE_TEMPLATE_RESULT: jobResultSchema,
  TEST_TEMPLATE_RESULT: jobResultSchema,
});

export const testHostEnvSchema = z.object({
  SSH_AUTH_SOCK: z.string().optional(),
});
