import process from "node:process";
import { $ } from "bun";
import { getArgs, values } from "./lib";
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
const { distro, candidateTag, imageVersion } = args.value;
const imageRef = values.imageRef(distro);
const candidateRef = `${imageRef}:${candidateTag}`;

// promote candidate image
console.log(`==> Promoting ${candidateRef}...`);
await $`docker buildx imagetools create \
  --prefer-index=false \
  -t ${`${imageRef}:${imageVersion}`} \
  -t ${`${imageRef}:latest`} \
  -t ${`${imageRef}:current`} \
  ${candidateRef}`;

console.log("==> Done!");
