<template>
	<div class="chathateraid chatMessage highlight alert">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="raid" alt="raid" class="icon" />

		<div class="content">
			<Icon name="block" alt="block" class="icon" />
			<span>{{ $t("chat.hate_raid.title") }}</span>
	
			<Icon class="loader" name="loader" v-if="messageData.terms.length === 0"/>

			<template v-else>
				<ul class="terms">
					<li v-for="term in messageData.terms" :key="term.id" :class="term.unblocked? 'strike' : ''">{{ term.text }}</li>
				</ul>
				
				<div class="usersTitle">{{ $t("chat.hate_raid.users") }}</div>
	
				<ul class="users">
					<li v-for="user in messageData.haters"
					:key="user.id"
					:class="user.channelInfo[messageData.channel_id]?.is_banned? 'strike' : ''">
						<Icon name="ban" v-if="user.channelInfo[messageData.channel_id]?.is_banned" />
						<span>{{ user.displayName }}</span>
					</li>
				</ul>
			</template>

			<a class="footer" href="https://dashboard.twitch.tv/settings/moderation/blocked-terms" target="_blank">{{ $t("chat.hate_raid.footer") }} <Icon name="newtab" /></a>
		</div>
		<div class="ctas" v-if="canUnblockTerms || canBanUsers">
			<TTButton v-if="canUnblockTerms" icon="unblock" @click.stop="unblockTerms()" :loading="unblocking" light alert small>{{ $t("chat.hate_raid.cancel_bt") }}</TTButton>
			<TTButton v-if="canBanUsers" icon="ban" @click.stop="banHaters()" :loading="banning" light alert small>{{ $t("chat.hate_raid.banUsers_bt") }}</TTButton>
		</div>

		
		<ClearButton class="closeBt" @click.stop="deleteMessage()" small />
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';
import AbstractChatMessage from './AbstractChatMessage';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Database from '@/store/Database';
import Utils from '@/utils/Utils';
import ClearButton from '../ClearButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
	},
	emits:["onRead"],
})
class ChatHateRaid extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageHateRaidData;

	public banning:boolean = false;
	public unblocking:boolean = false;

	public get canBanUsers():boolean {
		return this.messageData.haters.filter(v=>!v.channelInfo[this.messageData.channel_id]?.is_banned).length > 0;
	}

	public get canUnblockTerms():boolean {
		return this.messageData.terms.filter(v=>v.unblocked !== true).length > 0;
	}

	public async unblockTerms():Promise<void> {
		this.unblocking = true;
		for (const term of this.messageData.terms) {
			const res = await TwitchUtils.removeBanword(term.id);
			if(res) term.unblocked = true;
		}
		Database.instance.updateMessage(this.messageData);
		this.unblocking = false;
	}

	public async banHaters():Promise<void> {
		this.banning = true;
		for (const user of this.messageData.haters) {
			if(user.channelInfo[this.messageData.channel_id]!.is_banned) continue;
			await Utils.promisedTimeout(100);
			await TwitchUtils.banUser(user, this.messageData.channel_id, undefined, "You have been banned because you took part  what appears to be a hate raid");
		}
		Database.instance.updateMessage(this.messageData);
		this.banning = false;
	}

}
export default toNative(ChatHateRaid);
</script>

<style scoped lang="less">
.chathateraid{
	flex-wrap: wrap;
	row-gap: 1em;

	ul {
		list-style-position: inside;
		.strike {
			text-decoration: line-through;
		}
		.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
	}

	.usersTitle {
		margin-top: .5em;
	}

	.content {
		flex-grow: 1;
		flex-basis: 250px;
		white-space: pre-line;
		&>.icon {
			height: 1.25em;
			margin-right: .5em;
			vertical-align: text-bottom;
		}
	}
	.ctas {
		gap: 2px;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: auto;
	}
	.loader {
		height: 1.5em;
		margin-left: .5em;
		vertical-align: middle;
	}
	.footer {
		display: block;
		flex-grow: 1;
		color: var(--color-light);
		font-style: italic;
		margin-top: .5em;
		.icon {
			height: 1em;
			vertical-align: middle;
		}
	}
}
</style>