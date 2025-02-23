<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="raid" alt="raid" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" class="message" tag="span" keypath="chat.raid.text" :plural="showCount? messageData.viewers : 2">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
				</template>
				<template #COUNT>
					<strong @click.stop="showCount = !showCount" v-if="showCount">{{ messageData.viewers }}</strong>
					<mark class="censored" @click.stop="showCount = !showCount" v-else>???</mark>
				</template>
			</i18n-t>

			<div class="streamInfo" v-if="$store.params.appearance.showRaidStreamInfo.value == true">
				<div class="infos">
					<div class="title quote">
						<span>{{messageData.stream.title}}</span>
						<div class="details">
							<p class="category" v-if="messageData.stream.category">{{messageData.stream.category}}</p>
							<div class="duration" v-if="messageData.stream.wasLive">
								<Icon name="timer" class="icon" />{{formattedDuration}}
							</div>
						</div>
					</div>
				</div>

				<Button @click.stop="shoutout()"
					small
					icon="shoutout"
					:loading="shoutoutLoading"
					class="soButton"
					v-if="showSOButton"
					>{{ $t('chat.soBt') }}</Button>
			</div>

			<Button v-else-if="showSOButton"
				@click.stop="shoutout()"
				small
				icon="shoutout"
				:loading="shoutoutLoading"
				class="soButton"
			>{{ $t('chat.soBt') }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
//TODO make sure the "canModerate" works
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{
		Button: TTButton,
	},
	emits:["onRead"],
})
class ChatRaid extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageRaidData;

	public shoutoutLoading = false;
	public showCount = false;
	public showSOButton = false;
	public formattedDuration = "";

	public get classes():string[] {
		const res = ["chatraid","chatMessage","highlight"];
		if(this.$store.params.appearance.showRaidStreamInfo.value !== true) {
			res.push("rowMode");
		}
		return res;
	}

	public get iconColor():string{
		return this.$store.common.theme == "dark" ? "#ebeb00" : "#949400";
	}

	public beforeMount():void {
		this.showCount = this.$store.params.appearance.showRaidViewersCount.value !== false;
		this.formattedDuration = Utils.formatDuration(this.messageData.stream.duration);
		this.showSOButton = this.$store.auth.twitch.user.channelInfo[this.messageData.channel_id]?.is_moderator === true;
	}

	public async shoutout():Promise<void> {
		this.shoutoutLoading = true;
		try {
			await this.$store.users.shoutout(this.messageData.channel_id, this.messageData.user);
		}catch(error) {
			this.$store.common.alert(this.$t("error.shoutout"));
			console.log(error);
		}
		this.shoutoutLoading = false;
	}
}
export default toNative(ChatRaid);
</script>

<style scoped lang="less">
.chatraid{
	&>.icon {
		color: v-bind(iconColor);
	}
	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;
		gap: .25em;
	}

	.censored {
		cursor: pointer;
	}

	&.rowMode {
		.messageHolder {
			flex-wrap: wrap;
			flex-direction: row;
			gap: 1em;
			.message {
				flex-grow: 1;
				flex-basis: 150px;
			}

			.soButton {
				flex-shrink: 0;
			}
		}
	}
}
</style>
