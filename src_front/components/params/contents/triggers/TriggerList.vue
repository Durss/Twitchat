<template>
	<div :class="classes">
		<TTButton class="addFolderBt" icon="folder"
			v-if="!triggerId && folderTriggerList.length > 0"
			@click="addFolder()"
			v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'triggers_folder'}">{{ $t('triggers.create_folder') }}</TTButton>
		<TriggerSearchForm v-if="!triggerId && folderTriggerList.length > 0" v-model="debouncedSearch">
			<Checkbox class="searchActions" v-model="searchInActions">{{ $t('triggers.search_in_actions') }}</Checkbox>
		</TriggerSearchForm>
		<TriggerListFolderItem
			v-model:items="filteredTriggerList"
			:rewards="rewards"
			:noEdit="noEdit || hasSearch"
			:triggerId="triggerId"
			@change="onUpdateList"
			@changeState="onToggleTrigger"
			@delete="deleteTrigger"
			@duplicate="duplicateTrigger"
			@testTrigger="$emit('testTrigger',$event)"
			@createTrigger="$emit('createTrigger',$event)"
			@select="$emit('select', $event)" />
		<!-- <pre class="debug">{{ debug }}</pre> -->
		<!-- <pre>{{ $store.triggers.triggerIdToFolderEnabled }}</pre> -->
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import { TriggerTypesDefinitionList, type TriggerData, type TriggerTreeItemData, type TriggerTypeDefinition, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TriggerUtils from '@/utils/TriggerUtils';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import Icon from '@/components/Icon.vue';
import TriggerListFolderItem from './TriggerListFolderItem.vue';
import TriggerListItem from './TriggerListItem.vue';
import TriggerSearchForm from './TriggerSearchForm.vue';
import Checkbox from '@/components/Checkbox.vue';

@Component({
	components:{
		Icon,
		TTButton,
		Checkbox,
		ToggleBlock,
		ToggleButton,
		TriggerListItem,
		TriggerListFolderItem,
		TriggerSearchForm,
	},
	emits:["select", "testTrigger","createTrigger"],
})
class TriggerList extends Vue {

	@Prop({default:[]})
	public rewards!:TwitchDataTypes.Reward[];

	@Prop({default:false})
	public noEdit!:boolean;

	@Prop({default:null})
	public triggerId!:string|null;

	public debouncedSearch:string = "";
	public searchInActions:boolean = false;
	public triggerTypeToInfo:Partial<{[key in TriggerTypesValue]:TriggerTypeDefinition}> = {};
	public buildIndex = 0;
	public buildInterval = -1;
	public folderTriggerList:(TriggerListEntry|TriggerListFolderEntry)[] = [];
	/**
	 * Number of items to instanciate per frame
	 * Avoids a huge lag at open if there are hundred of triggers
	 */
	public buildBatchSize = 25;


	public get hasSearch():boolean {
		return this.debouncedSearch.trim().length > 0;
	}

	public get filteredTriggerList():(TriggerListEntry|TriggerListFolderEntry)[] {
		if(!this.hasSearch) return this.folderTriggerList;
		const query = this.debouncedSearch.trim().toLowerCase();
		return this.filterTree(this.folderTriggerList, query);
	}

	public set filteredTriggerList(value:(TriggerListEntry|TriggerListFolderEntry)[]) {
		//Ignore writes when searching to avoid corrupting the source list
		if(!this.hasSearch) {
			this.folderTriggerList = value;
		}
	}

	public get classes():string[] {
		const res = ["triggerslist"];
		return res;
	}

	public get debug():string {
		function buildItem(items:(TriggerListEntry|TriggerListFolderEntry)[]):any[] {
			const res:any[] = []
			for (const item of items) {
				if(item.type == "folder") {
					const children = buildItem(item.items || []);
					res.push({label:item.label, items:children});
				}else{
					res.push(item.label);
				}
			}
			return res;
		}
		const list = buildItem(this.folderTriggerList);
		return JSON.stringify(list, null, 4);
	}

	public beforeMount():void {
		this.populateTriggers();
		let isFirstRewardUpdate = true;
		watch(()=>this.rewards, ()=>{
			if(isFirstRewardUpdate) {
				isFirstRewardUpdate = false;
				return;
			}
			this.populateTriggers();
		})

		this.startSequentialBuild();
	}

	public beforeUnmount():void {
		clearInterval(this.buildInterval);
	}

	private startSequentialBuild():void {
		this.buildIndex = -1;
		clearInterval(this.buildInterval);
		this.buildInterval = window.setInterval(()=> {
			this.buildIndex ++;
			if(this.buildIndex > Math.floor(this.folderTriggerList.length/this.buildBatchSize)) {
				clearInterval(this.buildInterval);
			}
		}, 60);
	}

	/**
	 * Populates the triggers list
	 */
	private populateTriggers():void {
		//List all available trigger types
		this.triggerTypeToInfo = {};
		TriggerTypesDefinitionList().forEach(v=> this.triggerTypeToInfo[v.value] = v);

		const triggerList = this.$store.triggers.triggerList;

		//Sort by type so they're properly splitted into categories later
		triggerList.sort((a,b) => {
			if(parseInt(a.type) > parseInt(b.type)) return 1;
			if(parseInt(a.type) < parseInt(b.type)) return -1;
			return 0
		});

		let triggerBuildIndex = 0;
		let flatList:TriggerListEntry[] = [];

		for (const trigger of triggerList) {
			//Parse trigger
			const info = TriggerUtils.getTriggerDisplayInfo(trigger);
			const canTest = this.triggerTypeToInfo[trigger.type]!.testMessageType != undefined;
			const buildIndex = Math.floor(++triggerBuildIndex/this.buildBatchSize);//Builditems by batch of 5
			const entry:TriggerListEntry = { type:"trigger", index:buildIndex, label:info.label, labelKey:info.labelKey, id:trigger.id, trigger, icon:info.icon, iconURL:info.iconURL, canTest };
			flatList.push(entry);
			if(info.iconBgColor) entry.iconBgColor = info.iconBgColor;
		}

		if(this.triggerId != null) {
			this.folderTriggerList = flatList.filter(v=> v.type=='trigger' && v.trigger.id === this.triggerId);
		}else{
			//Build folder structure
			const idToHasFolder:{[key:string]:boolean} = {};
			const done:any = {};
			function buildItem(items:TriggerTreeItemData[]):(TriggerListEntry|TriggerListFolderEntry)[] {
				const res:(TriggerListEntry|TriggerListFolderEntry)[] = []
				for (const item of items) {
					if(item.type == "folder") {
						const children = buildItem(item.children || []);
						res.push({type:"folder",
								id:item.id,
								label:item.name!,
								items:children,
								color:{type:"color", value:item.color || "#60606c"},
								expand:item.expand == true,
								enabled:item.enabled !== false});
					}else{
						const entry = flatList.find(v=> v.trigger.id == item.triggerId);
						if(entry && !done[entry.id]) {
							idToHasFolder[entry.id] = true;
							res.push(entry);
						}
					}
				}
				return res;
			}
			this.folderTriggerList = buildItem(this.$store.triggers.triggerTree);

			//Push items not linked to any folder.
			//After this execution, triggers will be registered on the tree structure.
			//This is mostly here as a sort of migration step from old flat list structure
			//to the new tree structure
			flatList.forEach(v=>{
				if(!idToHasFolder[v.id]) {
					this.folderTriggerList.push(v);
				}
			});
		}

		this.startSequentialBuild();
	}

	/**
	 * Delete a trigger
	 * @param entry
	 */
	public deleteTrigger(entry:TriggerListEntry):void {
		this.$store.main.confirm(this.$t("triggers.delete_confirm")).then(()=>{
			this.$store.triggers.deleteTrigger(entry.trigger.id);
			this.populateTriggers();
		}).catch(error=>{});
	}

	/**
	 * Duplicate a trigger
	 * @param entry
	 */
	public duplicateTrigger(entry:TriggerListEntry, parent:TriggerListFolderEntry):void {
		this.$store.triggers.duplicateTrigger(entry.trigger.id, parent?.id);
		this.populateTriggers();
		this.onUpdateList();
	}

	/**
	 * Called when enabling/disabling a trigger
	 * @param item
	 */
	public onToggleTrigger(item:TriggerListEntry):void {
		this.$store.triggers.saveTriggers();
	}

	/**
	 * Called when sorting triggers, creating a folder, renaming a folder, changing its color,...
	 * Saves data to store
	 * @param tree
	 */
	public onUpdateList():void {
		function buildItem(root:TriggerListEntry|TriggerListFolderEntry):TriggerTreeItemData {
			switch(root.type) {
				case "folder":{
					return {type:"folder",
							id:root.id,
							name:root.label,
							expand:root.expand === true,
							color:root.color.value,
							enabled:root.enabled !== false,
							children:root.items.map(v=> buildItem(v))
						};
				}
				default:
				case "trigger":{
					return {type:"trigger", id:root.id, triggerId:root.id};
				}
			}
		}

		const tree = this.folderTriggerList.map(v => buildItem(v));
		this.$store.triggers.updateTriggerTree(tree);
	}

	/**
	 * Recursively filters the trigger tree, keeping only entries matching
	 * the search query (by label or translated labelKey) and preserving
	 * the folder structure for matching descendants.
	 */
	private filterTree(items:(TriggerListEntry|TriggerListFolderEntry)[], query:string):(TriggerListEntry|TriggerListFolderEntry)[] {
		const result:(TriggerListEntry|TriggerListFolderEntry)[] = [];
		for(const item of items) {
			if(item.type === "folder") {
				const filteredChildren = this.filterTree(item.items, query);
				if(filteredChildren.length > 0) {
					result.push({...item, items:filteredChildren, expand:true});
				}
			}else{
				const values:(string|undefined)[] = [item.label];
				if(item.labelKey) values.push(this.$t(item.labelKey));
				if(this.searchInActions) {
					item.trigger.actions.forEach(action => {
						switch(action.type) {
							case "chat": {
								values.push(action.text);
								break;
							}
							case "customChat": {
								values.push(action.customMessage.message);
								values.push(action.customMessage.quote);
								values.push(action.customMessage.user?.name);
								break;
							}
							case "raffle": {
								values.push(action.raffleData.command);
								values.push(action.raffleData.customEntries);
								values.push(...action.raffleData.entries.map(entry => entry.label));
								break;
							}
							case "animated_text": {
								if(action.animatedTextData.action == "show") {
									values.push(action.animatedTextData.text);
								}
								break;
							}
							case "discord": {
								values.push(action.discordAction.message);
								break;
							}
							case "highlight": {
								if(action.show) {
									values.push(action.text);
								}
								break;
							}
							case "http": {
								values.push(action.url);
								break;
							}
							case "music": {
								values.push(action.track);
								break;
							}
							case "obs": {
								values.push(action.sourceName);
								values.push(action.filterName);
								values.push(action.text);
								values.push(action.url);
								values.push(action.browserEventName);
								values.push(action.browserEventParams);
								values.push(action.recordChapterName);
								values.push(action.persistedDataKey);
								values.push(action.persistedDataValue);
								values.push(action.persistedDataPlaceholder);
								break;
							}
							case "poll": {
								values.push(action.pollData.title);
								values.push(...action.pollData.answers.map(option => option));
								break;
							}
							case "prediction": {
								values.push(action.predictionData.title);
								values.push(...action.predictionData.answers.map(option => option));
								break;
							}
							case "chat_poll": {
								values.push(action.chatPollData.title);
								values.push(...action.chatPollData.choices.map(option => option.label));
								break;
							}
							case "chatSugg": {
								values.push(action.suggData.command);
								break;
							}
							case "tts": {
								values.push(action.text);
								break;
							}
							case "random": {
								if(action.mode == "list") {
									values.push(...action.list.map(option => option));
								}
								break;
							}
							case "stream_infos": {
								values.push(action.title);
								values.push(...action.tags);
								break;
							}
						}
					})
				}
				for (const value of values) {
					if(value && value.toString().toLowerCase().includes(query.toLowerCase())) {
						result.push(item);
						break;
					}
				}
			}
		}
		return result;
	}

	/**
	 * Create a new empty trigger folder
	 */
	public addFolder():void {
		this.folderTriggerList.unshift({
			type:"folder",
			id:Utils.getUUID(),
			items:[],
			label:"",
			enabled:true,
			expand:true,
			color:{type:"color", value:"#60606c"},
		})
	}

}

export interface TriggerListEntry {
	type:"trigger";
	id:string;
	index:number;
	label:string;
	labelKey?:string;
	icon:string;
	canTest:boolean;
	trigger:TriggerData;
	iconURL?:string;
	iconBgColor?:string;
}

export interface TriggerListFolderEntry {
	type:"folder";
	id:string;
	label:string;
	enabled:boolean;
	expand:boolean;
	color:TwitchatDataTypes.ParameterData<string>;
	items:(TriggerListEntry|TriggerListFolderEntry)[];
}
export default toNative(TriggerList);
</script>

<style scoped lang="less">
.triggerslist{
	display: flex;
	flex-direction: column;
	gap: 1em;

	.searchActions {
		display: flex;
		align-items: center;
		gap: .5em;
		font-size: .9em;
		cursor: pointer;
		align-self: center;
		background-color: var(--background-color-fader);
		padding: .25em .5em;
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
	}

	.addFolderBt {
		align-self: center;
	}

}
</style>
