import process from "node:process";
import { githubActionsEnvSchema } from "./schemas";

// biome-ignore lint/style/noProcessEnv: single use
const githubEnv = githubActionsEnvSchema.safeParse(process.env);
if (githubEnv.error) {
  console.error(githubEnv.error.message);
  process.exit(1);
}

export const env = githubEnv.data;
