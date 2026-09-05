import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { distroList, publishTemplatesSchema } from "./misc/schemas";
import { publishCollection } from "./publish-template";

const distros = ["alpine", "archlinux", "debian", "fedora", "ubuntu"];
const candidateTag = "candidate-test-123";
const imageVersion = "2026.9.5";
const digest = `sha256:${"a".repeat(64)}`;
const metadataFile = "devcontainer-template.json";
const configFile = ".devcontainer/devcontainer.json";
const imageRef = (distro: string) => `ghcr.io/mkvlrn/mise-devcontainer-${distro}`;
const options = (changed = distros) => ({ distros: changed, candidateTag, imageVersion });
type Io = NonNullable<Parameters<typeof publishCollection>[1]>;

function required<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error("expected fixture value to exist");
  }
  return value;
}

// Buffers preserve whitespace, line endings, and binary helper content in comparisons.
async function snapshot(directory: string): Promise<Record<string, Buffer>> {
  const files: Record<string, Buffer> = {};
  async function visit(relative: string): Promise<void> {
    for (const entry of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
      const name = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        await visit(name);
      } else {
        files[name] = await fs.readFile(path.join(directory, name));
      }
    }
  }
  await visit("");
  return files;
}

async function writeTemplate(directory: string, distro: string, restored: boolean): Promise<void> {
  await fs.mkdir(path.join(directory, ".devcontainer", "helpers"), { recursive: true });
  await fs.writeFile(
    path.join(directory, metadataFile),
    `${JSON.stringify(
      {
        id: distro,
        version: restored ? "2025.1.2" : imageVersion,
        name: `${distro} template`,
        options: { greeting: { type: "string", default: "hello" } },
      },
      null,
      4,
    )}\n`,
  );
  await fs.writeFile(
    path.join(directory, configFile),
    `${JSON.stringify(
      {
        image: restored
          ? `${imageRef(distro)}:old@${digest}`
          : `${imageRef(distro)}:${candidateTag}`,
        remoteUser: "vscode",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: preserve unresolved Dev Container options
        containerEnv: { GREETING: "${templateOption:greeting}" },
        customizations: { vscode: { extensions: ["example.extension"] } },
      },
      null,
      4,
    )}\r\n`,
  );
  await fs.writeFile(
    path.join(directory, ".devcontainer", "helpers", "setup.sh"),
    "#!/bin/sh\r\necho 'hello'\r\n",
  );
  await fs.writeFile(
    path.join(directory, ".devcontainer", "helpers", "data.bin"),
    Buffer.from([0, 255, 13, 10, 128]),
  );
  await fs.writeFile(path.join(directory, "README.md"), `# ${distro}\n\nKeep trailing spaces.  \n`);
}

