import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import bun from "bun";
import { getArgs, readJsonc, values } from "./lib";
import { publishSchema } from "./schemas";
import ContainerConfig from "./templates/_common/.devcontainer/devcontainer.json" with {
  type: "jsonc",
};
import TemplateConfig from "./templates/_common/devcontainer-template.json" with { type: "jsonc" };

// parse args
const args = getArgs(
  { distro: "string", candidateTag: "string", imageVersion: "string" },
  publishSchema,
);
if (args.isError) {
  console.error(args.error.message);
  process.exit(1);
}

// vars
const { distro, candidateTag, imageVersion } = args.value;
const commonDir = values.templatesDir("_common");
const distroDir = values.templatesDir(distro);
const outputDir = values.publishTemplateDir(distro);

// prepare template files
await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
await fs.cp(commonDir, outputDir, { recursive: true, force: true });
await fs.cp(distroDir, outputDir, { recursive: true, force: true });

// configure config
const containerName = `mise-devcontainer-${distro}-\${localWorkspaceFolderBasename}`;
const containerConfigPath = path.join(outputDir, ".devcontainer", "devcontainer.json");
const containerConfig = await readJsonc<typeof ContainerConfig>(containerConfigPath);
containerConfig.name = containerName;
containerConfig.runArgs[0] = `--name=${containerName}`;
containerConfig.image = `${values.imageRef(distro)}:${candidateTag}`;
await bun.write(containerConfigPath, `${JSON.stringify(containerConfig, null, 2)}\n`);

// configure template
const templateConfigPath = path.join(outputDir, "devcontainer-template.json");
const templateConfig = await readJsonc<typeof TemplateConfig>(templateConfigPath);
templateConfig.version = imageVersion;
await bun.write(templateConfigPath, `${JSON.stringify(templateConfig, null, 2)}\n`);
