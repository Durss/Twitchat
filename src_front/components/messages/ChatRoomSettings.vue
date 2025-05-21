<template>
	<div class="chatroomsettings chatMessage highlight primary">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		<Icon class="icon lock" name="lock" />
		<div class="content">
			<div>
				<i18n-t scope="global" tag="span" keypath="chat.room_settings.title">
					<template #ROOM><strong>#{{messageData.channel_name}}</strong></template>
				</i18n-t>
			</div>
			<div class="restriction" v-if="messageData.settings.subOnly" ref="sub">
				<span><Icon class="icon" name="sub" />{{$t("chat.room_settings.sub_only")}}</span>
				<TTButton v-if="isMod" class="unsetBt" @click="unset('sub')" small light>{{$t("chat.room_settings.unsetBt")}}</TTButton>
			</div>
			<div class="restriction" v-if="messageData.settings.emotesOnly" ref="emote">
				<span><Icon class="icon" name="emote" />{{$t("chat.room_settings.emote_only")}}</span>
				<TTButton v-if="isMod" class="unsetBt" @click="unset('emote')" small light>{{$t("chat.room_settings.unsetBt")}}</TTButton>
			</div>
			<div class="restriction" v-if="typeof messageData.settings.followOnly == 'number'" ref="follow">
				<span><Icon class="icon" name="follow" />{{$t("chat.room_settings.follow_only")}}</span>
				<TTButton v-if="isMod" class="unsetBt" @click="unset('follow')" small light>{{$t("chat.room_settings.unsetBt")}}</TTButton>
			</div>
			<div class="restriction" v-if="messageData.settings.slowMode" ref="slow">
				<span><Icon class="icon" name="slow" />{{$t("chat.room_settings.slow_mode")}} ({{messageData.settings.slowMode}}s)</span>
				<TTButton v-if="isMod" class="unsetBt" @click="unset('slow')" small light>{{$t("chat.room_settings.unsetBt")}}</TTButton>
			</div>
			<div class="restriction" v-if="messageData.settings.chatDelay" ref="delay">
				<span><Icon class="icon" name="timer" />{{$t("chat.room_settings.chat_delay")}} ({{messageData.settings.chatDelay}}s)</span>
				<TTButton v-if="isMod" class="unsetBt" @click="unset('delay')" small light>{{$t("chat.room_settings.unsetBt")}}</TTButton>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import Splitter from '../Splitter.vue';
import ToggleBlock from '../ToggleBlock.vue';
import AbstractChatMessage from './AbstractChatMessage';
import ChatTipAndTrickAd from './ChatTipAndTrickAd.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
		Splitter,
		ToggleBlock,
		ChatTipAndTrickAd,
	},
	emits:["onRead"]
})
class ChatRoomSettings extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageRoomSettingsData;

	public isMod:boolean = false

	public beforeMount(): void {
		const authUser = this.$store.auth[this.messageData.platform].user;
		const user = this.$store.users.getUserFrom(this.messageData.platform, this.messageData.channel_id, authUser.id, authUser.login, authUser.displayName, undefined, undefined, undefined, undefined, false);
		this.isMod = user.channelInfo[this.messageData.channel_id].is_moderator && TwitchUtils.hasScopes([TwitchScopes.SET_ROOM_SETTINGS]);
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
				this.$store.common.alert(this.$t("error.room_settings_update"));
			}
		});
	}

}
export default toNative(ChatRoomSettings);
</script>

<style scoped lang="less">
.chatroomsettings{
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
				background-color: rgba(255, 255, 255, .1);
				margin-left: 1em;
				// padding: .75em;
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