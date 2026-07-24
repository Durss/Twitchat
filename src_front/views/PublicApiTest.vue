<template>
	<div class="publicapitest">
		<div class="connectForm blured-background-window">
			<form @submit.prevent="connect()" v-if="!connected">
				<ParamItem :paramData="obsPort_conf" class="param" />
				<ParamItem :paramData="obsPass_conf" class="param" />
				<ParamItem :paramData="obsIP_conf" class="param" />
				<TTButton type="submit" class="connectBt" :loading="loading">Connect</TTButton>
			</form>
			<TTButton
				v-else
				@click="disconnect()"
				class="connectBt"
				:loading="loading"
				alert
				icon="cross"
				>Disconnect</TTButton
			>
		</div>
		<div class="lists">
			<div class="list events">
				<div class="head">Public API events logger</div>
				<transition-group name="list" tag="div" class="eventsList">
					<template v-for="e in eventList" :key="e.key">
						<ToggleBlock
							v-if="e.active"
							class="event active"
							:key="e.key"
							:title="e.key"
							:open="false"
							primary
							medium
						>
							<div class="container">
								<div class="ctas" v-if="e.data">
									<TTButton
										small
										icon="copy"
										:copy="JSON.stringify(e.data, null, 4)"
										>JSON</TTButton
									>
									<TTButton small icon="copy" :copy="e.ts">TS</TTButton>
								</div>
								<div class="json" v-if="e.data">
									{{ JSON.stringify(e.data, null, 2) }}
								</div>
								<div v-else class="empty">- no data -</div>
							</div>
						</ToggleBlock>
						<div class="event" v-else>{{ e.key }}</div>
					</template>
				</transition-group>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import type { TwitchatEventMap } from "@/events/TwitchatEvent";
import type TwitchatEvent from "@/events/TwitchatEvent";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { storeOBS as useStoreOBS } from "@/store/obs/storeOBS";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { onBeforeMount, ref } from "vue";
import OBSWebsocket from "@/utils/OBSWebsocket";
import ParamItem from "@/components/params/ParamItem.vue";

const storeOBS = useStoreOBS();

const eventList = ref<
	{
		key: keyof TwitchatEventMap;
		active: boolean;
		data: any | null;
		ts: string;
	}[]
>([]);

const loading = ref(false);
const connected = ref(false);
const connectError = ref(false);
const connectSuccess = ref(false);
const openConnectForm = ref(false);
const obsPort_conf = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 4455,
	min: 0,
	max: 65535,
	step: 1,
	fieldName: "obsport",
	labelKey: "obs.form_port",
});
const obsPass_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "password",
	value: "",
	fieldName: "obspass",
	labelKey: "obs.form_pass",
});
const obsIP_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "127.0.0.1",
	fieldName: "obsip",
	labelKey: "obs.form_ip",
});

onBeforeMount(() => {
	eventList.value = EventList.concat()
		.map((v) => {
			return { key: v, active: false, data: null, ts: "" };
		})
		.sort((a, b) => {
			if (a.key < b.key) return -1;
			if (a.key > b.key) return 1;
			return 0;
		});

	initAPI();
});

/**
 * Connect to OBS websocket
 */
async function connect(): Promise<void> {
	loading.value = true;
	connectSuccess.value = false;
	connectError.value = false;

	//Make sure OBS will connect
	storeOBS.connectionEnabled = true;

	connected.value = await OBSWebsocket.instance.connect(
		obsPort_conf.value.value.toString(),
		obsPass_conf.value.value,
		false,
		obsIP_conf.value.value,
	);
	PublicAPI.instance.initialize(false);

	connectSuccess.value = true;
	loading.value = false;
	initAPI();
	window.setTimeout(() => {
		connectSuccess.value = false;
		openConnectForm.value = false;
	}, 3000);
}
async function disconnect(): Promise<void> {
	await OBSWebsocket.instance.disconnect();
}

