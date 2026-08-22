import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { parseEnv } from "./misc/lib";
import { ghcrEnvSchema } from "./misc/schemas";

export async function run(_: string[]): ResultAsync<true, Error> {
  const parsedEnv = parseEnv(ghcrEnvSchema);
  if (parsedEnv.isError) {
    return errResult(new Error("error loading env vars", { cause: parsedEnv.error }));
  }

  const env = parsedEnv.value;

  try {
    const proc = Bun.spawn(
      ["docker", "login", "ghcr.io", "--username", env.GHCR_USERNAME, "--password-stdin"],
      { stdin: "pipe", stdout: "inherit", stderr: "inherit" },
    );

    proc.stdin.write(env.GITHUB_TOKEN);
    proc.stdin.end();
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error("GHCR login failed");
    }

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not login to GHCR", { cause: err }));
  }
}
