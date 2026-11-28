/**
 * Type declarations for what our tmi.js fork adds on top of @types/tmi.js
 */

declare module "tmi.js" {
	interface Actions {
		forceReconnect(): Promise<[string, number]>;
	}

	interface Events {
		socketclose(event: CloseEvent): void;
	}
}

export {};
