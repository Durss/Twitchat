<template>
	<div class="chattrackaddedtoqueue chatMessage"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<Icon name="music" alt="notice" class="icon"/>
		<CloseButton class="closeBt" @click.stop="deleteMessage()" />

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" keypath="chat.added_to_queue.title">
				<template #USER>
					<template v-if="messageData.user">
						<a class="userlink"
							:href="'https://twitch.tv/'+messageData.user.login"
							target="_blank"
							@click.stop.prevent="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
					</template>
					<template v-else><strong>???</strong></template>
				</template>
			</i18n-t>

			<div class="trackHolder">
				<img :src="messageData.trackAdded?.cover" alt="cover" class="cover">
				<div class="trackInfo">
					<strong>{{ messageData.trackAdded.title }}</strong>
					<span>{{ messageData.trackAdded.artist }}</span>
				</div>
				<Button class="cta" icon="newTab" type="link" :href="messageData.trackAdded.url" target="_blank" v-tooltip="$t('chat.added_to_queue.open_track')" />
				<Button class="cta" icon="music" v-if="canBanFromSR && !isBanned" @click.stop="banFromSR()" primary v-tooltip="$t('chat.added_to_queue.ban_user')" />
				<Button class="cta" icon="noMusic" v-if="canBanFromSR && isBanned" @click.stop="unBanFromSR()" alert v-tooltip="$t('chat.added_to_queue.unban_user')" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import Icon from '../Icon.vue';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{
		Icon,
		Button,
		CloseButton,
	},
	emits:["onRead"]
})
export default class ChatTrackAddedToQueue extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageMusicAddedToQueueData;

	public get canBanFromSR():boolean {
		if(!this.messageData.user) return false;
		if(!this.messageData.triggerIdSource) return false;
		const trigger = this.$store("triggers").triggerList.find(v=>v.id === this.messageData.triggerIdSource);
		if(!trigger) return false;
		return trigger.permissions != undefined;
	}

	public get isBanned():boolean {
		if(!this.messageData.user) return false;
		if(!this.messageData.triggerIdSource) return false;
		const trigger = this.$store("triggers").triggerList.find(v=>v.id === this.messageData.triggerIdSource);
		if(!trigger || !trigger.permissions) return false;
		return (trigger.permissions.usersRefused || []).findIndex(v=>v.toLowerCase() === this.messageData.user!.login.toLowerCase()) > -1;
	}

	public banFromSR():void {
		if(!this.messageData.user) return;
		const trigger = this.$store("triggers").triggerList.find(v=>v.id === this.messageData.triggerIdSource);
		if(!trigger) return;

		if(!trigger.permissions) {
			trigger.permissions = {
				all:true,
				vips:true,
				subs:true,
				mods:true,
				follower:true,
				broadcaster:true,
				follower_duration_ms:0,
				usersAllowed:[],
				usersRefused:[],
			}
		}

		trigger.permissions.usersRefused.push(this.messageData.user.login);
	}

	public unBanFromSR():void {
		if(!this.messageData.user) return;
		const trigger = this.$store("triggers").triggerList.find(v=>v.id === this.messageData.triggerIdSource);
		if(!trigger || !trigger.permissions) return;

		const list = (trigger.permissions.usersRefused || []);
		for (let i = 0; i < list.length; i++) {
			const u = list[i];
			if(u.toLowerCase() == this.messageData.user.login.toLowerCase()) {
				list.splice(i, 1);
				i--;
			}
		}
	}

}
</script>

<style scoped lang="less">
.chattrackaddedtoqueue{
	display: flex;
	flex-direction: row;
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
		.trackInfo {
			display: flex;
			flex-direction: column;
		}
		.cover {
			height: 3em;
		}

		.cta {
			width: 1.75em;
			height: 1.75em;
		}
	}
}
</style>