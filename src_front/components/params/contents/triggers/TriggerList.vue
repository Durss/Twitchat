<template>
	<div :class="classes">
		<SwitchButton v-if="folderTriggerList && folderTriggerList.length > 0 && noEdit === false" class="filterSwitch" :label1="$t('triggers.triggers_list_raw')" :label2="$t('triggers.triggers_list_cat')" v-model="filterState" />
		
		<div class="list" v-show="filterState === false" v-if="renderedList">
			<TTButton class="addFolderBt" icon="folder" v-if="!triggerId" @click="addFolder()">{{ $t('triggers.create_folder') }}</TTButton>
			<TriggerListFolderItem
				v-model:items="folderTriggerList"
				:rewards="rewards"
				:noEdit="noEdit"
				:debugMode="debugMode"
				:triggerId="triggerId"
				@change="onUpdateList"
				@changeState="onToggleTrigger"
				@delete="deleteTrigger"
				@duplicate="duplicateTrigger"
				@testTrigger="$emit('testTrigger',$event)"
				@select="$emit('select', $event)" />
		</div>
		
		<div class="list category" v-show="filterState === true" v-if="noEdit === false && renderedCat">
			<ToggleBlock class="category" medium
			v-for="cat in triggerCategories" :key="'cat_'+cat.index"
			:title="$t(cat.labelKey)" :icons="cat.icons">
				<template  v-for="item in cat.triggerList">
					<TriggerListItem
						:noEdit="noEdit"
						:entryData="item"
						:key="'item_'+item.trigger.id"
						:ref="'item_'+item.trigger.id"
						v-if="buildIndex >= item.index"
						@changeState="onToggleTrigger(item)"
						@delete="deleteTrigger($event)"
						@duplicate="duplicateTrigger($event)"
						@test="$emit('testTrigger',$event)"
						@select="$emit('select', $event)"
					>
						<span class="triggerId" v-if="debugMode" v-click2Select @click.stop="">{{ item.trigger.id }}</span>
					</TriggerListItem>
				</template>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import SwitchButton from '@/components/SwitchButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import DataStore from '@/store/DataStore';
import { TriggerTypesDefinitionList, type TriggerData, type TriggerTypeDefinition, type TriggerTypesValue, type TriggerTreeItemData } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerListItem from './TriggerListItem.vue';
import { gsap } from 'gsap/all';
import { RoughEase } from 'gsap/all';
import { Linear } from 'gsap/all';
import TriggerListFolderItem from './TriggerListFolderItem.vue';
import TTButton from '@/components/TTButton.vue';

@Component({
	components:{
		TTButton,
		ToggleBlock,
		SwitchButton,
		ToggleButton,
		TriggerListItem,
		TriggerListFolderItem,
	},
	emits:["select", "testTrigger"],
})
export default class TriggerList extends Vue {

	@Prop({default:[]})
	public rewards!:TwitchDataTypes.Reward[];

	@Prop({default:false})
	public noEdit!:boolean;

	@Prop({default:null})
	public triggerId!:string|null;

	public debugMode:boolean = false;
	public filterState:boolean = true;
	public renderedList:boolean = true;
	public renderedCat:boolean = true;
	public triggerCategories:TriggerListCategoryEntry[] = [];
	public triggerTypeToInfo:Partial<{[key in TriggerTypesValue]:TriggerTypeDefinition}> = {};
	public buildIndex = 0;
	public buildInterval = -1;
	public folderTriggerList:(TriggerListEntry|TriggerListFolderEntry)[] = [];
	/**
	 * Number of items to instanciate per frame
	 * Avoids a huge lag at open if there are hundred of triggers
	 */
	public buildBatchSize = 25;

	// private fakeFolders:TriggerTreeItemData[] = [
			// {type:"folder", name:"blublu", id:Utils.getUUID(), children:[
			// 	{type:"trigger", triggerId:"768ea4b8-40d0-4ee1-9512-4e2959a1a330", id:Utils.getUUID()},
			// 	{type:"trigger", triggerId:"7777ac1c-ffd3-4ae3-a983-d5f2364ef68a", id:Utils.getUUID()},
			// ]},
			// {type:"folder", name:"couille", id:Utils.getUUID(), children:[
			// 	{type:"trigger", triggerId:"97eb2565-6bc9-4087-88be-bab09863031d", id:Utils.getUUID()},
			// 	{type:"trigger", triggerId:"d91f5d69-8945-4e74-bc65-d2b65cb91fd2", id:Utils.getUUID()},
			// 	{type:"trigger", triggerId:"c3533872-be70-4641-a2ef-37d7df7f1e33", id:Utils.getUUID()},
			// 	{type:"trigger", triggerId:"6a9a7e1e-cf8a-4b2e-8e5b-a2c4820aa181", id:Utils.getUUID()},
			// ]},
			// {type:"folder", name:"clito", id:Utils.getUUID(), children:[
			// 	{type:"trigger", triggerId:"a9da4629-368e-4d1c-ad97-970b08480ce5", id:Utils.getUUID()},
			// 	{type:"trigger", triggerId:"38ab5a2a-1188-4583-be80-d1a24032b30e", id:Utils.getUUID()},
			// 	{type:"trigger", triggerId:"9439261e-24e4-4dde-b223-34d23f1bf7ca", id:Utils.getUUID()},
			// ]},
			// {type:"folder", name:"urêtre", id:Utils.getUUID(), children:[
			// 	{type:"trigger", triggerId:"dff04f5b-c516-41a2-a752-43a2944e57ca", id:Utils.getUUID()},
			// 	{type:"trigger", triggerId:"bfae0999-b9b2-4b35-a1d2-4875636e8c0e", id:Utils.getUUID()},
			// ]},
			// {type:"folder", name:"anu", id:Utils.getUUID(), children:[
			// 	{type:"trigger", triggerId:"0088ec43-9a54-4922-9b8d-6c5d58e0a021", id:Utils.getUUID()},
			// ]},
			// {type:"trigger", triggerId:"2ee5e246-10ed-4a1c-a82a-76c16955a76a", id:Utils.getUUID()},
			// {type:"trigger", triggerId:"cb9051b9-f6d0-4306-8975-01289228fc92", id:Utils.getUUID()},
		// ]
	
