<template>
	<div class="paramstriggers">
		<img src="@/assets/icons/broadcast_purple.svg" alt="overlay icon" class="icon">

		<p class="header" v-if="!currentEvent">Execute custom actions based on twitch events.<br></p>

		<div class="menu">
			<Button class="backBt" v-if="currentEvent"
				white
				@click="goBack()"
				:icon="$image('icons/back_purple.svg')"
			/>

			<div class="list">
				
				<!-- Main event title -->
				<div v-if="currentEvent" class="mainCategoryTitle">
					<img :src="getIcon(currentEvent)">
					
					<div class="label">{{currentEvent?.label}}</div>

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
					
					<div class="label" v-html="currentSubEvent?.label"></div>

					<ToggleButton class="toggle"
						:aria-label="currentSubEvent.enabled? 'trigger enabled' : 'trigger disabled'"
						v-model="currentSubEvent.enabled"
						@change="onToggleEnable(currentSubEvent)"
						v-if="currentSubEvent && canToggle(currentSubEvent)"
					/>
				</div>
				
				<!-- Main list -->
				<ToggleBlock class="category" v-if="!currentEvent"
				v-for="c in eventCategories" :key="c.label" :title="c.label" :open="false" :icons="[c.icon]">
					<div v-for="e in c.events" :key="(e.value as string)" :class="e.value=='41'? 'item beta' : 'item'">
						<Button class="triggerBt"
							white
							:title="e.label"
							:icon="getIcon(e)"
							@click="currentEvent = e"
						/>

						<ToggleButton class="toggle"
							:aria-label="e.enabled? 'trigger enabled' : 'trigger disabled'"
							v-model="e.enabled"
							@change="onToggleEnable(e)"
							v-if="canToggle(e)"
						/>
					</div>
				</ToggleBlock>

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

		<div class="triggerDescription" v-if="((currentEvent && ! isSublist) || (isSublist && (currentSubEvent || actionList.length > 0))) && !showLoading">
			<div class="text" v-html="triggerDescription"></div>

			<div class="ctas" v-if="currentEvent && obsConnected && obsActions">
				<Button :icon="$image('icons/refresh.svg')" title="Resync OBS sources"
					class="cta resyncBt"
					@click="listSources(true)"
					data-tooltip="If you changed something<br>on OBS, click this to see it<br>listed on OBS actions"
					:loading="syncing"
				/>
			</div>

			<div class="ctas">
				<Button v-if="canTestAction" title="Test trigger" class="cta" @click="testTrigger()" :icon="$image('icons/test.svg')" />
				<Button title="Delete trigger" class="cta" @click="deleteTrigger()" highlight :icon="$image('icons/delete.svg')" />
			</div>
		</div>

		<img src="@/assets/loader/loader.svg" alt="loader" v-if="showLoading" class="loader">

		<TriggerActionChatCommandParams class="chatCmdParams"
			v-if="isChatCmd && triggerData && (currentSubEvent || actionList.length > 0)"
			:triggerData="triggerData"
		/>

		<Button :icon="$image('icons/whispers.svg')" title="Create chat command"
			v-if="isChatCmd && !currentSubEvent && actionList.length == 0"
			class="addBt"
			@click="addAction()"
		/>


		<TriggerActionScheduleParams class="chatCmdParams"
			v-if="isSchedule && triggerData && (currentSubEvent || actionList.length > 0)"
			:triggerData="triggerData"
		/>

		<Button :icon="$image('icons/date.svg')" title="Add scheduled action"
			v-if="isSchedule && !currentSubEvent && actionList.length == 0"
			class="addBt"
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
					:sources="sources"
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
			<Button :icon="$image('icons/add.svg')" title="Add action"
				class="addBt"
				@click="addAction()"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { TriggerEvents, TriggerEventTypeCategories, TriggerTypes, type TriggerActionTypes, type TriggerData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import UserSession from '@/utils/UserSession';
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
	public eventCategories:{label:string, icon:string, events:TriggerEventTypes[]}[] = [];
	public actionList:TriggerActionTypes[] = [];
	public sources:OBSSourceItem[] = [];
	public canSave = true;
	public syncing = false;
	public isSublist = false;
	public showLoading = false;
	public rewards:TwitchDataTypes.Reward[] = [];
	public triggerData:TriggerData = {
						enabled:true,
						actions:[],
					};

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }

	public get isChatCmd():boolean { return this.currentEvent?.value === TriggerTypes.CHAT_COMMAND; }
	
	public get isSchedule():boolean { return this.currentEvent?.value === TriggerTypes.SCHEDULE; }

	public get triggerKey():string {
		let key = this.currentEvent?.value as string;
		let subkey = this.currentSubEvent?.value as string;
		if(this.currentEvent?.isCategory && key !== TriggerTypes.REWARD_REDEEM) {
			subkey = this.triggerData.name as string;
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
		const entry = TriggerEvents.find(v=>v.value == this.currentEvent?.value);
		const hasJSON = entry ? entry.jsonTest != undefined : false;
		return canTest && hasJSON;
	}

	/**
	 * Get a trigger's description
	 */
	public get triggerDescription():string|null {
		const value = this.currentEvent?.value as string;
		const item = this.eventsList.find(v => v.value == value) as TriggerEventTypes|null;
		if(item) {
			let desc = item.description as string;
			if(this.currentSubEvent) {
				desc = desc.replace(/\{SUB_ITEM_NAME\}/gi, this.currentSubEvent.label);
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
			key = this.currentEvent!.value+"_"+key;
		}
		
		if(this.$store("triggers").triggers[key]) {
			const trigger = JSON.parse(JSON.stringify(this.$store("triggers").triggers[key]));
			let list = trigger as TriggerData;
			return e.noToggle !== true && list.actions.length > 0;
		}

		return false;
	}
	
	public async mounted():Promise<void> {
		watch(()=> OBSWebsocket.instance.connected, () => { this.listSources(); });
		watch(()=> this.currentEvent, () => { this.onSelectTrigger(); });
		watch(()=> this.currentSubEvent, () => { this.onSelectsubTrigger(); });
		watch(()=> this.actionList, () => { this.saveData(); }, { deep:true });
		watch(()=> this.triggerData, () => { this.saveData(); }, { deep:true });
		await this.listSources();

		//List all available trigger types
		let events:TriggerEventTypes[] = [];
		events = events.concat(TriggerEvents);
		if(!Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED) {
			events = events.filter(v => v.value != TriggerTypes.TRACK_ADDED_TO_QUEUE);
		}
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
		catToLabel[ TriggerEventTypeCategories.GLOBAL ] = "Chat - Channel points - Stream";
		catToLabel[ TriggerEventTypeCategories.USER ] = "User event";
		catToLabel[ TriggerEventTypeCategories.SUBITS ] = "Sub & bits";
		catToLabel[ TriggerEventTypeCategories.MOD ] = "Moderation actions";
		catToLabel[ TriggerEventTypeCategories.TWITCHAT ] = "Twitchat";
		catToLabel[ TriggerEventTypeCategories.HYPETRAIN ] = "Hype train";
		catToLabel[ TriggerEventTypeCategories.GAMES ] = "Games";
		catToLabel[ TriggerEventTypeCategories.MUSIC ] = "Music";
		catToLabel[ TriggerEventTypeCategories.TIMER ] = "Timers";
		
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

		for (let i = 0; i < events.length; i++) {
			const ev = events[i];
			if(ev.category != currCat || i === events.length-1) {
				if(i === events.length-1) catEvents.push(ev);
				this.eventCategories.push({
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
	}

	/**
	 * Go up on the tree
	 */
	public goBack():void {
		if(this.currentSubEvent) this.currentSubEvent = null;
		else this.currentEvent = null;
	}

	/**
	 * Gets all the available OBS sources and sort them alphabetically
	 */
	public async listSources(refreshVue = false):Promise<void> {
		this.syncing = true;
		try {
			this.sources = await OBSWebsocket.instance.getSources();
		}catch(error){
			//
		}
		this.sources = this.sources.sort((a, b) => {
			if(a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
			if(a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
			return 0;
		});
		if(refreshVue) {
			await Utils.promisedTimeout(500)
		}
		this.syncing = false;
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

		//Because we watch for any modifications on "actionList" to fires a
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
		this.$confirm("Delete action ?").then(async ()=> {
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
			// console.log(this.triggerKey, this.triggerData);
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
		const entry = TriggerEvents.find(v=>v.value == key);
		
		if(entry?.jsonTest) {
			const json = entry.jsonTest as TwitchatDataTypes.ChatMessageTypes;
			if(key == TriggerTypes.REWARD_REDEEM) {
				//Push current reward ID to the test JSON data
				if(json.type == TwitchatDataTypes.TwitchatMessageType.REWARD && json.reward) {
					const m = json as TwitchatDataTypes.MessageRewardRedeemData;
					m.reward.id = this.currentSubEvent?.value as string;
					//TODO make sure the test button for reward triggers still work after I removed the "TEST_ID" on TriggerActionHandler
				}
			}
			if(key == TriggerTypes.CHAT_COMMAND) {
				//Push current command to the test JSON data
				const m = json as TwitchatDataTypes.MessageChatData;
				m.message = this.triggerData.name + " lorem ipsum dolor sit amet.";
			}
			TriggerActionHandler.instance.onMessage(json, true);
		}else if(this.isSchedule) {
			//TODO
		}
	}

	/**
	 * Called to delete the actions sequence
	 */
	public deleteTrigger():void {
		this.$confirm("Delete trigger ?").then(()=> {
			//Delete trigger from storage
			this.$store("triggers").deleteTrigger(this.triggerKey);
			//Reset menu selection
			if(this.isSublist) {
				this.currentSubEvent = null;
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
		if(this.currentEvent) {
			key = this.currentEvent.value+"_"+(e.value as string).toLowerCase();
		}
		if(this.$store("triggers").triggers[key]) {
			const trigger = this.$store("triggers").triggers[key];
			trigger.enabled = e.enabled as boolean;
			this.$store("triggers").setTrigger(key, trigger);
		}
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

			const entry = TriggerEvents.find(v=> v.value == key);
			if(entry?.isCategory === true) {
				//Chat commands and channel point rewards are stored differently to avoid
				//flooding the main trigger list. Main trigger elements are stored with
				//simple keys like "1" where these ones are stored with keys like "1_entryName".
				this.isSublist = true;
				this.subeventsList = [];
				if(!onlypopulateSublist) this.actionList = [];
				

				if(key == TriggerTypes.REWARD_REDEEM) {
					this.listRewards();
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
					const select = this.subeventsList.find(v=>v.value == this.triggerData.name);
					if(select) {
						this.currentSubEvent = select;
					}
				}
			}else if(this.$store("triggers").triggers[key.toLowerCase()]){
				const trigger = JSON.parse(JSON.stringify(this.$store("triggers").triggers[key.toLowerCase()]));//Avoid modifying the original data
				this.actionList = (trigger as TriggerData).actions;
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
			//If going up the sublist, clear actions
			this.actionList = [];
			this.resetTriggerData();
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
			this.rewards = await TwitchUtils.loadRewards(true);
		}catch(error) {
			this.rewards = [];
			this.$store("main").alert = "An error occurred while loading your rewards";
			this.showLoading = false;
			return;
		}

		//Push "Highlight my message" reward as it's not given by the API...
		this.rewards.push(UserSession.instance.highlightMyMessageReward)

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
	 * Resets the chat command sub category params
	 */
	private resetTriggerData():void {
		this.triggerData = {
			enabled:true,
			actions:[],
		}
	}
}
</script>

<style scoped lang="less">
.paramstriggers{
	// font-size: .9em;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding-top: 0;

	.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}

	.header {
		text-align: center;
		margin-bottom: 1em;
	}

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

		.backBt {
			min-width: 30px;
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
			}
		}

		.list {
			display: flex;
			flex-direction: column;
			flex-grow: 1;

			.category:not(:last-of-type) {
				margin-bottom: 1em;
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
							background: linear-gradient(-90deg, fade(@mainColor_normal, 0) 0%, fade(@mainColor_normal, 100%) 30%, fade(@mainColor_normal, 100%) 100%);
							height: 100%;
							display: flex;
							align-items: center;
							padding: 0 1em 0 .35em;
							font-size: .8em;
							font-family: "Nunito";
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
					padding-right: 50px;
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