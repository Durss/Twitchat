<template>
	<div class="chathighlight" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img :src="icon" :alt="icon" v-if="icon" class="icon">

		<ChatMessageInfoBadges :infos="badgeInfos" />
		
		<div class="messageHolder">
			<span class="reason">
				<a class="userlink" v-if="user" @click.stop="openUserCard(user!)">{{user.displayName}}</a>

				<span class="text" v-html="reason"></span>
				
			</span>
			
			<div class="info" v-if="info" v-html="info"></div>
			
			<div class="quote" v-if="messageText" v-html="messageText"></div>

			<div class="ctas" v-if="canUnban || canBlock">
				<Button highlight v-if="canUnban"
					:loading="moderating"
					:icon="$image('icons/unban.svg')"
					:title="$t('chat.highlight.unbanBt')"
					@click.stop="unbanUser()" />

				<Button highlight v-if="canBlock"
					:loading="moderating"
					:icon="$image('icons/ban.svg')"
					:title="$t('chat.highlight.banBt')"
					@click.stop="blockUser()" />
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Component, Prop } from 'vue-facing-decorator';
import Button from '../Button.vue';
import AbstractChatMessage from './AbstractChatMessage.vue';
import ChatMessageInfoBadges from './components/ChatMessageInfoBadges.vue';

@Component({
	components:{
		Button,
		ChatMessageInfoBadges,
	},
	emits:["onRead"]
})
export default class ChatHighlight extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageChatData
	| TwitchatDataTypes.MessageAutobanJoinData
	
	public messageText = '';
	public info = "";
	public icon = "";
	public user:TwitchatDataTypes.TwitchatUser|null = null;
	public moderating = false;
	public canUnban = false;
	public canBlock = false;
	public badgeInfos:TwitchatDataTypes.MessageBadgeData[] = [];
	public additionalUsers:TwitchatDataTypes.TwitchatUser[] = [];

	public get reason():string {
		let value:number|"prime" = 0;
		this.info = "";

		let res = "";
		switch(this.messageData.type) {

			case TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN: {
				this.icon = this.$image('icons/mod.svg');
				this.user = this.messageData.user;
				res = this.$t("chat.highlight.autoban", {RULE:"<i>"+this.messageData.rule.label+"</i>"});
				this.canUnban = true;
				this.canBlock = true;
				break;
			}
		}
		return res;
	}

	public async mounted():Promise<void> {
		switch(this.messageData.type) {

			case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
				//Add twitchat's automod badge
				if(this.messageData.automod) {
					this.badgeInfos.push({type:"automod", tooltip:"<strong>Rule:</strong> "+this.messageData.automod.label});
				}
				break;
			}
		}
	}

	public beforeUpdate(): void {
		// console.log("UPDATE", this.messageData);
	}


	public copyJSON():void {
		console.log(this.messageData);
		this.messageData
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
	}

	public async unbanUser():Promise<void> {
		this.moderating = true;
		if(this.messageData.user.platform == "twitch") {
			await TwitchUtils.unbanUser(this.messageData.user, this.messageData.channel_id);
		}
		this.moderating = false;
		this.canUnban = false;
	}

	public async blockUser():Promise<void> {
		this.moderating = true;
		try {
			if(this.user) {
				await TwitchUtils.blockUser(this.user, this.messageData.channel_id);
			}
		}catch(error) {}
		this.moderating = false;
		this.canBlock = false;
	}

}
</script>

<style scoped lang="less">
.chathighlight{
	.chatMessageHighlight();

	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;

		&>*:not(:first-child) {
			margin-top: .25em;
		}

		.reason {
			color: #fff;
			:deep(.small) {
				font-size: .7em;
			}

			.additionalUsers:not(.additionalUsers ~ .additionalUsers) {
				margin-left: .6em;
			}

			.additionalUsers {
				.username {
					margin-right: 0;
				}
			}
		}
		.loader {
			height: 2em;
		}

		.ctas {
			width: 100%;
			display: flex;
			flex-direction: row;
			justify-content: center;
			align-items: center;
			.button:not(:first-child) {
				margin-left: .5em;
			}
		}
	}

	.userlink {
		margin-right: .25em;
	}
}
</style>