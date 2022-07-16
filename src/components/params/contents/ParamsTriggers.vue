<template>
	<div class="paramstriggers">
		<img src="@/assets/icons/broadcast_purple.svg" alt="overlay icon" class="icon">

		<p class="header">Execute custom actions based on twitch events.<br></p>
		<p class="useCase"><strong>Use case examples: </strong>control <u>OBS</u> sources and filters; create <u>chat commands</u>; control <u>spotify</u></p>

		<div class="menu">
			<Button class="backBt" v-if="event_conf.value != '0'"
				white
				@click="goBack()"
				:icon="$image('icons/back_purple.svg')"
			/>
			<div class="list">
				<!-- Main list -->
				<div v-for="e in event_conf.listValues" :key="(e.value as string)" class="item">
					<Button class="triggerBt"
						white
						v-if="event_conf.value == '0' || event_conf.value == e.value"
						:title="e.label"
						:icon="getIcon(e)"
						@click="event_conf.value = e.value"
					/>

					<ToggleButton class="toggle"
						:aria-label="e.enabled? 'trigger enabled' : 'trigger disabled'"
						v-model="e.enabled"
						@change="onToggleEnable(e)"
						v-if="(event_conf.value == e.value || event_conf.value == '0') && canToggle(e)"
					/>
				</div>

				<!-- Sublist -->
				<div v-if="isSublist && subevent_conf.listValues && subevent_conf.listValues.length > 1"
				v-for="e in subevent_conf.listValues" :key="(e.value as string)" class="item">
					<Button :class="getSubListClasses(e)"
						white
						v-if="subevent_conf.value == '0' || subevent_conf.value == e.value"
						:title="e.label"
						:icon="getIcon(e)"
						@click="subevent_conf.value = e.value"
					/>

					<ToggleButton class="toggle"
						:aria-label="e.enabled? 'trigger enabled' : 'trigger disabled'"
						v-model="e.enabled"
						@change="onToggleEnable(e)"
						v-if="(subevent_conf.value == e.value || subevent_conf.value == '0') && canToggle(e)"
					/>
				</div>
				<!-- <ParamItem :paramData="subevent_conf" v-if="isSublist && subevent_conf.listValues && subevent_conf.listValues.length > 1" /> -->
			</div>
		</div>

		<div class="triggerDescription" v-if="event_conf.value != '0'">
			<div v-html="triggerDescription"></div>

			<div class="ctas">
				<Button :icon="$image('icons/add.svg')" title="Add action"
					class="cta addBt"
					@click="addAction()"
					v-if="event_conf.value != '0'"
				/>
				<Button :icon="$image('icons/refresh.svg')" title="Resync OBS sources"
					class="cta resyncBt"
					@click="listSources(true)"
					data-tooltip="If you changed something<br>on OBS, click this to see it<br>listed on OBS actions"
					v-if="event_conf.value != '0'" :loading="syncing"
				/>
			</div>

			<div class="ctas" v-if="canTestAction">
				<Button title="Test trigger" class="cta" @click="testTrigger()" :icon="$image('icons/test.svg')" />
				<Button title="Delete trigger" class="cta" @click="deleteTrigger()" highlight :icon="$image('icons/delete.svg')" />
			</div>
		</div>

		<img src="@/assets/loader/loader.svg" alt="loader" v-if="showLoading" class="loader">

		<TriggerActionChatCommandParams class="chatCmdParams"
			v-if="isChatCmd && triggerData"
			:actionData="triggerData"
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
					:sources="sources"
					:event="event_conf.value"
					@delete="deleteAction(index)"
					@duplicate="duplicateAction(element, index)"
					@setContent="(v:string)=>$emit('setContent', v)"
				/>
			</template>
		</draggable>

		<!-- <div class="buttons">
			<Button :icon="$image('icons/add.svg')" title="Add action"
				class="addBt"
				@click="addAction()"
				v-if="event_conf.value != '0'"
			/>
			<Button :icon="$image('icons/refresh.svg')" title="Resync OBS sources"
				class="addBt"
				@click="listSources(true)"
				v-if="event_conf.value != '0'" :loading="syncing"
			/>
		</div> -->
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import store from '@/store';
import Config from '@/utils/Config';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import { TriggerEvents, TriggerTypes } from '@/utils/TriggerActionData';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import draggable from 'vuedraggable';
import TriggerActionChatCommandParams from './triggers/TriggerActionChatCommandParams.vue';
import TriggerActionEntry from './triggers/TriggerActionEntry.vue';
import type { ParameterData, ParameterDataListValue, TriggerData, TriggerActionTypes, TriggerEventTypes } from '@/types/TwitchatDataTypes';
import ToggleButton from '../../ToggleButton.vue';

