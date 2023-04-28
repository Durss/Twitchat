<template>
	<div class="chatcommunitychallengecontribution chatMessage highlight">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img src="@/assets/icons/channelPoints.svg" alt="reward" class="icon">

		<div class="holder">
			<i18n-t scope="global" tag="span" keypath="chat.community_challenge" class="label">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
				</template>
				<template #TITLE>
					<strong>{{ messageData.challenge.title }}</strong>
				</template>
				<template #COUNT>
					<strong>{{ messageData.contribution }}</strong>
				</template>
				<template #TOTAL>
					<strong>{{ messageData.total_contribution }}</strong>
				</template>
			</i18n-t>
	
			<div class="numbers">
				<div class="percent">{{ percent }}%</div>
		
				<div class="progress">
					<div class="values">
						<div>{{messageData.challenge.progress}}</div>
						<div>{{messageData.challenge.goal}}</div>
					</div>
					<p>pts</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"],
})
export default class ChatCommunityChallengeContribution extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageCommunityChallengeContributionData;

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user, this.messageData.channel_id);
	}

	public get percent():number {
		return Math.floor(this.messageData.challenge.progress / this.messageData.challenge.goal * 100);
	}
}
</script>

<style scoped lang="less">
.chatcommunitychallengecontribution{
	.holder {
		display: flex;
		flex-wrap: wrap;
		gap: .5em;
		align-items: center;
		.label {
			flex-basis: 200px;
			flex-grow: 1;
		}
	}

	.icon, .chatMessageTime {
		align-self: center;
	}

	.numbers {
		gap:.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		flex-grow: 1;
		.percent {
			font-size: 2em;
			font-weight: bold;
		}
		
		.progress {
			display: flex;
			flex-direction: row;
			align-items: center;
			.values {
				text-align: right;
				margin-right: .25em;
				div:first-child {
					border-bottom: 1px solid var(--color-light);
				}
			}
		}
	}
}
</style>