import fs from "node:fs/promises";
import path from "node:path";
import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import ContainerConfig from "../templates/_common/.devcontainer/devcontainer.json" with {
  type: "jsonc",
};
import TemplateConfig from "../templates/_common/devcontainer-template.json" with { type: "jsonc" };
import { parseArgs, pathFinder, readJsonc } from "./misc/lib";
import { distroTagImageSchema } from "./misc/schemas";

export async function run(args: string[]): ResultAsync<true, Error> {
  const parse = parseArgs(
    { distro: "string", candidateTag: "string", imageVersion: "string" },
    distroTagImageSchema,
    args,
  );
  if (parse.isError) {
    return errResult(new Error("could not parse template creation args", { cause: parse.error }));
  }

  const { distro, candidateTag, imageVersion } = parse.value;
  const commonDir = pathFinder.templatesDir("_common");
  const distroDir = pathFinder.templatesDir(distro);
  const outputDir = pathFinder.publishTemplateDir(distro);

  const preparation = await prepareTemplateFiles(commonDir, distroDir, outputDir);
  if (preparation.isError) {
    return errResult(preparation.error);
  }

  const configDc = await configureDevcontainerConfig(distro, outputDir, candidateTag);
  if (configDc.isError) {
    return errResult(configDc.error);
  }

  const configTemplate = await configureTemplate(outputDir, imageVersion);
  if (configTemplate.isError) {
    return errResult(configTemplate.error);
  }

  return okResult(true);
}

async function prepareTemplateFiles(
  commonDir: string,
  distroDir: string,
  outputDir: string,
): ResultAsync<true, Error> {
  try {
    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(outputDir, { recursive: true });
    await fs.cp(commonDir, outputDir, { recursive: true, force: true });
    await fs.cp(distroDir, outputDir, { recursive: true, force: true });

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not prepare template files", { cause: err }));
  }
}

async function configureDevcontainerConfig(
  distro: string,
  outputDir: string,
  candidateTag: string,
): ResultAsync<true, Error> {
  try {
    const containerName = `mise-devcontainer-${distro}-\${localWorkspaceFolderBasename}`;
    const containerConfigPath = path.join(outputDir, ".devcontainer", "devcontainer.json");
    const containerConfig = await readJsonc<typeof ContainerConfig>(containerConfigPath);
    containerConfig.name = containerName;
    containerConfig.runArgs[0] = `--name=${containerName}`;
    containerConfig.image = `${pathFinder.imageRef(distro)}:${candidateTag}`;
    await Bun.write(containerConfigPath, `${JSON.stringify(containerConfig, null, 2)}\n`);

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not configure devcontainer", { cause: err }));
  }
}

async function configureTemplate(
  outputDir: string,
  imageVersion: string,
): ResultAsync<true, Error> {
  try {
    const templateConfigPath = path.join(outputDir, "devcontainer-template.json");
    const templateConfig = await readJsonc<typeof TemplateConfig>(templateConfigPath);
    templateConfig.version = imageVersion;
    await Bun.write(templateConfigPath, `${JSON.stringify(templateConfig, null, 2)}\n`);

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not configure template", { cause: err }));
  }
}
