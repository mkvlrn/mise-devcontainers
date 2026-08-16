import process from "node:process";
import bun from "bun";

const token = process.env["GHCR_TOKEN"];
const username = process.env["GHCR_USERNAME"];

if (!token) {
  throw new Error("GHCR_TOKEN is required");
}

if (!username) {
  throw new Error("GHCR_USERNAME is required");
}

const proc = bun.spawn(["docker", "login", "ghcr.io", "--username", username, "--password-stdin"], {
  stdin: "pipe",
  stdout: "inherit",
  stderr: "inherit",
});

proc.stdin.write(token);
proc.stdin.end();

const exitCode = await proc.exited;

if (exitCode !== 0) {
  throw new Error("GHCR login failed");
}
