<template>
	<div class="publicapitest">
		<div class="lists">
			<div class="list events">
				<div class="head">Events received</div>
				<transition-group name="list" tag="div" class="eventsList">
					<ToggleBlock v-for="e in eventList" :class="e.active? 'event active' : 'event'"
					:key="e.key"
					:icons="e.active? ['checkmark'] : []"
					:title="e.key"
					:open="false"
					medium>
						<div class="container">
							<div class="ctas" v-if="e.data">
								<TTButton small icon="copy" :copy="JSON.stringify(e.data, null, 4)">JSON</TTButton>
								<TTButton small icon="copy" :copy="e.ts">TS</TTButton>
							</div>
							<div class="json" v-if="e.data">{{JSON.stringify(e.data, null, 2)}}</div>
							<div v-else class="empty">- no data -</div>
						</div>
					</ToggleBlock>
				</transition-group>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { TwitchatEventMap } from '@/events/TwitchatEvent';
import type TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
	}
})
class PublicApiTest extends Vue {

	public eventList:{key:keyof TwitchatEventMap, active:boolean, data:any|null, ts:string}[] = [];
	
	public loading = false;
	public connectError = false;
	public connectSuccess = false;
	public openConnectForm = false;
	public obsPort_conf:TwitchatDataTypes.ParameterData<number> = { type:"number", value:4455, min:0, max:65535, step:1, fieldName:"obsport", labelKey:"obs.form_port" };
	public obsPass_conf:TwitchatDataTypes.ParameterData<string> = { type:"password", value:"", fieldName:"obspass", labelKey:"obs.form_pass" };
	public obsIP_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"127.0.0.1", fieldName:"obsip", labelKey:"obs.form_ip" };

	public beforeMount(): void {
		this.eventList = EventList.concat().map(v=>{
			return {key:v, active:false, data:null, ts:""};
		}).sort((a,b)=> {
			if(a.key < b.key) return -1;
			if(a.key > b.key) return 1;
			return 0;
		});

		this.initAPI();
	}

	/**
	 * Connect to OBS websocket
	 */
	public async connect():Promise<void> {
		this.loading = true;
		this.connectSuccess = false;
		this.connectError = false;

		//Make sure OBS will connect
		this.$store.obs.connectionEnabled = true;
		
		this.connectSuccess = true;
		this.initAPI();
		window.setTimeout(()=> {
			this.connectSuccess = false;
			this.openConnectForm = false;
		}, 3000);
	}

	private initAPI():void {
		//@ts-ignore
		this.eventList.forEach(v=> {
			PublicAPI.instance.addEventListener(v.key, (e:TwitchatEvent<typeof v.key>) => {
				try {
					const index = this.eventList.findIndex(v=>v.key === e.type);
					if(index == -1) return;
					const obj = this.eventList.splice(index, 1)[0];
					if(obj) {
						obj.active = true;
						obj.data = e.data;
						obj.ts = Utils.jsonToTS(e.data);
					}
				}catch(error) {
					console.log(error)
				}
			})
		});
	}
}

