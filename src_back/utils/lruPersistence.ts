import { LRUCache } from "lru-cache";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type DumpEntry<V> = { value: V; ttl?: number; start?: number; size?: number };
type Dump<K extends string | number, V> = Array<[K, DumpEntry<V>]>;

export type LRUPersistenceOptions<K extends string | number, V extends {}, S = V> = {
	/** The cache to persist. The same instance is used for load and save. */
	cache: LRUCache<K, V>;
	/** Absolute file path for the on-disk snapshot. */
	fileName: string;
	/**
	 * Convert a cached value to a JSON-safe form before writing.
	 * Needed when V contains things JSON can't represent (Set, Map, BigInt, …).
	 */
	serialize?: (value: V) => S;
	/** Reverse of `serialize`, applied after reading from disk. */
	deserialize?: (value: S) => V;
	/** Optional label used in log messages so multiple caches are distinguishable. */
	name?: string;
};

const loadedCaches = new Set<() => Promise<void>>();
let shutdownHooked = false;
let shutdownSave: Promise<void> | null = null;

/**
 * Saves caches to disk when process shutsdown
 */
function hookShutdown(): void {
	if (shutdownHooked) return;
	shutdownHooked = true;
	for (const signal of ["SIGINT", "SIGTERM"]) {
		process.once(signal, () => {
			// Shared so a SIGINT followed by a SIGTERM doesn't write the same `.tmp` files concurrently
			if (!shutdownSave) {
				console.info(
					`[lru-persist] ${signal} received, saving ${loadedCaches.size} cache(s)`,
				);
				shutdownSave = Promise.all([...loadedCaches].map((save) => save())).then(() => {});
			}
			void shutdownSave.then(() => {
				if (process.listenerCount(signal) === 0) process.exit(0);
			});
		});
	}
}

/**
 * Persists an `lru-cache` instance to a JSON file. TTL/start metadata is preserved
 * by lru-cache's dump format, so entries past their window stay expired after a reload.
 *
 * Single-process only, if you ever run multiple writers against the same file,
 * switch to a shared store (Redis) instead.
 *
 * Ported from the Twitchat extension EBS (originally keyed off an env var); here
 * the caller passes an absolute path built from `Config`.
 */
export class LRUPersistence<K extends string | number, V extends {}, S = V> {
	private filePath: string = "";
	private readonly serialize: (value: V) => S;
	private readonly deserialize: (value: S) => V;
	private readonly label: string;

	private readonly saveOnShutdown = (): Promise<void> =>
		this.save().catch((e) => console.error(`[lru-persist:${this.label}] save failed`, e));

	constructor(private readonly opts: LRUPersistenceOptions<K, V, S>) {
		this.serialize = opts.serialize ?? ((v) => v as unknown as S);
		this.deserialize = opts.deserialize ?? ((v) => v as unknown as V);
		this.label = opts.name ?? path.basename(opts.fileName);
		this.filePath = path.resolve(this.opts.fileName);
	}

	/**
	 * Restore the cache from disk. Silent no-op when the file doesn't exist yet.
	 */
	async load(): Promise<void> {
		try {
			const raw = await readFile(this.filePath, "utf8");
			const dump = JSON.parse(raw) as Dump<K, S>;
			const entries = dump.map(([k, e]) => {
				const { value, ...rest } = e;
				return [k, { ...rest, value: this.deserialize(value) }] as const;
			});
			this.opts.cache.load(entries as Parameters<LRUCache<K, V>["load"]>[0]);
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
				console.error(`[lru-persist:${this.label}] load failed`, e);
			}
		}

		loadedCaches.add(this.saveOnShutdown);
		hookShutdown();
	}

	/** Atomic dump to disk: write to `.tmp` then rename, so a crash never leaves half-written JSON. */
	async save(): Promise<void> {
		// Not using `cache.dump()` which is ~20x slower than this loop
		const dump: Dump<K, S> = [];
		for (const k of this.opts.cache.rkeys()) {
			const entry = this.opts.cache.info(k);
			if (!entry) continue;
			const { value, ...rest } = entry;
			dump.push([k, { ...rest, value: this.serialize(value) }]);
		}
		await mkdir(path.dirname(this.filePath), { recursive: true });
		const tmp = this.filePath + ".tmp";
		await writeFile(tmp, JSON.stringify(dump), "utf8");
		await rename(tmp, this.filePath);
	}
}
