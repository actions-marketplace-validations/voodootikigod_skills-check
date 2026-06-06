import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock homedir to use temp directory
let tempDir: string;

vi.mock("node:os", async () => {
	const actual = await vi.importActual("node:os");
	return {
		...actual,
		homedir: () => tempDir,
	};
});

// Import after mocking
const { getCached, setCached, resetCacheState } = await import("./cache.js");

describe("cache", () => {
	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "cache-test-"));
		resetCacheState();
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it("returns undefined for cache miss", async () => {
		const result = await getCached("npm", "nonexistent");
		expect(result).toBeUndefined();
	});

	it("stores and retrieves cache entries", async () => {
		await setCached("npm", "express", true);
		const result = await getCached("npm", "express");
		expect(result).toBe(true);
	});

	it("stores false values", async () => {
		await setCached("npm", "bad-pkg", false);
		const result = await getCached("npm", "bad-pkg");
		expect(result).toBe(false);
	});

	it("handles scoped package names", async () => {
		await setCached("npm", "@scope/pkg", true);
		const result = await getCached("npm", "@scope/pkg");
		expect(result).toBe(true);
	});

	it("returns undefined for expired entries", async () => {
		await setCached("npm", "expired", true);
		// Check with 0ms TTL — should be expired
		const result = await getCached("npm", "expired", 0);
		expect(result).toBeUndefined();
	});

	it("separates ecosystems", async () => {
		await setCached("npm", "pkg", true);
		await setCached("pypi", "pkg", false);

		expect(await getCached("npm", "pkg")).toBe(true);
		expect(await getCached("pypi", "pkg")).toBe(false);
	});

	it("recovers from corruption by deleting the file", async () => {
		const { getCacheDir } = await import("./cache.js");
		const { createHash } = await import("node:crypto");
		const fs = await import("node:fs/promises");

		await setCached("npm", "corrupt-pkg", true);

		const hash = createHash("sha256").update("npm:corrupt-pkg").digest("hex");
		const filePath = join(getCacheDir(), `${hash}.json`);
		await fs.writeFile(filePath, "{invalid-json}", "utf-8");

		const result = await getCached("npm", "corrupt-pkg");
		expect(result).toBeUndefined();

		await expect(fs.stat(filePath)).rejects.toThrow();
	});

	it("supports cache bypass and disable options", async () => {
		const { configureCache } = await import("./cache.js");

		await setCached("npm", "opt-pkg", true);

		configureCache({ force: true });
		expect(await getCached("npm", "opt-pkg")).toBeUndefined();

		configureCache({ force: false });
		expect(await getCached("npm", "opt-pkg")).toBe(true);

		configureCache({ noCache: true });
		expect(await getCached("npm", "opt-pkg")).toBeUndefined();

		await setCached("npm", "opt-pkg-2", true);
		configureCache({ noCache: false });

		expect(await getCached("npm", "opt-pkg-2")).toBeUndefined();
	});
});
