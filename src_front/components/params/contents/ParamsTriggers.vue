<template>
	<div class="paramstriggers parameterContent">
		<Icon name="broadcast" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="p" :keypath="headerKey" v-if="!currentTriggerData">
				<template #COUNT><strong>{{ eventsCount }}</strong></template>
			</i18n-t>
			<i18n-t scope="global" tag="p" class="small" keypath="triggers.logs.cmd_info" v-if="!currentTriggerData">
				<template #CMD><mark v-click2Select>{{ $store.chat.commands.find(v=>v.id=='triggerlogs')?.cmd}}</mark></template>
			</i18n-t>
		</div>

		<div class="card-item" v-if="noTrigger">{{ $t("triggers.usage") }}</div>

		<div class="ctas" v-if="showForm || currentTriggerData">
			<Button class="cta resyncBt" small
				v-if="showOBSResync || showForm"
				icon="obs"
				@click="listOBSSources(); listOBSScenes();"
				v-tooltip="$t('triggers.resyncOBSBt_tt')"
				:loading="loadingOBSElements">{{ $t('triggers.resyncOBSBt') }}</Button>

			<Button class="cta resyncBt" small
				icon="channelPoints"
				v-if="canManageRewards && isAffiliate"
				@click="listRewards()"
				v-tooltip="$t('triggers.resyncRewardsBt_tt')"
				:loading="loadingRewards">{{ $t('triggers.resyncRewardsBt') }}</Button>

			<Button class="cta resyncBt" small
				icon="extension"
				v-if="canManageExtensions"
				@click="listExtensions()"
				v-tooltip="$t('triggers.resyncExtensionBt_tt')"
				:loading="loadingExtension">{{ $t('triggers.resyncExtensionBt') }}</Button>

			<Button class="cta resyncBt" small
				icon="mixitup"
				v-if="$store.mixitup.connected"
				@click="listMixItUp()"
				v-tooltip="$t('triggers.resyncmixitupBt_tt')"
				:loading="loadingMixItUp">{{ $t('triggers.resyncmixitupBt') }}</Button>

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

		<template v-if="showList && !showForm">
			<Button class="createBt"
				v-if="activeTriggerCount < $config.MAX_TRIGGERS || ($store.auth.isPremium && activeTriggerCount < $config.MAX_TRIGGERS_PREMIUM)"
				icon="add" primary
				v-newflag="{date:$config.NEW_FLAGS_DATE_V16_12, id:'paramsparams_triggers_3'}"
				@click="openForm();">{{ $t('triggers.add_triggerBt') }}</Button>

			<div class="card-item premium premiumLimit" v-else-if="!$store.auth.isPremium">
				<span>{{$t("triggers.nonpremium_limit", {MAX:$config.MAX_TRIGGERS, MAX_PREMIUM:$config.MAX_TRIGGERS_PREMIUM})}}</span>
				<Button icon="premium" premium light @click="openPremium()">{{ $t("premium.become_premiumBt") }}</Button>
			</div>
			<div class="card-item premium premiumLimit" v-else>
				<span>{{$t("triggers.premium_limit", {MAX:$config.MAX_TRIGGERS_PREMIUM})}}</span>
			</div>
		</template>

		<TriggerCreateForm
			v-if="showForm"
			@selectTrigger="onSelectTrigger($event)"
			@updateHeader="headerKey = $event"
			:obsScenes="obsScenes"
			:obsSources="obsSources"
			:obsInputs="obsInputs"
			:rewards="rewards"
			:folderTarget="createFolderTarget" />

		<TriggerActionList
			v-if="currentTriggerData"
			:triggerData="currentTriggerData"
			:obsScenes="obsScenes"
			:obsSources="obsSources"
			:obsInputs="obsInputs"
			:rewards="rewards"
			:extensions="extensions" />

		<TriggerList v-if="showList && !showForm"
			@select="onSelectTrigger($event)"
			@testTrigger="testTrigger($event)"
			@createTrigger="createTriggerWithinFolder($event)"
			:rewards="rewards" />
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import { TriggerTypes, TriggerTypesDefinitionList, type TriggerData, type TriggerTypeDefinition, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { OBSInputItem, OBSSceneItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import SchedulerHelper from '@/utils/SchedulerHelper';
import Utils from '@/utils/Utils';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import type IParameterContent from './IParameterContent';
import TriggerActionList from './triggers/TriggerActionList.vue';
import TriggerCreateForm from './triggers/TriggerCreateForm.vue';
import TriggerList from './triggers/TriggerList.vue';

@Component({
	components:{
		Button: TTButton,
		TriggerList,
		TriggerActionList,
		TriggerCreateForm,
	},
	emits:[],
})
class ParamsTriggers extends Vue implements IParameterContent {

	public eventsCount:number = 0;
	public showForm:boolean = false;
	public loadingRewards:boolean = false;
	public loadingMixItUp:boolean = false;
	public loadingExtension:boolean = false;
	public loadingOBSElements:boolean = false;
	public headerKey:string = "triggers.header";
	public createFolderTarget:string = "";
	public obsScenes:OBSSceneItem[] = [];
	public obsSources:OBSSourceItem[] = [];
	public obsInputs:OBSInputItem[] = [];
	public rewards:TwitchDataTypes.Reward[] = [];
	public extensions:TwitchDataTypes.Extension[] = [];

	private renameOBSElementHandler!:(e:TwitchatEvent) => void;
	public get currentTriggerData():TriggerData|null { return this.$store.triggers.currentEditTriggerData; }
	public get showList():boolean { return this.currentTriggerData == null; }
	public get isAffiliate():boolean { return this.$store.auth.twitch.user.is_affiliate || this.$store.auth.twitch.user.is_partner; }
	public get canManageRewards():boolean { return TwitchUtils.hasScopes([TwitchScopes.MANAGE_REWARDS]); }
	public get canManageExtensions():boolean { return TwitchUtils.hasScopes([TwitchScopes.EXTENSIONS]); }

	public get showOBSResync():boolean {
		if(!this.currentTriggerData) return false;
		if(this.currentTriggerData.type == TriggerTypes.HEAT_CLICK) return true;
		if(this.currentTriggerData.actions.length === 0) return false;
		return this.currentTriggerData.actions.findIndex(v=>v.type == "obs") > -1;
	}

	public get canTestTrigger():boolean {
		if(!this.currentTriggerData) return false;
		let events:TriggerTypeDefinition[] = TriggerTypesDefinitionList().concat();
		const e = events.find(v=>v.value == this.currentTriggerData?.type);
		return e?.testMessageType != undefined;
	}

	public get activeTriggerCount():number {
		return this.$store.triggers.triggerList.filter(v=>v.enabled !== false).length;
	}

	public get noTrigger():boolean {
		return this.$store.triggers.triggerList?.length === 0;
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
		if(TwitchUtils.hasScopes([TwitchScopes.EXTENSIONS])) {
			this.listExtensions();
		}
		if(this.$store.mixitup.connected) {
			this.listMixItUp();
		}
		//No trigger yet, just show form
		if(this.noTrigger) {
			// this.showForm = true;
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
			debounceTimeout = window.setTimeout(()=> {
				if(this.currentTriggerData) {
					if(this.currentTriggerData.type == TriggerTypes.SCHEDULE) {
						//Force reschedule after an update
						SchedulerHelper.instance.scheduleTrigger(this.currentTriggerData);
					}
					this.$store.triggers.saveTriggers();
				}
			}, 1000);
		}, {deep:true});

		//Check for OBS connection change event.
		//if connection has been established, load scenes and sources
		watch(()=>OBSWebsocket.instance.connected.value, async ()=> {
			if(OBSWebsocket.instance.connected.value) {
				await this.listOBSScenes();
				await this.listOBSSources();
			}
		})
		
		watch(()=>this.$store.auth.newScopesToRequest, () => {
			if(TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
				this.listRewards();
			}
		});
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
		this.createFolderTarget = "";
		return this.reload();
	}

	/**
	 * Called when back button is clicked on params header
	 */
	public reload(): boolean {
		if(!this.showList || this.showForm) {
			this.showForm = false;
			this.createFolderTarget = "";
			this.$store.triggers.openTriggerList();
			this.headerKey = "triggers.header";
			return true;
		}
		return false;
	}

	/**
	 * Opens the premium page
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Opens the form
	 */
	public openForm():void {
		this.headerKey = "triggers.header_select_trigger";
		this.showForm = true;
	}

	/**
	 * Called when an existing trigger is selected for edition
	 * @param triggerData
	 */
	public onSelectTrigger(triggerData:TriggerData):void {
		this.$store.triggers.openTriggerEdition(triggerData);
		this.showForm = false;
		this.createFolderTarget = "";
	}

	/**
	 * Lists OBS sources, scenes and filters
	 */
	public async listOBSSources():Promise<void> {
		this.loadingOBSElements = true;
		await Utils.promisedTimeout(250);
		let sources:OBSSourceItem[] = [];
		let inputs:OBSInputItem[] = [];
		try {
			sources = await OBSWebsocket.instance.getSources();
			inputs = await OBSWebsocket.instance.getInputs();
		}catch(error) {
			this.obsSources = [];
			this.$store.common.alert(this.$t('error.obs_sources_loading'));
			this.loadingOBSElements = false;
			return;
		}

		sources.sort((a,b)=> {
			if(a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
			if(a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
			return 0;
		});

		inputs.sort((a,b)=> {
			if(a.inputName.toLowerCase() < b.inputName.toLowerCase()) return -1;
			if(a.inputName.toLowerCase() > b.inputName.toLowerCase()) return 1;
			return 0;
		});

		this.obsSources = sources;
		this.obsInputs = inputs;
		this.loadingOBSElements = false;
	}

	/**
	 * Lists OBS Scenes
	 */
	public async listOBSScenes():Promise<void> {
		let scenes:OBSSceneItem[] = [];
		try {
			scenes = ((await OBSWebsocket.instance.getScenes()).scenes as unknown) as OBSSceneItem[];
		}catch(error) {
			this.obsScenes = [];
			this.$store.common.alert(this.$t('error.obs_scenes_loading'));
			return;
		}

		scenes.sort((a,b)=> {
			if(a.sceneName.toLowerCase() < b.sceneName.toLowerCase()) return -1;
			if(a.sceneName.toLowerCase() > b.sceneName.toLowerCase()) return 1;
			return 0;
		});
		this.obsScenes = scenes;
	}

	/**
	 * Lists the rewards
	 */
	public async listRewards():Promise<void> {
		this.loadingRewards = true;
		this.rewards = await this.$store.rewards.loadRewards();
		await Utils.promisedTimeout(200);//Just make sure the loading is visible in case query runs crazy fast
		this.loadingRewards = false;
	}

	/**
	 * Lists twitch extensions
	 */
	public async listExtensions():Promise<void> {
		this.loadingExtension = true;
		const list = await TwitchUtils.listExtensions(false);
		this.extensions = list || [];
		await Utils.promisedTimeout(200);//Just make sure the loading is visible in case query runs crazy fast
		this.loadingExtension = false;
	}

	/**
	 * Lists Mix It Up commands
	 */
	public async listMixItUp():Promise<void> {
		this.loadingMixItUp = true;
		this.$store.mixitup.listCommands();
		await Utils.promisedTimeout(200);//Just make sure the loading is visible in case query runs crazy fast
		this.loadingMixItUp = false;
	}

	/**
	 * Simulates a trigger's execution
	 */
	public createTriggerWithinFolder(folderId:string):void {
		this.createFolderTarget = folderId;
		this.openForm();
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

			//If it's s slash command
			// if(trigger.type === TriggerTypes.SLASH_COMMAND) {
				// this.$store.debug.simulateMessage<TwitchatDataTypes.ChatMessageTypes>(triggerEvent.testMessageType, (data)=> {
				// 	let m = data
				// 	TriggerActionHandler.instance.execute(m, true, trigger.id);
				// }, false);
			// }else

			//If it's a notice type
			if(triggerEvent.testMessageType == TwitchatDataTypes.TwitchatMessageType.NOTICE) {
				this.$store.debug.simulateNotice<TwitchatDataTypes.MessageNoticeData>(triggerEvent.testNoticeType, (data)=> {
					const m = data as TwitchatDataTypes.MessageNoticeData;
					switch(m.noticeId) {
						case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:{
							(m as TwitchatDataTypes.MessageEmergencyModeInfo).enabled = (triggerEvent.value == TriggerTypes.EMERGENCY_MODE_START);
							break;
						}
						case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE:{
							(m as TwitchatDataTypes.MessageShieldMode).enabled = (triggerEvent.value == TriggerTypes.SHIELD_MODE_ON);
							break;
						}
					}
					TriggerActionHandler.instance.execute(data, true);
				}, false);

			//If it's any other message type
			}else{
				this.$store.debug.simulateMessage<TwitchatDataTypes.ChatMessageTypes>(triggerEvent.testMessageType, async (data)=> {
					let m = data
					let amount = Math.round(Math.random() * 100 + 1);
					let amountFormatted = "$"+amount;

					//Slash commands simulation
					if(trigger.type == TriggerTypes.SLASH_COMMAND) {
						const typedMessage = m as TwitchatDataTypes.MessageChatData;
						TriggerActionHandler.instance.executeTrigger(trigger, typedMessage, true, trigger.chatCommand);
					}else

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
						}
					}else

					//Reward redeem simulation
					if(m.type == TwitchatDataTypes.TwitchatMessageType.REWARD) {
						//Inject actual reward data
						let twitchReward = this.$store.rewards.rewardList.find(v=> v.id == trigger.rewardId);
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
							this.$store.common.alert("Trigger type \""+trigger.type+"\" is missing associated state on ParamsTriggers.vue");
						}
					}else

					//Counter update simulation
					if(m.type == TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE) {
						const counter = this.$store.counters.counterList.find(v=>v.id == trigger.counterId);
						if(counter) {
							m.counter = counter;
							switch(trigger.type) {
								case TriggerTypes.COUNTER_EDIT:
								case TriggerTypes.COUNTER_ADD: m.added = m.added_abs = 10; break;
								case TriggerTypes.COUNTER_DEL: m.added = -10; m.added_abs = 10; break;
								case TriggerTypes.COUNTER_LOOPED: m.looped = true; break;
								case TriggerTypes.COUNTER_MAXED: m.maxed = true; break;
								case TriggerTypes.COUNTER_MINED: m.mined = true; break;
							}
						}
					}

					//Value update simulation
					if(m.type == TwitchatDataTypes.TwitchatMessageType.VALUE_UPDATE) {
						const value = this.$store.values.valueList.find(v=>v.id == trigger.valueId);
						if(value) {
							m.value = value;
							m.oldValue = value.value;
						}
					}

					//Timer start simulation
					if(triggerEvent.value == TriggerTypes.TIMER_START) {
						//Set the timer as not stopped
						(m as TwitchatDataTypes.MessageTimerData).stopped = false;
					}else

					/**
					 * Countdown start simulation
					 */
					if(triggerEvent.value == TriggerTypes.COUNTDOWN_START) {
						//Remove end date so it counts as a countdown start not an end
						const cd = m as TwitchatDataTypes.MessageCountdownData;
						cd.complete = false;
						delete cd.endedAt_ms;
						delete cd.endedAt_str;
						delete cd.finalDuration_ms;
						delete cd.finalDuration_str;
					}else

					//Subgift simulation
					if(triggerEvent.value == TriggerTypes.SUBGIFT) {
						const sub = (m as TwitchatDataTypes.MessageSubscriptionData);
						sub.is_gift = true;
						const recipients = [];
						do {
							recipients.push(Utils.pickRand(this.$store.users.users));
						}while(Math.random()>.25);
						sub.gift_recipients = recipients;
						sub.gift_count = recipients.length;
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
					}else

					if(triggerEvent.value == TriggerTypes.HEAT_CLICK) {
						//Force proper heat click target
						if(trigger.heatClickSource == "area" && trigger.heatAreaIds) {
							(m as TwitchatDataTypes.MessageHeatClickData).areaId = Utils.pickRand(trigger.heatAreaIds);
						}
						if(trigger.heatClickSource == "obs" && trigger.heatObsSource) {
							(m as TwitchatDataTypes.MessageHeatClickData).obsSource = trigger.obsSource;
						}
					}else

					if(triggerEvent.value == TriggerTypes.GOXLR_BUTTON_PRESSED || triggerEvent.value == TriggerTypes.GOXLR_BUTTON_RELEASED) {
						//Force a button
						(m as TwitchatDataTypes.MessageGoXLRButtonData).button = Utils.pickRand(trigger.goxlrButtons!);
						(m as TwitchatDataTypes.MessageGoXLRButtonData).pressed = triggerEvent.value == TriggerTypes.GOXLR_BUTTON_PRESSED;
					}else

					if(triggerEvent.value == TriggerTypes.GOXLR_FX_ENABLED || triggerEvent.value == TriggerTypes.GOXLR_FX_DISABLED) {
						(m as TwitchatDataTypes.MessageGoXLRFXEnableChangeData).enabled = triggerEvent.value == TriggerTypes.GOXLR_FX_ENABLED;
						(m as TwitchatDataTypes.MessageGoXLRFXEnableChangeData).fxIndex = Utils.pickRand([0,1,2,3,4,5]);
					}else

					if(triggerEvent.value == TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE) {
						//Remove ban duration so it counts as a ban, not a timeout
						(m as TwitchatDataTypes.MessageCommunityChallengeContributionData).challenge.progress = (m as TwitchatDataTypes.MessageCommunityChallengeContributionData).challenge.goal;
					}else

					if(triggerEvent.value == TriggerTypes.TRACK_ADD_TO_QUEUE_FAILED) {
						const code = Utils.pickRand<TwitchatDataTypes.MessageMusicAddedToQueueData["failCode"]>(["spotify_not_connected", "wrong_url", "no_result", "api_queue", "api_playlist", "max_duration"]);
						(m as TwitchatDataTypes.MessageMusicAddedToQueueData).failCode = code;
						(m as TwitchatDataTypes.MessageMusicAddedToQueueData).failReason = this.$t("triggers.actions.music.fail_reasons."+code, {DURATION:"03:33", SEARCH:"Mitchiri Neko March"});
					}else

					if(triggerEvent.value == TriggerTypes.AD_APPROACHING) {
						(m as TwitchatDataTypes.MessageAdBreakApproachingData).delay_ms = trigger.adBreakDelay || 0;
					}else

					if(triggerEvent.value == TriggerTypes.STREAMLABS_DONATION) {
						(m as TwitchatDataTypes.StreamlabsDonationData).eventType = "donation";
						(m as TwitchatDataTypes.StreamlabsDonationData).amount = amount;
						(m as TwitchatDataTypes.StreamlabsDonationData).amountFormatted = amountFormatted;
					}else

					if(triggerEvent.value == TriggerTypes.STREAMLABS_MERCH) {
						(m as TwitchatDataTypes.StreamlabsMerchData).eventType = "merch";
						(m as TwitchatDataTypes.StreamlabsMerchData).product = "T-shirt";
					}else

					if(triggerEvent.value == TriggerTypes.STREAMLABS_PATREON_PLEDGE) {
						(m as TwitchatDataTypes.StreamlabsPatreonPledgeData).eventType = "patreon_pledge";
						(m as TwitchatDataTypes.StreamlabsPatreonPledgeData).amount = amount;
						(m as TwitchatDataTypes.StreamlabsPatreonPledgeData).amountFormatted = amountFormatted;
					}else

					if(triggerEvent.value == TriggerTypes.STREAMLABS_CHARITY_TIP) {
						(m as TwitchatDataTypes.StreamlabsCharityData).eventType = "charity";
						(m as TwitchatDataTypes.StreamlabsCharityData).amount = amount;
						(m as TwitchatDataTypes.StreamlabsCharityData).amountFormatted = amountFormatted;
					}else

					if(triggerEvent.value == TriggerTypes.KOFI_DONATION) {
						(m as TwitchatDataTypes.KofiDonationData).eventType = "donation";
						(m as TwitchatDataTypes.KofiDonationData).amount = amount;
						(m as TwitchatDataTypes.KofiDonationData).amountFormatted = amountFormatted;
					}else

					if(triggerEvent.value == TriggerTypes.KOFI_MERCH) {
						(m as TwitchatDataTypes.KofiMerchData).eventType = "merch";
						(m as TwitchatDataTypes.KofiMerchData).products = [{id:"123456", name:"T-shirt", quantity:1}, {id:"234561", name:"Hoodie", quantity:1}];
					}else

					if(triggerEvent.value == TriggerTypes.KOFI_SUBSCRIPTION) {
						(m as TwitchatDataTypes.KofiSubscriptionData).eventType = "subscription";
						(m as TwitchatDataTypes.KofiSubscriptionData).amount = amount;
						(m as TwitchatDataTypes.KofiSubscriptionData).amountFormatted = amountFormatted;
						(m as TwitchatDataTypes.KofiSubscriptionData).tier = Utils.pickRand(["Gold", "Bronze", "Silver", "Poop"]);
					}else

					if(triggerEvent.value == TriggerTypes.KOFI_COMMISSION) {
						(m as TwitchatDataTypes.KofiCommissionData).eventType = "commission";
						(m as TwitchatDataTypes.KofiCommissionData).amount = amount;
						(m as TwitchatDataTypes.KofiCommissionData).amountFormatted = amountFormatted;
						(m as TwitchatDataTypes.KofiCommissionData).currency = "EUR";
					}else

					if(triggerEvent.value == TriggerTypes.TIPEEE_SUB) {
						(m as TwitchatDataTypes.MessageTipeeeDonationData).recurring = true;
					} else if(triggerEvent.value == TriggerTypes.TIPEEE_RESUB) {
						(m as TwitchatDataTypes.MessageTipeeeDonationData).recurring = true;
						(m as TwitchatDataTypes.MessageTipeeeDonationData).recurringCount = Math.round(Math.random() * 10);
					} else

					if(triggerEvent.value == TriggerTypes.POWER_UP_MESSAGE) {
						(m as TwitchatDataTypes.MessageChatData).twitch_animationId = Utils.pickRand(["rainbow-eclipse", "simmer"]);
					} else

					if(triggerEvent.value == TriggerTypes.VOICEMOD) {
						delete (m as TwitchatDataTypes.MessageVoicemodData).soundID;
						delete (m as TwitchatDataTypes.MessageVoicemodData).soundName;
					} else

					if(triggerEvent.value == TriggerTypes.VOICEMOD_SOUND_EFFECT) {
						delete (m as TwitchatDataTypes.MessageVoicemodData).voiceID;
						delete (m as TwitchatDataTypes.MessageVoicemodData).voiceName;
					} else

					if(triggerEvent.value == TriggerTypes.MONITOR_RESTRICT_OFF) {
						(m as TwitchatDataTypes.MessageLowtrustTreatmentData).restricted =
						(m as TwitchatDataTypes.MessageLowtrustTreatmentData).monitored = false;
					} else

					if(triggerEvent.value == TriggerTypes.MONITOR_ON) {
						(m as TwitchatDataTypes.MessageLowtrustTreatmentData).monitored = true;
					} else

					if(triggerEvent.value == TriggerTypes.RESTRICT_ON) {
						(m as TwitchatDataTypes.MessageLowtrustTreatmentData).restricted = false;
					}else

					if(triggerEvent.value == TriggerTypes.MESSAGE_ANSWER) {
						const fakeMessage = await this.$store.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE);
						(m as TwitchatDataTypes.MessageChatData).answersTo = fakeMessage;
					}else

					if(triggerEvent.value == TriggerTypes.POLL_START) {
						(m as TwitchatDataTypes.MessagePollData).isStart = true;
					}else

					if(triggerEvent.value == TriggerTypes.PREDICTION_START) {
						(m as TwitchatDataTypes.MessagePredictionData).isStart = true;
					}else

					if(triggerEvent.value == TriggerTypes.CHAT_POLL_START) {
						(m as TwitchatDataTypes.MessageChatPollData).isStart = true;
					}

					TriggerActionHandler.instance.execute(m, true, trigger.id);
				}, false);
			}
		}
	}

	/**
	 * Delete a trigger
	 * @param id
	 */
	public deleteTrigger(id:string):void {
		this.$store.main.confirm(this.$t("triggers.delete_confirm")).then(()=>{
			this.showForm = false;
			this.createFolderTarget = "";
			this.$store.triggers.deleteTrigger(id);
			this.$store.triggers.openTriggerList();
		}).catch(error=>{});
	}
}
export default toNative(ParamsTriggers);
</script>

<style scoped lang="less">
.paramstriggers{

	.createBt {
		margin: auto;
	}

	.premiumLimit {
		text-align: center;
		.button {
			display: flex;
			margin: auto;
			margin-top: .5em;
		}
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

	.exportForm {
		margin: auto;
	}
}
</style>
