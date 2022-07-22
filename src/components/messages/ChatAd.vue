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
							<Button aria-label="open emergency params" small title="try it" @click.stop="openParamPage('emergency')" />
							<span>Protect yourself from <strong>followbot raids</strong> with the new option of the Emergency button</span>
						</li>
						<li>
							<Button aria-label="open alert param" small title="try it" @click.stop="openParamPage('alert')" />
							<span>Let your mods scream at you to make sure you read them with the new <strong>alert feature</strong> under <mark>Parameters =&gt features</mark>.</span>
						</li>
						<li>
							<span>Content of message sent by users you <strong>blocked</strong> is now hidden. Click to reveal.</span>
						</li>
						<li>
							<span>If sending a <strong>clip</strong>'s link, it's <strong>preview</strong> will be displayed</span>
						</li>
						<li>
							<span>The "Message Highlight" overlay can now play a clip with a single click on a dedicated button of the clip's preview</span>
						</li>
						<li>
							<span>Colored <mark>/announce</mark> commands available</span>
						</li>
						<li>
							<span><mark>/block</mark> and <mark>/unblock</mark> commands available</span>
						</li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block other" title="Other updates" :open="false" :icons="['change']">
					<ul>
						<li>
							<span>You won't loose the Greet them history if you reload twitchat during your stream. It will show a user again only after 8h.</span>
						</li>
						<li>
							<span>Get your current Twitchat version on the bottom of the parameters or with the <mark>/version</mark> command</span>
						</li>
						<li>
							<Button aria-label="open chat suggestions feature" small title="open" @click.stop="openModal('chatpoll')" />
							<span><mark>Chat poll</mark> feature has been renamed to <mark>Chat suggestions</mark> for the sake of clarity</span>
						</li>
						<li>
							<span>Parameters menu has been reviewed with a full page menu instead of the huge stack of tabs at the top</span>
						</li>
						<li>
							<span>Timer and Countdown overlay is a little less ugly</span>
						</li>
						<li>
							<Button aria-label="open chat suggestions feature" small title="open" @click.stop="openParamPage('overlays')" />
							<span>Spotify and Deezer overlay parameters now shows an example of what the player looks like</span>
						</li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block fix" title="Fixes" :open="true" :icons="['fix']">
					<ul>
						<li>Chat connexion was lost after few hours without succeeding to reconnect forcing you to reload the page. This should be fixed now.</li>
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
				@openParamItem="(v:string)=> showSpecificParam(v)"
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

	public showSpecificParam(id:string):void {
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