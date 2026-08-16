import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import bun, { $ } from "bun";
import { getArgs, values } from "./lib";
import { buildSchema } from "./schemas";

// parse args
const args = getArgs(
  { distro: "string", candidateTag: "string", "no-cache": "boolean" },
  buildSchema,
);
if (args.isError) {
  console.error(args.error.message);
  process.exit(1);
}

// vars
const { distro, candidateTag, "no-cache": noCache } = args.value;
const imageRef = values.imageRef(distro);
const commonDir = values.srcDir("_common");
const distroDir = values.srcDir(distro);
const outputDir = values.buildImageDir(distro);

// prepare build files
await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
await fs.cp(commonDir, outputDir, { recursive: true, force: true });
await fs.cp(distroDir, outputDir, { recursive: true, force: true });
await fs.unlink(path.join(outputDir, "binscripts", ".gitkeep"));

// merge Dockerfile
const commonDockerfile = bun.file(path.join(commonDir, "Dockerfile"));
const distroDockerfile = bun.file(path.join(outputDir, "Dockerfile"));
const mergedDockerfile = `${await distroDockerfile.text()}${await commonDockerfile.text()}`;
await bun.write(distroDockerfile, mergedDockerfile);

// build image
const dockerArgs = [
  "--push",
  "--cache-from",
  `type=registry,ref=${imageRef}:buildcache`,
  "--cache-to",
  `type=registry,ref=${imageRef}:buildcache,mode=max`,
  "--secret",
  "id=mise_github_token,env=MISE_GITHUB_TOKEN",
  // biome-ignore lint/style/noTernary: clear enough in here
  ...(noCache ? ["--no-cache"] : []),
  "-t",
  `${imageRef}:${candidateTag}`,
  "-f",
  `${outputDir}/Dockerfile`,
  outputDir,
];
await $`docker buildx build ${dockerArgs} > ${bun.stdout}`;
