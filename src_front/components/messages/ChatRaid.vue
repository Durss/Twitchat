<template>
	<div class="chatraid">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img src="@/assets/icons/raid.svg" alt="raid" class="icon">

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" keypath="chat.raid.text">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
				</template>
				<template #COUNT>
					<strong>{{ messageData.viewers }}</strong>
				</template>
			</i18n-t>

			<div v-if="error" class="error">{{ $t("error.stream_info_loading") }}</div>

			<div v-if="!error" class="streamInfo">
				<div class="infos">
					<i18n-t scope="global" :keypath="isLive? 'chat.raid.current_stream' : 'chat.raid.previous_stream'" tag="p" :plural="messageData.viewers">
						<template #CATEGORY>
							<strong>{{streamCategory}}</strong>
						</template>
					</i18n-t>
					<p class="title">{{streamTitle}}</p>
					<div class="duration" v-if="streamDuration">{{$t("chat.raid.duration", {DURATION:streamDuration})}}</div>
				</div>

				<Button @click.stop="shoutout()"
					white
					:title="$t('chat.soBt')"
					:icon="$image('icons/shoutout_purple.svg')"
					:loading="shoutoutLoading"
					class="soButton"
				/>
			</div>
		</div>

	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{
		Button,
	},
	emits:["onRead"],
})
export default class ChatRaid extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageRaidData;

	public error = false;
	public isLive = false;
	public loading = true;
	public shoutoutLoading = false;
	public streamTitle:string = "";
	public streamCategory:string = "";
	public streamDuration:string = "";

	public beforeMount():void {
		this.loadLastStreamInfos();
	}

	private async loadLastStreamInfos():Promise<void> {
		this.error = false;
		this.loading = true;
		this.isLive = false;
		try {
			//Check current live info
			const [currentStream] = await TwitchUtils.loadCurrentStreamInfo([this.messageData.user.id]);
			if(currentStream) {
				this.isLive = true;
				this.streamTitle = currentStream.title;
				this.streamCategory = currentStream.game_name;
				this.streamDuration = Utils.formatDuration(Date.now() - new Date(currentStream.started_at).getTime());
			}else{
				//No current live found, load channel info
				const [chanInfo] = await TwitchUtils.loadChannelInfo([this.messageData.user.id]);
				if(chanInfo) {
					this.streamTitle = chanInfo.title;
					this.streamCategory = chanInfo.game_name;
					this.streamDuration = "";
				}
			}
		}catch(error) {
			console.log(error);
			this.error = true;
		}
		this.loading = false;
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user, this.messageData.channel_id);
	}

	public async shoutout():Promise<void> {
		this.shoutoutLoading = true;
		try {
			await this.$store("users").shoutout(this.$store("auth").twitch.user.id, this.messageData.user);
		}catch(error) {
			this.$store("main").alert(this.$t("error.shoutout"));
			console.log(error);
		}
		this.shoutoutLoading = false;
	}
}
</script>

<style scoped lang="less">
.chatraid{
	.chatMessageHighlight();

	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;
		gap: .25em;
	}

	.streamInfo {
		color: @mainColor_light;
		background-color: rgba(255, 255, 255, .15);
		border-radius: .5em;
		overflow: hidden;
		width: 100%;
		padding: .5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		.infos {
			flex-grow: 1;
			.game {
				font-style: italic;
			}
			.duration {
				font-size: .9em;
				opacity: .8;
			}
		}
		.soButton {
			align-self: center;
		}
	}
	.error {
		color: @mainColor_alert_light;
		background-color: @mainColor_dark;
		border-radius: .5em;
		padding:.25em .5em;
	}
}
</style>