function initAPI(): void {
	eventList.value.forEach((v) => {
		PublicAPI.instance.addEventListener(v.key, (e: TwitchatEvent<typeof v.key>) => {
			try {
				const index = eventList.value.findIndex((v) => v.key === e.type);
				if (index == -1) return;
				const obj = eventList.value.splice(index, 1)[0];
				if (obj) {
					obj.active = true;
					obj.data = e.data;
					obj.ts = Utils.jsonToTS(e.data);
					eventList.value.unshift(obj); //Bring to top
				}
			} catch (error) {
				console.log(error);
			}
		});
	});
}

const EventList: (keyof TwitchatEventMap)[] = [
	"ON_TWITCHAT_READY",
	"ON_OBS_WEBSOCKET_CONNECTED",
	"ON_OBS_WEBSOCKET_DISCONNECTED",
	"SET_VOICE_CONTROL_STATE",
	"SET_CHAT_FEED_SCROLL",
	"SET_CHAT_FEED_READ",
	"SET_CHAT_FEED_READ_ALL",
	"SET_CHAT_FEED_PAUSE_STATE",
	"SET_CHAT_FEED_SCROLL_BOTTOM",
	"SET_CHAT_FEED_SELECT",
	"SET_CHAT_FEED_SELECT_ACTION_DELETE",
	"SET_CHAT_FEED_SELECT_ACTION_BAN",
	"SET_CHAT_FEED_SELECT_CHOOSING_ACTION",
	"SET_CHAT_FEED_SELECT_ACTION_SAVE",
	"SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT",
	"SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT",
	"SET_CHAT_FEED_SELECT_ACTION_CANCEL",
	"SET_GREET_FEED_READ",
	"SET_GREET_FEED_READ_ALL",
	"ON_VOICEMOD_VOICE_CHANGE",
	"GET_ENDING_CREDITS_PRESENCE",
	"SET_ENDING_CREDITS_PRESENCE",
	"GET_ENDING_CREDITS_DATA",
	"SET_ENDING_CREDITS_DATA",
	"ON_ENDING_CREDITS_COMPLETE",
	"ON_ENDING_CREDITS_CONFIGS",
	"SET_ENDING_CREDITS_CONTROL",
	"GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE",
	"SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE",
	"SET_CHAT_HIGHLIGHT_OVERLAY_CLIP",
	"SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE",
	"ON_MESSAGE_MARKED_AS_READ",
	"GET_ANIMATED_TEXT_CONFIGS",
	"ON_ANIMATED_TEXT_CONFIGS",
	"SET_ANIMATED_TEXT_CONTENT",
	"ON_ANIMATED_TEXT_SHOW_COMPLETE",
	"ON_ANIMATED_TEXT_HIDE_COMPLETE",
	"ON_ANIMATED_TEXT_CLOSE",
	"GET_BINGO_GRID_CONFIGS",
	"ON_BINGO_GRID_CONFIGS",
	"SET_BINGO_GRID_OVERLAY_PRESENCE",
	"ON_BINGO_GRID_VIEWER_EVENT",
	"ON_BINGO_GRID_LEADER_BOARD",
	"GET_ALL_COUNTERS",
	"ON_COUNTER_LIST",
	"GET_COUNTER",
	"ON_COUNTER_UPDATE",
	"SET_COUNTER_ADD",
	"GET_CUSTOM_TRAIN_DATA",
	"ON_CUSTOM_TRAIN_DATA",
	"GET_DISTORT_OVERLAY_CONFIGS",
	"ON_DISTORT_OVERLAY_CONFIGS",
	"GET_DONATION_GOALS_OVERLAY_CONFIGS",
	"ON_DONATION_GOALS_OVERLAY_CONFIGS",
	"ON_DONATION_EVENT",
	"GET_CURRENT_TRACK",
	"ON_CURRENT_TRACK",
	"ON_TRACK_ADDED_TO_QUEUE",
	"ON_MUSIC_PLAYER_HEAT_CLICK",
	"GET_POLLS_OVERLAY_PRESENCE",
	"ON_POLLS_OVERLAY_PRESENCE",
	"GET_POLLS_OVERLAY_CONFIGS",
	"ON_POLL_OVERLAY_CONFIGS",
	"ON_POLL_PROGRESS",
	"GET_PREDICTIONS_OVERLAY_PRESENCE",
	"ON_PREDICTIONS_OVERLAY_PRESENCE",
	"GET_PREDICTIONS_OVERLAY_CONFIGS",
	"ON_PREDICTION_OVERLAY_CONFIGS",
	"ON_PREDICTION_PROGRESS",
	"GET_TIMER_OVERLAY_PRESENCE",
	"ON_TIMER_OVERLAY_PRESENCE",
	"GET_TIMER_LIST",
	"ON_TIMER_LIST",
	"GET_TIMER",
	"ON_TIMER_START",
	"SET_TIMER_ADD",
	"ON_TIMER_STOP",
	"ON_COUNTDOWN_START",
	"SET_COUNTDOWN_ADD",
	"ON_COUNTDOWN_COMPLETE",
	"GET_WHEEL_OVERLAY_PRESENCE",
	"ON_WHEEL_OVERLAY_PRESENCE",
	"SET_WHEEL_OVERLAY_START",
	"ON_WHEEL_OVERLAY_ANIMATION_COMPLETE",
	"GET_AD_BREAK_OVERLAY_PRESENCE",
	"ON_AD_BREAK_OVERLAY_PRESENCE",
	"GET_AD_BREAK_OVERLAY_CONFIGS",
	"ON_AD_BREAK_OVERLAY_CONFIGS",
	"ON_AD_BREAK_OVERLAY_DATA",
	"GET_BITSWALL_OVERLAY_PRESENCE",
	"ON_BITSWALL_OVERLAY_PRESENCE",
	"GET_BITSWALL_OVERLAY_CONFIGS",
	"ON_BITSWALL_OVERLAY_CONFIGS",
	"GET_CHAT_POLL_OVERLAY_PRESENCE",
	"ON_CHAT_POLL_OVERLAY_PRESENCE",
	"GET_CHAT_POLL_OVERLAY_CONFIGS",
	"ON_CHAT_POLL_OVERLAY_CONFIGS",
	"ON_CHAT_POLL_PROGRESS",
	"ON_MESSAGE_DELETED",
	"ON_BITS",
	"ON_MESSAGE_WHISPER",
	"ON_MESSAGE_FROM_NON_FOLLOWER",
	"ON_MENTION",
	"ON_MESSAGE_FIRST_TODAY",
	"ON_MESSAGE_FIRST_ALL_TIME",
	"ON_REWARD_REDEEM",
	"ON_SUBSCRIPTION",
	"ON_FOLLOW",
	"SET_EMERGENCY_MODE",
	"ON_EMERGENCY_MODE_CHANGED",
	"GET_LABEL_OVERLAY_PLACEHOLDERS",
	"ON_LABEL_OVERLAY_PLACEHOLDERS",
	"GET_LABEL_OVERLAY_CONFIGS",
	"ON_LABEL_OVERLAY_CONFIGS",
	"GET_CHAT_COLUMNS_COUNT",
	"ON_CHAT_COLUMNS_COUNT",
	"GET_QNA_SESSION_LIST",
	"ON_QNA_SESSION_LIST",
	"SET_QNA_HIGHLIGHT",
	"SET_QNA_SKIP",
	"SET_EXECUTE_TRIGGER",
	"GET_TRIGGER_LIST",
	"ON_TRIGGER_LIST",
	"SET_TRIGGER_STATE",
	"SET_PLAY_SFXR",
	"SET_AUTOMOD_ACCEPT",
	"SET_AUTOMOD_REJECT",
	"SET_MERGE_TOGGLE",
	"SET_HIDE_CHAT_ALERT",
	"SET_POLL_TOGGLE",
	"SET_PREDICTION_TOGGLE",
	"SET_BINGO_TOGGLE",
	"SET_VIEWERS_COUNT_TOGGLE",
	"SET_MOD_TOOLS_TOGGLE",
	"SET_CENSOR_DELETED_MESSAGES_TOGGLE",
	"SET_RAFFLE_TOGGLE",
	"SET_SHOUTOUT_LAST_RAIDER",
	"SET_CLEAR_CHAT_HIGHLIGHT",
	"SET_STOP_POLL",
	"SET_STOP_PREDICTION",
	"SET_SEND_MESSAGE",
	"SET_RAFFLE_PICK_WINNER",
	"SET_STOP_CURRENT_TTS_AUDIO",
	"SET_SEND_CUSTOM_CHAT_MESSAGE",
	"GET_GLOBAL_STATES",
	"ON_GLOBAL_STATES",
	"ON_STT_TEXT_UPDATE",
	"ON_STT_RAW_TEXT_UPDATE",
	"ON_STT_REMOTE_TEMP_TEXT_EVENT",
	"ON_STT_REMOTE_FINAL_TEXT_EVENT",
	"ON_STT_SPEECH_END",
	"ON_STT_ACTION_BATCH",
	"ON_STT_ERASE",
	"ON_STT_NEXT",
	"ON_STT_PREVIOUS",
	"ON_STT_SUBMIT",
	"ON_STT_CANCEL",
	"ON_LABELS_UPDATE",
	"ON_OPEN_RAFFLE_CREATION_FORM",
	"ON_OPEN_POLL_CREATION_FORM",
	"SET_OPEN_PREDICTION_CREATION_FORM",
	"ON_OBS_SCENE_CHANGE",
	"ON_OBS_MUTE_TOGGLE",
	"ON_OBS_PLAYBACK_STARTED",
	"ON_OBS_PLAYBACK_PAUSED",
	"ON_OBS_PLAYBACK_NEXT",
	"ON_OBS_PLAYBACK_PREVIOUS",
	"ON_OBS_PLAYBACK_RESTARTED",
	"ON_OBS_PLAYBACK_ENDED",
	"ON_OBS_INPUT_NAME_CHANGED",
	"ON_OBS_SCENE_NAME_CHANGED",
	"ON_OBS_FILTER_NAME_CHANGED",
	"ON_OBS_SOURCE_TOGGLE",
	"ON_OBS_FILTER_TOGGLE",
	"ON_OBS_STREAM_STATE",
	"ON_OBS_RECORD_STATE",
];
</script>

