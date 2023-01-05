<template>
	<div class="chathypetrainresult" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/train.svg" alt="icon" class="icon">
		<div class="infoHolder">
			<i18n-t scope="global" tag="strong" keypath="chat.hype_train.summary_title">
				<template #LEVEL><mark>{{$t("chat.hype_train.summary_level")}} {{messageData.train.level}}</mark></template>
				<template #PERCENT><mark>{{reachPercent}}%</mark></template>
			</i18n-t>
			
			<div class="details">
				<div class="row" v-if="bits > 0" :data-tooltip="$t('global.tooltips.bits')">
					<img src="@/assets/icons/bits.svg" class="icon">
					<span class="label">{{bits}}</span>
				</div>
				<div class="row t1" v-if="subs1 > 0" :data-tooltip="$t('global.tooltips.subs1')">
					<img src="@/assets/icons/sub.svg" class="icon">
					<!-- <span class="tier">T1</span> -->
					<span class="label">x{{subs1}}</span>
				</div>
				<div class="row t2" v-if="subs2 > 0" :data-tooltip="$t('global.tooltips.subs2')">
					<img src="@/assets/icons/sub_purple.svg" class="icon">
					<!-- <span class="tier">T2</span> -->
					<span class="label">x{{subs2}}</span>
				</div>
				<div class="row t3" v-if="subs3 > 0" :data-tooltip="$t('global.tooltips.subs3')">
					<img src="@/assets/icons/sub_purple.svg" class="icon">
					<!-- <span class="tier">T3</span> -->
					<span class="label">x{{subs3}}</span>
				</div>
				<div class="row" v-if="primes > 0" :data-tooltip="$t('global.tooltips.primes')">
					<img src="@/assets/icons/prime.svg" class="icon">
					<span class="label">{{primes}}</span>
				</div>
				<div class="row" v-if="subgifts > 0" :data-tooltip="$t('global.tooltips.subgifts')">
					<img src="@/assets/icons/gift.svg" class="icon">
					<span class="label">{{subgifts}}</span>
				</div>
			</div>
			<Button v-if="!filtering && messageData.activities.length > 0" :title="$t('chat.hype_train.filterBt')" :icon="$image('icons/filters.svg')" @click="filter()" />
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{
		messageData:Object,
		filtering:{
			type:Boolean,
			default:false,
		},
	},
	components:{
		Button,
	},
	emits:["setCustomActivities", "onRead"]
})

export default class ChatHypeTrainResult extends Vue {

	public filtering!:boolean;
	public messageData!:TwitchatDataTypes.MessageHypeTrainSummaryData;

	public reachPercent:number = 0;
	public subs1:number = 0;
	public subs2:number = 0;
	public subs3:number = 0;
	public subgifts:number = 0;
	public primes:number = 0;
	public bits:number = 0;
	
	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	public mounted():void {
		this.reachPercent = Math.round(this.messageData.train.currentValue / this.messageData.train.goal * 100);
		for (let i = 0; i < this.messageData.activities.length; i++) {
			const el = this.messageData.activities[i];
			switch(el.type) {
				case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION:{
					if(el.tier == "prime") this.primes ++;
					else if(el.is_gift) {
						let count = el.gift_recipients!.length ?? 1;
						this.subgifts += count;
					}else {
						if(el.tier == 1) this.subs1 ++;
						if(el.tier == 2) this.subs2 ++;
						if(el.tier == 3) this.subs3 ++;
					}
					break;
				}
				case TwitchatDataTypes.TwitchatMessageType.CHEER: {
					this.bits += el.bits;
					break;
				}
			}
		}
	}

	public filter():void {
		this.$emit("setCustomActivities", [...this.messageData.activities, this.messageData]);
	}

}
</script>

<style scoped lang="less">
.chathypetrainresult{
	.chatMessageHighlight();

	.highlight() {
		background-color: fade(@mainColor_normal, 50%);
		border-radius: .5em;
		padding: 0 .5em;
	}

	mark {
		.highlight();
	}

	.infoHolder {
		flex-grow: 1;
		text-align: center;
	}

	.details {
		display: flex;
		flex-direction: row;
		margin: .5em 0;
		justify-content: center;
		flex-wrap: wrap;
		gap: .5em;

		.row {
			.highlight();
			padding-top: .25em;
			padding-bottom: .25em;
			cursor: default;
			
			.icon {
				height: 1em;
				max-width: 1em;
				margin-right: .25em;
				vertical-align: top;
			}
			.label {
				font-weight: bold;
			}
			.tier {
				font-weight: bold;
				display: inline-block;
				border-radius: .25em;
				padding: 0 .2em;
				font-size: .7em;
				vertical-align: top;
				margin-right: .5em;
				color: @mainColor_normal;
				background-color: @mainColor_light;
			}

			// &.t1 {
				// background-color: #996f21;
			// }

			&.t2 {
				background-color: #E6E8FA;
				color:@mainColor_normal;
			}

			&.t3 {
				background-color: #FFD700;
				color:@mainColor_normal;
			}
		}
	}
	
}
</style>