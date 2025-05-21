<template>
	<div class="chathypetrainresult chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		<Icon name="train" alt="icon" class="icon"/>
		<div class="infoHolder">
			<i18n-t scope="global" tag="strong" keypath="chat.hype_train.summary_title">
				<template #LEVEL><mark>{{$t("chat.hype_train.summary_level")}} {{messageData.train.level}}</mark></template>
				<template #PERCENT><mark>{{reachPercent}}%</mark></template>
			</i18n-t>

			<div class="details">
				<div class="row" v-if="bits > 0" v-tooltip="$t('global.tooltips.bits')">
					<Icon name="bits" class="icon" key="bits" />
					<span class="label">{{bits}}</span>
				</div>

				<div class="row subs" v-if="subs1 > 0 || subs2 > 0 || subs3 > 0 || primes > 0" key="subs">
					<div class="sum">
						<Icon name="sub" class="icon" />
						<span class="label">{{subs1 + subs2 + subs3 + primes}}</span>
					</div>
					<div class="info prime" v-if="primes > 0" v-tooltip="$t('global.tooltips.primes')">
						<Icon name="prime" class="icon" />
						<span class="label">{{primes}}</span>
					</div>
					<div class="info t1" v-if="subs1 > 0"  v-tooltip="$t('global.tooltips.subs1')">
						<span class="tier">T1</span>
						<span class="label">{{subs1}}</span>
					</div>
					<div class="info t2" v-if="subs2 > 0"  v-tooltip="$t('global.tooltips.subs2')">
						<span class="tier">T2</span>
						<span class="label">{{subs2}}</span>
					</div>
					<div class="info t3" v-if="subs3 > 0"  v-tooltip="$t('global.tooltips.subs3')">
						<span class="tier">T3</span>
						<span class="label">{{subs3}}</span>
					</div>
				</div>

				<div class="row" v-if="subgifts > 0" v-tooltip="$t('global.tooltips.subgifts')" key="subgifts">
					<Icon name="gift" class="icon" />
					<span class="label">{{subgifts}}</span>
				</div>

			</div>

			<div class="conductors">
				<div v-if="messageData.train.conductor_subs" class="conductor" ref="conductor_subs_holder" v-tooltip="$t('train.conductor_subs_tt')">
					<Icon name="sub" />

					<img :src="messageData.train.conductor_subs.user.avatarPath" class="avatar">

					<div>
						<a class="userlink"
						:href="'https://twitch.tv/'+messageData.train.conductor_subs.user.login"
						target="_blank"
						@click.stop.prevent="openUserCard(messageData.train.conductor_subs!.user, messageData.channel_id)">{{messageData.train.conductor_subs.user.displayName}}</a>

						<i18n-t scope="global" tag="div" class="label" keypath="train.conductor_subs" :plural="getConductorSubCount()">
							<template #COUNT>
								<span class="count">{{ getConductorSubCount() }}</span>
							</template>
						</i18n-t>
					</div>
				</div>

				<div v-if="messageData.train.conductor_bits" class="conductor" ref="conductor_bits_holder" v-tooltip="$t('train.conductor_bits_tt')">
					<Icon name="bits" />

					<img :src="messageData.train.conductor_bits.user.avatarPath" class="avatar">

					<div>
						<a class="userlink"
						:href="'https://twitch.tv/'+messageData.train.conductor_bits.user.login"
						target="_blank"
						@click.stop.prevent="openUserCard(messageData.train.conductor_bits.user, messageData.channel_id)">{{messageData.train.conductor_bits.user.displayName}}</a>

						<i18n-t scope="global" tag="div" class="label" keypath="train.conductor_bits" :plural="messageData.train.conductor_bits.amount">
							<template #COUNT>
								<span class="count">{{ messageData.train.conductor_bits.amount }}</span>
							</template>
						</i18n-t>
					</div>
				</div>
			</div>

			<Button v-if="!filtering && messageData.activities.length > 0" small icon="filters" @click.stop="filter()">{{ $t('chat.hype_train.filterBt') }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{
		Button: TTButton,
	},
	emits:["setCustomActivities", "onRead"]
})

class ChatHypeTrainResult extends AbstractChatMessage {

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

	public get iconColor():string{
		return this.$store.common.theme == "dark" ? "#00d6d6" : "#00a3a3";
	}

	public getConductorSubCount():number {
		let count = 0;
		for (let i = 0; i < this.messageData.activities.length; i++) {
			const element = this.messageData.activities[i];
			if(element.type === TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION
			&& element.user.id === this.messageData.train.conductor_subs!.user.id) {
				if(element.is_gift) count += element.gift_count || 1;
				else count++;
			}
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

}
export default toNative(ChatHypeTrainResult);
</script>

<style scoped lang="less">
.chathypetrainresult{
	&>.icon {
		color: v-bind(iconColor);
	}
	.highlight() {
		color: var(--color-text-light);
		background-color: var(--color-primary);
		border-radius: .5em;
		padding: 0 .5em;
	}

	mark {
		.highlight();
	}

	.infoHolder {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		mark {
			font-size: 1em;
		}
	}

	.details {
		display: flex;
		flex-direction: row;
		margin: .5em 0;
		justify-content: center;
		align-items: center;
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
				font-weight: normal;
			}

			&.subs {
				display: flex;
				flex-direction: row;
				align-items: center;
				flex-wrap: wrap;
				justify-content: center;
				gap: .5em;
				.tier {
					font-weight: bold;
					display: inline-block;
					// border-radius: .25em;
					// padding: 0 .2em;
					font-size: .9em;
					vertical-align: top;
					margin-right: .5em;
					font-weight: normal;
					// color: var(--color-dark);
					// background-color: var(--color-light);
				}
				.info {
					background-color: rgba(0, 0, 0, .3);
					padding: 0px 5px;
					border-radius: var(--border-radius);
					font-size: .8em;
					.icon {
						vertical-align: text-top;
					}
				}
			}
		}
	}

	.conductors{
		margin: .5em 0;
		flex-wrap: wrap;
		display: inline-flex;
		align-items: center;
		flex-direction: row;
		position: relative;
		justify-content: center;
		gap: 1em;

		.conductor {
			display: inline-flex;
			align-items: center;
			flex-direction: row;
			position: relative;
			gap:.25em;
			background-color: var(--background-color-fader);
			border-radius: var(--border-radius);
			padding: .5em;
			min-width: 6em;

			.icon {
				position: absolute;
				top: -.5em;
				left: -.5em;
				background-color: var(--background-color-fader);
				padding: .25em;
				border-radius: 50%;
				width: 1.5em;
				height: 1.5em;
			}
			.avatar {
				width: 2em;
				height: 2em;
				border-radius: 50%;
				margin: auto;
				display: block;
			}
			.userlink {
				font-size: .9em;
				color: var(--color-text);
			}
			.label {
				color: var(--color-text-text);
				.count {
					font-weight: bold;
				}
			}
		}
	}

}
</style>
