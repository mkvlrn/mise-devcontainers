import process from "node:process";
import type { Result, ResultAsync } from "@mkvlrn/result";
import bun from "bun";
import { run as buildImage } from "./commands/build-image";
import { run as createTemplate } from "./commands/create-template";
import { run as detectChanges } from "./commands/detect-changes";
import { run as loginGhcr } from "./commands/login-ghcr";
import { run as promoteImage } from "./commands/promote-image";
import { run as publishTemplate } from "./commands/publish-template";
import { run as testTemplate } from "./commands/test-template";

export type RunResult = Result<true, Error> | ResultAsync<true, Error>;
type Command = (args: string[]) => RunResult;
type CommandName = keyof typeof commands;

const commands = {
  "detect-changes": detectChanges,
  "build-image": buildImage,
  "create-template": createTemplate,
  "test-template": testTemplate,
  "login-ghcr": loginGhcr,
  "promote-image": promoteImage,
  "publish-template": publishTemplate,
} satisfies Record<string, Command>;
const [command, ...args] = bun.argv.slice(2);

if (!command) {
  console.error("a command is needed");
  process.exit(1);
}

if (!(command in commands)) {
  console.error(`unknown command: ${command}`);
  process.exit(1);
}

const result = await commands[command as CommandName](args);
if (result.isError) {
  console.error(result.error);
  process.exitCode = 1;
}