	private keyupHandler!:(e:KeyboardEvent) => void;

	public get classes():string[] {
		const res = ["triggerslist"];
		return res;
	}

	public beforeMount():void {
		this.filterState = this.noEdit === false && DataStore.get(DataStore.TRIGGER_SORT_TYPE) === "category";
		this.populateTriggers();
		let isFirstRewardUpdate = true;
		watch(()=>this.rewards, ()=>{
			if(isFirstRewardUpdate) {
				isFirstRewardUpdate = false;
				return;
			}
			this.populateTriggers();
		})

		watch(()=>this.filterState, ()=> {
			const sortType:SortTypes = this.filterState === true? "category" : "list";
			DataStore.set(DataStore.TRIGGER_SORT_TYPE, sortType);
		});
		
		this.startSequentialBuild();

		this.keyupHandler = (e:KeyboardEvent) => this.onKeyUp(e);
		document.addEventListener("keyup", this.keyupHandler);
	}
	
	public beforeUnmount():void {
		clearInterval(this.buildInterval);
		document.removeEventListener("keyup", this.keyupHandler);
	}

	private startSequentialBuild():void {
		this.buildIndex = 100000000;
		// this.buildIndex = -1;
		// clearInterval(this.buildInterval);
		// this.buildInterval = setInterval(()=> {
		// 	this.buildIndex ++;
		// 	if(this.buildIndex > Math.floor(this.folderTriggerList.length/this.buildBatchSize)) {
		// 		clearInterval(this.buildInterval);
		// 	}
		// }, 60);
	}

