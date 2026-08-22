import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { cleanup } from "./cleanup";
import { parseEnv } from "./lib";
import { testHostEnvSchema } from "./schemas";

export async function setupHostEnvironment(): ResultAsync<true, Error> {
  const parsedEnv = parseEnv(testHostEnvSchema);
  if (parsedEnv.isError) {
    return errResult(new Error("error loading env vars", { cause: parsedEnv.error }));
  }

  const env = parsedEnv.value;

  try {
    await fs.mkdir(path.join(os.homedir(), ".ssh"), { recursive: true });

    const signingKey = path.join(os.homedir(), ".ssh", "id_ed25519_signing");

    if (!(await Bun.file(signingKey).exists())) {
      await Bun.$`ssh-keygen -q -t ed25519 -N "" -f ${signingKey}`;

      cleanup.defer(() => fs.unlink(signingKey));
      cleanup.defer(() => fs.unlink(`${signingKey}.pub`));
    }

    if (!env.SSH_AUTH_SOCK) {
      const output = await Bun.$`ssh-agent -s`.text();
      // biome-ignore lint/performance/useTopLevelRegex: single use
      const authSock = output.match(/SSH_AUTH_SOCK=([^;]+)/)?.[1];
      // biome-ignore lint/performance/useTopLevelRegex: single use
      const agentPid = output.match(/SSH_AGENT_PID=([0-9]+)/)?.[1];

      if (!(authSock && agentPid)) {
        throw new Error("could not start ssh agent for testing");
      }

      cleanup.defer(async () => {
        await Bun.$`kill ${agentPid}`.quiet();
      });

      process.env["SSH_AUTH_SOCK"] = authSock;
      process.env["SSH_AGENT_PID"] = agentPid;
    }

    await Bun.$`ssh-add ${signingKey}`;

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not setup host environment for testing", { cause: err }));
  }
}

export function createRemote(testExecutionDir: string) {
  const shell = path.join(testExecutionDir, ".devcontainer", "shell.sh");

  return async function remote(command: string) {
    const result = await Bun.$`${shell} sh -lc ${command}`.quiet().nothrow();

    return {
      exitCode: result.exitCode,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  };
}