const EventList:(keyof TwitchatEventMap)[] =[
	"TWITCHAT_READY",
	"OBS_WEBSOCKET_CONNECTED",
	"OBS_WEBSOCKET_DISCONNECTED",
	"OBS_SCENE_CHANGE",
	"OBS_MUTE_TOGGLE",
	"OBS_PLAYBACK_STARTED",
	"OBS_PLAYBACK_PAUSED",
	"OBS_PLAYBACK_NEXT",
	"OBS_PLAYBACK_PREVIOUS",
	"OBS_PLAYBACK_RESTARTED",
	"OBS_PLAYBACK_ENDED",
	"OBS_INPUT_NAME_CHANGED",
	"OBS_SCENE_NAME_CHANGED",
	"OBS_FILTER_NAME_CHANGED",
	"OBS_SOURCE_TOGGLE",
	"OBS_FILTER_TOGGLE",
	"OBS_STREAM_STATE",
	"OBS_RECORD_STATE",
	"ENABLE_STT",
	"DISABLE_STT",
	"STT_TEXT_UPDATE",
	"STT_RAW_TEXT_UPDATE",
	"STT_REMOTE_TEMP_TEXT_EVENT",
	"STT_REMOTE_FINAL_TEXT_EVENT",
	"STT_SPEECH_END",
	"STT_ACTION_BATCH",
	"STT_ERASE",
	"STT_NEXT",
	"STT_PREVIOUS",
	"STT_SUBMIT",
	"STT_CANCEL",
	"CHAT_FEED_SCROLL_UP",
	"CHAT_FEED_SCROLL_DOWN",
	"CHAT_FEED_SCROLL",
	"CHAT_FEED_READ",
	"GREET_FEED_READ",
	"GREET_FEED_READ_ALL",
	"CREDITS_OVERLAY_PRESENCE",
	"GET_CREDITS_OVERLAY_PRESENCE",
	"GET_SUMMARY_DATA",
	"SUMMARY_DATA",
	"VOICEMOD_VOICE_CHANGE",
	"ENDING_CREDITS_COMPLETE",
	"ENDING_CREDITS_CONFIGS",
	"ENDING_CREDITS_CONTROL",
	"GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE",
	"SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE",
	"CHAT_HIGHLIGHT_OVERLAY_PRESENCE",
	"SHOW_CLIP",
	"SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE",
	"CHAT_HIGHLIGHT_OVERLAY_CONFIRM",
	"CHAT_FEED_SELECT_ACTION_CANCEL",
	"CHAT_FEED_READ_ALL",
	"CHAT_FEED_PAUSE",
	"CHAT_FEED_UNPAUSE",
	"CHAT_FEED_SCROLL_BOTTOM",
	"CHAT_FEED_SELECT",
	"CHAT_FEED_SELECT_ACTION_DELETE",
	"CHAT_FEED_SELECT_ACTION_BAN",
	"CHAT_FEED_SELECT_CHOOSING_ACTION",
	"CHAT_FEED_SELECT_ACTION_PIN",
	"CHAT_FEED_SELECT_ACTION_HIGHLIGHT",
	"CHAT_FEED_SELECT_ACTION_SHOUTOUT",
	"MESSAGE_READ",
	"GET_ANIMATED_TEXT_CONFIGS",
	"ANIMATED_TEXT_CONFIGS",
	"ANIMATED_TEXT_SET",
	"ANIMATED_TEXT_SHOW_COMPLETE",
	"ANIMATED_TEXT_HIDE_COMPLETE",
	"ANIMATED_TEXT_CLOSE",
	"GET_BINGO_GRID_PARAMETERS",
	"BINGO_GRID_PARAMETERS",
	"BINGO_GRID_OVERLAY_PRESENCE",
	"BINGO_GRID_HEAT_CLICK",
	"BINGO_GRID_OVERLAY_VIEWER_EVENT",
	"BINGO_GRID_OVERLAY_LEADER_BOARD",
	"COUNTER_GET_ALL",
	"COUNTER_GET",
	"COUNTER_LIST",
	"COUNTER_UPDATE",
	"COUNTER_ADD",
	"GET_CUSTOM_TRAIN_STATE",
	"CUSTOM_TRAIN_STATE",
	"DISTORT_OVERLAY_PARAMETERS",
	"GET_DISTORT_OVERLAY_PARAMETERS",
	"GET_DONATION_GOALS_OVERLAY_PARAMS",
	"DONATION_GOALS_OVERLAY_PARAMS",
	"DONATION_EVENT",
	"GET_CURRENT_TRACK",
	"CURRENT_TRACK",
	"TRACK_ADDED_TO_QUEUE",
	"MUSIC_PLAYER_HEAT_CLICK",
	"POLLS_OVERLAY_PRESENCE",
	"GET_POLLS_OVERLAY_PRESENCE",
	"GET_POLLS_OVERLAY_PARAMETERS",
	"POLL_PROGRESS",
	"POLLS_OVERLAY_PARAMETERS",
	"PREDICTIONS_OVERLAY_PRESENCE",
	"GET_PREDICTIONS_OVERLAY_PRESENCE",
	"GET_PREDICTIONS_OVERLAY_PARAMETERS",
	"PREDICTION_PROGRESS",
	"PREDICTIONS_OVERLAY_PARAMETERS",
	"TIMER_OVERLAY_PRESENCE",
	"GET_TIMER_OVERLAY_PRESENCE",
	"GET_TIMER_LIST",
	"GET_CURRENT_TIMERS",
	"TIMER_START",
	"TIMER_ADD",
	"TIMER_STOP",
	"COUNTDOWN_START",
	"COUNTDOWN_ADD",
	"COUNTDOWN_COMPLETE",
	"WHEEL_OVERLAY_PRESENCE",
	"GET_WHEEL_OVERLAY_PRESENCE",
	"WHEEL_OVERLAY_START",
	"WHEEL_OVERLAY_ANIMATION_COMPLETE",
	"GET_AD_BREAK_OVERLAY_PRESENCE",
	"GET_AD_BREAK_OVERLAY_PARAMETERS",
	"AD_BREAK_OVERLAY_PRESENCE",
	"AD_BREAK_OVERLAY_PARAMETERS",
	"AD_BREAK_DATA",
	"BITSWALL_OVERLAY_PRESENCE",
	"GET_BITSWALL_OVERLAY_PRESENCE",
	"GET_BITSWALL_OVERLAY_PARAMETERS",
	"BITSWALL_OVERLAY_PARAMETERS",
	"GET_CHAT_POLL_OVERLAY_PRESENCE",
	"CHAT_POLL_OVERLAY_PRESENCE",
	"GET_CHAT_POLL_OVERLAY_PARAMETERS",
	"CHAT_POLL_OVERLAY_PARAMETERS",
	"CHAT_POLL_PROGRESS",
	"MESSAGE_DELETED",
	"BITS",
	"MESSAGE_WHISPER",
	"MESSAGE_NON_FOLLOWER",
	"MENTION",
	"MESSAGE_FIRST",
	"REWARD_REDEEM",
	"SUBSCRIPTION",
	"FOLLOW",
	"EMERGENCY_MODE",
	"LABELS_UPDATE",
	"GET_LABEL_OVERLAY_PLACEHOLDERS",
	"GET_LABEL_OVERLAY_PARAMS",
	"LABEL_OVERLAY_PLACEHOLDERS",
	"LABEL_OVERLAY_PARAMS",
	"SET_COLS_COUNT",
	"QNA_SESSION_GET_ALL",
	"QNA_HIGHLIGHT",
	"QNA_SKIP",
	"QNA_SESSION_LIST",
	"TIMER_LIST",
	"TRIGGER_LIST",
	"PLAY_SFXR",
	"AUTOMOD_ACCEPT",
	"AUTOMOD_REJECT",
	"MERGE_TOGGLE",
	"HIDE_ALERT",
	"POLL_TOGGLE",
	"PREDICTION_TOGGLE",
	"BINGO_TOGGLE",
	"VIEWERS_COUNT_TOGGLE",
	"MOD_TOOLS_TOGGLE",
	"CENSOR_DELETED_MESSAGES_TOGGLE",
	"POLL_CREATE",
	"START_EMERGENCY",
	"STOP_EMERGENCY",
	"SET_EMERGENCY_MODE",
	"SHOUTOUT",
	"GET_COLS_COUNT",
	"CLEAR_CHAT_HIGHLIGHT",
	"CREATE_POLL",
	"CREATE_PREDICTION",
	"STOP_POLL",
	"STOP_PREDICTION",
	"SEND_MESSAGE",
	"RAFFLE_TOGGLE",
	"RAFFLE_START",
	"RAFFLE_END",
	"CREATE_RAFFLE",
	"STOP_RAFFLE",
	"RAFFLE_PICK_WINNER",
	"STOP_TTS",
	"EXECUTE_TRIGGER",
	"TRIGGERS_GET_ALL",
	"TOGGLE_TRIGGER",
	"CUSTOM_CHAT_MESSAGE",
];
export default toNative(PublicApiTest);
</script>

<style scoped lang="less">
.publicapitest{
	color: var(--color-text);
	padding: 1em;
	.connectForm, .connectForm>form {
		gap: .5em;
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
			display: flex;
			flex-direction: column;
			margin-top: 1em;
			&.events {
				flex-grow: 1;
				margin-left: 5px;
			}

			.eventsList {
				display: grid;
				gap: .5em;
				grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
			}

			.head {
				font-size: 1.5em;
				text-align: center;
				margin-bottom: 5px;
			}

			.action {
				margin-bottom: 5px;
				font-size: .7em;
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
				opacity: .5;
				margin-bottom: 5px;
				flex-grow: 1;
				&.active {
					opacity: 1;
				}
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
						gap: .25em;
					}
				}
			}
		}
	}
	.list-move {
		transition: transform 0.35s ease;
	}
}
</style>