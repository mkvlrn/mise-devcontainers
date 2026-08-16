import { check, type Remote } from "./util";

export async function runBaseTests(remote: Remote): Promise<void> {
  for (const tool of ["mise", "docker", "fish", "git", "ssh"]) {
    await check(`${tool} is available`, async () => {
      const result = await remote(`command -v ${tool}`);
      return result.exitCode === 0;
    });
  }

  await check("docker-in-docker is available", async () => {
    const result = await remote("docker info");
    return result.exitCode === 0;
  });
}
