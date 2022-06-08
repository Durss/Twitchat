<template>
	<div class="paramstriggers">
		<img src="@/assets/icons/broadcast_purple.svg" alt="overlay icon" class="icon">

		<p class="header">Execute custom actions based on twitch events.<br></p>
		<p class="useCase"><strong>Use case examples: </strong>control <u>OBS</u> sources and filters; create <u>chat commands</u>; control <u>spotify</u></p>

		<!-- <ParamItem :paramData="event_conf" /> -->
		<div class="menu">
			<Button class="backBt" v-if="event_conf.value != '0'"
				white
				@click="event_conf.value = '0'"
				:icon="require('@/assets/icons/back_purple.svg')"
			/>
			<div class="list">
				<div v-for="e in event_conf.listValues" :key="(e.value as string)">
					<Button class="triggerBt"
					white
					v-if="event_conf.value == '0' || event_conf.value == e.value"
					:title="e.label"
					:icon="getIcon(e)"
					@click="event_conf.value = e.value" />
				</div>
				<ParamItem :paramData="subevent_conf" v-if="isSublist && subevent_conf.listValues && subevent_conf.listValues.length > 1" />
			</div>
		</div>

		<div class="triggerDescription" v-if="event_conf.value != '0'">{{triggerDescription}}</div>

		<img src="@/assets/loader/loader.svg" alt="loader" v-if="showLoading" class="loader">

		<div class="ctas" v-if="canTestAction">
			<Button title="Test trigger" class="cta" @click="testTrigger()" :icon="require('@/assets/icons/test.svg')" />
			<Button title="Delete trigger" class="cta" @click="deleteTrigger()" highlight :icon="require('@/assets/icons/delete.svg')" />
		</div>

		<TriggerActionChatCommandParams class="chatCmdParams"
			v-if="isChatCmd && actionCategory"
			:actionData="actionCategory"
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
					@delete="deleteAction(element, index)"
					@duplicate="duplicateAction(element, index)"
					@setContent="(v:string)=>$emit('setContent', v)"
				/>
			</template>
		</draggable>

		<div class="buttons">
			<Button :icon="require('@/assets/icons/add.svg')" title="Add action"
				class="addBt"
				@click="addAction()"
				v-if="event_conf.value != '0'"
			/>
			<Button :icon="require('@/assets/icons/refresh.svg')" title="Resync OBS sources"
				class="addBt"
				@click="listSources(true)"
				v-if="event_conf.value != '0'" :loading="syncing"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import store, { ParameterData, ParameterDataListValue, PermissionsData, TriggerActionChatCommandData, TriggerActionTypes } from '@/store';
import Config from '@/utils/Config';
import { IRCEventDataList } from '@/utils/IRCEvent';
import OBSWebsocket, { OBSSourceItem } from '@/utils/OBSWebsocket';
import TriggerActionHandler, { TriggerEvents, TriggerEventTypes, TriggerTypes } from '@/utils/TriggerActionHandler';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import draggable from 'vuedraggable';
import Button from '@/components/Button.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import TriggerActionChatCommandParams from './triggers/TriggerActionChatCommandParams.vue';
import TriggerActionEntry from './triggers/TriggerActionEntry.vue';

