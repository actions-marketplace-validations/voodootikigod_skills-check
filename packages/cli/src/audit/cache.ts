import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

let bypassCache = false;
let disableCache = false;

export function configureCache(options: { force?: boolean; noCache?: boolean }): void {
	if (options.force !== undefined) {
		bypassCache = options.force;
	}
	if (options.noCache !== undefined) {
		disableCache = options.noCache;
	}
}

export function getCacheDir(): string {
	return join(homedir(), ".cache", "skills-check", "audit");
}

interface CacheEntry {
	timestamp: number;
	value: boolean;
}

let dirEnsured = false;

export function resetCacheState(): void {
	dirEnsured = false;
}

async function ensureCacheDir(): Promise<void> {
	if (dirEnsured) {
		return;
	}
	try {
		await mkdir(getCacheDir(), { recursive: true, mode: 0o700 });
		dirEnsured = true;
	} catch {
		// Cache dir creation failed — will fall through to in-memory only
	}
}

function cacheFilePath(ecosystem: string, name: string): string {
	const hash = createHash("sha256").update(`${ecosystem}:${name}`).digest("hex");
	return join(getCacheDir(), `${hash}.json`);
}

export async function getCached(
	ecosystem: string,
	name: string,
	ttlMs = DEFAULT_TTL_MS
): Promise<boolean | undefined> {
	if (disableCache || bypassCache) {
		return undefined;
	}
	const path = cacheFilePath(ecosystem, name);
	let raw: string;
	try {
		raw = await readFile(path, "utf-8");
	} catch {
		return undefined; // cache miss
	}

	try {
		const entry = JSON.parse(raw);
		if (Date.now() - entry.timestamp >= ttlMs) {
			return undefined; // expired
		}
		return entry.value;
	} catch (_err) {
		try {
			await unlink(path);
		} catch {
			// ignore unlink failure
		}
		return undefined;
	}
}

export async function setCached(ecosystem: string, name: string, value: boolean): Promise<void> {
	if (disableCache) {
		return;
	}
	await ensureCacheDir();
	try {
		const path = cacheFilePath(ecosystem, name);
		const entry: CacheEntry = { value, timestamp: Date.now() };
		await writeFile(path, JSON.stringify(entry), "utf-8");
	} catch {
		// Silently fail — cache is advisory
	}
}

interface JsonCacheEntry {
	data: unknown;
	timestamp: number;
}

export async function getJsonCached(
	ecosystem: string,
	name: string,
	ttlMs = DEFAULT_TTL_MS
): Promise<unknown | undefined> {
	if (disableCache || bypassCache) {
		return undefined;
	}
	const path = cacheFilePath(ecosystem, name);
	let raw: string;
	try {
		raw = await readFile(path, "utf-8");
	} catch {
		return undefined; // cache miss
	}

	try {
		const entry = JSON.parse(raw);
		if (Date.now() - entry.timestamp >= ttlMs) {
			return undefined; // expired
		}
		return entry.data;
	} catch (_err) {
		try {
			await unlink(path);
		} catch {
			// ignore unlink failure
		}
		return undefined;
	}
}

export async function setJsonCached(ecosystem: string, name: string, data: unknown): Promise<void> {
	if (disableCache) {
		return;
	}
	await ensureCacheDir();
	try {
		const path = cacheFilePath(ecosystem, name);
		const entry: JsonCacheEntry = { data, timestamp: Date.now() };
		await writeFile(path, JSON.stringify(entry), "utf-8");
	} catch {
		// Silently fail — cache is advisory
	}
}
