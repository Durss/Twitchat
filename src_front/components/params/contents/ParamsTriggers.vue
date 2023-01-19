<template>
	<div class="paramstriggers">
		<img src="@/assets/icons/broadcast_purple.svg" alt="overlay icon" class="icon">

		<i18n-t scope="global" tag="p" class="head" v-if="!currentEvent" keypath="triggers.header">
			<template #COUNT><strong>{{ eventsCount }}</strong></template>
		</i18n-t>

		<div class="menu">
			<Button class="backBt" v-if="currentEvent"
				white
				@click="goBack()"
				:icon="$image('icons/back_purple.svg')"
			/>

			<div class="list">
				
				<!-- Main menu -->
				<ToggleBlock class="category"
				v-if="!currentEvent"
				v-for="c in eventCategories"
				:key="c.label"
				:title="$t(c.label)"
				:open="false"
				:icons="[c.icon]">
					<i18n-t scope="global" tag="div" class="require"
					v-if="!musicServiceAvailable && isMusicCategory(c.category)"
					keypath="triggers.music.require">
						<template #URL>
							<a @click="openOverlays()">{{ $t("triggers.music.require_url") }}</a>
						</template>
					</i18n-t>

					<i18n-t scope="global" tag="div" class="require"
					v-if="!obsConnected && isOBSCategory(c.category)"
					keypath="triggers.obs.require">
						<template #URL>
							<a @click="openOBS()">{{ $t("triggers.obs.require_url") }}</a>
						</template>
					</i18n-t>

					<div v-for="e in c.events" :key="(e.value as string)" :class="e.beta? 'item beta' : 'item'">
						<Button class="triggerBt"
							white
							:title="$t(e.labelKey!)"
							:icon="getIcon(e)"
							@click.capture="disabledEntry(e)? requestScope(e) : currentEvent = e"
							:disabled="disabledEntry(e)"
							:data-tooltip="disabledEntry(e)? $t('triggers.noChannelPoints_tt') : ''"
						/>

						<ToggleButton class="toggle"
							:aria-label="e.enabled? 'trigger enabled' : 'trigger disabled'"
							v-model="e.enabled"
							@change="onToggleEnable(e)"
							v-if="canToggle(e)"
						/>
					</div>
				</ToggleBlock>
				
				<!-- Main event title -->
				<div v-if="currentEvent" class="mainCategoryTitle">
					<img :src="getIcon(currentEvent)">
					
					<div class="label">{{$t(currentEvent?.labelKey!)}}</div>

					<ToggleButton class="toggle"
						:aria-label="currentEvent.enabled? 'trigger enabled' : 'trigger disabled'"
						v-model="currentEvent.enabled"
						@change="onToggleEnable(currentEvent)"
						v-if="currentEvent && canToggle(currentEvent)"
					/>
				</div>
				
				<!-- Sub event title -->
				<div v-if="currentSubEvent" class="subCategoryTitle">
					<img :src="getIcon(currentSubEvent)">
					
					<div class="label" v-if="currentSubEvent?.label" v-html="currentSubEvent?.label"></div>
					<div class="label" v-else-if="currentSubEvent?.labelKey" v-html="$t(currentSubEvent.labelKey)"></div>

					<ToggleButton class="toggle"
						:aria-label="currentSubEvent.enabled? 'trigger enabled' : 'trigger disabled'"
						v-model="currentSubEvent.enabled"
						@change="onToggleEnable(currentSubEvent)"
						v-if="currentSubEvent && canToggle(currentSubEvent)"
					/>
				</div>

				<!-- Sublist -->
				<div v-if="isSublist && !currentSubEvent && actionList.length==0 && subeventsList && subeventsList.length > 0"
				v-for="e in subeventsList" :key="(e.value as string)" class="item">
					<Button :class="getSubListClasses(e)"
						white
						:title="e.label"
						:icon="getIcon(e)"
						@click="currentSubEvent = e"
					/>

					<ToggleButton class="toggle"
						:aria-label="e.enabled? 'trigger enabled' : 'trigger disabled'"
						v-model="e.enabled"
						@change="onToggleEnable(e)"
						v-if="canToggle(e)"
					/>
				</div>
			</div>
		</div>
		
		<div class="empty" v-if="isSublist && subeventsList.length == 0 && actionList.length === 0 && !showLoading">
			- no entry -
		</div>

		<div class="triggerDescription" v-if="((currentEvent && ! isSublist) || (isSublist && (currentSubEvent || actionList.length > 0))) && !showLoading">
			<div class="text" v-html="triggerDescription"></div>

			<div class="ctas" v-if="currentEvent && obsConnected && obsActions">
				<Button :icon="$image('icons/refresh.svg')"
					:title="$t('triggers.resyncBt')"
					class="cta resyncBt"
					@click="listOBSSources(undefined, true)"
					:data-tooltip="$t('triggers.resyncBt_tt')"
					:loading="syncing"
				/>
			</div>

			<div class="ctas">
				<Button class="cta"
					v-if="canTestAction"
					:title="$t('triggers.testBt')"
					:icon="$image('icons/test.svg')"
					@click="testTrigger()" />

				<Button class="cta"
					highlight
					:title="$t('triggers.deleteBt')"
					:icon="$image('icons/delete.svg')"
					@click="deleteTrigger()" />
			</div>
		</div>

		<img src="@/assets/loader/loader.svg" alt="loader" v-if="showLoading" class="loader">

		<TriggerActionChatCommandParams class="chatCmdParams"
			v-if="isChatCmd && triggerData && (currentSubEvent || actionList.length > 0)"
			:triggerData="triggerData"
		/>

		<Button class="addBt"
			:icon="$image('icons/whispers.svg')"
			:title="$t('triggers.create_chat_cmdBt')"
			v-if="isChatCmd && !currentSubEvent && actionList.length == 0"
			@click="addAction()"
		/>


		<TriggerActionScheduleParams class="chatCmdParams"
			v-if="isSchedule && triggerData && (currentSubEvent || actionList.length > 0)"
			:triggerData="triggerData"
		/>

		<Button class="addBt"
			:icon="$image('icons/date.svg')"
			:title="$t('triggers.create_scheduleBt')"
			v-if="isSchedule && !currentSubEvent && actionList.length == 0"
			@click="addAction()"
		/>

		<draggable 
		v-model="actionList" 
		group="actions" 
		item-key="id"
		ghost-class="ghost"
		@change="saveData()"
		direction="vertical"
		handle=".action>.header>.orderBt"
		:animation="250"
		:dragoverBubble="true">
			<template #item="{element, index}">
				<TriggerActionEntry class="action"
					:action="element"
					:index="index"
					:totalItems="actionList.length"
					:sources="obsSources"
					:event="currentEvent"
					:triggerData="triggerData"
					:triggerKey="triggerKey"
					@delete="deleteAction(index)"
					@duplicate="duplicateAction(element, index)"
					@setContent="(v:string)=>$emit('setContent', v)"
				/>
			</template>
		</draggable>

		<div class="bottomCTAS" v-if="((currentEvent && ! isSublist) || (isSublist && (currentSubEvent || actionList.length > 0))) && !showLoading">
			<Button class="addBt"
				:icon="$image('icons/add.svg')"
				:title="$t('triggers.add_actionBt')"
				@click="addAction()"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import StoreProxy from '@/store/StoreProxy';
