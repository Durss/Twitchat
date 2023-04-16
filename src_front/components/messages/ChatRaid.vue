<template>
	<div class="chatraid">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img src="@/assets/icons/raid.svg" alt="raid" class="icon">

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" keypath="chat.raid.text" :plural="messageData.viewers">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
				</template>
				<template #COUNT>
					<strong>{{ messageData.viewers }}</strong>
				</template>
			</i18n-t>


			<div class="streamInfo">
				<div class="infos">
					<i18n-t scope="global" :keypath="messageData.stream.wasLive? 'chat.raid.current_stream' : 'chat.raid.previous_stream'" tag="p">
						<template #CATEGORY>
							<strong>{{messageData.stream.category}}</strong>
						</template>
					</i18n-t>
					<p class="title">{{messageData.stream.title}}</p>
					<div class="duration" v-if="messageData.stream.wasLive">{{$t("chat.raid.duration", {DURATION:formatedDuration})}}</div>
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
import Utils from '@/utils/Utils';
import { Component, Prop } from 'vue-facing-decorator';
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

	public shoutoutLoading = false;
	public formatedDuration = "";

	public beforeMount():void {
		this.formatedDuration = Utils.formatDuration(this.messageData.stream.duration);
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
		color: var(--mainColor_light);
		// background-color: rgba(255, 255, 255, .15);
		border-radius: .5em;
		overflow: hidden;
		width: 100%;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		.infos {
			flex-grow: 1;
			flex-basis: 200px;
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
		color: var(--mainColor_alert_light);
		background-color: var(--mainColor_dark);
		border-radius: .5em;
		padding:.25em .5em;
	}
}
</style>