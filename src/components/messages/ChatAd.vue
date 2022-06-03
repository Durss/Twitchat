<template>
	<div class="chatad" @click.stop="">
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
				<ToggleBlock class="block new" title="New features" :icons="['new']">
					<ul>
						<li>
							<Button aria-label="open overlays params" small title="try it" @click.stop="openParamPage('overlays')" />
							<strong>Overlays</strong> feature.
						</li>
						<li>
							<Button aria-label="open spotify params" small title="try it" @click.stop="openParamPage('overlays')" />
							<strong>Spotify</strong> integration with dedicated overlay and possibility to control from chat commands.
						</li>
						<li>
							<Button aria-label="open wheel params" small title="try it" @click.stop="openParamPage('overlays')" />
							<strong>Wheel overlay</strong> to show an animattion when picking a <strong>raffle</strong> winner.
						</li>
						<li>
							<Button aria-label="open triggers params" small title="try it" @click.stop="openParamPage('triggers')" />
							Trigger actions can now send <strong>messages on your chat</strong>.
						</li>
						<li>
							<Button aria-label="Open translate name param" small title="try it" @click.stop="showSpecificParam('appearance.translateNames')" />
							Option to <strong>translate</strong> non-latin usernames
						</li>
						<li>
							<Button aria-label="open install params" small title="try it" @click.stop="openParamPage('account')" />
							You can kind of <strong>install</strong> twitchat on your device from the account section.<i>(possible only after interacting with the page for +30s)</i>
						</li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block other" title="Other updates" :open="false" :icons="['change']">
					<ul>
						<li>You can now <strong>duplicate</strong> a trigger action</li>
						<li>Better emotes replacement with support for <strong>wide emotes</strong> <i>(BTTV/FFZ/7TV)</i></li>
						<li>Supporting new predictions with up to 8 outcomes</li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block fix" title="Fixes" :open="false" :icons="['fix']">
					<ul>
						<li>A conflict between BTTV/FFZ/7TV and official <strong>emotes</strong> was sometimes cutting message contents</li>
						<li>Poll's votes with bits and channel points were showing wrong <strong>vote counts</strong></li>
						<li><strong>Test trigger</strong> button wasn't working for chat commands</li>
						<li>Trigger for <strong>bits event</strong> wasn't working</li>
						<li>Fixing <strong>chat scrolling</strong> on touch devices</li>
					</ul>
				</ToggleBlock>
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
import ToggleBlock from '../ToggleBlock.vue';

@Options({
	props:{
		messageData:Object,
	},
	components:{
		Button,
		ToggleBlock,
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

	div>.title {
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

		.block {
			&.new {
				:deep(.header){
					color: @mainColor_light;
					background-color: @mainColor_warn;
					border-bottom-color: darken(@mainColor_warn, 10%);
					&:hover {
						background-color: lighten(@mainColor_warn, 5%);
					}
				}
				:deep(.content){
					color: @mainColor_warn;
					background-color: lighten(@mainColor_warn_extralight, 15%);
				}
				.button {
					border-color: @mainColor_warn;
					color: @mainColor_warn !important;
					&:hover {
						background: fade(@mainColor_warn, 10%);
					}
				}
			}
			&.fix {
				:deep(.header){
					color: @mainColor_light;
					background-color: @mainColor_alert;
					border-bottom-color: darken(@mainColor_alert, 10%);
					&:hover {
						background-color: lighten(@mainColor_alert, 5%);
					}
				}
				:deep(.content){
					color: @mainColor_alert;
					background-color: lighten(@mainColor_alert_extralight, 5%);
				}
				.button {
					border-color: @mainColor_alert;
					color: @mainColor_alert !important;
					&:hover {
						background: fade(@mainColor_alert, 10%);
					}
				}
			}
			&:not(:last-of-type) {
				margin-bottom: .5em;
			}
			:deep(.header){
					color: @mainColor_light;
					background-color: @mainColor_normal;
					&:hover {
						background-color: lighten(@mainColor_normal, 5%);
					}
			}
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
					margin-right: .5em;
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