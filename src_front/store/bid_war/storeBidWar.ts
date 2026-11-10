import MessengerProxy from "@/messaging/MessengerProxy";
import type { StoreActions } from "@/types/pinia-helpers";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { replacePlaceholders } from "@/utils/PlaceholderModifiers";
import PublicAPI from "@/utils/PublicAPI";
import SetTimeoutWorker from "@/utils/SetTimeoutWorker";
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
const DEFAULT_DURATION_S = 5 * 60;

/**
 * Pending auto-disable timeouts by bid war ID
 */
const autoDisableTimeouts: { [id: string]: string } = {};

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
 * Sets default values of params added after the bid war's creation
 */
function applyDefaults(entry: TwitchatDataTypes.BidWarData): void {
	if (!entry.platforms) entry.platforms = getDefaultPlatforms();
	if (entry.autoDisable === undefined) entry.autoDisable = false;
	if (!entry.autoDisableDuration_s) entry.autoDisableDuration_s = DEFAULT_DURATION_S;
	if (!entry.autoDisable_at) entry.autoDisable_at = 0;
	if (entry.postResultOnChat === undefined) entry.postResultOnChat = true;
	if (entry.postResultChatMessage === undefined) {
		entry.postResultChatMessage = StoreProxy.i18n.t(
			"overlay.bidWar.param_postResultChatMessage_default",
		);
	}
	if (entry.postTieChatMessage === undefined) {
		entry.postTieChatMessage = StoreProxy.i18n.t(
			"overlay.bidWar.param_postTieChatMessage_default",
		);
	}
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

/**
 * Starts a timeout for every bid war that requested to automatically
 * close after a certain duration. Cancels any previous timeouts.
 * @returns true if any bid war data was updated
 */
function updateAutoDisableTimers(
	list: TwitchatDataTypes.BidWarData[],
	onComplete: (id: string) => void,
): boolean {
	let changed = false;
	const now = Date.now();
	for (const id in autoDisableTimeouts) {
		SetTimeoutWorker.instance.delete(autoDisableTimeouts[id]!);
		delete autoDisableTimeouts[id];
	}
	for (const entry of list) {
		if (!entry.enabled || !entry.autoDisable) {
			if (entry.autoDisable_at) {
				entry.autoDisable_at = 0;
				changed = true;
			}
			continue;
		}
		if (!entry.autoDisable_at) {
			const duration_s = Math.max(1, entry.autoDisableDuration_s || DEFAULT_DURATION_S);
			entry.autoDisable_at = now + duration_s * 1000;
			changed = true;
		}
		autoDisableTimeouts[entry.id] = SetTimeoutWorker.instance.create(
			() => onComplete(entry.id),
			Math.max(0, entry.autoDisable_at - now),
		);
	}
	return changed;
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
				let changed = false;
				const now = Date.now();
				this.bidWarList.forEach((entry) => {
					applyDefaults(entry);
					// Countdown completed while Twitchat was closed? Disable bid war
					if (entry.enabled && entry.autoDisable && entry.autoDisable_at > 0) {
						if (entry.autoDisable_at <= now) {
							entry.enabled = false;
							changed = true;
						}
					}
				});
				const timersChanged = updateAutoDisableTimers(this.bidWarList, (id) =>
					this.disableBidWar(id),
				);
				if (changed || timersChanged) this.saveData();
			}

			/**
			 * Called when a bid war overlay requests for its configs
			 */
			PublicAPI.instance.addEventListener("GET_BID_WAR_CONFIGS", (event) => {
				this.broadcastStates(event.data?.id);
			});

			/**
			 * Called when updating a bid war from the Stream Deck
			 */
			PublicAPI.instance.addEventListener("ON_BID_WAR_UPDATE", (event) => {
				const data = event.data;
				console.log(data);
				if (!data) return;
				const entry = this.bidWarList.find((v) => v.id === data.id);
				if (!entry) return;
				const value = typeof data.value === "number" ? data.value : NaN;
				switch (data.action) {
					case "enable":
					case "disable":
					case "toggle": {
						const enable =
							data.action === "toggle" ? !entry.enabled : data.action === "enable";
						if (!enable) {
							this.disableBidWar(entry.id);
							break;
						}
						if (entry.enabled) break;
						// Same limit as on the bid war params
						const enabledCount = this.bidWarList.filter((v) => v.enabled).length;
						if (
							!StoreProxy.auth.isPremium &&
							enabledCount >= Config.instance.MAX_BID_WAR
						) {
							break;
						}
						entry.enabled = true;
						this.saveData();
						this.broadcastStates(entry.id);
						break;
					}
					case "reset":
						this.resetAmounts(entry.id);
						break;
					case "add1":
						this.addAmount(entry.id, 0, value);
						break;
					case "add2":
						this.addAmount(entry.id, 1, value);
						break;
					case "set1":
						this.setAmount(entry.id, 0, value);
						break;
					case "set2":
						this.setAmount(entry.id, 1, value);
						break;
				}
			});
		},

		broadcastStates(id?: string): void {
			for (const bidwar of this.bidWarList) {
				if (id && bidwar.id !== id) continue;
				PublicAPI.instance.broadcast("ON_BID_WAR_CONFIGS", {
					bidwar,
					daysLabel: StoreProxy.i18n.t("global.date_days"),
				});
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
				autoDisable: false,
				autoDisableDuration_s: DEFAULT_DURATION_S,
				autoDisable_at: 0,
				postResultOnChat: true,
				postResultChatMessage: StoreProxy.i18n.t(
					"overlay.bidWar.param_postResultChatMessage_default",
				),
				postTieChatMessage: StoreProxy.i18n.t(
					"overlay.bidWar.param_postTieChatMessage_default",
				),
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

		disableBidWar(id: string): void {
			const entry = this.bidWarList.find((v) => v.id === id);
			if (!entry || !entry.enabled) return;
			entry.enabled = false;
			this.saveData();
			this.broadcastStates(id);

			// Send result notifcation
			if (!entry.sides.every((side) => side.amount === 0)) {
				const currency = entry.currency || Utils.CURRENCY_AMOUNT_TOKEN;
				const getSide = (
					side: TwitchatDataTypes.BidWarData["sides"][number],
				): TwitchatDataTypes.MessageBidWarResultData["sides"][number] => ({
					keyword: side.keyword,
					amount: side.amount,
					amountFormatted: Utils.formatCurrency(side.amount, currency),
				});
				const message: TwitchatDataTypes.MessageBidWarResultData = {
					id: Utils.getUUID(),
					date: Date.now(),
					platform: "twitchat",
					type: TwitchatDataTypes.TwitchatMessageType.BID_WAR_RESULT,
					channel_id: StoreProxy.auth.twitch.user.id,
					bidWarId: entry.id,
					title: entry.title || StoreProxy.i18n.t("overlay.bidWar.default_title"),
					sides: [getSide(entry.sides[0]), getSide(entry.sides[1])],
				};
				void StoreProxy.chat.addMessage(message);
			}

			// Send chat message if requested
			if (entry.postResultOnChat) {
				const [sideA, sideB] = entry.sides;
				const isTie = sideA.amount === sideB.amount;
				const template = isTie ? entry.postTieChatMessage : entry.postResultChatMessage;
				if (!template?.trim()) return;
				const winner = sideA.amount >= sideB.amount ? sideA : sideB;
				const loser = winner === sideA ? sideB : sideA;
				const currency = entry.currency || Utils.CURRENCY_AMOUNT_TOKEN;
				const message = replacePlaceholders(template, {
					TITLE: entry.title || StoreProxy.i18n.t("overlay.bidWar.default_title"),
					WINNER: winner.keyword,
					WINNER_AMOUNT: Utils.formatCurrency(winner.amount, currency),
					LOSER: loser.keyword,
					LOSER_AMOUNT: Utils.formatCurrency(loser.amount, currency),
					SIDE1: sideA.keyword,
					SIDE2: sideB.keyword,
					AMOUNT: Utils.formatCurrency(sideA.amount, currency),
				});
				MessengerProxy.instance.sendMessage(message);
			}
		},

		saveData(): void {
			this.bidWarList.forEach((entry) => {
				entry.sides.forEach((side) => {
					const amount = Number(side.amount);
					side.amount = isNaN(amount) ? 0 : Math.max(0, Math.min(MAX_AMOUNT, amount));
				});
			});
			updateAutoDisableTimers(this.bidWarList, (id) => this.disableBidWar(id));
			const data: IStoreData = {
				bidWarList: this.bidWarList,
			};
			DataStore.set(DataStore.BID_WAR_CONFIGS, data);
			PublicAPI.instance.broadcastGlobalStates();
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
