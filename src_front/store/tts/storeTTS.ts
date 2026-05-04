import DataStore from "@/store/DataStore";
import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import TTSUtils from "@/utils/TTSUtils";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { JsonObject } from "type-fest";
import type { ITTSActions, ITTSGetters, ITTSState } from "../StoreProxy";
import StoreProxy from "../StoreProxy";

export const storeTTS = defineStore("tts", {
	state: (): ITTSState => ({
		speaking: false,
		params: {
			elevenlabs_model: "",
			elevenlabs_lang: "",
			elevenlabs_style: 0,
			elevenlabs_similarity: 0.5,
			elevenlabs_stability: 0.5,
			enabled: false,
			volume: 1,
			rate: 1,
			pitch: 1,
			voice: {
				id: "",
				platform: "system",
			},
			maxLength: 0,
			maxDuration: 30,
			timeout: 0,
			removeEmotes: true,
			allRemoteChans: true,
			removeURL: true,
			replaceURL: "link",
			inactivityPeriod: 0,
			readMessages: false,
			readMessagePatern: "",
			readWhispers: false,
			readWhispersPattern: "",
			readNotices: false,
			readNoticesPattern: "",
			readRewards: false,
			readRewardsPattern: "",
			readSubs: false,
			readSubsPattern: "",
			readSubgifts: false,
			readSubgiftsPattern: "",
			readBits: false,
			readBitsMinAmount: 0,
			readBitsPattern: "",
			readRaids: false,
			readRaidsPattern: "",
			readFollow: false,
			readFollowPattern: "",
			readPolls: false,
			readPollsPattern: "",
			readPredictions: false,
			readPredictionsPattern: "",
			readBingos: false,
			readBingosPattern: "",
			readRaffle: false,
			readRafflePattern: "",
			read1stMessageToday: false,
			read1stMessageTodayPattern: "",
			read1stTimeChatters: false,
			read1stTimeChattersPattern: "",
			readMonitored: false,
			readMonitoredPattern: "",
			readRestricted: false,
			readRestrictedPattern: "",
			readAutomod: false,
			readAutomodPattern: "",
			readTimeouts: false,
			readTimeoutsPattern: "",
			readBans: false,
			readBansPattern: "",
			readUnbans: false,
			readUnbansPattern: "",
			readKofiTip: false,
			readKofiTipPattern: "",
			readKofiMerch: false,
			readKofiMerchPattern: "",
			readKofiSub: false,
			readKofiSubPattern: "",
			readStreamlabsTip: false,
			readStreamlabsTipPattern: "",
			readStreamlabsMerch: false,
			readStreamlabsMerchPattern: "",
			readStreamlabsPatreon: false,
			readStreamlabsPatreonPattern: "",
			readStreamelementsTip: false,
			readStreamelementsTipPattern: "",
			readChatPolls: false,
			readChatPollsPattern: "",
			ttsPerms: Utils.getDefaultPermissions(),
		},
	}),

	getters: {} satisfies StoreGetters<ITTSGetters, ITTSState>,

	actions: {
		populateData(): void {
			//Init TTS actions
			const tts = DataStore.get(DataStore.TTS_PARAMS);
			if (tts) {
				Utils.mergeRemoteObject(JSON.parse(tts), this.params as unknown as JsonObject);
				TTSUtils.instance.enabled = this.params.enabled;
			}
		},

		setSpeakingState(speaking: boolean): void {
			this.speaking = speaking;
			PublicAPI.instance.broadcastGlobalStates();
		},

		ttsReadMessage(message: TwitchatDataTypes.ChatMessageTypes) {
			void TTSUtils.instance.readNow(message);
		},

		ttsReadUser(user: TwitchatDataTypes.TwitchatUser, forceRead?: boolean) {
			let list = this.params.ttsPerms.usersAllowed;
			const index = list.findIndex((v) => v.toLowerCase() == user.login.toLowerCase());
			const readLocal = forceRead !== undefined ? forceRead : index === -1;
			if (index > -1) {
				//User already there, remove them if requested to stop reading them
				if (!readLocal) list.splice(index, 1);
			} else if (readLocal) {
				//User not yet in the list, add them if requested to read them
				list.push(user.login);
			}
			//Remove users whose name is less than 2 chars
			list = list.filter((v) => v.trim().length > 2);
			this.params.ttsPerms.usersAllowed = list;
			this.setTTSParams(this.params); //Triggers a server save

			let message = "";
			if (readLocal) {
				message = StoreProxy.i18n.t("tts.on_notice", { USER: user.displayName });
			} else {
				message = StoreProxy.i18n.t("tts.off_notice", { USER: user.displayName });
			}
			void StoreProxy.chat.addMessage({
				type: TwitchatDataTypes.TwitchatMessageType.NOTICE,
				id: Utils.getUUID(),
				date: Date.now(),
				platform: user.platform,
				noticeId: TwitchatDataTypes.TwitchatNoticeType.TTS,
				message,
				channel_id: StoreProxy.auth.twitch.user.id,
			});
		},

		setTTSParams(params: TwitchatDataTypes.TTSParamsData) {
			this.params = params;
			DataStore.set(DataStore.TTS_PARAMS, params);
			TTSUtils.instance.enabled = params.enabled;
		},
	} satisfies StoreActions<"tts", ITTSState, ITTSGetters, ITTSActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeTTS, import.meta.hot));
}
