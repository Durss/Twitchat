<template>
	<div class="chatroomsettings"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<div class="content">
			<div>
				<img class="icon" src="@/assets/icons/alert.svg" />
				<span><strong>#{{messageData.channel_name}}</strong> room has the following restrictions:</span>
			</div>
			<div class="restriction" v-if="messageData.settings.subOnly" ref="sub">
				<span><img class="icon" src="@/assets/icons/sub.svg" />Sub only</span>
				<Button title="unset" small class="unsetBt" @click="unset('sub')" />
			</div>
			<div class="restriction" v-if="messageData.settings.emotesOnly" ref="emote">
				<span><img class="icon" src="@/assets/icons/emote.svg" />Emotes only</span>
				<Button title="unset" small class="unsetBt" @click="unset('emote')" />
			</div>
			<div class="restriction" v-if="messageData.settings.followOnly" ref="follow">
				<span><img class="icon" src="@/assets/icons/follow.svg" />Followers only</span>
				<Button title="unset" small class="unsetBt" @click="unset('follow')" />
			</div>
			<div class="restriction" v-if="messageData.settings.slowMode" ref="slow">
				<span><img class="icon" src="@/assets/icons/slow.svg" />Slow mode ({{messageData.settings.slowMode}}s)</span>
				<Button title="unset" small class="unsetBt" @click="unset('slow')" />
			</div>
			<div class="restriction" v-if="messageData.settings.chatDelay" ref="delay">
				<span><img class="icon" src="@/assets/icons/timer.svg" />Chat delay ({{messageData.settings.chatDelay}}s)</span>
				<Button title="unset" small class="unsetBt" @click="unset('delay')" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
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

	public unset(prop:"sub"|"follow"|"delay"|"slow"|"emote"):void {
		const settings:TwitchatDataTypes.IRoomSettings = {};
		switch(prop) {
			case "sub":		settings.subOnly = false; break;
			case "follow":	settings.followOnly = false; break;
			case "delay":	settings.chatDelay = 0; break;
			case "slow":	settings.slowMode = 0; break;
			case "emote":	settings.emotesOnly = false; break;
		}
		TwitchUtils.setRoomSettings(this.messageData.channel_id, settings).then(res=> {
			if(res) {
				(this.$refs[prop] as HTMLDivElement).classList.add("disabled");
			}else {
				this.$store("main").alert("An error occured when updating room's settings");
			}
		});
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
			&.disabled {
				text-decoration: line-through;
				.unsetBt {
					display: none;
				}
			}

			.unsetBt {
				.clearButton();
				margin-left: 1em;
				padding: .75em;
				:deep(.label) {
					margin-left: 0;
				}
			}
		}
		.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
	}
}
</style>