import type { StoreActions } from "@/types/pinia-helpers";
import ApiHelper from "@/utils/ApiHelper";
import { acceptHMRUpdate, defineStore } from "pinia";
import DataStore from "../DataStore";
import type { IDiscordActions, IDiscordGetters, IDiscordState } from "../StoreProxy";
import Utils from "@/utils/Utils";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import StoreProxy from "../StoreProxy";
import SSEHelper from "@/utils/SSEHelper";
import SSEEvent from "@/events/SSEEvent";
import TwitchUtils from "@/utils/twitch/TwitchUtils";

export const storeDiscord = defineStore("discord", {
	state: (): IDiscordState => ({
		discordLinked: true,
		chatCols: [],
		banLogTarget: "",
		banLogThread: true,
		chatCmdTarget: "",
		logChanTarget: "",
		ticketChanTarget: "",
		linkedToGuild: "",
		reactionsEnabled: true,
		quickActions: [],
		channelList: [],
	}),

	actions: {
		populateData(): void {
			//Init discord params
			const discordParams = DataStore.get(DataStore.DISCORD_PARAMS);
			if (discordParams) {
				const data = JSON.parse(discordParams);
				this.chatCols = data.chatCols || [];
				this.banLogTarget = data.banLogTarget || "";
				this.chatCmdTarget = data.chatCmdTarget || "";
				this.logChanTarget = data.logChanTarget || "";
				this.ticketChanTarget = data.ticketChanTarget || "";
				this.banLogThread = data.banLogThread == true;
				this.reactionsEnabled = data.reactionsEnabled == true;
				this.quickActions = data.quickActions || [];
			}

			SSEHelper.instance.addEventListener(SSEEvent.NOTIFICATION, (event) => {
				const data = event.data!;
				const chunksMessage = TwitchUtils.parseMessageToChunks(
					data.message || "",
					undefined,
					true,
				);
				const chunksQuote = !data.quote
					? []
					: TwitchUtils.parseMessageToChunks(data.quote, undefined, true);
				const message: TwitchatDataTypes.MessageCustomData = {
					id: Utils.getUUID(),
					channel_id: StoreProxy.auth.twitch.user.id,
					date: Date.now(),
					platform: "twitchat",
					col: data.col,
					type: TwitchatDataTypes.TwitchatMessageType.CUSTOM,
					actions: data.actions,
					message: data.message,
					message_chunks: chunksMessage,
					message_html: TwitchUtils.messageChunksToHTML(chunksMessage),
					quote: data.quote,
					quote_chunks: chunksQuote,
					quote_html: TwitchUtils.messageChunksToHTML(chunksQuote),
					highlightColor: data.highlightColor,
					style: data.style,
					icon: "discord",
					user: {
						name: data.username,
					},
				};
				void StoreProxy.chat.addMessage(message);
			});
		},

		async initialize(): Promise<void> {
			const result = await ApiHelper.call("discord/link", "GET");
			if (result.json.linked === true) {
				this.linkedToGuild = result.json.guildName;
				await this.loadChannelList();
				this.discordLinked = true;
			}
		},

		async validateCode(
			code: string,
		): Promise<{ success: boolean; errorCode?: string; guildName?: string }> {
			try {
				const result = await ApiHelper.call("discord/code", "GET", { code }, false);
				if (result.json.success) {
					return { success: true, guildName: result.json.guildName };
				} else if (result.status == 401) {
					return { success: false, errorCode: result.json.errorCode || "UNAUTHORIZED" };
				} else {
					return { success: false, errorCode: result.json.errorCode || "UNKNOWN" };
				}
			} catch (_error) {}
			return { success: false, errorCode: "UNKNOWN" };
		},

		async submitCode(code: string): Promise<true | { code: string; channelName?: string }> {
			try {
				const result = await ApiHelper.call("discord/code", "POST", { code }, false);
				if (result.json.success === true) {
					await this.initialize();
					return true;
				} else if (result.status == 401) {
					return {
						code: result.json.errorCode || "UNAUTHORIZED",
						channelName: result.json.channelName,
					};
				} else {
					return {
						code: result.json.errorCode || "UNKNOWN",
						channelName: result.json.channelName,
					};
				}
			} catch (_error) {}
			return { code: "UNKNOWN" };
		},

		async unlinkDiscord(): Promise<true | string> {
			try {
				const result = await ApiHelper.call("discord/link", "DELETE");
				if (result.json.success) {
					this.discordLinked = false;
					return true;
				} else if (result.status == 401) {
					return result.json.errorCode || "UNAUTHORIZED";
				} else {
					return result.json.errorCode || "UNKNOWN";
				}
			} catch (_error) {}
			return "UNKNOWN";
		},

		addQuickAction(): void {
			this.quickActions.unshift({
				id: Utils.getUUID(),
				action: "message",
				name: "",
				message: "",
			});
			this.saveParams();
		},

		delQuickAction(action: TwitchatDataTypes.DiscordQuickActionData): void {
			StoreProxy.main
				.confirm(StoreProxy.i18n.t("discord.quick_delete"))
				.then((_v) => {
					const index = this.quickActions.findIndex((v) => v.id == action.id);
					this.quickActions.splice(index, 1);
					this.saveParams();
				})
				.catch((_error) => {});
		},

		saveParams(): void {
			const data: DiscordStoreData = {
				chatCols: this.chatCols,
				banLogTarget: this.banLogTarget,
				banLogThread: this.banLogThread,
				chatCmdTarget: this.chatCmdTarget,
				logChanTarget: this.logChanTarget,
				ticketChanTarget: this.ticketChanTarget,
				reactionsEnabled: this.reactionsEnabled,
				quickActions: this.quickActions,
			};
			DataStore.set(DataStore.DISCORD_PARAMS, data);
		},

		async loadChannelList(): Promise<void> {
			const channels = await ApiHelper.call("discord/channels", "GET");
			this.channelList = channels.json.channelList;
		},

		async logBan(
			platform: TwitchatDataTypes.ChatPlatform,
			channelId: string,
			bannedUser: TwitchatDataTypes.TwitchatUser,
			messages: TwitchatDataTypes.ChatMessageTypes[] = StoreProxy.chat.messages,
		): Promise<void> {
			if (!this.discordLinked || !this.banLogTarget) return;

			const uid = bannedUser.id;

			//Get creation date of the user if not already existing
			if (!bannedUser.created_at_ms && platform == "twitch") {
				const res = await TwitchUtils.getUserInfo([uid]);
				if (res.length > 0)
					bannedUser.created_at_ms = new Date(res[0]!.created_at).getTime();
			}

			//Get history of the user to be logged to discord
			let history = [];
			const now = Date.now();
			const t = StoreProxy.i18n.t;
			let message = "";
			for (
				let i = messages.length - 1;
				i >= Math.max(0, messages.length - 5000);
				i--
			) {
				const m = messages[i]!;
				if (now - m.date > 2 * 60 * 60_000) break;
				let labelCode = "";
				let params: { [key: string]: string } = {
					DATE: Utils.formatDate(new Date(m.date)),
				};
				if (
					(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE ||
						m.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) &&
					m.user.id == uid
				) {
					params.MESSAGE = m.message;
					labelCode = m.deleted ? "message_deleted" : "message";
					if (
						m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE &&
						m.directlyAnswersTo
					) {
						labelCode = m.deleted ? "message_answer_deleted" : "message_answer";
						params.USER = m.directlyAnswersTo.user.login;
						params.MESSAGE_ANSWERED = m.directlyAnswersTo.message;
					}
				}
				if (
					m.type == TwitchatDataTypes.TwitchatMessageType.REWARD &&
					m.user.id == uid
				) {
					labelCode = "redeem";
					params.REWARD = m.reward.title;
					if (m.message) {
						labelCode = "redeem_message";
						params.MESSAGE = m.message;
					}
				}
				if (
					m.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING &&
					m.user.id == uid
				) {
					labelCode = "follow";
				}
				if (
					m.type == TwitchatDataTypes.TwitchatMessageType.CHEER &&
					m.user.id == uid
				) {
					labelCode = "cheer";
					params.BITS = m.bits.toString();
					if (m.message) {
						labelCode = "cheer_message";
						params.MESSAGE = m.message;
					}
				}
				if (
					m.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION &&
					m.user.id == uid
				) {
					if ((m.gift_recipients?.length || 0) > 0) {
						labelCode = "subgift";
						params.TIER = m.tier.toString();
						params.COUNT = m.gift_recipients!.length.toString();
						params.RECIPIENTS = (m.gift_recipients || [])
							.map((v) => v.login)
							.join(", ");
					} else {
						labelCode = "sub";
						params.TIER = m.tier.toString();
						if (m.message) {
							labelCode = "sub_message";
							params.MESSAGE = m.message;
						}
					}
				}
				if (labelCode) {
					const str = t("discord.log_pattern." + labelCode, params);
					if (str && (message + "\n\n" + str).length > 1900) {
						history.unshift(message);
						message = str;
					} else {
						message = message ? str + "\n\n" + message : str;
					}
				}
			}
			if (message) {
				history.unshift(message);
			}
			//Format first message sent
			const followDate = bannedUser.channelInfo[channelId]!.following_date_ms;
			const followDateStr =
				followDate > 0
					? Utils.formatDate(new Date(followDate), true)
					: t("discord.log_pattern.not_following");
			const createDateStr = bannedUser.created_at_ms
				? Utils.formatDate(new Date(bannedUser.created_at_ms!))
				: "-";
			let error = "";
			history.unshift(`**${t("discord.log_pattern.uid")}**: \`${bannedUser.id}\`
**${t("discord.log_pattern.login")}**: \`${bannedUser.login}\`
**${t("discord.log_pattern.displayname")}**: \`${bannedUser.displayName}\`
**${t("discord.log_pattern.created_at")}**: \`${createDateStr}\`
**${t("discord.log_pattern.followed_at")}**: \`${followDateStr}\``);
			const channel = await new Promise<TwitchatDataTypes.TwitchatUser>((resolve) => {
				StoreProxy.users.getUserFrom(
					platform,
					channelId,
					channelId,
					undefined,
					undefined,
					(user) => {
						resolve(user);
					},
					undefined,
					undefined,
					undefined,
					false,
				);
			});
			let messageStr = t("discord.log_pattern.intro", {
				USER: bannedUser.login,
				UID: bannedUser.id,
				CHANNEL_NAME: channel.displayNameOriginal,
				CHANNEL_ID: channelId,
			});
			if (bannedUser.channelInfo[channelId]!.banReason)
				messageStr +=
					"\n**" +
					t("discord.log_pattern.reason") +
					"**: `" +
					bannedUser.channelInfo[channelId]!.banReason +
					"`";

			if (this.banLogThread == true) {
				//Send in a thread
				const result = await ApiHelper.call("discord/thread", "POST", {
					message: messageStr,
					channelId: this.banLogTarget,
					threadName: bannedUser.login + " #" + bannedUser.id,
					history,
				});

				if (!result.json.success) {
					if (result.json.errorCode == "POST_FAILED") {
						error = StoreProxy.i18n.t("error.discord.MISSING_ACCESS", {
							CHANNEL: result.json.channelName,
						});
					} else if (result.json.errorCode == "CREATE_THREAD_FAILED") {
						error = StoreProxy.i18n.t("error.discord.MISSING_ACCESS_THREAD", {
							CHANNEL: result.json.channelName,
						});
					} else {
						error = StoreProxy.i18n.t("error.discord.UNKNOWN");
					}
				}
			} else {
				//Send as normal messages
				const result = await ApiHelper.call("discord/message", "POST", {
					message: messageStr,
					channelId: this.banLogTarget,
				});
				if (!result.json.success) {
					if (result.json.errorCode == "POST_FAILED") {
						error = StoreProxy.i18n.t("error.discord.MISSING_ACCESS", {
							CHANNEL: result.json.channelName,
						});
					} else {
						error = StoreProxy.i18n.t("error.discord.UNKNOWN");
					}
				}

				if (!error) {
					history.forEach(async (message) => {
						await ApiHelper.call("discord/message", "POST", {
							message,
							channelId: this.banLogTarget,
						});
					});
				}
			}

			if (error) {
				const message: TwitchatDataTypes.MessageCustomData = {
					date: Date.now(),
					id: Utils.getUUID(),
					channel_id: channelId,
					platform,
					type: TwitchatDataTypes.TwitchatMessageType.CUSTOM,
					message: error,
					style: "error",
					icon: "alert",
				};
				void StoreProxy.chat.addMessage(message);
			}
		},
	} satisfies StoreActions<"Discord", IDiscordState, IDiscordGetters, IDiscordActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeDiscord, import.meta.hot));
}

export interface DiscordStoreData {
	chatCols: number[];
	banLogThread: boolean;
	banLogTarget: string;
	chatCmdTarget: string;
	logChanTarget: string;
	ticketChanTarget: string;
	reactionsEnabled: boolean;
	quickActions: TwitchatDataTypes.DiscordQuickActionData[];
}
