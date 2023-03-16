<template>
	<div class="chatcommunitychallengecontribution">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img src="@/assets/icons/channelPoints.svg" alt="reward" class="icon">

		<div class="holder">
			<i18n-t scope="global" tag="span" keypath="chat.community_challenge">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
				</template>
				<template #COUNT>
					<strong>{{ messageData.contribution }}</strong>
				</template>
				<template #TOTAL>
					<strong>{{ messageData.total_contribution }}</strong>
				</template>
			</i18n-t>
		</div>

		<div class="communityChallenge" v-if="messageData.type === 'community_challenge_contribution'">
			<div class="values">
				<div>{{messageData.challenge.progress}}</div>
				<div>{{messageData.challenge.goal}}</div>
			</div>
			<p>pts</p>
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
}
</script>

<style scoped lang="less">
.chatcommunitychallengecontribution{
	.chatMessageHighlight();
	
	.holder {
		flex-grow: 1;
	}

	.icon, .time {
		align-self: center;
	}

	.communityChallenge {
		font-size: .8em;
		color:@mainColor_light;
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-left: 1em;
		.values {
			text-align: right;
			margin-right: .25em;
			div:first-child {
				border-bottom: 1px solid @mainColor_light;
			}
		}
	}
}
</style>