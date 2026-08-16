import fs from "node:fs/promises";
import path from "node:path";
import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { $ } from "bun";
import { dirExists, parseArgs, pathFinder } from "./misc/lib";
import { distroTagSchema } from "./misc/schemas";

export async function run(args: string[]): ResultAsync<true, Error> {
  const parse = parseArgs({ distro: "string", candidateTag: "string" }, distroTagSchema, args);
  if (parse.isError) {
    return errResult(new Error("could not parse template creation args", { cause: parse.error }));
  }

  const { distro, candidateTag } = parse.value;
  const imageRef = pathFinder.imageRef(distro);
  const candidateRef = `${imageRef}:${candidateTag}`;
  const currentRef = `${imageRef}:current`;
  const templateOutputDir = pathFinder.publishTemplateDir(distro);
  const containerConfigPath = path.join(templateOutputDir, ".devcontainer", "devcontainer.json");

  if (!(await dirExists(templateOutputDir))) {
    return errResult(new Error(`template for ${distro} doesn't exist`));
  }

  const currentDigest = await resolveImageDigest(candidateRef, currentRef);
  if (currentDigest.isError) {
    return errResult(currentDigest.error);
  }

  const preparation = await preparePublication(
    containerConfigPath,
    currentRef,
    currentDigest.value,
    templateOutputDir,
  );
  if (preparation.isError) {
    return errResult(preparation.error);
  }

  const publish = await publishTemplate();
  if (publish.isError) {
    return errResult(publish.error);
  }

  return okResult(true);
}

async function getImageDigest(ref: string): Promise<string> {
  const output = await $`docker buildx imagetools inspect ${ref}`.text();
  // biome-ignore lint/performance/useTopLevelRegex: single use
  const digest = output.match(/^Digest:\s+(sha256:[a-f0-9]+)$/m)?.[1];

  if (!digest) {
    throw new Error(`could not resolve digest for ${ref}`);
  }

  return digest;
}

async function resolveImageDigest(
  candidateRef: string,
  currentRef: string,
): ResultAsync<string, Error> {
  try {
    const candidateDigest = await getImageDigest(candidateRef);
    const currentDigest = await getImageDigest(currentRef);

    if (candidateDigest !== currentDigest) {
      throw new Error("current image does not match tested candidate");
    }

    return okResult(currentDigest);
  } catch (err) {
    return errResult(new Error("could not resolve image digests", { cause: err }));
  }
}

async function preparePublication(
  containerConfigPath: string,
  currentRef: string,
  currentDigest: string,
  templateOutputDir: string,
) {
  try {
    const containerConfig = await Bun.file(containerConfigPath).json();
    containerConfig.image = `${currentRef}@${currentDigest}`;
    await Bun.write(containerConfigPath, `${JSON.stringify(containerConfig, null, 2)}\n`);

    await fs.rm(pathFinder.publishCollectionDir(), { recursive: true, force: true });
    await fs.mkdir(pathFinder.publishCollectionDir(), { recursive: true });
    await fs.cp(templateOutputDir, pathFinder.publishCollectionDir(), {
      recursive: true,
      force: true,
    });

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not prepare collection publication", { cause: err }));
  }
}

async function publishTemplate(): ResultAsync<true, Error> {
  try {
    await $`devcontainer templates publish \
        --registry ghcr.io \
        --namespace mkvlrn/mise-devcontainers \
        ${pathFinder.publishCollectionDir()}`;

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not publish template collection", { cause: err }));
  }
}
