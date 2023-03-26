<template>
	<div class="triggerslist">
		<div v-if="filteredTriggers.length === 0" class="empty">{{ $t("triggers.noTrigger") }}</div>
		
		<div class="item"
		v-for="item in filteredTriggers" :key="item.trigger.id">
			<button class="button" @click="$emit('select', item.trigger)">
				<img v-if="item.icon" :src="item.icon">
				<span v-if="item.label">{{item.label}}</span>
				<span v-else-if="item.trigger.name">{{item.trigger.name}}</span>
				<span v-else-if="item.trigger.chatCommand">{{item.trigger.chatCommand}}</span>
				<span v-else-if="item.trigger.obsScene">{{item.trigger.obsScene}}</span>
				<span v-else-if="item.trigger.obsSource">{{item.trigger.obsSource}}</span>
				<span v-else>{{ $t(triggerTypeToInfo[item.trigger.type]!.labelKey) }}</span>
			</button>
			<div class="toggle" @click="item.trigger.enabled = !item.trigger.enabled">
				<ToggleButton v-model="item.trigger.enabled"
				:aria-label="item.trigger.enabled? 'trigger enabled' : 'trigger disabled'"/>
			</div>
			<button class="deleteBt" @click="deleteTrigger(item)"
			:data-tooltip="$t('triggers.deleteBt')">
				<img src="@/assets/icons/trash_purple.svg" :alt="$t('triggers.deleteBt')" :aria-label="$t('triggers.deleteBt')">
			</button>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleButton from '@/components/ToggleButton.vue';
import { TriggerEvents, TriggerTypes, type TriggerData, type TriggerEventTypes, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Config from "@/utils/Config";
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleButton
	},
	emits:["select"],
})
export default class TriggerList extends Vue {

	public triggerList:TriggerEntry[] = [];
	public rewards:TwitchDataTypes.Reward[] = [];
	public triggerTypeToInfo:Partial<{[key in TriggerTypesValue]:TriggerEventTypes}> = {};

	public get filteredTriggers():TriggerEntry[] {
		const list:TriggerEntry[] = this.triggerList.concat();
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

	public beforeMount():void {
		this.populateTriggers();
	}

	/**
	 * Populates the triggers list
	 */
	private populateTriggers():void {
		//List all available trigger types
		let events:TriggerEventTypes[] = TriggerEvents().concat();

		this.triggerTypeToInfo = {}
		events.forEach(v=> this.triggerTypeToInfo[v.value] = v);

		let loadRewards:boolean = false;
		const counters = this.$store("counters").data;
		
		const list = this.$store("triggers").triggers;
		const entries:TriggerEntry[] = [];
		for (const key in list) {
			const trigger = list[key];
			const icon = this.$image('icons/'+this.triggerTypeToInfo[trigger.type]!.icon+'_purple.svg');
			let label = trigger.name ?? "";
			if(trigger.type == TriggerTypes.REWARD_REDEEM) loadRewards = true;
			if(trigger.type == TriggerTypes.COUNTER_ADD
			|| trigger.type == TriggerTypes.COUNTER_DEL
			|| trigger.type == TriggerTypes.COUNTER_LOOPED
			|| trigger.type == TriggerTypes.COUNTER_MAXED
			|| trigger.type == TriggerTypes.COUNTER_MINED) {
				const counter = counters.find(v=>v.id === trigger.counterID);
				if(counter) {
					label = counter.name ?? "";
				}else{
					label = this.$t("triggers.missing_counter");
				}
			}
			entries.push({ label, trigger, icon });
		}

		if(loadRewards) this.listRewards();

		this.triggerList = entries;
	}

	/**
	 * Lists the rewards and update labels
	 */
	private async listRewards():Promise<void> {
		try {
			this.rewards = await TwitchUtils.getRewards(true);
		}catch(error) {
			this.rewards = [];
			this.$store("main").alert(this.$t("error.rewards_loading"));
			return;
		}

		for (let i = 0; i < this.triggerList.length; i++) {
			const entry = this.triggerList[i];
			if(entry.trigger.type == TriggerTypes.REWARD_REDEEM && entry.trigger.rewardId) {
				const reward = this.rewards.find(v=>v.id == entry.trigger.rewardId);
				if(reward) {
					entry.label = reward.title;
				}else if(entry.trigger.rewardId === Config.instance.highlightMyMessageReward.id){
					entry.label = Config.instance.highlightMyMessageReward.title;
				}else{
					entry.label = this.$t("triggers.missing_reward");
					console.log(entry);
				}
				if(reward?.image?.url_1x) {
					entry.icon = reward?.image?.url_2x ?? reward?.image?.url_1x;
				}
			}
		}
	}

	public deleteTrigger(entry:TriggerEntry):void {
		this.$store("main").confirm(this.$t("triggers.delete_confirm")).then(()=>{
			this.$store("triggers").deleteTrigger(entry.trigger.id);
			this.populateTriggers();
		}).catch(error=>{});
	}

}

interface TriggerEntry {
	label:string;
	icon:string;
	trigger:TriggerData;
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

	.empty {
		text-align: center;
		font-style: italic;
	}

	.item {
		display: flex;
		flex-direction: row;
		&>* {
			border: 1px solid @mainColor_normal;
			border-right: none;
			&:hover {
				background-color: @mainColor_normal_extralight;
			}
		}
		&>*:first-child {
			border-top-left-radius: .5em;
			border-bottom-left-radius: .5em;
		}
		&>*:last-child {
			border-top-right-radius: .5em;
			border-bottom-right-radius: .5em;
			border-right: 1px solid @mainColor_normal;
		}
		.button {
			display: flex;
			flex-direction: row;
			gap: .5em;
			color: @mainColor_normal;
			padding: .25em .5em;
			align-items: center;
			text-align: left;
			transition: background-color .15s;
			padding-right: 3em;
			flex-grow: 1;
			img {
				height: 1em;
				max-width: 1em;
				filter: drop-shadow(1px 1px 1px fade(@mainColor_normal, 50%));
			}
		}
		.toggle {
			display: flex;
			align-items: center;
			padding: 0 .5em;
			cursor: pointer;
			border-left: 1px solid @mainColor_normal;
		}
		.deleteBt {
			img {
				height: .9em;
				padding: 0 .5em;
			}
		}
	}
}
</style>