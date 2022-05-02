<template>
	<div class="chatad">
		<div v-if="isSponsor" class="sponsor">
			<div class="title">🍔 I like food 🍔</div>
			<div class="content">Are you enjoying <strong>Twitchat</strong> ?<br>
			It took me a lot of time and efforts to create.<br>
			Twitchat is free, but if you can afford it, any tip would really <strong>make my day brighter</strong>!</div>
			<div class="cta">
				<img @click.stop="openParamPage('sponsor')" src="@/assets/img/eating.gif" alt="nomnom" class="sponsorGif">
				<Button @click.stop="openParamPage('sponsor')" title="🌞 Make my day brighter 🌞" />
			</div>
		</div>

		<div v-else-if="isUpdate" class="updates">
			<Button @click.stop="deleteMessage()" :icon="require('@/assets/icons/cross_white.svg')" class="closeBt" />
			<div class="title">🎉 New updates 🎉</div>
			<div class="infos">Use <mark>/updates</mark> command to open this back</div>
			<div class="content">
				<ul>
					<li><Button small title="try it" @click.stop="showSpecificParam('features.stopStreamOnRaid')" /> New option to automatically <strong>stop OBS stream</strong> after a raid completes</li>
					<li><Button small title="try it" @click.stop="showSpecificParam('features.showUserPronouns')" /> New parameter to show viewers <strong>pronouns</strong></li>
					<li><Button small title="try it" @click.stop="showSpecificParam('features.notifyJoinLeave')" /> New parameter to show when users <strong>enter/leave</strong> your chatroom</li>
					<li><Button small title="try it" @click.stop="$emit('showModal', 'chatpoll')" /> New "<strong>Chat poll</strong>" feature to create new kind of polls</li>
					<li><Button small title="try it" @click.stop="openParamPage('obs')" /> Create your own follow/sub/cheer/raid/rewards/.. alerts with the new <strong>trigger system</strong> that allows you to control and update your OBS sources adn filters</li>
					<li>Frankerfacez emotes supported</li>
				</ul>
			</div>
			<div class="cta">
				<Button @click.stop="deleteMessage()" title="OK got it" />
			</div>
		</div>

		<div v-if="isTip" class="tip">
			<Button @click.stop="deleteMessage()" :icon="require('@/assets/icons/cross_white.svg')" class="closeBt" />
			<div class="title">💡 Tips &amp; tricks 💡</div>
			<ChatTipAndTrickAd class="content"
				@showModal="v=> $emit('showModal', v)"
				@openParam="v=> openParamPage(v)"
				@openParamItem="v=> showSpecificParam(v)"
			/>
		</div>

		<div v-if="isDiscord" class="discord">
			<Button @click.stop="deleteMessage()" :icon="require('@/assets/icons/cross_white.svg')" class="closeBt" />
			<div class="title">Join us on Discord</div>
			<div class="content">
				<img src="@/assets/icons/discord_purple.svg" alt="discord" class="icon">
				<div>You have  feature suggestion or an issue to report?<br>join us on discord!</div>
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
import { ParamsContenType } from '../params/Parameters.vue';
import ChatTipAndTrickAd from './ChatTipAndTrickAd.vue';

@Options({
	props:{
		messageData:Object,
	},
	components:{
		Button,
		ChatTipAndTrickAd,
	},
	emits:["showModal", "delete", "close"]
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

	public openParamPage(page:ParamsContenType):void {
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