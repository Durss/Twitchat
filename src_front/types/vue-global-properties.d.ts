/**
 * Type declarations for Vue global properties
 * This fixes TypeScript errors for class-based components using vue-facing-decorator
 */

import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import type { VueI18n } from "vue-i18n";
import type { Store } from "pinia";
import type { IStore } from "@/store/StoreProxy";
import type Config from "@/utils/Config";
import type { TwitchatDataTypes } from "./TwitchatDataTypes";
import type { Reactive } from "vue";

declare module "@vue/runtime-core" {
	interface ComponentCustomProperties {
		// Vue Router
		$route: RouteLocationNormalizedLoaded;
		$router: Router;
		// Vue i18n (legacy mode)
		$i18n: VueI18n;
		$t: {
			(key: string): string;
			(key: string, value: number, { locale: string }): string;
			(key: string, values: Record<string, unknown>): string;
			(key: string, values: Record<string, unknown>, locale: string): string;
			// Support for pluralization with count as second parameter
			(key: string, count: number): string;
			// Support for pluralization with values and count
			(key: string, values: Record<string, unknown>, count: number): string;
			// Support for pluralization with values and count
			(key: string, values: (string | number)[], count: number): string;
		};
		/**
		 * @deprecated Use $t with count parameter instead
		 * $t("labelKey", count, { ...params })
		 */
		$tc: {
			(key: string, choice?: number): string;
			(key: string, choice: number, values: Record<string, unknown>): string;
			(key: string, choice: number, locale: string): string;
			(key: string, choice: number, values: Record<string, unknown>, locale: string): string;
		};
		$tm: (key: string) => unknown;
		$te: (key: string, locale?: string) => boolean;
		$d: (value: number | Date, key?: string) => string;
		$n: (value: number, key?: string) => string;

		// Custom properties (from your app)
		$asset: (path: string) => string;
		$store: IStore;
		$config: Reactive<Config>;
		$utils: typeof Utils;
		$asset: (path: string) => string;
		$placeDropdown: (
			dropdownList: HTMLDivElement,
			component: { $refs: { [key: string]: HTMLElement } },
			params: { width: string; left: string; top: string },
		) => void;
		$overlayURL: (
			id: TwitchatDataTypes.OverlayTypes,
			params?: { k: string; v: string }[],
		) => string;
		$confirm: <T>(
			title: string,
			description?: string,
			data?: T,
			yesLabel?: string,
			noLabel?: string,
		) => Promise<T | undefined>;
	}
}

export {};
