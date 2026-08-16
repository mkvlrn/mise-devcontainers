import { z } from "zod";
import { values } from "./lib";

export const distroSchema = z.strictObject({
  distro: z.enum(values.distros, {
    error: (issue) => {
      if (issue.input === undefined) {
        return "distro is required";
      }

      return `distro must be one of ${values.distros.join(", ")}`;
    },
  }),
});
export type Distro = z.infer<typeof distroSchema>;

export const buildSchema = z.strictObject({
  distro: distroSchema.shape.distro,
  candidateTag: z.string({ error: "candidateTag is required" }),
  "no-cache": z.boolean().default(false).optional(),
});
export type Build = z.infer<typeof buildSchema>;

export const publishSchema = z.strictObject({
  distro: distroSchema.shape.distro,
  candidateTag: buildSchema.shape.candidateTag,
  imageVersion: z.string({ error: "imageVersion is required" }),
});

export const githubActionsEnvSchema = z.object({
  GITHUB_ACTIONS: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
  GITHUB_RUN_ID: z.string(),
  GITHUB_RUN_ATTEMPT: z.coerce.number(),
  GITHUB_OUTPUT: z.string(),
  GITHUB_EVENT_NAME: z.string(),
  GITHUB_EVENT_PATH: z.string(),
  INPUT_DISTRO: z.string(),
  SSH_AUTH_SOCK: z.string().optional(),
});
