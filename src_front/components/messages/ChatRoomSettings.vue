<template>
	<div class="chatroomsettings"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<div class="content">
			<div>
				<img class="icon" src="@/assets/icons/alert.svg" />
				<span><strong>#{{messageData.channel_name}}</strong> room has the following restrictions:</span>
			</div>
			<div class="restriction" v-if="messageData.settings.subOnly"><img class="icon" src="@/assets/icons/sub.svg" />Sub only</div>
			<div class="restriction" v-if="messageData.settings.emotesOnly"><img class="icon" src="@/assets/icons/emote.svg" />Emotes only</div>
			<div class="restriction" v-if="messageData.settings.followOnly"><img class="icon" src="@/assets/icons/follow.svg" />Followers only</div>
			<div class="restriction" v-if="messageData.settings.slowMode"><img class="icon" src="@/assets/icons/slow.svg" />Slow mode ({{messageData.settings.slowMode}}s)</div>
			<div class="restriction" v-if="messageData.settings.chatDelay"><img class="icon" src="@/assets/icons/timer.svg" />Chat delay ({{messageData.settings.chatDelay}}s)</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Splitter from '../Splitter.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ChatTipAndTrickAd from './ChatTipAndTrickAd.vue';

@Options({
	props:{
		messageData:Object,
	},
	components:{
		Button,
		Splitter,
		ToggleBlock,
		ChatTipAndTrickAd,
	},
	emits:["onRead"]
})
export default class ChatRoomSettings extends Vue {

	public messageData!:TwitchatDataTypes.MessageRoomSettingsData;

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public mounted():void {
		// console.log("OFKDOKFD");
		// console.log(this.messageData);
	}

}
</script>

<style scoped lang="less">
.chatroomsettings{
	.chatMessageHighlight();

	.content {
		display: flex;
		flex-direction: column;

		.restriction {
			margin-left: 1.5em;
			margin-top: .25em;
		}
		.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
	}
}
</style>