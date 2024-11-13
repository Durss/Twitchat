<template>
	<div class="chattwitchcharitydonation chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="twitch_charity" alt="twitch charity" class="icon charityIcon"/>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" keypath="chat.twitch_charity.donation">
				<template #USER>
					<strong>{{ messageData.user.displayName }}</strong>
				</template>
				<template #AMOUNT>
					<strong>{{ messageData.amountFormatted }}</strong>
				</template>
				<template #CAMPAIGN>
					<a :href="messageData.campaign.url" target="_blank"><strong>{{ messageData.campaign.title }}</strong></a>
				</template>
			</i18n-t>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:[],
})
class ChatTwitchCharityDonation extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageCharityDonationData;

	public get iconColor():string{
		return this.$store.common.theme == "dark" ? "#5cffbe" : "#00a865";
	}

}
export default toNative(ChatTwitchCharityDonation);
</script>

<style scoped lang="less">
.chattwitchcharitydonation{
	.charityIcon {
		color: v-bind(iconColor);
	}
}
</style>