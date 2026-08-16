import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import bun, { $ } from "bun";
import { dirExists, getArgs, values } from "./lib";
import { publishSchema } from "./schemas";

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
const { distro, candidateTag } = args.value;
const imageRef = values.imageRef(distro);
const candidateRef = `${imageRef}:${candidateTag}`;
const currentRef = `${imageRef}:current`;
const templateOutputDir = values.publishTemplateDir(distro);
const containerConfigPath = path.join(templateOutputDir, ".devcontainer", "devcontainer.json");
const publishDir = path.join(values.root, ".publish-collection");
const publishTemplateDir = path.join(publishDir, distro);

// checks
if (!(await dirExists(templateOutputDir))) {
  console.error(`template for ${distro} does not exist`);
  process.exit(1);
}

// resolve image digest
async function getDigest(ref: string): Promise<string> {
  const output = await $`docker buildx imagetools inspect ${ref}`.text();
  const digest = output.match(/^Digest:\s+(sha256:[a-f0-9]+)$/m)?.[1];

  if (!digest) {
    throw new Error(`could not resolve digest for ${ref}`);
  }

  return digest;
}

console.log("==> Resolving image digests...");

const candidateDigest = await getDigest(candidateRef);
const currentDigest = await getDigest(currentRef);

if (candidateDigest !== currentDigest) {
  throw new Error("current image does not match tested candidate");
}

// pin image digest
const containerConfig = await bun.file(containerConfigPath).json();
containerConfig.image = `${currentRef}@${currentDigest}`;

await bun.write(containerConfigPath, `${JSON.stringify(containerConfig, null, 2)}\n`);

// prepare publication
await fs.rm(publishDir, { recursive: true, force: true });
await fs.mkdir(publishDir, { recursive: true });
await fs.cp(templateOutputDir, publishTemplateDir, { recursive: true, force: true });

// publish template
try {
  console.log("==> Publishing template...");

  await $`devcontainer templates publish \
    --registry ghcr.io \
    --namespace mkvlrn/mise-devcontainers \
    ${publishDir}`;
} finally {
  await fs.rm(publishDir, { recursive: true, force: true });
}

console.log("==> Done!");
