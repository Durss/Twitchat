<template>
	<div class="triggerslist">
		<div v-if="filteredTriggers.length === 0" class="empty">{{ $t("triggers.noTrigger") }}</div>
		
		<div class="item"
		v-for="item in filteredTriggers" :key="item.trigger.id">
			<button class="button"
			@click="$emit('select', item.trigger)"
			:data-tooltip="getCategoryLabel(item)">
				<img v-if="item.icon" :src="item.icon" :style="{backgroundColor:item.iconBgColor}">
				<span v-if="item.label">{{item.label}}</span>
				<span v-else-if="item.trigger.name">{{item.trigger.name}}</span>
				<span v-else-if="item.trigger.chatCommand">{{item.trigger.chatCommand}}</span>
				<span v-else-if="item.trigger.obsScene">{{item.trigger.obsScene}}</span>
				<span v-else-if="item.trigger.obsSource">{{item.trigger.obsSource}}</span>
				<span v-else>{{ $t(triggerTypeToInfo[item.trigger.type]!.labelKey) }}</span>
			</button>

			<div class="toggle" @click="item.trigger.enabled = !item.trigger.enabled; onChangeTrigger()">
				<ToggleButton v-model="item.trigger.enabled"
				@change="onChangeTrigger()"
				:aria-label="item.trigger.enabled? 'trigger enabled' : 'trigger disabled'"/>
			</div>

			<button class="testBt" @click="testTrigger(item)"
			:disabled="!item.canTest"
			:data-tooltip="$t('triggers.testBt')">
				<img src="@/assets/icons/test_purple.svg" :alt="$t('triggers.testBt')" :aria-label="$t('triggers.testBt')">
			</button>

			<button class="deleteBt" @click="deleteTrigger(item)"
			:data-tooltip="$t('triggers.deleteBt')">
				<img src="@/assets/icons/trash_purple.svg" :alt="$t('triggers.deleteBt')" :aria-label="$t('triggers.deleteBt')">
			</button>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleButton from '@/components/ToggleButton.vue';
import { TriggerEvents, TriggerTypes, type TriggerData, type TriggerEventTypes, type TriggerTypesValue, TriggerEventTypeCategories, type TriggerEventTypeCategoryValue } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleButton
	},
	emits:["select"],
})
export default class TriggerList extends Vue {

	@Prop({default:[]})
	public rewards!:TwitchDataTypes.Reward[];

