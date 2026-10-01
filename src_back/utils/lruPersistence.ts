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
	/** Save interval for the auto-save loop. Defaults to 30 s. */
	intervalMs?: number;
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

const DEFAULT_INTERVAL_MS = 30_000;

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
	private timer: NodeJS.Timeout | null = null;
	private filePath: string = "";
	private readonly serialize: (value: V) => S;
	private readonly deserialize: (value: S) => V;
	private readonly label: string;

	constructor(private readonly opts: LRUPersistenceOptions<K, V, S>) {
		this.serialize = opts.serialize ?? ((v) => v as unknown as S);
		this.deserialize = opts.deserialize ?? ((v) => v as unknown as V);
		this.label = opts.name ?? path.basename(opts.fileName);
		this.filePath = path.resolve(this.opts.fileName);
	}

	/** Restore the cache from disk. Silent no-op when the file doesn't exist yet. */
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
	}

	/** Atomic dump to disk: write to `.tmp` then rename, so a crash never leaves half-written JSON. */
	async save(): Promise<void> {
		const dump: Dump<K, S> = this.opts.cache.dump().map(([k, e]) => {
			const { value, ...rest } = e;
			return [k as K, { ...rest, value: this.serialize(value) }];
		});
		await mkdir(path.dirname(this.filePath), { recursive: true });
		const tmp = this.filePath + ".tmp";
		await writeFile(tmp, JSON.stringify(dump), "utf8");
		await rename(tmp, this.filePath);
	}

	/** Start the periodic-save loop. Idempotent; the timer is unref'd so it doesn't block process exit. */
	start(): void {
		if (this.timer) return;
		this.timer = setInterval(() => {
			void this.save().catch((e) =>
				console.error(`[lru-persist:${this.label}] save failed`, e),
			);
		}, this.opts.intervalMs ?? DEFAULT_INTERVAL_MS);
		this.timer.unref();
	}

	/** Stop the periodic-save loop. Does NOT flush, call `save()` explicitly if needed. */
	stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}
}
