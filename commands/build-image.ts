import path from "node:path";
import { errResult, okResult, type ResultAsync } from "@mkvlrn/result";
import { parseArgs, pathFinder, prepareOverlayDir } from "./misc/lib";
import { distroTagCacheSchema } from "./misc/schemas";

export async function run(args: string[]): ResultAsync<true, Error> {
  const parse = parseArgs(
    { distro: "string", candidateTag: "string", "no-cache": "boolean" },
    distroTagCacheSchema,
    args,
  );
  if (parse.isError) {
    return errResult(new Error("could not parse image build args", { cause: parse.error }));
  }

  const { distro, candidateTag, "no-cache": noCache } = parse.value;
  const imageRef = pathFinder.imageRef(distro);
  const commonDir = pathFinder.distrosDir("_common");
  const distroDir = pathFinder.distrosDir(distro);
  const outputDir = pathFinder.buildImageDir(distro);

  const preparation = await prepareBuildFiles(commonDir, distroDir, outputDir);
  if (preparation.isError) {
    return errResult(preparation.error);
  }

  const merge = await mergeDockerfiles(commonDir, outputDir);
  if (merge.isError) {
    return errResult(merge.error);
  }

  const build = await buildImage(imageRef, noCache ?? false, candidateTag, outputDir);
  if (build.isError) {
    return errResult(build.error);
  }

  return okResult(true);
}

async function prepareBuildFiles(
  commonDir: string,
  distroDir: string,
  outputDir: string,
): ResultAsync<true, Error> {
  try {
    await prepareOverlayDir(commonDir, distroDir, outputDir);

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not prepare build files", { cause: err }));
  }
}

async function mergeDockerfiles(commonDir: string, outputDir: string): ResultAsync<true, Error> {
  try {
    const commonDockerfile = Bun.file(path.join(commonDir, "Dockerfile"));
    const distroDockerfile = Bun.file(path.join(outputDir, "Dockerfile"));
    const mergedDockerfile = `${await distroDockerfile.text()}${await commonDockerfile.text()}`;
    await Bun.write(distroDockerfile, mergedDockerfile);

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not merge Dockerfiles", { cause: err }));
  }
}

async function buildImage(
  imageRef: string,
  noCache: boolean,
  candidateTag: string,
  outputDir: string,
): ResultAsync<true, Error> {
  const cacheFlag: string[] = [];
  if (noCache) {
    cacheFlag.push("--no-cache");
  }

  const dockerArgs: string[] = [];
  dockerArgs.push("--push");
  dockerArgs.push(...["--cache-from", `type=registry,ref=${imageRef}:buildcache`]);
  dockerArgs.push(...["--cache-to", `type=registry,ref=${imageRef}:buildcache,mode=max`]);
  dockerArgs.push(...["--secret", "id=mise_github_token,env=MISE_GITHUB_TOKEN"]);
  dockerArgs.push(...cacheFlag);
  dockerArgs.push(...["-t", `${imageRef}:${candidateTag}`]);
  dockerArgs.push(...["-f", `${outputDir}/Dockerfile`]);
  dockerArgs.push(outputDir);

  try {
    const proc = Bun.spawn(["docker", "buildx", "build", ...dockerArgs], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`docker build failed with exit code ${exitCode}`);
    }

    return okResult(true);
  } catch (err) {
    return errResult(new Error("could not build image", { cause: err }));
  }
}
