import { errResult, okResult, type Result } from "@mkvlrn/result";

import { parseEnv } from "./misc/lib";

const validResults = ["success", "skipped"];

export function run(_: string[]): Result<true, Error> {
  const parsedEnv = parseEnv();

  if (parsedEnv.isError) {
    return errResult(new Error("error loading env vars", { cause: parsedEnv.error }));
  }

  const env = parsedEnv.value;
  const results = {
    "detect-changes": env.DETECT_CHANGES_RESULT,
    "build-image": env.BUILD_IMAGE_RESULT,
    "create-template": env.CREATE_TEMPLATE_RESULT,
    "test-template": env.TEST_TEMPLATE_RESULT,
  };

  for (const [job, result] of Object.entries(results)) {
    if (!(result && validResults.includes(result))) {
      return errResult(new Error(`${job} finished with result: ${result ?? "unknown"}`));
    }
  }

  return okResult(true);
}