import { TriggerEvents, TriggerEventTypeCategories, TriggerTypes, type TriggerActionTypes, type TriggerData, type TriggerEventTypeCategoryValue, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket, { type OBSSceneItem, type OBSSourceItem } from '@/utils/OBSWebsocket';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { TwitchScopes, type TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import draggable from 'vuedraggable';
import ToggleBlock from '../../ToggleBlock.vue';
import ToggleButton from '../../ToggleButton.vue';
import TriggerActionChatCommandParams from './triggers/TriggerActionChatCommandParams.vue';
import TriggerActionEntry from './triggers/TriggerActionEntry.vue';
import TriggerActionScheduleParams from './triggers/TriggerActionScheduleParams.vue';

@Options({
	props:{},
	components:{
		Button,
		draggable,
		ToggleBlock,
		ToggleButton,
		TriggerActionEntry,
		TriggerActionScheduleParams,
		TriggerActionChatCommandParams,
	},
	emits:["setContent"]
})
export default class ParamsTriggers extends Vue {

	public currentEvent:TriggerEventTypes|null = null;
	public currentSubEvent:TwitchatDataTypes.ParameterDataListValue|null = null;
	public eventsList:TriggerEventTypes[] = [];
	public subeventsList:TwitchatDataTypes.ParameterDataListValue[] = [];
	public eventCategories:{category:TriggerEventTypeCategoryValue, label:string, icon:string, events:TriggerEventTypes[]}[] = [];
	public actionList:TriggerActionTypes[] = [];
	public eventsCount = 0;
	public canSave = true;
	public syncing = false;
	public isSublist = false;
	public showLoading = false;
	public rewards:TwitchDataTypes.Reward[] = [];
	public obsScenes:OBSSceneItem[] = [];
	public obsSources:OBSSourceItem[] = [];
	public triggerData:TriggerData = {
						name:"",
						enabled:true,
						actions:[],
					};

	public get musicServiceAvailable():boolean { return Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED; }

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }

	public get isChatCmd():boolean { return this.currentEvent?.value === TriggerTypes.CHAT_COMMAND; }
	
	public get isSchedule():boolean { return this.currentEvent?.value === TriggerTypes.SCHEDULE; }
	
	public get hasChannelPoints():boolean { return StoreProxy.auth.twitch.user.is_affiliate || StoreProxy.auth.twitch.user.is_partner; }

	public get triggerKey():string {
		if(!this.triggerData) return "";
		let key = this.currentEvent?.value as string;
		let subkey = this.triggerData.name;
		if(this.currentEvent?.isCategory &&
		(key === TriggerTypes.REWARD_REDEEM
		|| key === TriggerTypes.OBS_SCENE
		|| key === TriggerTypes.OBS_SOURCE_ON
		|| key === TriggerTypes.OBS_SOURCE_OFF)) {
			subkey = this.currentSubEvent?.value as string;
		}
		if(subkey != "0" && subkey) key = key+"_"+subkey;
		return key;
	}

	/**
	 * Returns if the trigger can be tested.
	 * A trigger can be tested if it has enough information.
	 */
	public get canTestAction():boolean {
		let canTest = false;
		for (let i = 0; i < this.actionList.length; i++) {
			const a = this.actionList[i];
			if(a.type === null) {
				//No action type defined
				continue;
			}else
			if(a.type == "obs") {
				//If it's an OBS action, it needs at least a souce to be defined
				if(!(a.sourceName?.length > 0)) continue;
			}else
			if(a.type == "chat"){
				//If it's a chat action, it needs at least the message to be defined
				if(!(a.text?.length > 0)) continue;
			}
			canTest = true;
			break;
		}
		//Check if a JSON example is available
		const entry = TriggerEvents().find(v=>v.value == this.currentEvent?.value);
		const hasJSON = entry ? entry.testMessageType != undefined : false;
		return canTest && hasJSON;
	}

	/**
	 * Get a trigger's description
	 */
	public get triggerDescription():string|null {
		const value = this.currentEvent?.value as string;
		const item = this.eventsList.find(v => v.value == value) as TriggerEventTypes|null;
		if(item) {
			let desc = this.$t(item.descriptionKey!);
			if(this.currentSubEvent) {
				let label = this.currentSubEvent.labelKey? this.$t(this.currentSubEvent.labelKey) : this.currentSubEvent.label ?? "";
				desc = desc.replace(/\{SUB_ITEM_NAME\}/gi, label);
			}
			return desc;
		}
		return null;
	}

	public get obsActions():boolean {
		for (let i = 0; i < this.actionList.length; i++) {
			if(this.actionList[i].type == "obs") return true;
		}
		return false;
	}

	/**
	 * Gets a trigger's icon
	 */
	public getSubListClasses(e:TriggerEventTypes|TwitchatDataTypes.ParameterDataListValue):string[] {
		const res = ["triggerBt", "subItem"];
		if(this.getIcon(e)) res.push("hasIcon");
		return res;
	}

	/**
	 * Gets a trigger's icon
	 */
	public getIcon(e:TriggerEventTypes|TwitchatDataTypes.ParameterDataListValue):string {
		if(!e.icon) return "";
		if(e.icon.indexOf("/") > -1) {
			return e.icon as string;
		}
		return this.$image("icons/"+e.icon+"_purple.svg");
	}

	/**
	 * Get if a trigger entry can be toggled
	 */
	public canToggle(e:TriggerEventTypes|TwitchatDataTypes.ParameterDataListValue):boolean {
		let key = e.value as string;
		if(this.isSublist) {
			key = this.currentEvent!.value+"_"+key.toLowerCase();
		}
		
		if(this.$store("triggers").triggers[key]) {
			const trigger = JSON.parse(JSON.stringify(this.$store("triggers").triggers[key]));
			let list = trigger as TriggerData;
			return e.noToggle !== true && list.actions.length > 0;
		}

		if(e.value == TriggerTypes.REWARD_REDEEM && !this.hasChannelPoints) return false;

		return false;
	}

	/**
	 * Get if a trigger entry should be disabled
	 */
	public disabledEntry(e:TriggerEventTypes|TwitchatDataTypes.ParameterDataListValue):boolean {
		if(e.value == TriggerTypes.REWARD_REDEEM && (!this.hasChannelPoints || !TwitchUtils.hasScope(TwitchScopes.LIST_REWARDS))) return true;
		if(e.value == TriggerTypes.POLL_RESULT && (!this.hasChannelPoints || !TwitchUtils.hasScope(TwitchScopes.MANAGE_POLLS))) return true;
		if(e.value == TriggerTypes.PREDICTION_RESULT && (!this.hasChannelPoints || !TwitchUtils.hasScope(TwitchScopes.MANAGE_PREDICTIONS))) return true;
		if(e.value == TriggerTypes.SHIELD_MODE_ON && !TwitchUtils.hasScope(TwitchScopes.SHIELD_MODE)) return true;
		if(e.value == TriggerTypes.SHIELD_MODE_OFF && !TwitchUtils.hasScope(TwitchScopes.SHIELD_MODE)) return true;
		if(e.value == TriggerTypes.TIMEOUT && !TwitchUtils.hasScope(TwitchScopes.READ_MODS_AND_BANNED)) return true;
		if(e.value == TriggerTypes.BAN && !TwitchUtils.hasScope(TwitchScopes.READ_MODS_AND_BANNED)) return true;
		if(e.value == TriggerTypes.UNBAN && !TwitchUtils.hasScope(TwitchScopes.READ_MODS_AND_BANNED)) return true;
		if(e.value == TriggerTypes.VIP && !TwitchUtils.hasScope(TwitchScopes.EDIT_VIPS)) return true;
		if(e.value == TriggerTypes.UNVIP && !TwitchUtils.hasScope(TwitchScopes.EDIT_VIPS)) return true;
		if(e.value == TriggerTypes.MOD && !TwitchUtils.hasScope(TwitchScopes.EDIT_MODS)) return true;
		if(e.value == TriggerTypes.UNMOD && !TwitchUtils.hasScope(TwitchScopes.EDIT_MODS)) return true;
		if(e.value == TriggerTypes.STREAM_INFO_UPDATE && !TwitchUtils.hasScope(TwitchScopes.SET_STREAM_INFOS)) return true;

		if(!TwitchUtils.hasScope(TwitchScopes.READ_HYPE_TRAIN)
		&& (e.value == TriggerTypes.HYPE_TRAIN_CANCELED
		|| e.value == TriggerTypes.HYPE_TRAIN_APPROACHING
		|| e.value == TriggerTypes.HYPE_TRAIN_COOLDOWN
		|| e.value == TriggerTypes.HYPE_TRAIN_END
		|| e.value == TriggerTypes.HYPE_TRAIN_PROGRESS
		|| e.value == TriggerTypes.HYPE_TRAIN_START)) return true;

		return false;
	}

	public requestScope(e:TriggerEventTypes):void {
		let scope:TwitchScopesString|"" = "";
		if(e.value == TriggerTypes.REWARD_REDEEM && this.hasChannelPoints && !TwitchUtils.hasScope(TwitchScopes.LIST_REWARDS)) scope = TwitchScopes.LIST_REWARDS;
		if(e.value == TriggerTypes.POLL_RESULT && this.hasChannelPoints && !TwitchUtils.hasScope(TwitchScopes.MANAGE_POLLS)) scope = TwitchScopes.MANAGE_POLLS;
		if(e.value == TriggerTypes.PREDICTION_RESULT && this.hasChannelPoints && !TwitchUtils.hasScope(TwitchScopes.MANAGE_PREDICTIONS)) scope = TwitchScopes.MANAGE_PREDICTIONS;
		if(e.value == TriggerTypes.SHIELD_MODE_ON && !TwitchUtils.hasScope(TwitchScopes.SHIELD_MODE)) scope = TwitchScopes.SHIELD_MODE;
		if(e.value == TriggerTypes.SHIELD_MODE_OFF && !TwitchUtils.hasScope(TwitchScopes.SHIELD_MODE)) scope = TwitchScopes.SHIELD_MODE;
		if(e.value == TriggerTypes.TIMEOUT && !TwitchUtils.hasScope(TwitchScopes.READ_MODS_AND_BANNED)) scope = TwitchScopes.READ_MODS_AND_BANNED;
		if(e.value == TriggerTypes.BAN && !TwitchUtils.hasScope(TwitchScopes.READ_MODS_AND_BANNED)) scope = TwitchScopes.READ_MODS_AND_BANNED;
		if(e.value == TriggerTypes.UNBAN && !TwitchUtils.hasScope(TwitchScopes.READ_MODS_AND_BANNED)) scope = TwitchScopes.READ_MODS_AND_BANNED;
		if(e.value == TriggerTypes.VIP && !TwitchUtils.hasScope(TwitchScopes.EDIT_VIPS)) scope = TwitchScopes.EDIT_VIPS;
		if(e.value == TriggerTypes.UNVIP && !TwitchUtils.hasScope(TwitchScopes.EDIT_VIPS)) scope = TwitchScopes.EDIT_VIPS;
		if(e.value == TriggerTypes.MOD && !TwitchUtils.hasScope(TwitchScopes.EDIT_MODS)) scope = TwitchScopes.EDIT_MODS;
		if(e.value == TriggerTypes.UNMOD && !TwitchUtils.hasScope(TwitchScopes.EDIT_MODS)) scope = TwitchScopes.EDIT_MODS;
		if(e.value == TriggerTypes.STREAM_INFO_UPDATE && !TwitchUtils.hasScope(TwitchScopes.SET_STREAM_INFOS)) scope = TwitchScopes.SET_STREAM_INFOS;

		if(!TwitchUtils.hasScope(TwitchScopes.READ_HYPE_TRAIN)
			&& (e.value == TriggerTypes.HYPE_TRAIN_CANCELED
			|| e.value == TriggerTypes.HYPE_TRAIN_APPROACHING
			|| e.value == TriggerTypes.HYPE_TRAIN_COOLDOWN
			|| e.value == TriggerTypes.HYPE_TRAIN_END
			|| e.value == TriggerTypes.HYPE_TRAIN_PROGRESS
			|| e.value == TriggerTypes.HYPE_TRAIN_START)) scope = TwitchScopes.READ_HYPE_TRAIN;
		
		if(scope) {
			this.$store("auth").requestTwitchScope(scope);
		}
	}
	
	public mounted():void {
		watch(()=> OBSWebsocket.instance.connected, () => { this.listOBSSources(undefined, true); });
		watch(()=> this.currentEvent, () => { this.onSelectTrigger(); });
		watch(()=> this.currentSubEvent, () => { this.onSelectsubTrigger(); });
		watch(()=> this.actionList, () => { this.saveData(); }, { deep:true });
		watch(()=> this.triggerData, () => { this.saveData(); }, { deep:true });
		//List all available trigger types
		let events:TriggerEventTypes[] = [];
		events = events.concat(TriggerEvents());
		this.eventsCount = events.length

		//Define select states
		events.forEach(v=>{
			const enabled = this.$store("triggers").triggers[v.value]?.enabled;
			v.enabled = enabled !== false;
		})

		events.sort((a, b) => {
			if(a.category > b.category) return 1;
			if(a.category < b.category) return -1;
			return 0;
		})

		this.eventCategories = [];
		let currCat = events[0].category;
		let catEvents:TriggerEventTypes[] = [];
		const catToLabel:{[key:number]:string} = {};
		catToLabel[ TriggerEventTypeCategories.GLOBAL ]		= "triggers.categories.global";
		catToLabel[ TriggerEventTypeCategories.USER ]		= "triggers.categories.user";
		catToLabel[ TriggerEventTypeCategories.SUBITS ]		= "triggers.categories.subits";
		catToLabel[ TriggerEventTypeCategories.MOD ]		= "triggers.categories.mod";
		catToLabel[ TriggerEventTypeCategories.TWITCHAT ]	= "triggers.categories.twitchat";
		catToLabel[ TriggerEventTypeCategories.HYPETRAIN ]	= "triggers.categories.hypetrain";
		catToLabel[ TriggerEventTypeCategories.GAMES ]		= "triggers.categories.games";
		catToLabel[ TriggerEventTypeCategories.MUSIC ]		= "triggers.categories.music";
		catToLabel[ TriggerEventTypeCategories.TIMER ]		= "triggers.categories.timer";
		catToLabel[ TriggerEventTypeCategories.OBS ]		= "triggers.categories.obs";
		catToLabel[ TriggerEventTypeCategories.MISC ]		= "triggers.categories.misc";
		
		const catToIcon:{[key:number]:string} = {};
		catToIcon[ TriggerEventTypeCategories.GLOBAL ] = "whispers_purple";
		catToIcon[ TriggerEventTypeCategories.USER ] = "user_purple";
		catToIcon[ TriggerEventTypeCategories.SUBITS ] = "coin_purple";
		catToIcon[ TriggerEventTypeCategories.MOD ] = "mod_purple";
		catToIcon[ TriggerEventTypeCategories.TWITCHAT ] = "twitchat_purple";
		catToIcon[ TriggerEventTypeCategories.HYPETRAIN ] = "train_purple";
		catToIcon[ TriggerEventTypeCategories.GAMES ] = "ticket_purple";
		catToIcon[ TriggerEventTypeCategories.MUSIC ] = "music_purple";
		catToIcon[ TriggerEventTypeCategories.TIMER ] = "timer_purple";
		catToIcon[ TriggerEventTypeCategories.OBS ] = "obs_purple";
		catToIcon[ TriggerEventTypeCategories.MISC ] = "broadcast_purple";

		for (let i = 0; i < events.length; i++) {
			const ev = events[i];
			if(ev.category != currCat || i === events.length-1) {
				if(i === events.length-1) catEvents.push(ev);
				this.eventCategories.push({
					category:catEvents[0].category,
					label: catToLabel[catEvents[0].category],
					icon: catToIcon[catEvents[0].category],
					events:catEvents,
				});
				catEvents = [ev];
			}else{
				catEvents.push(ev);
			}
			currCat = ev.category
			// this.event_conf.value = events[0].value;
		}
		
		this.eventsList = events;
		this.listOBSSources(undefined, true);
	}

	/**
	 * Go up on the tree
	 */
	public goBack():void {
		if(this.currentSubEvent) this.currentSubEvent = null;
		else this.currentEvent = null;
	}

	/**
	 * Adds an action to the lsit
	 */
	public async addAction():Promise<void> {
		this.canSave = false;//Avoid saving data after adding an empty action
		this.actionList.push({
			id:Math.random().toString(),
			delay:0,
			type:null,
		});

		//Because we watch for any modifications on "actionList" to fire a
		//save process, we want to avoid that save process to occure as
		//it cleans up any empty action (like this new one).
		//If we were not waiting for a frame the save process would clean
		//the new item right after creating it
		await this.$nextTick();
		this.canSave = true;
	}

	/**
	 * Called when deleting an action item
	 */
	public deleteAction(index:number):void {
		this.$confirm(this.$t("triggers.delete_action_confirm")).then(async ()=> {
			// if(this.actionList.length == 1) this.canSave = false;
			this.actionList.splice(index, 1);
			// await this.$nextTick();
			// this.canSave = true;
		}).catch(()=> {});
	}

	/**
	 * Called when duplicating an action item
	 */
	public duplicateAction(action:TriggerActionTypes, index:number):void {
		const clone:TriggerActionTypes = JSON.parse(JSON.stringify(action));
		clone.id = Math.random().toString();//Avoid duplicate keys
		this.actionList.splice(index, 0, clone);
	}

	/**
	 * Saves the data to storage
	 */
	public async saveData():Promise<void> {
		if(!this.canSave) return;
		this.canSave = false;

		//Format chat commands
		this.triggerData.actions = this.actionList;

		//Save the trigger only if it can be tested which means it
		//has the minimum necessary data defined
		// if(this.canTestAction) {
			this.$store("triggers").setTrigger(this.triggerKey, this.triggerData);
		// }
		// if(this.isChatCmd || this.isSchedule) {
		// 	// Preselects the current subevent
		// 	await this.onSelectTrigger(true);
		// }

		//As we watch for any modifications on "actionCategory" and we
		//modify it during the save process, we need to freeze the save
		//process for a frame to avoid a recursive loop.
		await this.$nextTick();
		this.canSave = true;
	}

	/**
	 * Called to test the actions sequence
	 */
	public testTrigger():void {
		let key = this.currentEvent?.value as string;
		// if(this.isSublist) key = key+"_"+this.subevent_conf.value as string;
		const entry = TriggerEvents().find(v=>v.value == key);
		
		if(entry?.testMessageType) {
			if(this.isSchedule) {
				TriggerActionHandler.instance.parseScheduleTrigger(this.triggerKey);
			}else
			if(entry.testMessageType == TwitchatDataTypes.TwitchatMessageType.NOTICE) {
				this.$store("debug").simulateNotice(entry.testNoticeType, (data)=> {
					const m = data as TwitchatDataTypes.MessageNoticeData;
					switch(m.noticeId) {
						case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:{
							(m as TwitchatDataTypes.MessageEmergencyModeInfo).enabled = (key == TriggerTypes.EMERGENCY_MODE_START);
						}
						case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE:{
							(m as TwitchatDataTypes.MessageShieldMode).enabled = (key == TriggerTypes.SHIELD_MODE_ON);
						}
					}
					TriggerActionHandler.instance.onMessage(data, true);
				}, false);
			}else{

				this.$store("debug").simulateMessage(entry.testMessageType, (data)=> {
					let m = data
					if(m.type == TwitchatDataTypes.TwitchatMessageType.REWARD) {
						//Update the fake ID of the reward to the current one
						let reward = this.rewards.find(v=>v.id == this.currentSubEvent?.value)!;
						m.reward.id = reward.id;
						m.reward.cost = reward.cost;
						m.reward.description = reward.prompt;
						m.reward.icon = {
							sd:reward.image?.url_1x ?? "",
							hd:reward.image?.url_4x ?? "",
						};

						m.reward.title = reward.title;
						m.message = "Lorem ipsum dolor sit amet";
					}
					if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						switch(key) {
							case TriggerTypes.CHAT_COMMAND:{
								//Add the command to the fake text message
								m.message = this.triggerData.name + " " + m.message;
								m.message_html = this.triggerData.name + " " + m.message_html;
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
					}
					if(entry.value == TriggerTypes.TIMER_STOP) {
						//Set the timer as stopped
						(m as TwitchatDataTypes.MessageTimerData).started = false;
					}
					if(entry.value == TriggerTypes.SUBGIFT) {
						const sub = (m as TwitchatDataTypes.MessageSubscriptionData);
						sub.is_gift = true;
						sub.gift_recipients = [Utils.pickRand(this.$store("users").users)];
					}
					if(entry.value == TriggerTypes.COUNTDOWN_START) {
						//Remove end date so it counts as a countdown start not an end
						const cd = (m as TwitchatDataTypes.MessageCountdownData).countdown;
						delete cd.endAt;
						delete cd.endAt_ms;
					}
					if(entry.value == TriggerTypes.TIMEOUT) {
						//Remove end date so it counts as a countdown start not an end
						(m as TwitchatDataTypes.MessageBanData).duration_s = Math.round(Math.random()*666);
					}
					if(entry.value == TriggerTypes.BAN) {
						//Remove end date so it counts as a countdown start not an end
						delete (m as TwitchatDataTypes.MessageBanData).duration_s;
					}

					TriggerActionHandler.instance.onMessage(m, true);
				}, false);
			}
		}
	}

	/**
	 * Called to delete the actions sequence
	 */
	public deleteTrigger():void {
		this.$confirm(this.$t("triggers.delete_confirm")).then(()=> {
			//Delete trigger from storage
			this.$store("triggers").deleteTrigger(this.triggerKey);
			//Reset menu selection
			if(this.isSublist) {
				this.currentSubEvent = null;
				this.triggerData
			}else{
				this.currentEvent = null;
			}
			this.resetTriggerData();
			this.onSelectTrigger();
		}).catch(()=> {});
	}

	/**
	 * Toggle a trigger
	 */
	public onToggleEnable(e:TriggerEventTypes|TwitchatDataTypes.ParameterDataListValue|null):void {
		if(!e) return;
		let key = e.value as string;
		if(this.currentEvent && this.currentEvent.value != key) {
			key = this.currentEvent.value+"_"+key.toLowerCase();
		}
		
		if(this.$store("triggers").triggers[key]) {
			const trigger = this.$store("triggers").triggers[key];
			trigger.enabled = e.enabled as boolean;
			this.$store("triggers").setTrigger(key, trigger);
		}
	}

	public isMusicCategory(category:TriggerEventTypeCategoryValue):boolean {
		return category == TriggerEventTypeCategories.MUSIC;
	}

	public isOBSCategory(category:TriggerEventTypeCategoryValue):boolean {
		return category == TriggerEventTypeCategories.OBS;
	}

	public openOverlays():void {
		this.$emit('setContent', TwitchatDataTypes.ParamsCategories.OVERLAYS);
	}

	public openOBS():void {
		this.$emit('setContent', TwitchatDataTypes.ParamsCategories.OBS);
	}

	/**
	 * Called when selecting a trigger
	 */
	private async onSelectTrigger(onlypopulateSublist = false):Promise<void> {
		this.currentSubEvent = null;
		this.isSublist = false;
		
		if(!this.currentEvent) {
			//No selection, reset everything
			this.actionList = [];
			this.resetTriggerData();

		}else {
			let key = this.currentEvent.value as string;

			const entry = TriggerEvents().find(v=> v.value == key);
			if(entry?.isCategory === true) {
				//Chat commands and channel point rewards are stored differently to avoid
				//flooding the main trigger list. Main trigger elements are stored with
				//simple keys like "1" where these ones are stored with keys like "1_entryName".
				this.isSublist = true;
				this.subeventsList = [];
				if(!onlypopulateSublist) this.actionList = [];

				if(key == TriggerTypes.REWARD_REDEEM) {
					this.listRewards();
				}else

				if(key == TriggerTypes.OBS_SCENE) {
					this.listOBSScenes();
				}else

				if(key == TriggerTypes.OBS_SOURCE_ON || key == TriggerTypes.OBS_SOURCE_OFF) {
					this.listOBSSources(key);
				}
				else
				{
					const triggers = this.$store("triggers").triggers;
					//Search for all command triggers
					const commandList:TriggerData[] = [];
					for (const k in triggers) {
						if(k.indexOf(key+"_") === 0) commandList.push(triggers[k] as TriggerData);
					}
					this.subeventsList = commandList.sort((a,b)=> {
						if(!a.name || !b.name) return 0
						if(a.name < b.name) return -1;
						if(a.name > b.name) return 1;
						return 0;
					}).map((v):TwitchatDataTypes.ParameterDataListValue=> {
						return {
							label:v.name as string,
							value:v.name?.toLowerCase(),
							enabled:v.enabled
						}
					});
					const select = this.subeventsList.find(v=>v.value == this.triggerData?.name);
					if(select) {
						this.currentSubEvent = select;
					}
				}
			}else if(this.$store("triggers").triggers[key.toLowerCase()]){
				const trigger = JSON.parse(JSON.stringify(this.$store("triggers").triggers[key.toLowerCase()]));//Avoid modifying the original data
				this.actionList = (trigger as TriggerData).actions;
				this.triggerData = trigger;
			}else{
				this.actionList = [];
			}

			if(!this.isSublist && this.actionList.length == 0) {
				this.addAction();
				// this.$store("triggers").triggers[this.triggerKey].enabled = true;
			}
		}
	}

	/**
	 * Called when selecting a sub trigger
	 */
	private async onSelectsubTrigger():Promise<void> {
		this.canSave = false;
		let key = this.currentEvent?.value as string;
		key += "_";
		if(this.currentSubEvent?.value !== undefined) {
			key += (this.currentSubEvent.value as string).toLowerCase();
		}
		
		//Load actions for the selected sub event
		let json = this.$store("triggers").triggers[key];
		if(json) {
			const trigger = JSON.parse(JSON.stringify(this.$store("triggers").triggers[key]));//Avoid modifying the original data
			this.triggerData = trigger as TriggerData;
			this.actionList = this.triggerData.actions;

		}else if(this.isSublist){
			//If going back to the sublist, clear actions
			this.actionList = [];
			this.resetTriggerData();
			if(this.currentSubEvent) {
				this.addAction();
				if(this.currentSubEvent) this.currentSubEvent.enabled = true;
			}
		}
		await this.$nextTick();
		this.canSave = true;
	}

	/**
	 * Lists the rewards
	 */
	private async listRewards():Promise<void> {
		this.showLoading = true;
		try {
			this.rewards = await TwitchUtils.getRewards(true);
		}catch(error) {
			this.rewards = [];
			this.$store("main").alert(this.$t("error.rewards_loading"));
			this.showLoading = false;
			return;
		}

		//Push "Highlight my message" reward as it's not given by the API...
		this.rewards.push(Config.instance.highlightMyMessageReward)

		const list = this.rewards.sort((a,b)=> {
			if(a.cost < b.cost) return -1;
			if(a.cost > b.cost) return 1;
			if(a.title.toLowerCase() < b.title.toLowerCase()) return -1;
			if(a.title.toLowerCase() > b.title.toLowerCase()) return 1;
			return 0;
		}).map((v):TwitchatDataTypes.ParameterDataListValue => {
			const enabled = this.$store("triggers").triggers[TriggerTypes.REWARD_REDEEM+"_"+v.id]?.enabled;
			return {
				label:v.title+(v.cost> 0? "<span class='cost'>("+v.cost+")</span>" : ""),
				value:v.id,
				enabled,
				icon:v.image?.url_2x
			};
		})
		this.subeventsList = this.subeventsList?.concat(list);
		this.showLoading = false;
	}

	/**
	 * Lists OBS Scenes
	 */
	private async listOBSScenes():Promise<void> {
		this.showLoading = true;
		try {
			this.obsScenes = ((await OBSWebsocket.instance.getScenes()).scenes as unknown) as OBSSceneItem[];
		}catch(error) {
			this.obsScenes = [];
			this.$store("main").alert(this.$t('error.obs_scenes_loading'));
			this.showLoading = false;
			return;
		}
		const list = this.obsScenes.sort((a,b)=> {
			if(a.sceneName.toLowerCase() < b.sceneName.toLowerCase()) return -1;
			if(a.sceneName.toLowerCase() > b.sceneName.toLowerCase()) return 1;
			return 0;
		}).map(v => {
			const enabled = this.$store("triggers").triggers[TriggerTypes.OBS_SCENE+"_"+v.sceneName.toLowerCase()]?.enabled;
			return {
				label:v.sceneName,
				value:v.sceneName,
				enabled
			};
		})
		this.subeventsList = this.subeventsList?.concat(list);
		this.showLoading = false;
	}

	/**
	 * Lists OBS Sources
	 */
	public async listOBSSources(key?:string, fullRefreshMode:boolean = false):Promise<void> {
		this.syncing		= fullRefreshMode;
		this.showLoading	= !fullRefreshMode;
		try {
			this.obsSources = await OBSWebsocket.instance.getSources();
		}catch(error) {
			this.obsSources = [];
			this.$store("main").alert(this.$t('error.obs_sources_loading'));
			this.showLoading = false;
			return;
		}

		this.obsSources.sort((a,b)=> {
			if(a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
			if(a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
			return 0;
		});

		if(fullRefreshMode) {
			//Fake await to make sure loader is displayed
			await Utils.promisedTimeout(500);
		}else{
			const list = this.obsSources.map(v => {
				const enabled = this.$store("triggers").triggers[key+"_"+v.sourceName.toLowerCase()]?.enabled;
				return {
					label:v.sourceName,
					value:v.sourceName,
					enabled
				};
			});
			this.subeventsList = this.subeventsList?.concat(list);
		}
		this.syncing		= false;
		this.showLoading	= false;
		
	}

	/**
	 * Resets the chat command sub category params
	 */
	private resetTriggerData():void {
		this.triggerData = {
			name:"",
			enabled:true,
			actions:[],
		}
	}
}
</script>

<style scoped lang="less">
.paramstriggers{
	.parameterContent();

	.useCase {
		font-size: .8em;
		margin-bottom: 1em;
	}

	.menu {
		display: flex;
		flex-direction: row;
		position: sticky;
		align-items: flex-start;
		z-index: 1;
		background-color: #eee;
		padding-bottom: 1em;
		margin-top: 1em;

		.backBt {
			min-width: 30px;
			height: 30px;
			flex-basis: 30px;
			margin-left: -30px;
		}

		.mainCategoryTitle, .subCategoryTitle {
			display: flex;
			flex-direction: row;
			justify-content: center;
			align-items: center;
			background-color: @mainColor_light;
			width: 100%;
			height: 32px;
			margin-bottom: .5em;
			border-radius: .5em;
			box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
			padding: 0 .5em;
			img {
				height: 1em;
				margin-right: .5em;
				filter: drop-shadow(0 0 2px fade(@mainColor_normal, 50%));
			}
			.label {
				flex-grow: 1;
				line-height: .8em;
			}
			&.mainCategoryTitle {
				padding-right: 2em;
				.label {
					text-align: center;
				}
			}
		}

		.list {
			display: flex;
			flex-direction: column;
			flex-grow: 1;

			.category{
				&:not(:last-of-type) {
					margin-bottom: 1em;
				}
				.require {
					font-size: .8em;
					text-align: center;
					margin-bottom: 1em;
				}
			}

			.item {
				position: relative;
				.toggle {
					position: absolute;
					right: .5em;
					top: 50%;
					transform: translateY(calc(-50% - 2px));
					z-index: 1;
				}
				&.beta {
					:deep(.button) {
						padding-left: 3.5em;

						&::before {
							content: "beta";
							position: absolute;
							left: 0;
							color:@mainColor_light;
							background-color: @mainColor_normal;
							background: linear-gradient(-90deg, fade(@mainColor_normal, 0) 0%, fade(@mainColor_normal, 100%) 0%, fade(@mainColor_normal, 100%) 100%);
							height: 100%;
							display: flex;
							align-items: center;
							padding: 0 .35em;
							font-size: .8em;
							font-family: var(--font-nunito);
							text-transform: uppercase;
							z-index: 1;
						}
					}
				}
			}
			
			.triggerBt {
				width: 100%;
				margin-bottom: 2px;
				box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
				padding: .25em .5em;
				:deep(.label) {
					flex-grow: 1;
					display: flex;
					flex-direction: row;
					justify-content: space-between;
				}
				:deep(.icon) {
					z-index: 1;
					width: 1em;
				}
				:deep(.cost) {
					font-size: .8em;
					font-style: italic;
					margin-right: 3em;
				}

				&.subItem.hasIcon {
					&:before {
						content:"";
						width:2em;
						height:100%;
						left: 0;
						position: absolute;
						background-color: @mainColor_normal;
					}
					:deep(.label) {
						padding-left: .5em;
					}
				}
			}
		}
	}
	.empty {
		font-style: italic;
		text-align: center;
		margin-bottom: 1.5em;
	}

	.triggerDescription {
		font-size: .8em;
		background-color: @mainColor_light;
		padding: .5em;
		border-radius: .5em;
		text-align: center;
		margin-bottom: 1em;

		.text {
			:deep(mark) {
				line-height: 1.5em;
				border: 1px dashed @mainColor_normal;
				background-color: fade(@mainColor_normal, 15%);
				padding: .1em .5em;
				border-radius: .5em;
				span {
					//This is used to hide the channel point reward's costs
					display: none;
				}
			}
		}
	}

	.sortable-chosen {
		filter: grayscale() brightness(1.5);
	}

	.action ~ .action {
		padding-top: .5em;
		margin-top: 0;
		&::before{
			content: "";
			display: block;
			width: 1em;
			height: .5em;
			background-color: @mainColor_normal;
			border-top-left-radius: 100% 200%;
			border-top-right-radius: 100% 200%;
			margin: auto;
		}
	}
	.action {
		background: linear-gradient(90deg, @mainColor_normal 2px, transparent 1px);
		background-position: 100% 0;
		background-repeat: no-repeat;
		background-size: calc(50% + 1px) 1em;
		padding-top: 1em;
		&:first-of-type {
			background: none;
		}

		&::after{
			content: "";
			display: block;
			width: 1em;
			height: .5em;
			background-color: @mainColor_normal;
			border-bottom-left-radius: 100% 200%;
			border-bottom-right-radius: 100% 200%;
			margin: auto;
		}
	}

	.ctas {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		margin-top: .5em;
		flex-wrap: wrap;
		.cta:not(:last-child) {
			margin-right: 1em;
		}
	}

	.bottomCTAS {
		// display: flex;
		// flex-direction: row;
		background: linear-gradient(90deg, @mainColor_normal 2px, transparent 1px);
		background-position: 100% 0;
		background-repeat: no-repeat;
		background-size: calc(50% + 1px) 1em;
		padding-top: .5em;
		.addBt {
			display: block;
			margin: auto;
		}
		&::before{
			content: "";
			display: block;
			width: 1em;
			height: .5em;
			background-color: @mainColor_normal;
			border-top-left-radius: 100% 200%;
			border-top-right-radius: 100% 200%;
			margin: auto;
		}
	}

	.loader {
		width: 2em;
		margin: auto;
		margin-top: 1em;
	}
}
</style>