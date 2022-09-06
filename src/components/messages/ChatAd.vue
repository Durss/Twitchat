<template>
	<div class="chatad" @click.stop="">
		<div v-if="isSponsor" class="sponsor">
			<div class="title">🍔 I like food 🍔</div>
			<div class="content">Are you enjoying <strong>Twitchat</strong> ?<br>
			It took <strong>months</strong> of my life to create.<br>
			Twitchat is free, but <strong>if you can afford it</strong>, any tip would really make my day brighter!</div>
			<div class="cta">
				<img @click.stop="openParamPage(contentSponsor)" src="@/assets/img/eating.gif" alt="nomnom" class="sponsorGif">
				<Button aria-label="Open tip options" @click.stop="openParamPage(contentSponsor)" title="🌞 Make my day brighter 🌞" />
			</div>
		</div>

		<div v-else-if="isUpdate" class="updates">
			<Button aria-label="Remove message" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
			<div class="title">🎉 Latest updates 🎉</div>
			<div class="version">Version {{appVersion}}</div>
			<div class="infos">Use <mark>/updates</mark> command to open this back</div>
			<div class="important">
				<Splitter class="title">Important</Splitter>
				<div class="details">
					<p>Twitchat will now post a message on your chat to let your viewers know about it.</p>
					<p>One message will be posted every 2 hours if at least 100 messages have been received.</p>
					<p>The message won't be posted if a link to Twitchat has been posted within the past hour so you can advertise about it by yourself.</p>
					<Button title="Customize message" small :icon="$image('icons/edit.svg')" @click="openParamPage(contentMainMenu)" />
					<p class="spacing"><strong>Donors are not concerned</strong><br>If you donated, go under <a @click="openParamPage(contentAccount)">account section</a> to make sure you have the donor badge. If you don't see it, contact me on <a href="https://twitch.tv/durss" target="_blank" aria-label="DM me on twitter">Twitch</a> so I give it to you.</p>
					<p>This feature is <strong>disabled for donors</strong> but you can enable it back if you'd still like to let your viewers know about Twitchat 💝</p>
				</div>
			</div>
			<div class="content">
				<ToggleBlock class="block new" title="New features" :icons="['new']">
					<ul>
						<li>
							<img src="@/assets/icons/overlay.svg" class="icon" />
							<Button aria-label="open overlays params" small title="try it" @click.stop="openParamPage(contentOverlays)" />
							<span><strong>Unified overlays</strong>. Include all the available overlays in one single browser source for a lesser memory footprint</span>
						</li>
						<li>
							<img src="@/assets/icons/channelPoints.svg" class="icon" />
							<Button aria-label="open triggers params" small title="try it" @click.stop="openParamPage(contentTriggers)" />
							<span><strong>Highlight my message</strong> channel point reward available on the triggers section. Do anything you want when viewers use it!</span>
						</li>
						<li>
							<img src="@/assets/icons/broadcast.svg" class="icon" />
							<Button aria-label="open triggers params" small title="try it" @click.stop="openParamPage(contentTriggers)" />
							<span><strong>1 new trigger</strong>: Repeat any actions regularly or execute them at specific dates (see: Triggers => Timers => <strong>Schedule actions</strong>)</span>
						</li>
						<li>
							<img src="@/assets/icons/broadcast.svg" class="icon" />
							<Button aria-label="open triggers params" small title="try it" @click.stop="openParamPage(contentTriggers)" />
							<span><strong>1 new trigger action</strong>: Call another trigger from any trigger</span>
						</li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block other" title="Other updates" :open="false" :icons="['change']">
					<ul>
						<li>Users cannot spam follow/unfollow anymore. Only one notification will be displayed in such case.</li>
						<li><Button aria-label="open triggers params" small title="try it" @click.stop="openViewerCard()" />User info now shows if user is streaming</li>
						<li>Cumulative months sub info now displayed <i>(if a viewer buys multiple months at once)</i></li>
						<li>Open user card from their ID with the <mark>/userinfo</mark> command</li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block fix" title="Fixes" :open="false" :icons="['fix']">
					<ul>
						<li>Lots of minor fixes on the triggers parameters. Many "Test trigger" buttons weren't implemented</li>
						<li>Overlays weren't working if used from an external browser</li>
						<li>More stable voice control if running multiple twitchat instances</li>
						<li>Test button of the Wheel overlay was broken</li>
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
				@openParam="(v:any)=> openParamPage(v)"
				@openParamItem="(v:string)=> openSpecificParam(v)"
			/>
		</div>

		<div v-if="isDiscord" class="discord">
			<Button aria-label="Close discord message" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
			<div class="title">Join us on Discord</div>
			<div class="content">
				<img src="@/assets/icons/discord_purple.svg" alt="discord" class="icon">
				<div>You have a feature suggestion or an issue to report?<br>Join us on discord!</div>
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

		<div v-if="isUpdateWarning" class="discord">
			<Button aria-label="Close discord message" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
			<div class="title">Important</div>
			<div class="content">
				<img src="@/assets/icons/alert_purple.svg" alt="discord" class="icon">
				<div>This update contains lots of deep changes in Twitchat's codebase.</div>
				<div>It's been tested as best as possible but there are chances some issues have not been catched in the process.</div>
				<br>
				<div>If you experience even the slightest issue I'd greatly appreciate you take time to tell me either on Discord or Twitter.</div>
			</div>
			<div class="cta">
				<Button :icon="$image('icons/discord.svg')"
					title="Discord"
					:href="discordURL"
					target="_blank"
					type="link"
				/>
				<Button :icon="$image('icons/twitter.svg')"
					title="Twitter"
					:href="discordURL"
					target="_blank"
					type="link"
				/>
			</div>
		</div>

		<div v-if="isAdWarning" class="discord">
			<Button aria-label="Close discord message" @click.stop="confirmGngngnClose()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
			<div class="title">IMPORTANT MESSAGE</div>
			<div class="content left">
				<img src="@/assets/icons/twitchat_purple.svg" alt="discord" class="icon">
				<div v-if="isFreshAdWarning">This is a friendly reminder that, as stated in the previous update info, Twitchat will now send a message on your chat to let people know about it.</div>
				<div v-if="!isFreshAdWarning">Twitchat is free for you to use but:</div>
				<div>A message with a link to Twitchat will be sent every 2 hours on your chat <i>(only if you received at least 100 messages during that timeframe)</i>.</div>
				<div>The message won't be sent as long as a link to twitchat is sent by anyone on your chat during that 2h timeframe.</div>
				<br>
				<div>You can customize the message on the Parameters menu.</div>
				<div>Or you can donate any amount to remove it</div>
			</div>
			<div class="cta">
				<Button title="😡😡😡 THAT'S UNACCEPTABLE 😡😡😡" @click="openModal('gngngn')" />
				<Button :icon="$image('icons/edit.svg')"
					title="Customize message"
					@click="openParamPage(contentMainMenu)"
				/>
				<Button :icon="$image('icons/follow.svg')"
					title="Donate to remove"
					@click="openParamPage(contentSponsor)"
				/>
			</div>
		</div>

		<div class="confirmClose" ref="confirmClose" v-if="showConfirm">
			<p>Are you sure you read the message?</p>
			<p>It's important</p>
			<div class="ctaConfirm">
				<Button :loading="confirmDelay" title="Cancel" @click="showConfirm=false" small highlight />
				<Button :loading="confirmDelay" title="Yes close" @click="deleteMessage()" small />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Store from '@/store/Store';
