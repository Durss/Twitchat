<template>
	<div class="chathypetrainresult" @click.ctrl="copyJSON()">
		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/train.svg" alt="icon" class="icon">
		<div class="infoHolder">
			<strong>Hype Train completed at <mark>level {{result.train.level}}</mark> <mark>{{reachPercent}}%</mark></strong>
			<div class="details">
				<div class="row">
					<img src="@/assets/icons/bits.svg" class="icon">
					<span class="label">{{bits}}</span>
				</div>
				<div class="row">
					<img src="@/assets/icons/sub.svg" class="icon">
					<span class="label">{{subs}}</span>
				</div>
				<div class="row">
					<img src="@/assets/icons/gift.svg" class="icon">
					<span class="label">{{subgifts}}</span>
				</div>
			</div>
			<Button v-if="!filtering" title="Filter activities" :icon="$image('icons/filters.svg')" @click="filter()" />
		</div>
	</div>
</template>

<script lang="ts">
import { getTwitchatMessageType, TwitchatMessageType, type IRCEventDataList } from '@/utils/IRCEventDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{
		result:Object,
		filtering:{
			type:Boolean,
			default:false,
		},
	},
	components:{
		Button,
	},
	emits:["setCustomActivities"]
})
export default class ChatHypeTrainResult extends Vue {

	public filtering!:boolean;
	public result!:IRCEventDataList.HypeTrainResult;

	public reachPercent:number = 0;
	public subs:number = 0;
	public subgifts:number = 0;
	public bits:number = 0;
	
	public get time():string {
		const d = new Date(parseInt(this.result.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.result));
		console.log(this.result);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	public mounted():void {
		this.reachPercent = Math.round(this.result.train.currentValue / this.result.train.goal * 100);
		for (let i = 0; i < this.result.activities.length; i++) {
			const el = this.result.activities[i];
			const type = getTwitchatMessageType(el);
			switch(type) {
				case TwitchatMessageType.SUB:
				case TwitchatMessageType.SUB_PRIME:
				case TwitchatMessageType.SUBGIFT_UPGRADE: this.subs ++; break;
				case TwitchatMessageType.SUBGIFT: {
					let count = 1;
					const subgiftAdditionalRecipents = (el as IRCEventDataList.Highlight).subgiftAdditionalRecipents
					if(subgiftAdditionalRecipents) {
						count += subgiftAdditionalRecipents.length;
					}
					this.subgifts += count;
					break;
				}
				case TwitchatMessageType.BITS: this.bits += parseInt((el as IRCEventDataList.Highlight).tags.bits as string); break;
			}
		}
	}

	public filter():void {
		this.$emit("setCustomActivities", [...this.result.activities, this.result]);
	}

}
</script>

<style scoped lang="less">
.chathypetrainresult{
	
	background-color: rgba(255, 255, 255, .15);
	border-radius: 5px;
	margin: 5px 0;
	padding: 5px !important;
	text-align: center;

	display: flex;
	flex-direction: row;
	align-items: center;
	color: #fff;

	&>.icon {
		width: 1.5em;
		height: 1.5em;
		object-fit: contain;
		margin: 0 .5em;
	}
	
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
		justify-content: space-evenly;

		.row {
			.highlight();
			padding-top: .25em;
			padding-bottom: .25em;
			
			.icon {
				height: 1em;
				margin-right: .25em;
				vertical-align: top;
			}
			.label {
				font-weight: bold;
			}
		}
	}
	
}
</style>