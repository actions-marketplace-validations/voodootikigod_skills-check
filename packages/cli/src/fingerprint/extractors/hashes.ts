import { createHash } from "node:crypto";
import { countTokens } from "../../budget/tokenizer.js";

/**
 * Watermark format: <!-- skill:name/version source -->
 * Source is optional.
 */
const WATERMARK_RE = /<!--\s*skill:([^/\s]+)\/(\S+?)(?:\s+(\S+))?\s*-->/;

export interface WatermarkInfo {
	name: string;
	version: string;
	source?: string;
}

/**
 * Extract watermark from skill content.
 */
export function extractWatermark(content: string): WatermarkInfo | null {
	const match = WATERMARK_RE.exec(content);
	if (!match) return null;
	return {
		name: match[1],
		version: match[2],
		source: match[3] || undefined,
	};
}

/**
 * Generate a watermark comment string.
 */
export function generateWatermark(name: string, version: string, source?: string): string {
	const parts = [`skill:${name}/${version}`];
	if (source) parts.push(source);
	return `<!-- ${parts.join(" ")} -->`;
}

/**
 * Compute a hash of the given text.
 */
function computeHash(text: string, algorithm = "sha256"): string {
	return createHash(algorithm).update(text, "utf-8").digest("hex");
}

/**
 * Compute SHA-256 of raw YAML frontmatter (between --- markers).
 */
export function computeFrontmatterHash(frontmatterRaw: string, algorithm = "sha256"): string {
	return computeHash(frontmatterRaw, algorithm);
}

/**
 * Normalize content for hashing: collapse whitespace, strip HTML comments.
 */
export function normalizeContent(content: string): string {
	return content
		.replace(/<!--[\s\S]*?-->/g, "") // strip HTML comments
		.replace(/\s+/g, " ") // collapse whitespace
		.trim();
}

/**
 * Compute SHA-256 of normalized full content.
 */
export function computeContentHash(content: string, algorithm = "sha256"): string {
	return computeHash(normalizeContent(content), algorithm);
}

/**
 * Compute SHA-256 of first 500 tokens of normalized content.
 */
export function computePrefixHash(content: string, algorithm = "sha256"): string {
	const normalized = normalizeContent(content);
	// Approximate: split by whitespace, take first 500 tokens
	// Use budget tokenizer for accurate count
	const tokens = countTokens(normalized);
	if (tokens <= 500) {
		return computeHash(normalized, algorithm);
	}
	// Take approximately the first 500 tokens worth of text
	const words = normalized.split(/\s+/);
	let prefix = "";
	let tokenCount = 0;
	for (const word of words) {
		const newPrefix = prefix ? `${prefix} ${word}` : word;
		tokenCount = countTokens(newPrefix);
		if (tokenCount > 500) break;
		prefix = newPrefix;
	}
	return computeHash(prefix, algorithm);
}

/**
 * Extract raw frontmatter string from SKILL.md content.
 */
export function extractRawFrontmatter(raw: string): string | null {
	const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
	return match ? match[1] : null;
}
