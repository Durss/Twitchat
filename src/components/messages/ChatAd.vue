<template>
	<div class="chatad" @click.stop="">
		<div v-if="isSponsor" class="sponsor">
			<div class="title">🍔 I like food 🍔</div>
			<div class="content">Are you enjoying <strong>Twitchat</strong> ?<br>
			It took <strong>months</strong> of my life to create.<br>
			Twitchat is free, but <strong>if you can afford it</strong>, any tip would really make my day brighter!</div>
			<div class="cta">
				<img @click.stop="openParamPage('sponsor')" src="@/assets/img/eating.gif" alt="nomnom" class="sponsorGif">
				<Button aria-label="Open tip options" @click.stop="openParamPage('sponsor')" title="🌞 Make my day brighter 🌞" />
			</div>
		</div>

		<div v-else-if="isUpdate" class="updates">
			<Button aria-label="Remove message" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
			<div class="title">🎉 New updates 🎉</div>
			<div class="infos">Use <mark>/updates</mark> command to open this back</div>
			<div class="content">
				<ToggleBlock class="block new" title="New features" :icons="['new']">
					<ul>
						<li>
							<Button aria-label="open voice params" small title="try it" @click.stop="openParamPage('voice')" />
							<span><strong>Control Twitchat with your voice</strong>! Create polls and predictions, scroll the chat, mark messages as read and much more with your voice.</span>
						</li>
						<li>
							<span>You can now <strong>pin messages</strong> so you don't loose them. Roll over a message and click the pin icon. Open the pinned messages later with the pin icon at the bottom.</span>
						</li>
						<li>
							<span><strong>Stream Deck™ plugin</strong> can now start the emergency mode and shoutout your latest raider.</span>
						</li>
						<li>
							<Button aria-label="open overlays" small title="open" @click.stop="openParamPage('overlays')" />
							<span>Many options added to the <strong>music player</strong> overlay</span>
						</li>
						<li>
							<Button aria-label="open triggers" small title="open" @click.stop="openParamPage('triggers')" />
							<span>Allow your viewers to change your <strong>currently playing spotify playlist</strong> from chat commands or channel point rewards</span>
						</li>
						<li>
							<Button aria-label="open triggers" small title="open" @click.stop="openParamPage('triggers')" />
							<span><strong>2 new triggers</strong> added to execute actions when a <strong>music starts or stops playing</strong> <i>(ex: to automatically send current track info on chat)</i></span>
						</li>
						<li>
							<Button aria-label="open triggers" small title="open" @click.stop="openParamPage('triggers')" />
							<span><strong>4 new triggers</strong> added to execute actions when <strong>hype train</strong> approches, starts, progresses and ends</span>
						</li>
						<li>
							<span>When using the split view option you can now <strong>resize the columns</strong> as you wish</span>
						</li>
						<li>
							<Button aria-label="open followers param" small title="open" @click.stop="openSpecificParam('appearance.highlightNonFollowers')" />
							<span>Users list will now show who's not following you <i>(if you enabled the option)</i></span>
						</li>
						<li>
							<Button aria-label="open alert param" small title="donate 💝" href="https://ko-fi.com/durss" type="link" target="_blank" />
							<span>I opened a <strong>Ko-fi</strong> page for donations</span>
						</li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block other" title="Other updates" :open="false" :icons="['change']">
					<ul>
						<li>If using Twitchat on a mobile device, Twitchat will now <strong>prevent it from locking</strong> the screen in case of inactivity</li>
						<li>Music overlay will also show <strong>podcast info</strong> played from Spotify</li>
						<li>Added <strong>CSS selectors</strong> to the music player so you can better customize it</li>
						<li>I updated the way i sync your data with the server. <strong>PLEASE</strong> let me know if you experience any data loss!</li>
						<li>Optimized emotes parsing</li>
						<li>You can now pass query parameters to a local HTML on the triggers. <i>(ex: if you create a custom sub/cheer/raid alert page)</i></li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block fix" title="Fixes" :open="true" :icons="['fix']">
					<ul>
						<li>Music player overlay was sometimes blocked when using Spotify.</li>
						<li>You had to create at least 2 chat commands to see them on the list.</li>
						<li>Sub-only trigger wasn't working for subs that weren't showing their sub badge.</li>
					</ul>
				</ToggleBlock>
			</div>
			<div class="cta">
				<Button aria-label="Close updates" @click.stop="deleteMessage()" title="OK got it" />
			</div>
		</div>

		<div v-if="isTip" class="tip">
			<Button aria-label="Close tips &amp; tricks message" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
			<div class="title">💡 Tips &amp; tricks 💡</div>
			<ChatTipAndTrickAd class="content"
				@showModal="(v:string)=> $emit('showModal', v)"
				@openParam="(v:string)=> openParamPage(v)"
				@openParamItem="(v:string)=> openSpecificParam(v)"
			/>
		</div>

		<div v-if="isDiscord" class="discord">
			<Button aria-label="Close discord message" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
			<div class="title">Join us on Discord</div>
			<div class="content">
				<img src="@/assets/icons/discord_purple.svg" alt="discord" class="icon">
				<div>You have a feature suggestion or an issue to report?<br>join us on discord!</div>
			</div>
			<div class="cta">
				<Button :icon="$image('icons/discord.svg')"
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
import Store from '@/store/Store';
import { TwitchatAdTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '../ToggleBlock.vue';
import ChatTipAndTrickAd from './ChatTipAndTrickAd.vue';

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
	public get isTip():boolean { return this.messageData.contentID == TwitchatAdTypes.TIP_AND_TRICK; }
	public get isDiscord():boolean { return this.messageData.contentID == TwitchatAdTypes.DISCORD; }
	
	public get discordURL():string { return Config.instance.DISCORD_URL; }

	public mounted():void {
		
	}

	public openParamPage(page:string):void {
		StoreProxy.store.state.tempStoreValue = "CONTENT:"+page;
		StoreProxy.store.dispatch("showParams", true);
	}

	public openSpecificParam(id:string):void {
		StoreProxy.store.state.tempStoreValue = "SEARCH:"+id;
		StoreProxy.store.dispatch("showParams", true);
	}

	public openModal(modal:string):void { this.$emit("showModal", modal); }

	public deleteMessage():void {
		if(this.isUpdate) {
			Store.set(Store.UPDATE_INDEX, StoreProxy.store.state.latestUpdateIndex);
		}
		StoreProxy.store.dispatch("delChatMessage", {messageId:this.messageData.tags.id});
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

				.cmd {
					background-color: fade(@mainColor_warn, 15%);
				}
				mark {
					border: 1px dashed darken(@mainColor_warn_light, 10%);
					background-color: fade(@mainColor_warn_extralight, 50%);
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

				.cmd {
					background-color: fade(@mainColor_alert, 15%);
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

			.cmd {
				background-color: fade(@mainColor_normal, 15%);
				border-radius: .5em;
				padding: 0 .5em;
				font-family: 'Courier New', Courier, monospace;
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
		mark {
			border: 1px dashed fade(#000, 20);
			background-color: fade(#000, 5);
			border-radius: .5em;
			padding: 0 .25em;
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