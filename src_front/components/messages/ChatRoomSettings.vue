<template>
	<div class="chatroomsettings"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img class="icon lock" src="@/assets/icons/lock.svg" />
		<div class="content">
			<div>
				<span><strong>#{{messageData.channel_name}}</strong> room has the following restrictions:</span>
			</div>
			<div class="restriction" v-if="messageData.settings.subOnly" ref="sub">
				<span><img class="icon" src="@/assets/icons/sub.svg" />Sub only</span>
				<Button v-if="isMod" title="unset" small class="unsetBt" @click="unset('sub')" />
			</div>
			<div class="restriction" v-if="messageData.settings.emotesOnly" ref="emote">
				<span><img class="icon" src="@/assets/icons/emote.svg" />Emotes only</span>
				<Button v-if="isMod" title="unset" small class="unsetBt" @click="unset('emote')" />
			</div>
			<div class="restriction" v-if="messageData.settings.followOnly" ref="follow">
				<span><img class="icon" src="@/assets/icons/follow.svg" />Followers only</span>
				<Button v-if="isMod" title="unset" small class="unsetBt" @click="unset('follow')" />
			</div>
			<div class="restriction" v-if="messageData.settings.slowMode" ref="slow">
				<span><img class="icon" src="@/assets/icons/slow.svg" />Slow mode ({{messageData.settings.slowMode}}s)</span>
				<Button v-if="isMod" title="unset" small class="unsetBt" @click="unset('slow')" />
			</div>
			<div class="restriction" v-if="messageData.settings.chatDelay" ref="delay">
				<span><img class="icon" src="@/assets/icons/timer.svg" />Chat delay ({{messageData.settings.chatDelay}}s)</span>
				<Button v-if="isMod" title="unset" small class="unsetBt" @click="unset('delay')" />
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
	public isMod:boolean = false;

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public beforeMount(): void {
		const authUser = this.$store("auth")[this.messageData.platform].user;
		//Go through getUserFrom() method so the channelInfo is properly initialised
		const user = this.$store("users").getUserFrom(this.messageData.platform, this.messageData.channel_id, authUser.id, authUser.login, authUser.displayName)
		this.isMod = user.channelInfo[this.messageData.channel_id].is_moderator;
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
	color:@mainColor_light;
	background-color: fade(@mainColor_normal, 50%);
	&:hover {
		background-color: fade(@mainColor_normal, 60%);
	}

	.content {
		display: flex;
		flex-direction: column;

		.restriction {
			margin-left: 1em;
			margin-top: .25em;
			&.disabled {
				text-decoration: line-through;
				.unsetBt {
					display: none;
				}
			}

			.unsetBt {
				.clearButton();
				background-color: rgba(255, 255, 255, .1);
				margin-left: 1em;
				padding: .75em;
			}
		}
		.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
	}
	&>.icon {
		height: 2.5em;
		width: auto;
		// align-self: flex-start;
	}
}
</style>