import { ParamsContentType, TwitchatAdTypes, type ParamsContentStringType } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import IRCClient from '@/utils/IRCClient';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import UserSession from '@/utils/UserSession';
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '../ToggleBlock.vue';
import ChatTipAndTrickAd from './ChatTipAndTrickAd.vue';
import Splitter from '../Splitter.vue';

@Options({
	props:{
		messageData:Object,
	},
	components:{
		Button,
		Splitter,
		ToggleBlock,
		ChatTipAndTrickAd,
	},
	emits:["showModal", "delete", "close", "ariaMessage"]
})
export default class ChatAd extends Vue {

	public messageData!:IRCEventDataList.TwitchatAd;
	
	public voiceIcon:string = "";
	public ttsIcon:string = "";
	public pinIcon:string = "";
	public elgatoIcon:string = "";
	public followIcon:string = "";
	public kofiIcon:string = "";
	public showConfirm:boolean = false;
	public confirmDelay:boolean = false;

	public get isUpdateWarning():boolean { return this.messageData.contentID == TwitchatAdTypes.UPDATE_WARNING; }
	public get isSponsor():boolean { return this.messageData.contentID == TwitchatAdTypes.SPONSOR; }
	public get isUpdate():boolean { return this.messageData.contentID == TwitchatAdTypes.UPDATES; }
	public get isTip():boolean { return this.messageData.contentID == TwitchatAdTypes.TIP_AND_TRICK; }
	public get isDiscord():boolean { return this.messageData.contentID == TwitchatAdTypes.DISCORD; }
	public get isAdWarning():boolean { return this.messageData.contentID == TwitchatAdTypes.TWITCHAT_AD_WARNING; }
	public get isFreshAdWarning():boolean { return this.appVersion == "6.1.3"; }

	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }
	
	public get discordURL():string { return Config.instance.DISCORD_URL; }
	
	public get isDonor():boolean { return UserSession.instance.isDonor; }

	public get contentAppearance():ParamsContentStringType { return ParamsContentType.APPEARANCE; } 
	public get contentFilters():ParamsContentStringType { return ParamsContentType.FILTERS; } 
	public get contentAccount():ParamsContentStringType { return ParamsContentType.ACCOUNT; } 
	public get contentAbout():ParamsContentStringType { return ParamsContentType.ABOUT; } 
	public get contentFeatures():ParamsContentStringType { return ParamsContentType.FEATURES; } 
	public get contentObs():ParamsContentStringType { return ParamsContentType.OBS; } 
	public get contentSponsor():ParamsContentStringType { return ParamsContentType.SPONSOR; } 
	public get contentStreamdeck():ParamsContentStringType { return ParamsContentType.STREAMDECK; } 
	public get contentTriggers():ParamsContentStringType { return ParamsContentType.TRIGGERS; } 
	public get contentOverlays():ParamsContentStringType { return ParamsContentType.OVERLAYS; } 
	public get contentEmergency():ParamsContentStringType { return ParamsContentType.EMERGENCY; } 
	public get contentSpoiler():ParamsContentStringType { return ParamsContentType.SPOILER; } 
	public get contentAlert():ParamsContentStringType { return ParamsContentType.ALERT; } 
	public get contentTts():ParamsContentStringType { return ParamsContentType.TTS; } 
	public get contentVoice():ParamsContentStringType { return ParamsContentType.VOICE; } 
	public get contentAutomod():ParamsContentStringType { return ParamsContentType.AUTOMOD; } 
	public get contentMainMenu():ParamsContentStringType { return ParamsContentType.MAIN_MENU; } 

	public async getSvgIcon(name:string) {
		const module = await import(`../../assets/icons/${name}.svg`);
		return module.default
	}

	public async mounted():Promise<void> {
		this.voiceIcon = await this.getSvgIcon("voice");
		this.ttsIcon = await this.getSvgIcon("tts");
		this.pinIcon = await this.getSvgIcon("pin");
		this.elgatoIcon = await this.getSvgIcon("elgato");
		this.followIcon = await this.getSvgIcon("follow");
		this.kofiIcon = await this.getSvgIcon("kofi");
	}

	public openParamPage(page:ParamsContentStringType):void {
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
			if(Store.get(Store.UPDATE_INDEX) != (StoreProxy.store.state.latestUpdateIndex as number).toString()) {
				//Push a message after closing the ad
				// setTimeout(()=> {
				// 	StoreProxy.store.dispatch("addChatMessage",{
				// 	type:"ad",
				// 		channel:"#"+UserSession.instance.authToken.login,
				// 		markedAsRead:false,
				// 		contentID:TwitchatAdTypes.UPDATE_WARNING,
				// 		tags:{id:"twitchatAd"+Math.random()}
				// 	});
				// }, 1000);
				Store.set(Store.UPDATE_INDEX, StoreProxy.store.state.latestUpdateIndex);
			}
		}
		if(this.isAdWarning) {
			Store.set(Store.TWITCHAT_AD_WARNED, true);
		}
		StoreProxy.store.dispatch("delChatMessage", {messageId:this.messageData.tags.id});
		this.$emit("delete");
	}

	public confirmGngngnClose():void {
		this.showConfirm = true;
		this.confirmDelay = true;
		setTimeout(()=> {
			this.confirmDelay = false;
		}, 2000);
	}

	public openViewerCard():void {
		StoreProxy.store.dispatch("openUserCard", UserSession.instance.user?.login);
	}

	public async simulateEvent(code:string):Promise<void> {
		IRCClient.instance.sendFakeEvent(code);
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

	.confirmClose {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: fade(@mainColor_dark, 70%);
		backdrop-filter: blur(3px);
		display: flex;
		align-items: center;
		flex-direction: column;
		justify-content: center;
		color: @mainColor_light;
		font-size: 2em;
		text-shadow: 1px 1px 1px @mainColor_dark;
		text-align: center;
		.ctaConfirm {
			width: 100%;
			max-width: 250px;
			margin-top: .5em;
			display: flex;
			flex-direction: row;
			justify-content: space-evenly;
		}
	}

	.closeBt {
		position: absolute;
		top:0;
		right:0;
		height: 3em;
	}

	&>div>.title {
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
	
	.version {
		font-size: 1.25em;
		text-align: center;
		padding-top: .5em;
	}
	
	.important {
		font-size: 1em;
		padding: .5em;
		.title {
			font-size: 2em;
			margin-bottom: .5em;
		}
		.details {
			padding: 0 1em;
			.spacing {
				margin-top: 1em;
			}
			.button {
				display: block;
				margin: auto;
				margin-top: .75em;
				font-size: 1.25em;
			}
		}
	}

	.content {
		padding: .5em;
		&:not(.left) {
			text-align: center;
		}

		.icon {
			height: 4em;
			width: 4em;
			margin: 0 auto .5em auto;
			display: block;
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
				.icon {
					background: @mainColor_warn;
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
				.icon {
					background: @mainColor_alert;
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
				.icon {
					border-radius: .5em;
					height: 2em;
					width: 2em;
					padding: .25em;
					display: inline;
					margin-right: .5em;
					vertical-align: middle;
					background: @mainColor_normal;
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

		.button:not(:first-of-type) {
			margin-top: .5em;
		}

		.sponsorGif {
			width: 8em;
			cursor: pointer;
		}
	}

}
</style>