	public triggerList:TriggerEntry[] = [];
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
		watch(()=>this.rewards, ()=>{
			this.populateTriggers();
		})
	}

	/**
	 * Populates the triggers list
	 */
	private populateTriggers():void {
		//List all available trigger types
		let events:TriggerEventTypes[] = TriggerEvents().concat();

		this.triggerTypeToInfo = {}
		events.forEach(v=> this.triggerTypeToInfo[v.value] = v);

		const counters = this.$store("counters").data;
		
		const list = this.$store("triggers").triggerList;
		const entries:TriggerEntry[] = [];
		for (const key in list) {
			const trigger = list[key];
			let icon = this.$image('icons/'+this.triggerTypeToInfo[trigger.type]!.icon+'_purple.svg');
			let label = trigger.name ?? "";
			let iconBgColor:string = "";

			//Get reward's details (title and icon)
			if(trigger.type == TriggerTypes.REWARD_REDEEM) {
				const reward = this.rewards.find(v=>v.id == trigger.rewardId);
				if(reward) {
					label = reward.title;
					if(reward.image) {
						icon = reward.image.url_2x ?? reward.image.url_1x;
						iconBgColor = reward.background_color;
					}
				}
			}else
			
			//Get counter's title
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
			
			const canTest = this.triggerTypeToInfo[trigger.type]!.testMessageType != undefined;
			const entry:TriggerEntry = { label, trigger, icon, canTest };
			if(iconBgColor) entry.iconBgColor = iconBgColor;
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

	public testTrigger(entry:TriggerEntry):void {
		// if(this.isSublist) key = key+"_"+this.subevent_conf.value as string;
		const triggerEvent = TriggerEvents().find(v=>v.value == entry.trigger.type);
		
		if(triggerEvent?.testMessageType) {
			//Special case for schedules
			if(entry.trigger.type === TriggerTypes.SCHEDULE) {
				TriggerActionHandler.instance.parseScheduleTrigger(entry.trigger, true);
			}else

			//If it's a notice type
			if(triggerEvent.testMessageType == TwitchatDataTypes.TwitchatMessageType.NOTICE) {
				this.$store("debug").simulateNotice(triggerEvent.testNoticeType, (data)=> {
					const m = data as TwitchatDataTypes.MessageNoticeData;
					switch(m.noticeId) {
						case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:{
							(m as TwitchatDataTypes.MessageEmergencyModeInfo).enabled = (triggerEvent.value == TriggerTypes.EMERGENCY_MODE_START);
						}
						case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE:{
							(m as TwitchatDataTypes.MessageShieldMode).enabled = (triggerEvent.value == TriggerTypes.SHIELD_MODE_ON);
						}
					}
					TriggerActionHandler.instance.execute(data, true);
				}, false);
				
			//If it's any other message type
			}else{
				this.$store("debug").simulateMessage(triggerEvent.testMessageType, (data)=> {
					let m = data
					if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						switch(triggerEvent.value) {
							case TriggerTypes.CHAT_COMMAND:{
								//Add the command to the fake text message
								m.message = entry.trigger.chatCommand + " " + m.message;
								m.message_html = entry.trigger.chatCommand + " " + m.message_html;
								break;
							}
							case TriggerTypes.FIRST_ALL_TIME:{
								m.twitch_isFirstMessage = true;
								break;
							}
							case TriggerTypes.FIRST_TODAY:{
								m.todayFirst = true;
								break;
							}
							case TriggerTypes.RETURNING_USER:{
								m.twitch_isReturning = true;
								break;
							}
							case TriggerTypes.PRESENTATION:{
								m.twitch_isPresentation = true;
								break;
							}
						} 
					}
					if(triggerEvent.value == TriggerTypes.TIMER_STOP) {
						//Set the timer as stopped
						(m as TwitchatDataTypes.MessageTimerData).started = false;
					}else

					if(triggerEvent.value == TriggerTypes.SUBGIFT) {
						const sub = (m as TwitchatDataTypes.MessageSubscriptionData);
						sub.is_gift = true;
						const recipients = [];
						do {
							recipients.push(Utils.pickRand(this.$store("users").users));
						}while(Math.random()>.25);
						sub.gift_recipients = recipients;
						sub.gift_count = recipients.length;
					}else

					if(triggerEvent.value == TriggerTypes.COUNTDOWN_START) {
						//Remove end date so it counts as a countdown start not an end
						const cd = (m as TwitchatDataTypes.MessageCountdownData).countdown;
						delete cd.endAt;
						delete cd.endAt_ms;
					}else

					if(triggerEvent.value == TriggerTypes.TIMEOUT) {
						//set timeout duration
						(m as TwitchatDataTypes.MessageBanData).duration_s = Math.round(Math.random()*666);
					}else

					if(triggerEvent.value == TriggerTypes.BAN) {
						//Remove ban duration so it counts as a ban, not a timeout
						delete (m as TwitchatDataTypes.MessageBanData).duration_s;
					}else

					if(triggerEvent.value == TriggerTypes.SHOUTOUT_IN || triggerEvent.value == TriggerTypes.SHOUTOUT_OUT) {
						//Force proper "received" state
						(m as TwitchatDataTypes.MessageShoutoutData).received = (triggerEvent.value == TriggerTypes.SHOUTOUT_IN);
					}

					TriggerActionHandler.instance.execute(m, true);
				}, false);
			}
		}
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
		transition: color .25s, background-color .25s;
		overflow: hidden;
		&>* {
			&:hover {
				background-color: @mainColor_normal_extralight;
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
			transition: background-color .15s;
			flex-grow: 1;
			overflow: hidden;
			img {
				height: 1.5em;
				width: 1.5em;
				padding: .25em;
				object-fit: contain;
			}
		}
		.toggle {
			display: flex;
			align-items: center;
			padding: 0 .5em;
			cursor: pointer;
			// border-left: 1px solid @mainColor_normal;
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