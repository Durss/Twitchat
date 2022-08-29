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
			<div class="content">
				<ToggleBlock class="block new" title="New features" :icons="['new']">
					<ul>
						<li>
							<img src="@/assets/icons/mod.svg" class="icon" />
							<Button aria-label="open autmod params" small title="try it" @click.stop="openParamPage(contentAutomod)" />
							<span><strong>Automod tool</strong> with that allows to delete messages or automatically block users if their names isn't appropriate. Users won't be able to bypass it with alternative chars like <mark>🆃🅆ｉ𝘁𝕔𝓱🅰🅣</mark></span>
						</li>
						<li>
							<img src="@/assets/icons/user.svg" class="icon" />
							<Button aria-label="open viewer info" small title="try it" @click.stop="openViewerCard()" />
							<span><strong>Viewer inspector</strong> to quickly check for a user's info. Just click a nickname or use <mark>/userinfo</mark> command</span>
						</li>
						<li>
							<img src="@/assets/icons/follow.svg" class="icon" />
							<Button aria-label="open viewer params" small title="try it" @click.stop="openParamPage(contentEmergency)" />
							<span><strong>Follow bot raid</strong> detection added to the emergency button options. It can automatically start an emergency if Twitchat detects such a raid.</span>
						</li>
						<li>
							<img src="@/assets/icons/train.svg" class="icon" />
							<Button aria-label="show hype summary example" small title="try it" @click.stop="simulateEvent('hypeTrainSummary')" />
							<span><strong>Hype train summaries</strong> are now posted when an hype train completes.</span>
						</li>
						<li>
							<img src="@/assets/icons/broadcast.svg" class="icon" />
							<Button aria-label="open triggers params" small title="try it" @click.stop="openParamPage(contentTriggers)" />
							<span><strong>9 new triggers</strong> available : ban/unban, vip/unvip, mod/unmod, timeout, shoutout, hype train cancelled</span>
						</li>
						<li>
							<img src="@/assets/icons/broadcast.svg" class="icon" />
							<Button aria-label="open triggers params" small title="try it" @click.stop="openParamPage(contentTriggers)" />
							<span><strong>1 new trigger action</strong> to send a message on the <strong>Message Highlight</strong> overlay from any trigger.</span>
						</li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block other" title="Other updates" :open="false" :icons="['change']">
					<ul>
						<li><strong>Highlight my message</strong> reward now available on the channel point rewards list under the triggers section</li>
						<li>If you click a nickname anywhere it will now open the user's details on the new viewer inspector</li>
						<li>New <strong>Broadcaster</strong> permission everywhere you can set custom permissions <i>(ex: if you don't want your own messages to be read by TTS)</i></li>
					</ul>
				</ToggleBlock>
				<ToggleBlock class="block fix" title="Fixes" :open="false" :icons="['fix']">
					<ul>
						<li>Editing a stream info preset was renaming it with the stream's title.</li>
						<li>The button to test the wheel overlay was broken.</li>
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
	
	public voiceIcon:string = "";
	public ttsIcon:string = "";
	public pinIcon:string = "";
	public elgatoIcon:string = "";
	public followIcon:string = "";
	public kofiIcon:string = "";

	public get isUpdateWarning():boolean { return this.messageData.contentID == TwitchatAdTypes.UPDATE_WARNING; }
	public get isSponsor():boolean { return this.messageData.contentID == TwitchatAdTypes.SPONSOR; }
	public get isUpdate():boolean { return this.messageData.contentID == TwitchatAdTypes.UPDATES; }
	public get isTip():boolean { return this.messageData.contentID == TwitchatAdTypes.TIP_AND_TRICK; }
	public get isDiscord():boolean { return this.messageData.contentID == TwitchatAdTypes.DISCORD; }
	
	public get discordURL():string { return Config.instance.DISCORD_URL; }

	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }
	
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
		//Push a message after closing the ad
		// if(this.isUpdate) {
		// 	if(Store.get(Store.UPDATE_INDEX) != (StoreProxy.store.state.latestUpdateIndex as number).toString()) {
		// 		setTimeout(()=> {
		// 			StoreProxy.store.dispatch("addChatMessage",{
		// 			type:"ad",
		// 				channel:"#"+UserSession.instance.authToken.login,
		// 				markedAsRead:false,
		// 				contentID:TwitchatAdTypes.UPDATE_WARNING,
		// 				tags:{id:"twitchatAd"+Math.random()}
		// 			});
		// 		}, 1000);
		// 		Store.set(Store.UPDATE_INDEX, StoreProxy.store.state.latestUpdateIndex);
		// 	}
		// }
		StoreProxy.store.dispatch("delChatMessage", {messageId:this.messageData.tags.id});
		this.$emit("delete");
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
	
	.version {
		font-size: 1.25em;
		text-align: center;
		padding-top: .5em;
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