<template>
	<div class="paramstriggers parameterContent">
		<Icon name="broadcast" class="icon" />

		<i18n-t scope="global" tag="p" class="head" :keypath="headerKey" v-if="!currentTriggerData">
			<template #COUNT><strong>{{ eventsCount }}</strong></template>
		</i18n-t>

		<div class="holder">

			<div class="ctas" v-if="showForm || currentTriggerData">
				<Button class="cta resyncBt" small
					v-if="showOBSResync || showForm"
					icon="obs"
					@click="listOBSSources()"
					v-tooltip="$t('triggers.resyncOBSBt_tt')"
					:loading="loadingOBSScenes">{{ $t('triggers.resyncOBSBt') }}</Button>

				<Button class="cta resyncBt" small
					icon="channelPoints"
					@click="listRewards()"
					v-tooltip="$t('triggers.resyncRewardsBt_tt')"
					:loading="loadingRewards">{{ $t('triggers.resyncRewardsBt') }}</Button>

				<Button class="cta" small
					v-if="canTestTrigger"
					icon="test"
					@click="testTrigger(currentTriggerData!)">{{ $t('triggers.testBt') }}</Button>
			
				<Button class="cta"
					v-if="currentTriggerData"
					alert small
					icon="delete"
					@click="deleteTrigger(currentTriggerData!.id)">{{ $t('triggers.deleteBt') }}</Button>
			</div>

			<Button class="createBt"
				v-if="showList && !showForm"
				icon="add"
				@click="openForm();">{{ $t('triggers.add_triggerBt') }}</Button>
			
			<TriggerCreateForm
				v-if="showForm"
				@selectTrigger="onSelectTrigger($event)"
				@updateHeader="headerKey = $event"
				:obsScenes="obsScenes"
				:obsSources="obsSources"
				:obsInputs="obsInputs"
				:rewards="rewards" />
				
			<TriggerActionList
				v-if="currentTriggerData"
				:triggerData="currentTriggerData"
				:obsSources="obsSources"
				:obsInputs="obsInputs"
				:rewards="rewards" />
				
			<TriggerList v-if="showList"
				@select="onSelectTrigger($event)"
				@testTrigger="testTrigger($event)"
				:rewards="rewards" />
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { TriggerTypesDefinitionList, TriggerTypes, type TriggerData, type TriggerTypeDefinition, type TriggerActionData, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { OBSInputItem, OBSSceneItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import type IParameterContent from './IParameterContent';
import TriggerActionList from './triggers/TriggerActionList.vue';
import TriggerCreateForm from './triggers/TriggerCreateForm.vue';
import TriggerList from './triggers/TriggerList.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import SchedulerHelper from '@/utils/SchedulerHelper';

@Component({
	components:{
		Button,
		TriggerList,
		TriggerActionList,
		TriggerCreateForm,
	},
	emits:[],
})
export default class ParamsTriggers extends Vue implements IParameterContent {

	public eventsCount:number = 0;
	public showList:boolean = true;
	public showForm:boolean = false;
	public loadingRewards:boolean = false;
	public loadingOBSScenes:boolean = false;
	public headerKey:string = "triggers.header";
	public currentTriggerData:TriggerData|null = null;
	public obsScenes:OBSSceneItem[] = [];
	public obsSources:OBSSourceItem[] = [];
	public obsInputs:OBSInputItem[] = [];
	public rewards:TwitchDataTypes.Reward[] = [];

	private renameOBSElementHandler!:(e:TwitchatEvent) => void;

	public get showOBSResync():boolean {
		if(!this.currentTriggerData) return false;
		if(this.currentTriggerData.actions.length === 0) return false;
		return this.currentTriggerData.actions.findIndex(v=>v.type == "obs") > -1;
	}

	public get canTestTrigger():boolean {
		if(!this.currentTriggerData) return false;
		let events:TriggerTypeDefinition[] = TriggerTypesDefinitionList().concat();
		const e = events.find(v=>v.value == this.currentTriggerData?.type);
		return e?.testMessageType != undefined;
	}

	public beforeMount():void {
		//List all available trigger types
		let events:TriggerTypeDefinition[] = TriggerTypesDefinitionList().concat();
		this.eventsCount = events.length;
		if(OBSWebsocket.instance.connected) {
			this.listOBSScenes();
			this.listOBSSources();
		}
		if(TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
			this.listRewards();
		}
		const list = this.$store("triggers").triggerList;
		//No trigger yet, just show form
		if(list.length == 0) {
			this.showList = false;
			this.showForm = true;
			this.headerKey = "triggers.header_select_trigger";
		}

		this.renameOBSElementHandler = async () => {
			//For some reason we need to call OBS twice to get latest changes
			await this.listOBSScenes();
			await this.listOBSScenes();
			
			await this.listOBSSources();
			await this.listOBSSources();
		};
		OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_INPUT_NAME_CHANGED, this.renameOBSElementHandler);
		OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_SCENE_NAME_CHANGED, this.renameOBSElementHandler);
		OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_FILTER_NAME_CHANGED, this.renameOBSElementHandler);
		

		let debounceTimeout = -1;
		//Watch for any change on the selected trigger
		watch(()=>this.currentTriggerData, ()=> {
			clearTimeout(debounceTimeout);
			debounceTimeout = setTimeout(()=> {
				if(this.currentTriggerData) {
					if(this.currentTriggerData.type == TriggerTypes.SCHEDULE) {
						//Force reschedule after an update
						SchedulerHelper.instance.scheduleTrigger(this.currentTriggerData);
					}
					this.$store("triggers").saveTriggers();
				}
			}, 1000);
		}, {deep:true});

		//Check for OBS connection change event.
		//if connection has been established, load scenes and sources
		watch(()=>OBSWebsocket.instance.connected, async ()=> {
			if(OBSWebsocket.instance.connected) {
				await this.listOBSScenes();
				await this.listOBSSources();
			}
		})
	}

	public beforeUnmount():void {
		OBSWebsocket.instance.removeEventListener(TwitchatEvent.OBS_INPUT_NAME_CHANGED, this.renameOBSElementHandler);
		OBSWebsocket.instance.removeEventListener(TwitchatEvent.OBS_SCENE_NAME_CHANGED, this.renameOBSElementHandler);
		OBSWebsocket.instance.removeEventListener(TwitchatEvent.OBS_FILTER_NAME_CHANGED, this.renameOBSElementHandler);
	}

	/**
	 * Called when back button is clicked on params header
	 */
	public onNavigateBack(): boolean {
		if(!this.showList) {
			this.showList = true;
			this.showForm = false;
			this.currentTriggerData = null;
			this.headerKey = "triggers.header";
			return true;
		}
		return false;
	}

	/**
	 * Opens the form
	 */
	public openForm():void {
		this.headerKey = "triggers.header_select_trigger";
		this.showForm = true;
		this.showList = false;
	}

	/**
	 * Called when an existing trigger is selected for edition
	 * @param triggerData
	 */
	public onSelectTrigger(triggerData:TriggerData):void {
		this.currentTriggerData = triggerData;
		this.showList = false;
		this.showForm = false;
	}

	/**
	 * Lists OBS Sources
	 */
	public async listOBSSources():Promise<void> {
		this.loadingOBSScenes = true;
		await Utils.promisedTimeout(250);
		try {
			this.obsSources = await OBSWebsocket.instance.getSources();
			this.obsInputs = await OBSWebsocket.instance.getInputs();
		}catch(error) {
			this.obsSources = [];
			this.$store("main").alert(this.$t('error.obs_sources_loading'));
			return;
		}

		this.obsSources.sort((a,b)=> {
			if(a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
			if(a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
			return 0;
		});

		this.obsInputs.sort((a,b)=> {
			if(a.inputName.toLowerCase() < b.inputName.toLowerCase()) return -1;
			if(a.inputName.toLowerCase() > b.inputName.toLowerCase()) return 1;
			return 0;
		});
		this.loadingOBSScenes = false;
	}

	/**
	 * Lists OBS Scenes
	 */
	public async listOBSScenes():Promise<void> {
		try {
			this.obsScenes = ((await OBSWebsocket.instance.getScenes()).scenes as unknown) as OBSSceneItem[];
		}catch(error) {
			this.obsScenes = [];
			this.$store("main").alert(this.$t('error.obs_scenes_loading'));
			return;
		}

		this.obsScenes.sort((a,b)=> {
			if(a.sceneName.toLowerCase() < b.sceneName.toLowerCase()) return -1;
			if(a.sceneName.toLowerCase() > b.sceneName.toLowerCase()) return 1;
			return 0;
		});
	}

	/**
	 * Lists the rewards
	 */
	public async listRewards():Promise<void> {
		this.loadingRewards = true;
		this.rewards = await this.$store("rewards").loadRewards();
		await Utils.promisedTimeout(200);//Just make sure the loading is visible in case query runs crazy fast
		this.loadingRewards = false;
	}

	/**
	 * Simulates a trigger's execution
	 */
	public testTrigger(trigger:TriggerData):void {
		const triggerEvent = TriggerTypesDefinitionList().find(v=>v.value == trigger.type);
		
		if(triggerEvent?.testMessageType) {
			//Special case for schedules
			if(trigger.type === TriggerTypes.SCHEDULE) {
				TriggerActionHandler.instance.parseScheduleTrigger(trigger, true);
			}else

			//If it's a notice type
			if(triggerEvent.testMessageType == TwitchatDataTypes.TwitchatMessageType.NOTICE) {
				this.$store("debug").simulateNotice(triggerEvent.testNoticeType, (data)=> {
					const m = data as TwitchatDataTypes.MessageNoticeData;
					switch(m.noticeId) {
						case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:{
							(m as TwitchatDataTypes.MessageEmergencyModeInfo).enabled = (triggerEvent.value == TriggerTypes.EMERGENCY_MODE_START);
						}
						case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE:{
							(m as TwitchatDataTypes.MessageShieldMode).enabled = (triggerEvent.value == TriggerTypes.SHIELD_MODE_ON);
						}
					}
					TriggerActionHandler.instance.execute(data, true);
				}, false);
				
			//If it's any other message type
			}else{
				this.$store("debug").simulateMessage(triggerEvent.testMessageType, (data)=> {
					let m = data
					//Chat message simulation
					if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						switch(triggerEvent.value) {
							case TriggerTypes.CHAT_COMMAND:{
								//Add the command to the fake text message
								m.message = trigger.chatCommand + " " + m.message;
								m.message_html = trigger.chatCommand + " " + m.message_html;
								break;
							}
							case TriggerTypes.FIRST_ALL_TIME:{
								m.twitch_isFirstMessage = true;
								break;
							}
							case TriggerTypes.FIRST_TODAY:{
								m.todayFirst = true;
								break;
							}
							case TriggerTypes.RETURNING_USER:{
								m.twitch_isReturning = true;
								break;
							}
							case TriggerTypes.PRESENTATION:{
								m.twitch_isPresentation = true;
								break;
							}
						} 
					}else 

					//Reward redeem simulation
					if(m.type == TwitchatDataTypes.TwitchatMessageType.REWARD) {
						//Inject actual reward data
						let twitchReward = this.$store("rewards").rewardList.find(v=> v.id == trigger.rewardId);
						if(twitchReward) {
							(m as TwitchatDataTypes.MessageRewardRedeemData).reward = {
								id:twitchReward.id,
								cost:twitchReward.cost,
								description:twitchReward.prompt,
								title:twitchReward.title,
								color:twitchReward.background_color,
								icon:{
									sd:twitchReward.image?.url_1x ?? "",
									hd:twitchReward.image?.url_4x,
								},
							};
						}
					}else 

					//OBS scene change simulation
					if(m.type == TwitchatDataTypes.TwitchatMessageType.OBS_SCENE_CHANGE) {
						m.sceneName = trigger.obsScene!;
					}else 

					//OBS source toggle simulation
					if(m.type == TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE) {
						m.sourceName = trigger.obsSource!;
						m.visible = trigger.type == TriggerTypes.OBS_SOURCE_ON;
					}else 

					//OBS source toggle simulation
					if(m.type == TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE) {
						m.inputName = trigger.obsInput!;
						const typeToState:Partial<{[key in TriggerTypesValue]:TwitchatDataTypes.MessageOBSPlaybackStateValue}> = {};
						typeToState[TriggerTypes.OBS_PLAYBACK_ENDED]		= "complete";
						typeToState[TriggerTypes.OBS_PLAYBACK_STARTED]		= "start";
						typeToState[TriggerTypes.OBS_PLAYBACK_PAUSED]		= "pause";
						typeToState[TriggerTypes.OBS_PLAYBACK_NEXT]			= "next";
						typeToState[TriggerTypes.OBS_PLAYBACK_PREVIOUS]		= "prev";
						typeToState[TriggerTypes.OBS_PLAYBACK_RESTARTED]	= "restart";
						if(typeToState[trigger.type]) {
							m.state = typeToState[trigger.type]!;
						}else{
							this.$store("main").alert("Trigger type \""+trigger.type+"\" is missing associated state on ParamsTriggers.vue");
						}
					}else 

					//Counter update simulation
					if(m.type == TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE) {
						const counter = this.$store("counters").counterList.find(v=>v.id == trigger.counterId);;
						if(counter) {
							m.counter = counter;
							switch(trigger.type) {
								case TriggerTypes.COUNTER_ADD: m.added = m.added_abs = 10; break;
								case TriggerTypes.COUNTER_DEL: m.added = -10; m.added_abs = 10; break;
								case TriggerTypes.COUNTER_LOOPED: m.looped = true; break;
								case TriggerTypes.COUNTER_MAXED: m.maxed = true; break;
								case TriggerTypes.COUNTER_MINED: m.mined = true; break;
							}
						}
					}

					//Timer stop simulation
					if(triggerEvent.value == TriggerTypes.TIMER_STOP) {
						//Set the timer as stopped
						(m as TwitchatDataTypes.MessageTimerData).started = false;
					}else

					//Subgift simulation
					if(triggerEvent.value == TriggerTypes.SUBGIFT) {
						const sub = (m as TwitchatDataTypes.MessageSubscriptionData);
						sub.is_gift = true;
						const recipients = [];
						do {
							recipients.push(Utils.pickRand(this.$store("users").users));
						}while(Math.random()>.25);
						sub.gift_recipients = recipients;
						sub.gift_count = recipients.length;
					}else

					if(triggerEvent.value == TriggerTypes.COUNTDOWN_START) {
						//Remove end date so it counts as a countdown start not an end
						const cd = (m as TwitchatDataTypes.MessageCountdownData).countdown;
						delete cd.endAt;
						delete cd.endAt_ms;
					}else

					if(triggerEvent.value == TriggerTypes.TIMEOUT) {
						//set timeout duration
						(m as TwitchatDataTypes.MessageBanData).duration_s = Math.round(Math.random()*666);
					}else

					if(triggerEvent.value == TriggerTypes.BAN) {
						//Remove ban duration so it counts as a ban, not a timeout
						delete (m as TwitchatDataTypes.MessageBanData).duration_s;
					}else

					if(triggerEvent.value == TriggerTypes.SHOUTOUT_IN || triggerEvent.value == TriggerTypes.SHOUTOUT_OUT) {
						//Force proper "received" state
						(m as TwitchatDataTypes.MessageShoutoutData).received = (triggerEvent.value == TriggerTypes.SHOUTOUT_IN);
					}

					TriggerActionHandler.instance.execute(m, true);
				}, false);
			}
		}
	}

	/**
	 * Delete a trigger
	 * @param id 
	 */
	public deleteTrigger(id:string):void {
		this.$store("main").confirm(this.$t("triggers.delete_confirm")).then(()=>{
			this.$store("triggers").deleteTrigger(id);
			this.showList = true;
			this.showForm = false;
			this.currentTriggerData = null;
		}).catch(error=>{});
	}
}
</script>

<style scoped lang="less">
.paramstriggers{
	.holder {
		display: flex;
		flex-direction: column;
		gap: 1em;

		.createBt {
			margin: auto;
		}
	
		.ctas {
			column-gap: 1em;
			row-gap: .25em;
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			margin-top: .5em;
			flex-wrap: wrap;
		}
	}
}
</style>