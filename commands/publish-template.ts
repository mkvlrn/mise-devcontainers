import fs from "node:fs/promises";
import path from "node:path";
import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { z } from "zod";
import { dirExists, parseArgs, pathFinder } from "./misc/lib";
import { distroList, publishTemplatesSchema } from "./misc/schemas";

const namespace = "mkvlrn/mise-devcontainers";
const templateMetadataSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
});
const containerConfigSchema = z.object({ image: z.string().min(1) }).passthrough();

type PublicationOptions = z.output<typeof publishTemplatesSchema>;

type PublicationDependencies = {
  collectionDir: string;
  templateDir: (distro: string) => string;
  getImageDigest: (ref: string) => Promise<string>;
  restoreTemplate: (distro: string, destination: string) => Promise<void>;
  publishTemplates: (directory: string) => Promise<void>;
};

const dependencies: PublicationDependencies = {
  collectionDir: pathFinder.publishCollectionDir(),
  templateDir: pathFinder.downloadedTemplateDir,
  getImageDigest,
  restoreTemplate,
  publishTemplates: async (directory) => {
    await Bun.$`devcontainer templates publish --registry ghcr.io --namespace ${namespace} ${directory}`;
  },
};

export async function run(args: string[]): ResultAsync<true, Error> {
  const parse = parseArgs(
    { distros: "string", candidateTag: "string", imageVersion: "string" },
    publishTemplatesSchema,
    args,
  );
  if (parse.isError) {
    return errResult(
      new Error("could not parse template publication args", { cause: parse.error }),
    );
  }

  try {
    await publishCollection(parse.value);
    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not publish template collection", { cause: err }));
  }
}

export async function publishCollection(
  options: PublicationOptions,
  io: PublicationDependencies = dependencies,
): Promise<void> {
  await fs.rm(io.collectionDir, { recursive: true, force: true });
  await fs.mkdir(io.collectionDir, { recursive: true });

  for (const distro of distroList) {
    const destination = path.join(io.collectionDir, distro);
    const changed = options.distros.includes(distro);

    if (changed) {
      const source = io.templateDir(distro);
      if (!(await dirExists(source))) {
        throw new Error(`tested template for ${distro} doesn't exist`);
      }
      await fs.cp(source, destination, { recursive: true });
    } else {
      try {
        await io.restoreTemplate(distro, destination);
      } catch (err) {
        throw new Error(
          `could not restore published template for ${distro}; all five templates are required. If it has never been published, change .rebuild-all to validate and release every distro`,
          { cause: err },
        );
      }
    }

    const metadata = templateMetadataSchema.parse(
      await Bun.file(path.join(destination, "devcontainer-template.json")).json(),
    );
    if (metadata.id !== distro) {
      throw new Error(`template ID ${metadata.id} does not match distro ${distro}`);
    }

    const configPath = path.join(destination, ".devcontainer", "devcontainer.json");
    const config = containerConfigSchema.parse(await Bun.file(configPath).json());

    if (changed) {
      const imageRef = pathFinder.imageRef(distro);
      const candidateRef = `${imageRef}:${options.candidateTag}`;
      if (metadata.version !== options.imageVersion || config.image !== candidateRef) {
        throw new Error(`tested template for ${distro} does not match the validated release`);
      }

      const candidateDigest = await io.getImageDigest(candidateRef);
      const currentRef = `${imageRef}:current`;
      const currentDigest = await io.getImageDigest(currentRef);
      if (candidateDigest !== currentDigest) {
        throw new Error(`current image for ${distro} does not match tested candidate`);
      }

      config.image = `${currentRef}@${currentDigest}`;
      await Bun.write(configPath, `${JSON.stringify(config, null, 2)}\n`);
    }
  }

  // Each CLI invocation replaces collection metadata, so publish only after all distros are ready.
  await io.publishTemplates(io.collectionDir);
}

async function getImageDigest(ref: string): Promise<string> {
  const output = await Bun.$`docker buildx imagetools inspect ${ref}`.text();
  // biome-ignore lint/performance/useTopLevelRegex: single use
  const digest = output.match(/^Digest:\s+(sha256:[a-f0-9]{64})$/m)?.[1];
  if (!digest) {
    throw new Error(`could not resolve digest for ${ref}`);
  }
  return digest;
}

async function restoreTemplate(distro: string, destination: string): Promise<void> {
  const downloadDir = await fs.mkdtemp(`${destination}-download-`);
  try {
    // Pull the original package, not an applied template: applying drops metadata and resolves options.
    await Bun.$`oras pull --output ${downloadDir} ${`ghcr.io/${namespace}/${distro}:latest`}`;
    const archive = path.join(downloadDir, `devcontainer-template-${distro}.tgz`);
    await fs.mkdir(destination, { recursive: true });
    await Bun.$`tar --extract --file ${archive} --directory ${destination} --no-same-owner`;
  } finally {
    await fs.rm(downloadDir, { recursive: true, force: true });
  }
}
