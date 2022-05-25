<template>
	<div class="TriggerAction">
		<p class="header">Execute custom actions based on twitch events.<br></p>
		<p class="useCase"><strong>Use case examples :</strong> create chat coommands; control your OBS sources and filters when someone subs, a poll starts, ...</p>

		<ParamItem :paramData="event_conf" />
		<ParamItem :paramData="subevent_conf" v-if="isSublist && subevent_conf.listValues && subevent_conf.listValues.length > 1" />
		<img src="@/assets/loader/loader.svg" alt="loader" v-if="showLoading" class="loader">

		<Button title="Test action" class="testBt" @click="testAction()" v-if="canTestAction" />

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
import store, { ParameterData, ParameterDataListValue, PermissionsData, TriggerActionChatCommandData, TriggerActionObsData, TriggerActionTypes } from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import OBSWebsocket, { OBSSourceItem } from '@/utils/OBSWebsocket';
import TriggerActionHandler, { OBSTriggerEvents, TriggerTypes, TriggerEventTypes } from '@/utils/TriggerActionHandler';
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
	public saving:boolean = false;
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

	public get canTestAction():boolean {
		let canTest = false;
		for (let i = 0; i < this.actionList.length; i++) {
			const a = this.actionList[i];
			if(a.type === "") break;
			canTest = true;
			break;
		}
		return canTest;
	}
	
	public async mounted():Promise<void> {
		watch(()=> OBSWebsocket.instance.connected, () => { this.listSources(); });
		watch(()=> this.event_conf.value, () => { this.onSelectTrigger(); });
		watch(()=> this.subevent_conf.value, () => { this.onSelectTrigger(true); });
		watch(()=> this.actionList, () => { this.saveData(); }, { deep:true });
		watch(()=> this.actionCategory, () => { this.saveData(); }, { deep:true });
		await this.listSources();

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
		this.actionList.push({
			id:Math.random().toString(),
			delay:0,
			type:"obs",//TODO reset to empty string
			sourceName:"",
			show:true,
		});
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
		if(this.saving) return;
		this.saving = true;

		let key = this.event_conf.value as string;
		let subkey = this.subevent_conf.value as string;
		let data:TriggerActionTypes[]|TriggerActionChatCommandData = this.actionList;
		if(this.isChatCmd) {
			subkey = this.actionCategory.chatCommand;
			this.actionCategory.actions = this.actionList as TriggerActionTypes[];
			data = this.actionCategory;
		}
		if(this.isSublist) key = key+"_"+subkey;

		if(this.actionList.length > 0) {
			store.dispatch("setTrigger", { key, data});
		}

		//As we watch for any modifications on "actionCategory" and we
		//modify it during the save process, we need to freeze the save
		//process for a frame to avoid a recursive loop.
		await this.$nextTick();
		this.saving = false;
	}

	/**
	 * Called to test the actions sequence
	 */
	public testAction():void {
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
	 * Called when selecting a trigger and or a sub event
	 */
	private async onSelectTrigger(isSubSelection:boolean = false):Promise<void> {
		this.isSublist = isSubSelection;
		let key = this.event_conf.value as string;
		let subkey = this.subevent_conf.value as string;
		if(isSubSelection && subkey != "0") {
			key = key+"_"+subkey;
			if(subkey == "0") {
				this.resetActionCategory();
			}
		}else{
			this.isSublist = false;
			this.subevent_conf.value = "0";
		}
		
		if(key == "0") {
			//A selection is missing
			this.actionList = [];
			this.resetActionCategory();

		}else {
			const entry = OBSTriggerEvents.find(v=> v.value == key);
			if(entry?.isCategory === true) {
				//Chat commands and channel point rewards are stored differently to avoid
				//flooding the main trigger list. Main trigger elements are stored with
				//simple keys like "1" where these ones are stored with keys like "1_entryName".
				this.isSublist = true;
				this.actionList = [];
				let defaultTitle:string = "";
				this.subevent_conf.listValues = [];
				
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
					this.resetActionCategory();
				}else if(key == TriggerTypes.REWARD_REDEEM) {
					defaultTitle = "Select reward...";
				}
				
				this.subevent_conf.listValues.unshift({ label:defaultTitle, value:"0" });

				//This update will trigger the watcher that will call onSelectTrigger() again
				//which will then initialize the form
				this.subevent_conf.value = (this.subevent_conf.listValues as ParameterDataListValue[])[0].value;
				if(key == TriggerTypes.REWARD_REDEEM) {
					this.listRewards();
				}
			}else{
				//Load actions for the selected trigger event or sub event
				const trigger = JSON.parse(JSON.stringify(store.state.triggers[key]));//Avoid modifying the original data
				if(this.isChatCmd && this.subevent_conf.value != "0") {
					this.actionCategory = trigger as TriggerActionChatCommandData;
					this.actionList = this.actionCategory.actions;
				}else{
					this.actionList = trigger as TriggerActionObsData[];
				}
				if(!this.actionList) this.actionList = [];
				if(this.actionList.length == 0) {
					this.addAction();
				}
			}
		}
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

	.header {
		text-align: center;
		margin-bottom: .5em;
	}

	.useCase {
		font-size: .8em;
		margin-bottom: 1em;
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

	.testBt {
		display: block;
		margin: auto;
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