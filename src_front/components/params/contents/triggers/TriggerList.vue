<template>
	<div :class="classes">
		<div v-if="filteredTriggers.length === 0" class="empty">{{ $t("triggers.triggers_none") }}</div>
		<Splitter class="head" v-else-if="noEdit===false">{{ $t("triggers.triggers_list") }}</Splitter>
		
		<div class="item"
		v-for="item in filteredTriggers" :key="item.trigger.id">
			<button class="button"
			@click="$emit('select', item.trigger)"
			:data-tooltip="getCategoryLabel(item)">
				<img v-if="item.icon" :src="item.icon" :style="{backgroundColor:item.iconBgColor}">
				<span>{{item.label}}</span>
			</button>

			<div class="toggle"
			v-if="noEdit === false"
			@click="item.trigger.enabled = !item.trigger.enabled; onChangeTrigger()">
				<ToggleButton v-model="item.trigger.enabled"
				@change="onChangeTrigger()"
				:aria-label="item.trigger.enabled? 'trigger enabled' : 'trigger disabled'"/>
			</div>

			<button class="testBt" @click="$emit('testTrigger',item.trigger)"
			v-if="noEdit === false"
			:disabled="!item.canTest"
			:data-tooltip="$t('triggers.testBt')">
				<img src="@/assets/icons/test_purple.svg" :alt="$t('triggers.testBt')" :aria-label="$t('triggers.testBt')">
			</button>

			<button class="deleteBt" @click="deleteTrigger(item)"
			v-if="noEdit === false"
			:data-tooltip="$t('triggers.deleteBt')">
				<img src="@/assets/icons/trash_purple.svg" :alt="$t('triggers.deleteBt')" :aria-label="$t('triggers.deleteBt')">
			</button>
		</div>
	</div>
</template>

<script lang="ts">
import Splitter from '@/components/Splitter.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import { TriggerEvents, TriggerEventTypeCategories, type TriggerData, type TriggerEventTypeCategoryValue, type TriggerEventTypes, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Splitter,
		ToggleButton,
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

	public triggerList:TriggerEntry[] = [];
	public triggerTypeToInfo:Partial<{[key in TriggerTypesValue]:TriggerEventTypes}> = {};

	public get filteredTriggers():TriggerEntry[] {
		const list:TriggerEntry[] = this.triggerList.concat();
		if(this.triggerId != null) {
			return list.filter(v=>v.trigger.id === this.triggerId);
		}

		list.sort((a,b) => {
			if(parseInt(a.trigger.type) > parseInt(b.trigger.type)) return 1;
			if(parseInt(a.trigger.type) < parseInt(b.trigger.type)) return -1;
			if(a.label.toLowerCase() > b.label.toLowerCase()) return 1;
			if(a.label.toLowerCase() < b.label.toLowerCase()) return -1;
			if(a.trigger.name && b.trigger.name) {
				if(a.trigger.name.toLowerCase() > b.trigger.name.toLowerCase()) return 1;
				if(a.trigger.name.toLowerCase() < b.trigger.name.toLowerCase()) return -1;
			}
			return 0
		})
		return list;
	}

	public get classes():string[] {
		const res = ["triggerslist"];
		return res;
	}

	public getCategoryLabel(entry:TriggerEntry):string {
		const event = TriggerEvents().find(v=> v.value === entry.trigger.type);
		if(!event) return "";

		const catToLabel:Partial<{[key in TriggerEventTypeCategoryValue]:string}> = {};
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
		catToLabel[ TriggerEventTypeCategories.COUNTER]		= "triggers.categories.count";
		
		if(!catToLabel[event.category]) return "";

		return this.$t( catToLabel[event.category]! );
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
	}

	/**
	 * Populates the triggers list
	 */
	private populateTriggers():void {
		//List all available trigger types
		this.triggerTypeToInfo = {}
		TriggerEvents().forEach(v=> this.triggerTypeToInfo[v.value] = v);

		const list = this.$store("triggers").triggerList;
		const entries:TriggerEntry[] = [];
		for (const key in list) {
			const trigger = list[key];
			
			const info = Utils.getTriggerDisplayInfo(trigger);
			let icon = "";
			if(info.iconURL) {
				icon = info.iconURL;
			}else{
				icon = this.$image('icons/'+info.icon+'_purple.svg');
			}
			const canTest = this.triggerTypeToInfo[trigger.type]!.testMessageType != undefined;
			const entry:TriggerEntry = { label:info.label, trigger, icon, canTest };
			if(info.iconBgColor) entry.iconBgColor = info.iconBgColor;
			entries.push(entry);
		}

		this.triggerList = entries;
	}

	public deleteTrigger(entry:TriggerEntry):void {
		this.$store("main").confirm(this.$t("triggers.delete_confirm")).then(()=>{
			this.$store("triggers").deleteTrigger(entry.trigger.id);
			this.populateTriggers();
		}).catch(error=>{});
	}


	public onChangeTrigger():void {
		this.$store("triggers").saveTriggers();
	}

}

interface TriggerEntry {
	label:string;
	icon:string;
	canTest:boolean;
	trigger:TriggerData;
	iconBgColor?:string;
}
</script>

<style scoped lang="less">
.triggerslist{
	// @itemWidth: 170px;
	// display: grid;
	// grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
	display: flex;
	flex-direction: column;
	gap: .25em;

	.head {
		margin: 0 0 1em 0;
	}

	.empty {
		text-align: center;
		font-style: italic;
	}

	.item {
		box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
		color: @mainColor_normal;
		background-color: @mainColor_light;
		border-radius: .5em;
		padding: 0;
		display: flex;
		flex-direction: row;
		min-height: 1.5em;
		overflow: hidden;
		&>* {
			transition: color .25s, background-color .25s;
			&:hover {
				background-color: fade(@mainColor_normal_extralight, 20%);
			}
		}
		.button {
			display: flex;
			flex-direction: row;
			gap: .25em;
			color: @mainColor_normal;
			padding: 0 .5em 0 0;
			align-items: center;
			text-align: left;
			transition: background-color .25s;
			flex-grow: 1;
			overflow: hidden;
			word-wrap: break-word;
			img {
				height: 1.5em;
				width: 1.5em;
				padding: .25em;
				object-fit: fill;
			}
		}
		.toggle {
			display: flex;
			align-items: center;
			padding: 0 .5em;
			cursor: pointer;
			border-left: 1px solid @mainColor_normal;
		}
		.deleteBt, .testBt {
			img {
				height: .9em;
				padding: 0 .5em;
			}
			
			&:disabled,
			&[disabled] {
				pointer-events: none;
				img {
					opacity: .35;
				}
			}
		}
	}
}
</style>