import process from "node:process";
import { $, file } from "bun";
import dayjs from "dayjs";
import { env } from "./env";
import { values } from "./lib";

// for arrays
const joinDistros = (distros: string[]) => distros.map((d) => `"${d}"`).join(",");

// vars
const candidateTag = `ci-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`;
const imageVersion = dayjs().format("YYYY.M.D-H.m.s");
const githubOutputFile = file(env.GITHUB_OUTPUT).writer();

// write to action outputs
githubOutputFile.write(`candidate_tag=${candidateTag}\n`);
githubOutputFile.write(`image_version=${imageVersion}\n`);

// distros for workflow_dispatch
if (env.GITHUB_EVENT_NAME === "workflow_dispatch") {
  if (env.INPUT_DISTRO === "all") {
    githubOutputFile.write(`distros=[${joinDistros(values.distros)}]\n`);
  } else {
    githubOutputFile.write(`distros=["${env.INPUT_DISTRO}"]\n`);
  }

  githubOutputFile.flush();
  process.exit(0);
}

// get changed files
const event = await file(env.GITHUB_EVENT_PATH).json();
const baseSha = event.pull_requests.base.sha;
const mergeSha = event.pull_requests.merge_commit_sha;
const changedFiles = (await $`git diff --name-only ${baseSha} ${mergeSha}`).text();

// changes in common trigger all builds
const changesInCommon = /^src\/_common/;
if (changesInCommon.test(changedFiles)) {
  githubOutputFile.write(`distros=[${joinDistros(values.distros)}]`);
  githubOutputFile.flush();
  process.exit(0);
}

// collect changed distros
const changedDistros: string[] = [];
for (const distro of values.distros) {
  if (changedFiles.includes(`src/${distro}`)) {
    changedDistros.push(distro);
  }
}
githubOutputFile.write(`distros=[${joinDistros(changedDistros)}]`);
githubOutputFile.flush();
