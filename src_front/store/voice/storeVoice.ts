import DataStore from "@/store/DataStore";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import VoiceAction from "@/utils/voice/VoiceAction";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IVoiceActions, IVoiceGetters, IVoiceState } from "../StoreProxy";
import VoiceController from "@/utils/voice/VoiceController";
import VoicemodWebSocket from "@/utils/voice/VoicemodWebSocket";
import Utils from "@/utils/Utils";
import VoicemodEvent from "@/utils/voice/VoicemodEvent";
import StoreProxy from "../StoreProxy";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import Config from "@/utils/Config";

export const storeVoice = defineStore("voice", {
	state: (): IVoiceState => ({
		voiceActions: [],
		voiceLang: "en-US",
		voiceText: {
			tempText: "",
			rawTempText: "",
			finalText: "",
		},
		voicemodCurrentVoice: null,
		voicemodParams: {
			enabled: false,
			voiceIndicator: true,
			commandToVoiceID: {},
			chatCmdPerms: Utils.getDefaultPermissions(true, true, false, false, false, false),
		},
	}),

	getters: {
		voiceBotConfigured: (): boolean => {
			if (Config.instance.OBS_DOCK_CONTEXT) return false;
			const actions = Object.keys(VoiceAction);
			type VAKeys = keyof typeof VoiceAction;
			//Search for global labels
			for (let i = 0; i < actions.length; i++) {
				const a = actions[i];
				if (VoiceAction[(a + "_IS_GLOBAL") as VAKeys] !== true) continue;
				const id: string = a as string;
				const action = StoreProxy.voice.voiceActions.find((v) => v.id == id);
				if (!action?.sentences) return false;
			}
			return true;
		},
	} satisfies StoreGetters<IVoiceGetters, IVoiceState>,

	actions: {
		populateData() {
			//Init Voice control actions
			const voiceActions = DataStore.get("voiceActions");
			if (voiceActions) {
				try {
					this.voiceActions = (JSON.parse(voiceActions) as VoiceAction[]).filter(
						(va) => va.id && va.sentences,
					);
				} catch (_e) {
					this.voiceActions = [];
				}
			}

			//Init Voice control language
			const voiceLang = DataStore.get("voiceLang");
			if (voiceLang) {
				this.voiceLang = voiceLang;
				VoiceController.instance.lang.value = voiceLang;
			}

			//Init voicemod
			const voicemodParams = DataStore.get(DataStore.VOICEMOD_PARAMS);
			if (voicemodParams) {
				this.setVoicemodParams(JSON.parse(voicemodParams));
				if (this.voicemodParams.enabled) {
					VoicemodWebSocket.instance
						.connect(this.voicemodParams.ip, this.voicemodParams.port)
						.then(() => {})
						.catch(() => {});
				}
			}

			/**
			 * Init voicemod voice change event handler
			 */
			VoicemodWebSocket.instance.addEventListener(
				VoicemodEvent.VOICE_CHANGE,
				async (e: VoicemodEvent) => {
					//Execute trigger
					const trigger: TwitchatDataTypes.MessageVoicemodData = {
						id: Utils.getUUID(),
						date: Date.now(),
						type: TwitchatDataTypes.TwitchatMessageType.VOICEMOD,
						platform: "twitchat",
						voiceID: e.voiceID,
						voiceName: e.voiceName,
						channel_id: StoreProxy.auth.twitch.user.id,
					};
					void TriggerActionHandler.instance.execute(trigger);
				},
			);
		},
		setVoiceLang(value: string) {
			this.voiceLang = value;
			DataStore.set(DataStore.VOICE_BOT_LANG, value);
		},

		setVoiceActions(value: VoiceAction[]) {
			this.voiceActions = value;
			DataStore.set(DataStore.VOICE_BOT_ACTIONS, value);
		},

		setVoicemodParams(payload: TwitchatDataTypes.VoicemodParamsData) {
			this.voicemodParams = payload;
			DataStore.set(DataStore.VOICEMOD_PARAMS, payload);
		},

		async handleChatCommand(
			message: TwitchatDataTypes.TranslatableMessage,
			cmd: string,
		): Promise<void> {
			//Check if it's a voicemod command
			if (
				this.voicemodParams.enabled &&
				this.voicemodParams.commandToVoiceID[cmd] &&
				(await Utils.checkPermissions(
					this.voicemodParams.chatCmdPerms,
					message.user,
					message.channel_id,
				))
			) {
				void VoicemodWebSocket.instance.enableVoiceEffect(
					this.voicemodParams.commandToVoiceID[cmd],
				);
			}
		},
	} satisfies StoreActions<"voice", IVoiceState, IVoiceGetters, IVoiceActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeVoice, import.meta.hot));
}
