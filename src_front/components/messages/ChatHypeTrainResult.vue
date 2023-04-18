<template>
	<div class="chathypetrainresult">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/train.svg" alt="icon" class="icon">
		<div class="infoHolder">
			<i18n-t scope="global" tag="strong" keypath="chat.hype_train.summary_title">
				<template #LEVEL><mark>{{$t("chat.hype_train.summary_level")}} {{messageData.train.level}}</mark></template>
				<template #PERCENT><mark>{{reachPercent}}%</mark></template>
			</i18n-t>
			
			<div class="details">
				<div class="row" v-if="bits > 0" v-tooltip="$t('global.tooltips.bits')">
					<img src="@/assets/icons/bits.svg" class="icon">
					<span class="label">{{bits}}</span>
				</div>
				<div class="row t1" v-if="subs1 > 0" v-tooltip="$t('global.tooltips.subs1')">
					<img src="@/assets/icons/sub.svg" class="icon">
					<!-- <span class="tier">T1</span> -->
					<span class="label">x{{subs1}}</span>
				</div>
				<div class="row t2" v-if="subs2 > 0" v-tooltip="$t('global.tooltips.subs2')">
					<img src="@/assets/icons/sub.svg" class="icon">
					<!-- <span class="tier">T2</span> -->
					<span class="label">x{{subs2}}</span>
				</div>
				<div class="row t3" v-if="subs3 > 0" v-tooltip="$t('global.tooltips.subs3')">
					<img src="@/assets/icons/sub.svg" class="icon">
					<!-- <span class="tier">T3</span> -->
					<span class="label">x{{subs3}}</span>
				</div>
				<div class="row" v-if="primes > 0" v-tooltip="$t('global.tooltips.primes')">
					<img src="@/assets/icons/prime.svg" class="icon">
					<span class="label">{{primes}}</span>
				</div>
				<div class="row" v-if="subgifts > 0" v-tooltip="$t('global.tooltips.subgifts')">
					<img src="@/assets/icons/gift.svg" class="icon">
					<span class="label">{{subgifts}}</span>
				</div>
			</div>

			<div class="conductors">
				<div v-if="messageData.train.conductor_subs" class="conductor" ref="conductor_subs_holder" v-tooltip="$t('train.conductor_subs_tt')">
					<div class="head">
						<div class="icon"><img src="@/assets/icons/sub.svg"></div>
					</div>

					<img :src="messageData.train.conductor_subs.user.avatarPath" class="avatar">

					<div>
						<a class="userlink" @click.stop="openUserCard(messageData.train.conductor_subs!.user)">{{messageData.train.conductor_subs.user.displayName}}</a>
	
						<i18n-t scope="global" tag="div" class="label" keypath="train.conductor_subs" :plural="getConductorSubCount()">
							<template #COUNT>
								<span class="count">{{ getConductorSubCount() }}</span>
							</template>
						</i18n-t>
					</div>
				</div>

				<div v-if="messageData.train.conductor_bits" class="conductor" ref="conductor_bits_holder" v-tooltip="$t('train.conductor_bits_tt')">
					<div class="head">
						<div class="icon"><img src="@/assets/icons/bits.svg"></div>
					</div>

					<img :src="messageData.train.conductor_bits.user.avatarPath" class="avatar">

					<div>
						<a class="userlink" @click.stop="openUserCard(messageData.train.conductor_bits!.user)">{{messageData.train.conductor_bits.user.displayName}}</a>
						
						<i18n-t scope="global" tag="div" class="label" keypath="train.conductor_bits" :plural="getConductorBitsCount()">
							<template #COUNT>
								<span class="count">{{ getConductorBitsCount() }}</span>
							</template>
						</i18n-t>
					</div>
				</div>
			</div>
			
			<Button v-if="!filtering && messageData.activities.length > 0" :title="$t('chat.hype_train.filterBt')" icon="filters" @click="filter()" />
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import Button from '../Button.vue';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{
		Button,
	},
	emits:["setCustomActivities", "onRead"]
})

export default class ChatHypeTrainResult extends AbstractChatMessage {
	
	@Prop({
			type:Boolean,
			default:false,
		})
	public filtering!:boolean;
	@Prop
	declare messageData:TwitchatDataTypes.MessageHypeTrainSummaryData;

	public reachPercent:number = 0;
	public subs1:number = 0;
	public subs2:number = 0;
	public subs3:number = 0;
	public subgifts:number = 0;
	public primes:number = 0;
	public bits:number = 0;
	
	public getConductorSubCount():number {
		let count = 0;
		for (let i = 0; i < this.messageData.train.conductor_subs!.contributions.length; i++) {
			const c = this.messageData.train.conductor_subs!.contributions[i];
			if(c.sub_t1) count += c.sub_t1;
			if(c.sub_t2) count += c.sub_t2;
			if(c.sub_t3) count += c.sub_t3;
			if(c.subgift_t1) count += c.subgift_t1;
			if(c.subgift_t2) count += c.subgift_t2;
			if(c.subgift_t3) count += c.subgift_t3;
		}
		return count;
	}

	public getConductorBitsCount():number {
		let count = 0;
		for (let i = 0; i < this.messageData.train.conductor_bits!.contributions.length; i++) {
			const c = this.messageData.train.conductor_bits!.contributions[i];
			if(c.bits) count += c.bits;
		}
		return count;
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

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
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
			color:var(--mainColor_light);
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
				color: var(--mainColor_normal);
				background-color: var(--mainColor_light);
			}

			// &.t1 {
				// background-color: #996f21;
			// }

			&.t2 {
				background-color: #c247ff;
			}

			&.t3 {
				background-color: #fc47ff;
			}
		}
	}

	.conductors{
		margin: .5em 0;
		
		.conductor {
			display: inline-flex;
			align-items: center;
			flex-direction: row;
			gap:.25em;
			background-color: fade(@mainColor_normal, 50%);
			border-radius: var(--border_radius);
			padding: .5em;
			min-width: 6em;

			&:not(:first-child) {
				margin-left: 1em;
			}
			
			.head {
				position: absolute;
				display: flex;
				flex-direction: column;
				align-self: flex-start;
				margin-top: -1em;
				margin-left: -1em;
				.icon {
					background-color: fade(@mainColor_normal, 50%);
					padding: .25em;
					border-radius: 50%;
					img {
						width: 1em;
						height: 1em;
					}
				}
			}
			.avatar {
				width: 2em;
				height: 2em;
				border-radius: 50%;
				margin: auto;
				display: block;
				border: 1px solid var(--mainColor_normal);
			}
			.userlink {
				font-size: .9em;
			}
			.label {
				.count {
					font-weight: bold;
				}
			}
		}
	}
	
}
</style>