<template>
	<div class="chatad">
		<div v-if="isSponsor" class="sponsor">
			<div class="title">🍔 I like food 🍔</div>
			<div class="content">Are you enjoying <strong>Twitchat</strong> ?<br>
			It took me a lot of time and efforts to create.<br>
			Twitchat is free, but if you can afford it, any tip would really <strong>make my day brighter</strong>!</div>
			<div class="cta">
				<img @click.stop="openParamPage('sponsor')" src="@/assets/img/eating.gif" alt="nomnom" class="sponsorGif">
				<Button aria-label="Open tip options" @click.stop="openParamPage('sponsor')" title="🌞 Make my day brighter 🌞" />
			</div>
		</div>

		<div v-else-if="isUpdate" class="updates">
			<Button aria-label="Remove message" @click.stop="deleteMessage()" :icon="require('@/assets/icons/cross_white.svg')" class="closeBt" />
			<div class="title">🎉 New updates 🎉</div>
			<div class="infos">Use <mark>/updates</mark> command to open this back</div>
			<div class="content">
				<ul>
					<li><Button aria-label="Open whispers on chat param" small title="try it" @click.stop="showSpecificParam('features.showWhispersOnChat')" /> New option to show <strong>whispers</strong> on chat</li>
					<li><Button aria-label="Open 7TV param" small title="try it" @click.stop="showSpecificParam('appearance.sevenTVEmotes')" /> <strong>7TV</strong> emotes supported</li>
					<li>Raffle and bingo can now post a message on chat when they start</li>
					<li><Button aria-label="Open vertical split param" small title="try it" @click.stop="showSpecificParam('appearance.splitViewVertical')" /> New option to <strong>split</strong> the view <strong>vertically</strong></li>
					<li><Button aria-label="Open notif filter param" small title="try it" @click.stop="showSpecificParam('filters.showNotifications')" /> New option to remove all notifcations from chat <i>(sub,follow, raid, poll,...)</i></li>
					<li>Slightly enhancing <strong>accessibility</strong> for people with visual impairment</li>
					<li><strong>Fixed</strong> : Cutomod message wouldn't disappear properly if chat was paused</li>
					<li><strong>Fixed</strong> : Channel points OBS trigger wasn't working</li>
					<li><strong>Woops</strong> : While refactoring the way the custom shoutout message was stored I have made a mistake that probably lost the message you configured, sorry about that 🥺</li>
				</ul>
			</div>
			<div class="cta">
				<Button aria-label="Close updates" @click.stop="deleteMessage()" title="OK got it" />
			</div>
		</div>

		<div v-if="isTip" class="tip">
			<Button aria-label="Close tips &amp; tricks message" @click.stop="deleteMessage()" :icon="require('@/assets/icons/cross_white.svg')" class="closeBt" />
			<div class="title">💡 Tips &amp; tricks 💡</div>
			<ChatTipAndTrickAd class="content"
				@showModal="(v:string)=> $emit('showModal', v)"
				@openParam="(v:string)=> openParamPage(v)"
				@openParamItem="(v:string)=> showSpecificParam(v)"
			/>
		</div>

		<div v-if="isDiscord" class="discord">
			<Button aria-label="Close discord message" @click.stop="deleteMessage()" :icon="require('@/assets/icons/cross_white.svg')" class="closeBt" />
			<div class="title">Join us on Discord</div>
			<div class="content">
				<img src="@/assets/icons/discord_purple.svg" alt="discord" class="icon">
				<div>You have a feature suggestion or an issue to report?<br>join us on discord!</div>
			</div>
			<div class="cta">
				<Button :icon="require('@/assets/icons/discord.svg')"
					title="Join Discord"
					:href="discordURL"
					target="_blank"
					type="link"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import store, { TwitchatAdTypes } from '@/store';
import Store from '@/store/Store';
import Config from '@/utils/Config';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { Options, Vue } from 'vue-class-component';
import ChatTipAndTrickAd from './ChatTipAndTrickAd.vue';

@Options({
	props:{
		messageData:Object,
	},
	components:{
		Button,
		ChatTipAndTrickAd,
	},
	emits:["showModal", "delete", "close", "ariaMessage"]
})
export default class ChatAd extends Vue {

	public messageData!:IRCEventDataList.TwitchatAd;

	public get isSponsor():boolean { return this.messageData.contentID == TwitchatAdTypes.SPONSOR; }
	public get isUpdate():boolean { return this.messageData.contentID == TwitchatAdTypes.UPDATES; }
	public get isTip():boolean { return this.messageData.contentID == TwitchatAdTypes.TIP; }
	public get isDiscord():boolean { return this.messageData.contentID == TwitchatAdTypes.DISCORD; }
	
	public get discordURL():string { return Config.DISCORD_URL; }

	public mounted():void {
		
	}

	public openParamPage(page:string):void {
		console.log("OPEN PARAM", page);
		store.state.tempStoreValue = "CONTENT:"+page;
		store.dispatch("showParams", true);
	}

	public showSpecificParam(id:string):void {
		store.state.tempStoreValue = "SEARCH:"+id;
		store.dispatch("showParams", true);
	}

	public deleteMessage():void {
		if(this.isUpdate) {
			Store.set("updateIndex", store.state.latestUpdateIndex);
		}
		store.dispatch("delChatMessage", {messageId:this.messageData.tags.id});
		this.$emit("delete");
	}

}
</script>

<style scoped lang="less">
.chatad{
	background-color: @mainColor_light;
	border-radius: 1em;
	overflow: hidden;
	margin: .5em 0;
	position: relative;

	&>* {
		color: @mainColor_normal;
	}

	.closeBt {
		position: absolute;
		top:0;
		right:0;
		height: 3em;
	}

	.title {
		text-align: center;
		background: @mainColor_normal;
		color: @mainColor_light;
		font-weight: bold;
		padding: .5em;
		font-size: 1.5em;
	}

	.infos {
		font-style: italic;
		text-align: center;
		padding: .5em;
		color: @mainColor_dark_extralight;
		mark {
			border: 1px dashed @mainColor_dark_extralight;
			border-radius: .5em;
			padding: 0 .25em;
		}
	}

	.content {
		padding: .5em;
		text-align: center;

		.icon {
			height: 4em;
			width: 4em;
		}

		ul {
			text-align: left;
			margin-left: 2em;
			li {
				&:not(:last-child) {
					margin-bottom:.5em;
				}
				.button {
					background: transparent;
					border: 1px solid @mainColor_normal;
					padding: .16em .3em;
					color: @mainColor_normal !important;
					&:hover {
						background: fade(@mainColor_normal, 10%);
					}
				}
			}
		}
	}

	.cta {
		padding: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;

		.sponsorGif {
			width: 8em;
			cursor: pointer;
		}
	}

}
</style>