<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="music" alt="notice" class="icon"/>
		<ClearButton class="closeBt" @click.stop="deleteMessage()" small />

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" :keypath="labelKey">
				<template #USER>
					<template v-if="messageData.user">
						<a class="userlink"
							:href="'https://twitch.tv/'+messageData.user.login"
							target="_blank"
							@click.stop.prevent="openUserCard(messageData.user!, messageData.channel_id)">{{messageData.user.displayName}}</a>
					</template>
					<template v-else><strong>???</strong></template>
				</template>

				<template #PLAYLIST v-if="messageData.playlistTarget">
					<a class="userlink" v-if="messageData.playlistTarget!.url"
						:href="messageData.playlistTarget!.url"
						target="_blank">{{messageData.playlistTarget!.title}}</a>
					<strong v-else>{{messageData.playlistTarget!.title}}</strong>
				</template>
			</i18n-t>

			<div class="trackHolder" v-if="messageData.trackAdded">
				<div class="coverAndInfos">
					<img :src="messageData.trackAdded?.cover" alt="cover" class="cover">
					<div class="trackInfo">
						<strong>{{ messageData.trackAdded.title }}</strong>
						<span>{{ messageData.trackAdded.artist }}</span>
						<span class="duration"><Icon name="timer" />{{ formatDuration(messageData.trackAdded.duration) }}</span>
					</div>
				</div>
				<TTButton class="cta" small icon="newtab" type="link" :href="messageData.trackAdded.url" target="_blank" v-tooltip="$t('chat.added_to_queue.open_track')" />
				<TTButton class="cta" small icon="delete" v-if="messageData.skipped !== true && !messageData.playlistTarget" @click.stop="removeTrack()" alert v-tooltip="$t('chat.added_to_queue.skip_track')" />
				<TTButton class="cta" small icon="ban" v-if="canBanFromSR && !isBanned" @click.stop="banFromSR()" secondary v-tooltip="$t('chat.added_to_queue.ban_user')" />
				<TTButton class="cta" small icon="unban" v-if="canBanFromSR && isBanned" @click.stop="unBanFromSR()" alert v-tooltip="$t('chat.added_to_queue.unban_user')" />
			</div>

			<div class="trackHolder" v-else>{{ $t("triggers.actions.music.fail_reasons."+messageData.failCode, {DURATION:maxDuration, SEARCH:messageData.search}) }}</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import Icon from '../Icon.vue';
import AbstractChatMessage from './AbstractChatMessage';
import Utils from '@/utils/Utils';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import Database from '@/store/Database';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
	},
	emits:["onRead"]
})
class ChatTrackAddedToQueue extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageMusicAddedToQueueData;

	public classes:string[] = ["chattrackaddedtoqueue", "chatMessage", "highlight"];

	public get labelKey():string {
		if(this.messageData.playlistTarget) {
			return this.messageData.trackAdded? "chat.added_to_playlist.title" : "chat.added_to_playlist.title_fail";
		}else{
			return this.messageData.trackAdded? "chat.added_to_queue.title" : "chat.added_to_queue.title_fail";
		}
	}

	public get maxDuration():string {
		return Utils.formatDuration((this.messageData.maxDuration || 0) * 1000)+"s";
	}

	public get canBanFromSR():boolean {
		if(!this.messageData.user) return false;
		if(!this.messageData.triggerIdSource) return false;
		const trigger = this.$store.triggers.triggerList.find(v=>v.id === this.messageData.triggerIdSource);
		if(!trigger) return false;
		return trigger.permissions != undefined;
	}

	public get isBanned():boolean {
		if(!this.messageData.user) return false;
		if(!this.messageData.triggerIdSource) return false;
		const trigger = this.$store.triggers.triggerList.find(v=>v.id === this.messageData.triggerIdSource);
		if(!trigger || !trigger.permissions) return false;
		return (trigger.permissions.usersRefused || []).findIndex(v=>v.toLowerCase() === this.messageData.user!.login.toLowerCase()) > -1;
	}

	public beforeMount(): void {
		if(this.messageData.failCode) {
			this.classes.push("error");
		}
	}

	public formatDuration(duration:number):string {
		return Utils.formatDuration(duration, true);
	}

	public banFromSR():void {
		if(!this.messageData.user) return;
		const trigger = this.$store.triggers.triggerList.find(v=>v.id === this.messageData.triggerIdSource);
		if(!trigger) return;

		if(!trigger.permissions) {
			trigger.permissions = Utils.getDefaultPermissions()
		}

		trigger.permissions.usersRefused.push(this.messageData.user.login);
	}

	public unBanFromSR():void {
		if(!this.messageData.user) return;
		const trigger = this.$store.triggers.triggerList.find(v=>v.id === this.messageData.triggerIdSource);
		if(!trigger || !trigger.permissions) return;

		const list = (trigger.permissions.usersRefused || []);
		for (let i = 0; i < list.length; i++) {
			const u = list[i]!;
			if(u.toLowerCase() == this.messageData.user.login.toLowerCase()) {
				list.splice(i, 1);
				i--;
			}
		}
	}

	public removeTrack():void {
		if(!this.messageData.user || !this.messageData.trackAdded) return;
		//Tell Spotify to skip the track next time it starts playing
		SpotifyHelper.instance.skipQueuedTrack(this.messageData.user, this.messageData.trackAdded.id);
		this.messageData.skipped = true;
		Database.instance.updateMessage(this.messageData);
	}

}
export default toNative(ChatTrackAddedToQueue);
</script>

<style scoped lang="less">
.chattrackaddedtoqueue{
	display: flex;
	flex-direction: row;
	padding-right: 2em;
	.closeBt {
		z-index: 0;
	}

	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;
		gap: .25em;
	}

	.trackHolder {
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
		width: 100%;
		.coverAndInfos {
			flex-grow: 1;
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			flex-basis: 200px;
			flex-grow: 1;
			.trackInfo {
				display: flex;
				flex-direction: column;
			}
			.cover {
				height: 3em;
			}
			.duration {
				font-size: .8em;
				font-style: italic;
				.icon {
					height: 1em;
					margin-right: .25em;
				}
			}
		}

		.cta {
			width: 1.75em;
			height: 1.75em;
		}
	}
}
</style>