	/**
	 * Populates the triggers list
	 */
	private populateTriggers():void {
		if(!this.renderedList) {
			this.renderedList = this.filterState === false;
		}
		if(!this.renderedCat) {
			this.renderedCat = !this.renderedList;
		}

		//List all available trigger types
		this.triggerTypeToInfo = {};
		this.triggerCategories = [];
		TriggerTypesDefinitionList().forEach(v=> this.triggerTypeToInfo[v.value] = v);

		let triggerList = this.$store.triggers.triggerList;

		//Sort by type so they're properly splitted into categories later
		triggerList.sort((a,b) => {
			if(parseInt(a.type) > parseInt(b.type)) return 1;
			if(parseInt(a.type) < parseInt(b.type)) return -1;
			return 0
		});
		// list = list.slice(0, 10);

		const categories:TriggerListCategoryEntry[] = [];
		let triggerBuildIndex = 0;
		let idToCategory:{[key:string]:TriggerListCategoryEntry} = {};
		let flatList:TriggerListEntry[] = [];
		
		for (let i = 0; i < triggerList.length; i++) {
			const trigger = triggerList[i];
			
			//Create new category
			const index = TriggerTypesDefinitionList().findIndex(v=> v.value == trigger.type);
			
			if(index == -1) continue

			const triggerType = TriggerTypesDefinitionList()[index];
			if(!idToCategory[triggerType.category.id]) {
				let currentCategory = {
					index:index,
					icons: triggerType.category.icons,
					labelKey: triggerType.category.labelKey,
					triggerList: [],
				};
				categories.push(currentCategory);
				this.triggerCategories.push(currentCategory);
				idToCategory[triggerType.category.id] = currentCategory;
			}
			
			//Parse trigger
			const info = Utils.getTriggerDisplayInfo(trigger);
			const canTest = this.triggerTypeToInfo[trigger.type]!.testMessageType != undefined;
			const buildIndex = Math.floor(++triggerBuildIndex/this.buildBatchSize);//Builditems by batch of 5
			const entry:TriggerListEntry = { type:"trigger", index:buildIndex, label:info.label, id:trigger.id, trigger, icon:info.icon, iconURL:info.iconURL, canTest };
			flatList.push(entry);
			if(info.iconBgColor) entry.iconBgColor = info.iconBgColor;
			idToCategory[triggerType.category.id].triggerList.push(entry);
		}

		this.triggerCategories.sort((a,b)=>{
			if(a.index > b.index) return 1;
			if(a.index < b.index) return -1;
			return 0
		});
		

		if(this.triggerId != null) {
			this.folderTriggerList = flatList.filter(v=> v.type=='trigger' && v.trigger.id === this.triggerId);
		}else{
			//Build folder structure
			const idToHasFolder:{[key:string]:boolean} = {};
			function buildItem(items:TriggerTreeItemData[]):(TriggerListEntry|TriggerListFolderEntry)[] {
				const res:(TriggerListEntry|TriggerListFolderEntry)[] = []
				for (let i = 0; i < items.length; i++) {
					const item = items[i];
					if(item.type == "folder") {
						const children = buildItem(item.children || []).filter(v=> v != undefined) as TriggerListFolderEntry["items"];//(item.children || []).map(v=> buildItem(v.children || [])).filter(v=> v != undefined) as TriggerListFolderEntry["items"];
						res.push({type:"folder", id:item.id, label:item.name!, items:children});
					}else{
						const entry = flatList.find(v=> v.trigger.id == item.triggerId);
						if(entry) {
							idToHasFolder[entry.id] = true;
							res.push(entry);
						}
					}
				}
				return res;
			}
			this.folderTriggerList = buildItem(this.$store.triggers.triggerTree);

			flatList.forEach(v=>{
				if(!idToHasFolder[v.id]) {
					this.folderTriggerList.push(v);
				}
			})
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
	public duplicateTrigger(entry:TriggerListEntry):void {
		this.$store.triggers.duplicateTrigger(entry.trigger.id);
		this.populateTriggers();
	}

	/**
	 * Called when enabling/disabling a trigger
	 * @param item 
	 */
	public onToggleTrigger(item:TriggerListEntry):void {
		if(!this.$store.auth.isPremium
		&& this.$store.triggers.triggerList.filter(v=>v.enabled !== false).length > this.$config.MAX_TRIGGERS) {
			setTimeout(()=>{
				item.trigger.enabled = false;
			}, 350);
			setTimeout(()=>{
				const divs = this.$refs["item_"+item.trigger.id] as HTMLElement[];
				for (let i = 0; i < divs.length; i++) {
					gsap.fromTo(divs[i], {backgroundColor:"rgba(255,0,0,1)"}, {duration:.5, backgroundColor:"rgba(255,0,0,0)" , clearProps:"background-color"})
					gsap.fromTo(divs[i], {x:-5}, {duration:.2, x:5, ease:RoughEase.ease.config({strength:8, points:20, template:Linear.easeNone, randomize:false}) , clearProps:"x"})
				}
			}, 150);
		}else{
			this.$store.triggers.saveTriggers();
		}
	}

	/**
	 * Called when sorting triggers
	 * @param tree 
	 */
	public onUpdateList():void {
		const tree:TriggerTreeItemData[] = [];
		function buildItem(root:TriggerListEntry|TriggerListFolderEntry):TriggerTreeItemData {
			switch(root.type) {
				case "folder":{
					return {type:"folder", id:root.id, name: root.label, children:root.items.map(v=> buildItem(v))};
				}
				default:
				case "trigger":{
					return {type:"trigger", id:root.id, triggerId:root.id};
				}
			}
		}
		this.$store.triggers.updateTriggerTree(this.folderTriggerList.map(v => buildItem(v)));
	}

	/**
	 * Show a debug field on CTRL+ALT+D
	 * @param e 
	 */
	public onKeyUp(e:KeyboardEvent):void {
		if(e.key.toUpperCase() == "D" && e.ctrlKey && e.altKey) {
			this.debugMode = !this.debugMode;
			e.preventDefault();
		}
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
		})
	}

}

type SortTypes = "list" | "category";

interface TriggerListCategoryEntry {
	index:number;
	labelKey:string;
	icons:string[];
	triggerList:TriggerListEntry[];
}

export interface TriggerListEntry {
	type:"trigger";
	id:string;
	index:number;
	label:string;
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
	items:(TriggerListEntry|TriggerListFolderEntry)[];
}
</script>

<style scoped lang="less">
.triggerslist{
	display: flex;
	flex-direction: column;
	gap: 1em;

	.filterSwitch {
		margin: auto;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		&.category{
			gap: 1em;
		}
		.category {
			width: 100%;
			:deep(.header) {
				position: sticky;
				top: 0;
				z-index: 101;
			}
			:deep(.content) {
				display: flex;
				flex-direction: column;
				gap: 2px;
			}
		}

		.addFolderBt {
			margin: auto;
			margin-bottom: .5em
		}

		.triggerId {
			.bevel();
			cursor: help !important;
			font-size: .8em;
			font-family: 'Courier New', Courier, monospace;
			opacity: .75;
			padding: 2px 5px;
			&::before {
				content: "ID: ";
				font-family: Inter;
				font-weight: bold;
			}
		}
	}
}
</style>