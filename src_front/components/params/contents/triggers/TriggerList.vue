<template>
	<div :class="classes">
		<SwitchButton v-if="folderTriggerList.length > 0 && noEdit === false" class="filterSwitch" :label1="$t('triggers.triggers_list_raw')" :label2="$t('triggers.triggers_list_cat')" v-model="filterState" />
		
		
		<div class="list" v-show="filterState === false" v-if="renderedList">
			<TriggerListFolderItem
				:items="folderTriggerList"
				:rewards="rewards"
				:noEdit="noEdit"
				:debugMode="debugMode"
				:triggerId="triggerId"
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
				<div class="item" v-for="item in cat.triggerList"
				:key="'item_'+item.trigger.id"
				:ref="'item_'+item.trigger.id">
					<TriggerListItem :noEdit="noEdit" :entryData="item"
						v-if="buildIndex >= item.index"
						@changeState="onToggleTrigger(item)"
						@delete="deleteTrigger($event)"
						@duplicate="duplicateTrigger($event)"
						@test="$emit('testTrigger',$event)"
						@select="$emit('select', $event)"
					>
						<span class="triggerId" v-if="debugMode" v-click2Select
						@click.stop="">{{ item.trigger.id }}sss</span>
					</TriggerListItem>
				</div>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import Splitter from '@/components/Splitter.vue';
import SwitchButton from '@/components/SwitchButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import DataStore from '@/store/DataStore';
import { TriggerTypesDefinitionList, type TriggerData, type TriggerTypeDefinition, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerListItem from './TriggerListItem.vue';
import { gsap } from 'gsap/all';
import { RoughEase } from 'gsap/all';
import { Linear } from 'gsap/all';
import TriggerListFolderItem from './TriggerListFolderItem.vue';

@Component({
	components:{
		Splitter,
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
	/**
	 * Number of items to instanciate per frame
	 * Avoids a huge lag at open if there are hundred of triggers
	 */
	public buildBatchSize = 25;
	
	private keyupHandler!:(e:KeyboardEvent) => void;

	public get folderTriggerList():(TriggerListEntry|TriggerListFolderEntry)[] {
		let list:(TriggerListEntry|TriggerListFolderEntry)[] = [];
		for (let i = 0; i < this.triggerCategories.length; i++) {
			const cat = this.triggerCategories[i];
			list = list.concat(cat.triggerList);
		}
		if(this.triggerId != null) {
			return list.filter(v=> v.type=='trigger' && v.trigger.id === this.triggerId);
		}
		return list;
	}

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
		this.buildIndex = -1;
		clearInterval(this.buildInterval);
		this.buildInterval = setInterval(()=> {
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
		let idToCategory:{[key:string]:TriggerListCategoryEntry} = {}
		
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
			const entry:TriggerListEntry = { type:"trigger", index:buildIndex, label:info.label, trigger, icon:info.icon, iconURL:info.iconURL, canTest };
			if(info.iconBgColor) entry.iconBgColor = info.iconBgColor;
			idToCategory[triggerType.category.id].triggerList.push(entry);
		}

		this.triggerCategories.sort((a,b)=>{
			if(a.index > b.index) return 1;
			if(a.index < b.index) return -1;
			return 0
		})

		this.startSequentialBuild();
	}

	public deleteTrigger(entry:TriggerListEntry):void {
		this.$store.main.confirm(this.$t("triggers.delete_confirm")).then(()=>{
			this.$store.triggers.deleteTrigger(entry.trigger.id);
			this.populateTriggers();
		}).catch(error=>{});
	}

	public duplicateTrigger(entry:TriggerListEntry):void {
		this.$store.triggers.duplicateTrigger(entry.trigger.id);
		this.populateTriggers();
}

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
 * Show a debug field on CTRL+ALT+D
 * @param e 
 */
public onKeyUp(e:KeyboardEvent):void {
	if(e.key.toUpperCase() == "D" && e.ctrlKey && e.altKey) {
		this.debugMode = !this.debugMode;
		e.preventDefault();
	}
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
	label:string;
	icon:string;
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
		.triggerId {
			cursor: help !important;
			font-size: .8em;
			font-family: 'Courier New', Courier, monospace;
			opacity: .75;
			&::before {
				content: "ID: ";
				font-family: Inter;
				font-weight: bold;
			}
		}
	}

	.empty {
		text-align: center;
		font-style: italic;
	}

}
</style>