async function withFixture(
  run: (fixture: {
    io: Io;
    sourceDir: string;
    publishedDir: string;
    digestCalls: string[];
    restoreCalls: { distro: string; destination: string }[];
    publications: { directory: string; children: string[]; files: Record<string, Buffer> }[];
  }) => Promise<void>,
): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "publish-template-test-"));
  try {
    const sourceDir = path.join(root, "tested");
    const publishedDir = path.join(root, "published");
    for (const distro of distros) {
      await writeTemplate(path.join(sourceDir, distro), distro, false);
      await writeTemplate(path.join(publishedDir, distro), distro, true);
    }
    const digestCalls: string[] = [];
    const restoreCalls: { distro: string; destination: string }[] = [];
    const publications: { directory: string; children: string[]; files: Record<string, Buffer> }[] =
      [];
    const io: Io = {
      collectionDir: path.join(root, "collection"),
      templateDir: (distro) => path.join(sourceDir, distro),
      getImageDigest: (ref) => {
        digestCalls.push(ref);
        return Promise.resolve(digest);
      },
      restoreTemplate: async (distro, destination) => {
        restoreCalls.push({ distro, destination });
        await fs.cp(path.join(publishedDir, distro), destination, { recursive: true });
      },
      publishTemplates: async (directory) => {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        if (!entries.every((entry) => entry.isDirectory())) {
          throw new Error("collection must contain only template directories");
        }
        publications.push({
          directory,
          children: entries.map((entry) => entry.name).sort(),
          files: await snapshot(directory),
        });
      },
    };
    await run({ io, sourceDir, publishedDir, digestCalls, restoreCalls, publications });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function patchJson(
  directory: string,
  file: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const filename = path.join(directory, file);
  const value = JSON.parse(await fs.readFile(filename, "utf8"));
  await fs.writeFile(filename, JSON.stringify({ ...value, ...patch }));
}

describe("publishCollection", () => {
  test("publishes all five once, pins digests, and leaves tested artifacts unchanged", async () => {
    await withFixture(async ({ io, sourceDir, digestCalls, restoreCalls, publications }) => {
      expect([...distroList].sort()).toEqual(distros);
      const original = await snapshot(sourceDir);
      const expected = { ...original };
      for (const distro of distros) {
        const key = path.join(distro, configFile);
        const config = JSON.parse(required(original[key]).toString());
        config.image = `${imageRef(distro)}:current@${digest}`;
        expected[key] = Buffer.from(`${JSON.stringify(config, null, 2)}\n`);
      }

      await publishCollection(options(), io);

      expect(publications).toEqual([
        { directory: io.collectionDir, children: distros, files: expected },
      ]);
      expect(digestCalls).toEqual(
        distroList.flatMap((distro) => [
          `${imageRef(distro)}:${candidateTag}`,
          `${imageRef(distro)}:current`,
        ]),
      );
      expect(restoreCalls).toEqual([]);
      expect(await snapshot(sourceDir)).toEqual(original);
    });
  });

  test("partial release restores unchanged packages byte-identically and submits all five", async () => {
    await withFixture(
      async ({ io, sourceDir, publishedDir, digestCalls, restoreCalls, publications }) => {
        const original = await snapshot(sourceDir);
        const published = await snapshot(publishedDir);
        // Unchanged distros must come from restoration, not downloaded artifacts.
        for (const distro of distros.filter((name) => name !== "debian")) {
          await fs.rm(io.templateDir(distro), { recursive: true });
        }
        const remainingSource = await snapshot(sourceDir);
        await publishCollection(options(["debian"]), io);

        expect(publications).toHaveLength(1);
        expect(required(publications[0]).directory).toBe(io.collectionDir);
        expect(required(publications[0]).children).toEqual(distros);
        expect(restoreCalls).toEqual(
          distroList
            .filter((name) => name !== "debian")
            .map((distro) => ({
              distro,
              destination: path.join(io.collectionDir, distro),
            })),
        );
        expect(digestCalls).toEqual([
          `${imageRef("debian")}:${candidateTag}`,
          `${imageRef("debian")}:current`,
        ]);
        const expected = { ...published };
        for (const [name, bytes] of Object.entries(original)) {
          if (name.startsWith(`debian${path.sep}`)) {
            expected[name] = bytes;
          }
        }
        const configKey = path.join("debian", configFile);
        const config = JSON.parse(required(original[configKey]).toString());
        config.image = `${imageRef("debian")}:current@${digest}`;
        expected[configKey] = Buffer.from(`${JSON.stringify(config, null, 2)}\n`);
        expect(required(publications[0]).files).toEqual(expected);
        expect(await snapshot(sourceDir)).toEqual(remainingSource);
        expect(await snapshot(publishedDir)).toEqual(published);
      },
    );
  });

  test("cleans stale collection children and files within current distro directories", async () => {
    await withFixture(async ({ io, sourceDir, publications }) => {
      await fs.mkdir(path.join(io.collectionDir, "obsolete"), { recursive: true });
      await fs.mkdir(path.join(io.collectionDir, "alpine"), { recursive: true });
      await fs.writeFile(path.join(io.collectionDir, "obsolete", "old.txt"), "stale");
      await fs.writeFile(path.join(io.collectionDir, "alpine", "stale.txt"), "stale");
      await fs.writeFile(path.join(io.collectionDir, "old-index.json"), "{}");
      await publishCollection(options(), io);
      expect(publications).toHaveLength(1);
      expect(required(publications[0]).children).toEqual(distros);
      expect(Object.keys(required(publications[0]).files).sort()).toEqual(
        Object.keys(await snapshot(sourceDir)).sort(),
      );
    });
  });

  test.each([
    ["ID", metadataFile, { id: "wrong-distro" }, "does not match distro"],
    ["version", metadataFile, { version: "0.0.0" }, "does not match the validated release"],
    [
      "image",
      configFile,
      { image: `${imageRef("ubuntu")}:wrong-tag` },
      "does not match the validated release",
    ],
  ] as const)(
    "blocks publication for mismatched tested %s",
    async (_label, file, patch, message) => {
      await withFixture(async ({ io, publications }) => {
        await patchJson(io.templateDir("ubuntu"), file, patch);
        await expect(publishCollection(options(), io)).rejects.toThrow(message);
        expect(publications).toEqual([]);
      });
    },
  );

  test("missing tested artifact blocks publication even after earlier templates were staged", async () => {
    await withFixture(async ({ io, publications }) => {
      await fs.rm(io.templateDir("ubuntu"), { recursive: true });
      await expect(publishCollection(options(), io)).rejects.toThrow(
        "tested template for ubuntu doesn't exist",
      );
      expect(publications).toEqual([]);
    });
  });

  test("digest mismatch blocks publication", async () => {
    await withFixture(async ({ io, publications }) => {
      io.getImageDigest = (ref) =>
        Promise.resolve(ref.endsWith(":current") ? `sha256:${"b".repeat(64)}` : digest);
      await expect(publishCollection(options(), io)).rejects.toThrow(
        "does not match tested candidate",
      );
      expect(publications).toEqual([]);
    });
  });

  test("restore failure blocks publication and explains recovery", async () => {
    await withFixture(async ({ io, publications }) => {
      io.restoreTemplate = () => Promise.reject(new Error("not found"));
      await expect(publishCollection(options(["alpine"]), io)).rejects.toThrow(
        "change .rebuild-all",
      );
      expect(publications).toEqual([]);
    });
  });

  test("invalid restored metadata blocks publication", async () => {
    await withFixture(async ({ io, publishedDir, publications }) => {
      await patchJson(path.join(publishedDir, "ubuntu"), metadataFile, { id: "alpine" });
      await expect(publishCollection(options(["debian"]), io)).rejects.toThrow(
        "does not match distro ubuntu",
      );
      expect(publications).toEqual([]);
    });
  });

  test("publishing failures propagate", async () => {
    await withFixture(async ({ io }) => {
      io.publishTemplates = () => Promise.reject(new Error("registry unavailable"));
      await expect(publishCollection(options(), io)).rejects.toThrow("registry unavailable");
    });
  });
});

describe("publication arguments", () => {
  test.each(["invalid JSON", "[]", '["alpine", "alpine"]', '["unknown"]', "{}"])(
    "rejects invalid distro list %s",
    (value) => {
      expect(publishTemplatesSchema.safeParse({ ...options(), distros: value }).success).toBe(
        false,
      );
    },
  );

  test("accepts a partial release", () => {
    expect(publishTemplatesSchema.parse({ ...options(), distros: '["ubuntu"]' })).toEqual(
      options(["ubuntu"]),
    );
  });
});