@Options({
	props:{},
	components:{
		draggable,
		Button,
		ParamItem,
		ToggleButton,
		TriggerActionEntry,
		TriggerActionChatCommandParams,
	},
	emits:["setContent"]
})
export default class ParamsTriggers extends Vue {
	public actionList:TriggerActionTypes[] = [];
	public event_conf:ParameterData = { label:"", type:"list", value:"0", listValues:[] };
	public subevent_conf:ParameterData = { label:"", type:"list", value:"0", listValues:[] };
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

	public get isChatCmd():boolean { return this.event_conf.value === TriggerTypes.CHAT_COMMAND; }

	public get triggerKey():string {
		let key = this.event_conf.value as string;
		let subkey = this.subevent_conf.value as string;
		if(key === TriggerTypes.CHAT_COMMAND) {
			subkey = this.triggerData.chatCommand as string;
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
			if(a.type === "") {
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
			// else
			// if(a.type == "music"){
			// }
			canTest = true;
			break;
		}
		return canTest;
	}

	/**
	 * Get a trigger's description
	 */
	public get triggerDescription():string|null {
		const value = this.event_conf.value as string;
		const item = this.event_conf.listValues?.find(v => v.value == value) as TriggerEventTypes|null;
		if(item) {
			return item.description as string;
		}
		return null;
	}

	/**
	 * Gets a trigger's icon
	 */
	public getSubListClasses(e:ParameterDataListValue):string[] {
		const res = ["triggerBt", "subItem"];
		if(this.getIcon(e) && e.value != "0") res.push("hasIcon");
		return res;
	}

	/**
	 * Gets a trigger's icon
	 */
	public getIcon(e:ParameterDataListValue):string|null {
		if(e.icon) {
			return e.icon as string;
		}
		const map:{[key:string]:string} = {}
		map[TriggerTypes.FIRST_ALL_TIME] = "firstTime_purple";
		map[TriggerTypes.FIRST_TODAY] = "firstTime_purple";
		map[TriggerTypes.POLL_RESULT] = "poll_purple";
		map[TriggerTypes.PREDICTION_RESULT] = "prediction_purple";
		map[TriggerTypes.RAFFLE_RESULT] = "ticket_purple";
		map[TriggerTypes.BINGO_RESULT] = "bingo_purple";
		map[TriggerTypes.CHAT_COMMAND] = "whispers_purple";
		map[TriggerTypes.SUB] = "sub_purple";
		map[TriggerTypes.SUBGIFT] = "gift_purple";
		map[TriggerTypes.BITS] = "bits_purple";
		map[TriggerTypes.FOLLOW] = "follow_purple";
		map[TriggerTypes.RAID] = "raid_purple";
		map[TriggerTypes.REWARD_REDEEM] = "channelPoints_purple";
		map[TriggerTypes.TRACK_ADDED_TO_QUEUE] = "music_purple";
		map[TriggerTypes.TIMER_START] = "timer_purple";
		map[TriggerTypes.TIMER_STOP] = "timer_purple";
		map[TriggerTypes.COUNTDOWN_START] = "countdown_purple";
		map[TriggerTypes.COUNTDOWN_STOP] = "countdown_purple";
		map[TriggerTypes.STREAM_INFO_UPDATE] = "info_purple";
		map[TriggerTypes.EMERGENCY_MODE_START] = "emergency_purple";
		map[TriggerTypes.EMERGENCY_MODE_STOP] = "emergency_purple";
		map[TriggerTypes.HIGHLIGHT_CHAT_MESSAGE] = "highlight_purple";
		
		if(map[e.value as string]) {
			return  this.$image('icons/'+map[e.value as string]+".svg");
		}
		return null;
	}

	/**
	 * Get if a trigger entry can be toggled
	 */
	public canToggle(e:ParameterDataListValue):boolean {
		let key = e.value as string;
		if(this.event_conf.value != "0") {
			key = this.event_conf.value+"_"+(e.value as string).toLowerCase();
		}
		
		if(store.state.triggers[key]) {
			const trigger = JSON.parse(JSON.stringify(store.state.triggers[key]));
			let list = trigger as TriggerData;
			return e.noToggle !== true && list.actions.length > 0;
		}

		return false;
	}
	
	public async mounted():Promise<void> {
		watch(()=> OBSWebsocket.instance.connected, () => { this.listSources(); });
		watch(()=> this.event_conf.value, () => { this.onSelectTrigger(); });
		watch(()=> this.subevent_conf.value, () => { this.onSelectsubTrigger(); });
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
			const enabled = store.state.triggers[v.value]?.enabled;
			v.enabled = enabled !== false;
		})
		// this.event_conf.value = events[0].value;
		this.event_conf.listValues = events;
	}

	/**
	 * Go up on the tree
	 */
	public goBack():void {
		if(this.subevent_conf.value != '0') this.subevent_conf.value = '0';
		else this.event_conf.value = '0'
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
	public addAction():void {
		this.canSave = false;//Avoid saving data after adding an empty action
		this.actionList.push({
			id:Math.random().toString(),
			delay:0,
			type:"",
		});
		this.canSave = true;
	}

	/**
	 * Called when deleting an action item
	 */
	public deleteAction(index:number):void {
		this.$confirm("Delete action ?").then(()=> {
			this.actionList.splice(index, 1);
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
		if(this.canTestAction) {
			store.dispatch("setTrigger", { key:this.triggerKey, data:this.triggerData});
		}
		if(this.isChatCmd) {
			//Preselects the current subevent
			this.onSelectTrigger(true);
		}

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
		let key = this.event_conf.value as string;
		// if(this.isSublist) key = key+"_"+this.subevent_conf.value as string;
		const entry = TriggerEvents.find(v=>v.value == key);
		
		if(entry?.jsonTest) {
			const json = entry.jsonTest as IRCEventDataList.Message;
			if(key == TriggerTypes.REWARD_REDEEM) {
				//Push current reward ID to the test JSON data
				if(json.reward) json.reward.redemption.reward.id = this.subevent_conf.value as string;
			}
			if(key == TriggerTypes.CHAT_COMMAND) {
				//Push current command to the test JSON data
				json.message = this.triggerData.chatCommand + " lorem ipsum";
				console.log(json.message);
			}
			TriggerActionHandler.instance.onMessage(json, true);
		}
	}

	/**
	 * Called to delete the actions sequence
	 */
	public deleteTrigger():void {
		this.$confirm("Delete trigger ?").then(()=> {
			//Delete trigger from storage
			store.dispatch("deleteTrigger", this.triggerKey);
			//Reset menu selection
			if(this.isSublist) {
				this.subevent_conf.value = "0";
			}else{
				this.event_conf.value = "0";
			}
			this.resetTriggerData();
		}).catch(()=> {});
	}

	/**
	 * Toggle a trigger
	 */
	public onToggleEnable(e:ParameterDataListValue):void {
		let key = e.value as string;
		if(this.event_conf.value != "0") {
			key = this.event_conf.value+"_"+(e.value as string).toLowerCase();
		}
		if(store.state.triggers[key]) {
			const trigger = store.state.triggers[key];
			trigger.enabled = e.enabled as boolean;
			store.dispatch("setTrigger", { key, data:trigger});
		}
	}

	/**
	 * Called when selecting a trigger
	 */
	private async onSelectTrigger(onlypopulateSublist = false):Promise<void> {
		let key = this.event_conf.value as string;
		this.subevent_conf.value = "0";
		this.isSublist = false;
		
		if(key == "0") {
			//No selection, reset everything
			this.actionList = [];
			this.resetTriggerData();

		}else {
			const entry = TriggerEvents.find(v=> v.value == key);
			if(entry?.isCategory === true) {
				//Chat commands and channel point rewards are stored differently to avoid
				//flooding the main trigger list. Main trigger elements are stored with
				//simple keys like "1" where these ones are stored with keys like "1_entryName".
				this.isSublist = true;
				this.subevent_conf.listValues = [];
				if(!onlypopulateSublist) this.actionList = [];
				
				if(key == TriggerTypes.CHAT_COMMAND) {
					const triggers = store.state.triggers;
					//Search for all command triggers
					const commandList:TriggerData[] = [];
					for (const k in triggers) {
						if(k.indexOf(key+"_") === 0) commandList.push(triggers[k] as TriggerData);
					}
					this.subevent_conf.listValues = commandList.sort((a,b)=> {
						if(!a.chatCommand || !b.chatCommand) return 0
						if(a.chatCommand < b.chatCommand) return -1;
						if(a.chatCommand > b.chatCommand) return 1;
						return 0;
					}).map(v=> {
						return {
							label:v.chatCommand as string,
							value:v.chatCommand?.toLowerCase(),
							enabled:v.enabled
						}
					});
					const select = commandList.find(v=>v.chatCommand == this.triggerData.chatCommand);
					if(select) {
						this.subevent_conf.value = select.chatCommand?.toLowerCase();
					}
				}

				if(key == TriggerTypes.REWARD_REDEEM) {
					this.listRewards();
				}
			}else if(store.state.triggers[key]){
				const trigger = JSON.parse(JSON.stringify(store.state.triggers[key]));//Avoid modifying the original data
				this.actionList = (trigger as TriggerData).actions;
			}else{
				this.actionList = [];
			}
			if(!this.isSublist && this.actionList.length == 0) {
				this.addAction();
				// store.state.triggers[this.triggerKey].enabled = true;
			}
		}
	}

	/**
	 * Called when selecting a sub trigger
	 */
	private async onSelectsubTrigger():Promise<void> {
		this.canSave = false;
		let key = this.event_conf.value as string;
		key += "_"+(this.subevent_conf.value as string).toLowerCase();
		
		//Load actions for the selected sub event
		let json = store.state.triggers[key];
		if(json) {
			const trigger = JSON.parse(JSON.stringify(store.state.triggers[key]));//Avoid modifying the original data
			this.triggerData = trigger as TriggerData;
			this.actionList = this.triggerData.actions;
		//Do not reset if the sub event
		}else if(this.isSublist){
			this.actionList = [];
			this.resetTriggerData();
			this.addAction();
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
			store.state.alert = "An error occurred while loading your rewards";
			this.showLoading = false;
			return;
		}
		const list = this.rewards.sort((a,b)=> {
			if(a.cost < b.cost) return -1;
			if(a.cost > b.cost) return 1;
			if(a.title.toLowerCase() < b.title.toLowerCase()) return -1;
			if(a.title.toLowerCase() > b.title.toLowerCase()) return 1;
			return 0;
		}).map(v => {
			const enabled = store.state.triggers[TriggerTypes.REWARD_REDEEM+"_"+v.id]?.enabled;
			return {
				label:v.title+"<span class='cost'>("+v.cost+")</span>",
				value:v.id,
				enabled,
				icon:v.image?.url_2x
			};
		})
		this.subevent_conf.listValues = this.subevent_conf.listValues?.concat(list);
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
		margin-bottom: .5em;
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
		top: 0;
		z-index: 1;
		background-color: #eee;
		padding-bottom: 1em;
		.list {
			display: flex;
			flex-direction: column;
			flex-grow: 1;

			.item {
				position: relative;
				.toggle {
					position: absolute;
					right: .5em;
					top: 50%;
					transform: translateY(calc(-50% - 2px));
					z-index: 1;
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

		&:not(:last-of-type) {
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
	}

	.ctas {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		margin-top: 1em;
		flex-wrap: wrap;
		.cta:not(:last-child) {
			margin-right: 1em;
		}
	}

	.chatCmdParams {
		margin-top: 1em;
	}

	.buttons {
		display: flex;
		flex-direction: row;
		.addBt {
			display: block;
			margin: auto;
			margin-top: 1em;
		}
	}

	.loader {
		width: 2em;
		margin: auto;
		margin-top: 1em;
	}
}
</style>