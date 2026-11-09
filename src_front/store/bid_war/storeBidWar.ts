import type { StoreActions } from "@/types/pinia-helpers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore } from "pinia";
import DataStore from "../DataStore";
import StoreProxy, {
	type IBidWarActions,
	type IBidWarGetters,
	type IBidWarState,
} from "../StoreProxy";

const MAX_AMOUNT = 1_000_000_000;
const DEFAULT_CURRENCY = "$" + Utils.CURRENCY_AMOUNT_TOKEN;

/**
 * All tip platforms enabled
 */
function getDefaultPlatforms(): TwitchatDataTypes.BidWarData["platforms"] {
	return {
		kofi: true,
		streamelements: true,
		streamlabs: true,
		tipeee: true,
		tiltify: true,
		streamlabs_charity: true,
	};
}

/**
 * Lowercases and strips accents so "Café" matches "cafe"
 */
function normalize(text: string): string {
	return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Builds a regex matching the given keyword as a whole word
 */
function keywordToRegExp(keyword: string): RegExp | null {
	const kw = normalize(keyword.trim());
	if (!kw) return null;
	const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp("(^|[^\\p{L}\\p{N}])" + escaped + "($|[^\\p{L}\\p{N}])", "u");
}

/**
 * Find side the user is tipping for based on the keyword used.
 * Returns -1 if no keyword or both keywords are found.
 */
function getMatchingSide(bidWar: TwitchatDataTypes.BidWarData, message: string): number {
	const normalizedMessage = normalize(message);
	const matches = bidWar.sides.map(
		(side) => keywordToRegExp(side.keyword)?.test(normalizedMessage) === true,
	);
	if (matches[0] === matches[1]) return -1;
	return matches[0] ? 0 : 1;
}

export const storeBidWar = defineStore("bidwar", {
	state: (): IBidWarState => ({
		bidWarList: [],
	}),

	actions: {
		populateData(): void {
			const json = DataStore.get(DataStore.BID_WAR_CONFIGS);
			if (json) {
				const data = JSON.parse(json) as IStoreData;
				this.bidWarList = data.bidWarList || [];
				this.bidWarList.forEach((entry) => {
					if (!entry.platforms) entry.platforms = getDefaultPlatforms();
				});
			}

			/**
			 * Called when a bid war overlay requests for its configs
			 */
			PublicAPI.instance.addEventListener("GET_BID_WAR_CONFIGS", (event) => {
				this.broadcastStates(event.data?.id);
			});
		},

		broadcastStates(id?: string): void {
			for (const entry of this.bidWarList) {
				if ((id && entry.id !== id) || !entry.enabled) continue;
				PublicAPI.instance.broadcast("ON_BID_WAR_CONFIGS", entry);
			}
		},

		createBidWar(): void {
			const max = StoreProxy.auth.isPremium
				? Config.instance.MAX_BID_WAR_PREMIUM
				: Config.instance.MAX_BID_WAR;
			if (this.bidWarList.length >= max) return;
			const data: TwitchatDataTypes.BidWarData = {
				id: Utils.getUUID(),
				title: "",
				enabled: true,
				currency: DEFAULT_CURRENCY,
				sides: [
					{ keyword: "", amount: 0, color: "#2f6fed" },
					{ keyword: "", amount: 0, color: "#d6127f" },
				],
				platforms: getDefaultPlatforms(),
			};
			this.bidWarList.push(data);
			this.saveData();
		},

		deleteBidWar(id: string): void {
			const index = this.bidWarList.findIndex((t) => t.id === id);
			if (index == -1) return;
			StoreProxy.main
				.confirm(
					StoreProxy.i18n.t("overlay.bidWar.delete_confirm.title"),
					StoreProxy.i18n.t("overlay.bidWar.delete_confirm.message"),
				)
				.then(() => {
					this.bidWarList.splice(index, 1);
					this.saveData();
				})
				.catch(() => {});
		},

		saveData(): void {
			this.bidWarList.forEach((entry) => {
				entry.sides.forEach((side) => {
					const amount = Number(side.amount);
					side.amount = isNaN(amount) ? 0 : Math.max(0, Math.min(MAX_AMOUNT, amount));
				});
			});
			const data: IStoreData = {
				bidWarList: this.bidWarList,
			};
			DataStore.set(DataStore.BID_WAR_CONFIGS, data);
		},

		addAmount(id: string, sideIndex: number, amount: number): void {
			const entry = this.bidWarList.find((v) => v.id === id);
			const side = entry?.sides[sideIndex];
			if (!entry || !side || isNaN(amount)) return;
			side.amount = Math.round((side.amount + amount) * 100) / 100;
			this.saveData();
			this.broadcastStates(id);
		},

		setAmount(id: string, sideIndex: number, amount: number): void {
			const entry = this.bidWarList.find((v) => v.id === id);
			const side = entry?.sides[sideIndex];
			if (!entry || !side || isNaN(amount)) return;
			side.amount = Math.round(amount * 100) / 100;
			this.saveData();
			this.broadcastStates(id);
		},

		resetAmounts(id: string): void {
			const entry = this.bidWarList.find((v) => v.id === id);
			if (!entry) return;
			entry.sides.forEach((side) => (side.amount = 0));
			this.saveData();
			this.broadcastStates(id);
		},

		registerActivity(
			platform: keyof TwitchatDataTypes.BidWarData["platforms"],
			message: string,
			amount: number,
		): void {
			if (!message || !(amount > 0)) return;
			for (const entry of this.bidWarList) {
				if (!entry.enabled) continue;
				if (entry.platforms?.[platform] !== true) continue;
				const sideIndex = getMatchingSide(entry, message);
				if (sideIndex == -1) continue;
				this.addAmount(entry.id, sideIndex, amount);
			}
		},
	} satisfies StoreActions<"bidwar", IBidWarState, IBidWarGetters, IBidWarActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeBidWar, import.meta.hot));
}

interface IStoreData {
	bidWarList: TwitchatDataTypes.BidWarData[];
}