<style scoped lang="less">
.publicapitest {
	color: var(--color-text);
	padding: 1em;
	.connectForm,
	.connectForm > form {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		max-width: fit-content;
		justify-content: center;
		margin: auto;
		//background: var(--color-light);
		.param {
			:deep(.inputHolder) {
				flex-basis: 200px;
				flex-grow: 0 !important;
			}
		}
	}

	.connectBt {
		margin: auto;
	}

	.lists {
		display: flex;
		flex-direction: row;
		.list {
			gap: 1em;
			display: flex;
			flex-direction: column;
			margin-top: 1em;
			&.events {
				flex-grow: 1;
				margin-left: 5px;
			}

			.eventsList {
				display: grid;
				gap: 0.5em;
				grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
			}

			.head {
				font-size: 1.5em;
				text-align: center;
				margin-bottom: 5px;
			}

			.action {
				margin-bottom: 5px;
				font-size: 0.7em;
			}

			.toggleblock.closed {
				background: transparent;
				:deep(.header) {
					height: 100%;
					max-height: 3em;
				}
			}
			.toggleblock:not(.closed) {
				grid-column: 1 / -1;
			}

			.event {
				margin-bottom: 5px;
				flex-grow: 1;
				&.active {
					.container {
						position: relative;
						.empty {
							text-align: center;
							font-style: italic;
						}
						.json {
							white-space: pre-wrap;
							font-family: monospace;
						}

						.ctas {
							position: absolute;
							top: 5px;
							right: 5px;
							display: flex;
							flex-direction: column;
							gap: 0.25em;
						}
					}
				}
				&:not(.active) {
					opacity: 0.5;
					display: flex;
					align-items: center;
					justify-content: center;
					font-style: italic;
					overflow-wrap: anywhere;
					text-align: center;
					padding: 0.25em 0.5em;
					background: var(--color-light-fade);
					border-radius: var(--border-radius);
				}
			}
		}
	}
	.list-move {
		transition: transform 0.35s ease;
	}
}
</style>