@Options({
	props:{},
	components:{
		draggable,
		Button,
		ParamItem,
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
	public canSave:boolean = true;
	public syncing:boolean = false;
	public isSublist:boolean = false;
	public showLoading:boolean = false;
	public rewards:TwitchTypes.Reward[] = [];
	public actionCategory:TriggerActionChatCommandData = {
						chatCommand:"",
						permissions:{mods:true, vips:false, subs:false, all:false, users:""},
						cooldown:{global:0, user:0},
						actions:[],
					};

	public get isChatCmd():boolean { return this.event_conf.value === TriggerTypes.CHAT_COMMAND; }

	public get triggerKey():string {
		let key = this.event_conf.value as string;
		let subkey = this.subevent_conf.value as string;
		if(key === TriggerTypes.CHAT_COMMAND) {
			subkey = this.actionCategory.chatCommand;
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
	public getIcon(e:ParameterDataListValue):string|null {
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
		
		if(map[e.value as string]) {
			return require('@/assets/icons/'+map[e.value as string]+".svg");
		}
		return null;
	}
	
	public async mounted():Promise<void> {
		watch(()=> OBSWebsocket.instance.connected, () => { this.listSources(); });
		watch(()=> this.event_conf.value, () => { this.onSelectTrigger(); });
		watch(()=> this.subevent_conf.value, () => { this.onSelectsubTrigger(); });
		watch(()=> this.actionList, () => { this.saveData(); }, { deep:true });
		watch(()=> this.actionCategory, () => { this.saveData(); }, { deep:true });
		await this.listSources();

		//List all available trigger types
		let events:TriggerEventTypes[] = [
			// {label:"Select a trigger...", value:"0" },
		];
		events = events.concat(TriggerEvents);
		if(!Config.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED) {
			events = events.filter(v => v.value != TriggerTypes.TRACK_ADDED_TO_QUEUE);
		}
		// this.event_conf.value = events[0].value;
		this.event_conf.listValues = events;
	}

	/**
	 * Gets all the available OBS sources and sort them alphabetically
	 */
	public async listSources(refreshVue:boolean = false):Promise<void> {
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
	public deleteAction(action:TriggerActionTypes, index:number):void {
		Utils.confirm("Delete action ?").then(()=> {
			this.actionList.splice(index, 1);
		}).catch(()=> {});
	}

	/**
	 * Called when duplicating an action item
	 */
	public duplicateAction(action:TriggerActionTypes, index:number):void {
		// Utils.confirm("Delete action ?").then(()=> {
		// 	this.actionList.splice(index, 1);
		// }).catch(()=> {});

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
		let data:TriggerActionTypes[]|TriggerActionChatCommandData = this.actionList;
		if(this.isChatCmd) {
			this.actionCategory.actions = this.actionList as TriggerActionTypes[];
			data = this.actionCategory;
		}

		//Save the trigger only if it can be tested which means it
		//has the minimum necessary data defined
		if(this.canTestAction) {
			store.dispatch("setTrigger", { key:this.triggerKey, data});
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
				json.message = this.actionCategory.chatCommand + " lorem ipsum";
				console.log(json.message);
			}
			TriggerActionHandler.instance.onMessage(json, true);
		}
	}

	/**
	 * Called to delete the actions sequence
	 */
	public deleteTrigger():void {
		Utils.confirm("Delete trigger ?").then(()=> {
			//Delete trigger from storage
			store.dispatch("deleteTrigger", this.triggerKey);
			//Reset menu selection
			if(this.isSublist) {
				this.subevent_conf.value = "0";
			}else{
				this.event_conf.value = "0";
			}
			this.resetActionCategory();
		}).catch(()=> {});
	}

	/**
	 * Called when selecting a trigger
	 */
	private async onSelectTrigger(onlypopulateSublist:boolean = false):Promise<void> {
		let key = this.event_conf.value as string;
		this.subevent_conf.value = "0";
		this.isSublist = false;
		
		if(key == "0") {
			//No selection, reset everything
			this.actionList = [];
			this.resetActionCategory();

		}else {
			const entry = TriggerEvents.find(v=> v.value == key);
			if(entry?.isCategory === true) {
				//Chat commands and channel point rewards are stored differently to avoid
				//flooding the main trigger list. Main trigger elements are stored with
				//simple keys like "1" where these ones are stored with keys like "1_entryName".
				this.isSublist = true;
				let defaultTitle:string = "";
				this.subevent_conf.listValues = [];
				if(!onlypopulateSublist) this.actionList = [];
				
				if(key == TriggerTypes.CHAT_COMMAND) {
					defaultTitle = "+ New command...";
					const triggers = store.state.triggers;
					//Search for all command triggers
					const commandList:TriggerActionChatCommandData[] = [];
					for (const k in triggers) {
						if(k.indexOf(key+"_") === 0) commandList.push(triggers[k] as TriggerActionChatCommandData);
					}
					this.subevent_conf.listValues = commandList.sort((a,b)=> {
						if(a.chatCommand < b.chatCommand) return -1;
						if(a.chatCommand > b.chatCommand) return 1;
						return 0;
					}).map(v=> {
						return { label:v.chatCommand as string, value:v.chatCommand.toLowerCase() }
					});
					const select = commandList.find(v=>v.chatCommand == this.actionCategory.chatCommand);
					if(select) {
						this.subevent_conf.value = select.chatCommand.toLowerCase();
					}
				}else if(key == TriggerTypes.REWARD_REDEEM) {
					defaultTitle = "Select reward...";
				}
				
				this.subevent_conf.listValues.unshift({ label:defaultTitle, value:"0" });

				// //This update will trigger the watcher that will call onSelectTrigger() again
				// //which will then initialize the form
				// this.subevent_conf.value = (this.subevent_conf.listValues as ParameterDataListValue[])[0].value;
				if(key == TriggerTypes.REWARD_REDEEM) {
					this.listRewards();
				}
			}else if(store.state.triggers[key]){
				const trigger = JSON.parse(JSON.stringify(store.state.triggers[key]));//Avoid modifying the original data
				this.actionList = trigger as TriggerActionTypes[];
			}else{
				this.actionList = [];
			}
			if(!this.isSublist && this.actionList.length == 0) {
				this.addAction();
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
			if(this.isChatCmd && this.subevent_conf.value != "0") {
				this.actionCategory = trigger as TriggerActionChatCommandData;
				this.actionList = this.actionCategory.actions;
			}else{
				this.actionList = trigger as TriggerActionTypes[];
			}
		//Do not reset if the sub event
		}else if(this.isSublist){
			this.actionList = [];
			this.resetActionCategory();
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
			return { label:"("+v.cost+") "+v.title, value:v.id }
		})
		this.subevent_conf.listValues = this.subevent_conf.listValues?.concat(list);
		this.showLoading = false;
	}

	/**
	 * Resets the chat command sub category params
	 */
	private resetActionCategory():void {
		this.actionCategory = {
			chatCommand:"",
			permissions:{
				mods:true,
				vips:false,
				subs:false,
				all:false,
				users:"",
			},
			cooldown:{
				user:0,
				global:0,
			},
			actions:[],
		}
	}
}

export interface OBSChatCmdParameters extends PermissionsData {
	cmd:string;
	userCooldown:number;
	globalCooldown:number;
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
		top: 0;
		z-index: 1;
		background-color: #eee;
		padding-bottom: 1em;
		.list {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			
			.triggerBt {
				width: 100%;
				margin-bottom: 2px;
				box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
				:deep(.label) {
					flex-grow: 1;
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