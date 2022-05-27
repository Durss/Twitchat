<template>
	<div class="TriggerAction">
		<ParamItem :paramData="event_conf" />
		<ParamItem :paramData="subevent_conf" v-if="isSublist && subevent_conf.listValues && subevent_conf.listValues.length > 1" />
		<img src="@/assets/loader/loader.svg" alt="loader" v-if="showLoading" class="loader">

		<div class="ctas">
			<Button title="Test trigger" class="cta" v-if="canTestAction" @click="testTrigger()" :icon="require('@/assets/icons/test.svg')" />
			<Button title="Delete trigger" class="cta" v-if="canTestAction" @click="deleteTrigger()" highlight :icon="require('@/assets/icons/delete.svg')" />
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
					@update="saveData()"
					@setContent="(v:string)=>$emit('setContent', v)"
				/>
			</template>
		</draggable>

		<div class="buttons">
			<Button :icon="require('@/assets/icons/add.svg')" title="Add step"
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
import store, { ParameterData, PermissionsData, TriggerActionChatCommandData, TriggerActionObsData, TriggerActionTypes } from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import OBSWebsocket, { OBSSourceItem } from '@/utils/OBSWebsocket';
import TriggerActionHandler, { OBSTriggerEvents, TriggerEventTypes, TriggerTypes } from '@/utils/TriggerActionHandler';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import draggable from 'vuedraggable';
import Button from '../../../Button.vue';
import ParamItem from '../../ParamItem.vue';
import TriggerActionChatCommandParams from './TriggerActionChatCommandParams.vue';
import TriggerActionEntry from './TriggerActionEntry.vue';

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
export default class TriggerActionList extends Vue {
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
				//If it's an chat action, it needs at least the message to be defined
				if(!(a.text?.length > 0)) continue;
			}
			canTest = true;
			break;
		}
		return canTest;
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
			{label:"Select a trigger...", value:"0" },
		];
		events = events.concat(OBSTriggerEvents);
		this.event_conf.value = events[0].value;
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
	public deleteAction(action:TriggerActionObsData, index:number):void {
		Utils.confirm("Delete action ?").then(()=> {
			this.actionList.splice(index, 1);
		}).catch(()=> {});
	}

	/**
	 * Saves the data to storage
	 */
	public async saveData():Promise<void> {
		if(!this.canSave) return;
		this.canSave = false;

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
		const entry = OBSTriggerEvents.find(v=>v.value == key);
		
		if(entry?.jsonTest) {
			const json = entry.jsonTest as IRCEventDataList.Message;
			if(key == TriggerTypes.REWARD_REDEEM) {
				//Push current reward ID to the test JSON data
				if(json.reward) json.reward.redemption.reward.id = this.subevent_conf.value as string;
			}
			if(key == TriggerTypes.CHAT_COMMAND) {
				//Push current command to the test JSON data
				json.message = this.actionCategory.chatCommand;
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
			const entry = OBSTriggerEvents.find(v=> v.value == key);
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
						return { label:v.chatCommand as string, value:v.chatCommand }
					});
					const select = commandList.find(v=>v.chatCommand == this.actionCategory.chatCommand);
					if(select) {
						this.subevent_conf.value = select.chatCommand;
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
				this.actionList = trigger as TriggerActionObsData[];
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
		key += "_"+this.subevent_conf.value as string;
		
		//Load actions for the selected sub event
		let json = store.state.triggers[key];
		if(json) {
			const trigger = JSON.parse(JSON.stringify(store.state.triggers[key]));//Avoid modifying the original data
			if(this.isChatCmd && this.subevent_conf.value != "0") {
				this.actionCategory = trigger as TriggerActionChatCommandData;
				this.actionList = this.actionCategory.actions;
			}else{
				this.actionList = trigger as TriggerActionObsData[];
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
.TriggerAction{
	// font-size: .9em;
	display: flex;
	flex-direction: column;
	justify-content: center;

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
		flex-direction: column;
		align-items: center;
		margin-top: 1em;
		.cta:not(:first-child) {
			margin-top: .25em;
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