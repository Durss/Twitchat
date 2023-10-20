<template>
	<div class="chatad chatMessage">
		<div class="innerHolder">
			<div v-if="isDonate || isDonateReminder" class="card-item primary sponsor">
				<div class="header">
					<CloseButton :aria-label="$t('changelog.closeBt_aria')" @click.stop="deleteMessage()" v-if="$store('params').donationReminderEnabled" />
					<div class="title">{{ $t('chat.sponsor.title') }}</div>
				</div>
				<div class="content" v-html="isDonateReminder? $t('chat.sponsor.head_reminder') : $t('chat.sponsor.head')"></div>
				<div class="ctas">
					<img @click.stop="openParamPage(contentDonate)" src="@/assets/img/eating.gif" alt="nomnom" class="sponsorGif">
					
					<Button :aria-label="$t('chat.sponsor.tipBt_aria')"
					@click.stop="openParamPage(contentDonate)">{{ $t('chat.sponsor.tipBt') }}</Button>
					
					<template v-if="!isDonateReminder">
						<Button v-if="!$store('params').donationReminderEnabled" secondary
							@click.stop="$store('params').donationReminderEnabled = true" icon="timer">{{ $t('chat.sponsor.remind_meBt') }}</Button>
						<div v-else class="card-item secondary center">{{ $t("chat.sponsor.reminder_scheduled") }}</div>
					</template>
				</div>
			</div>
	
			<div v-else-if="isUpdate" class="card-item primary updates">
				<div class="header">
					<CloseButton :aria-label="$t('changelog.closeBt_aria')" @click.stop="deleteMessage()" />
					<div class="title">{{ $t('changelog.title') }}</div>
				</div>

				<ChatChangelog class="content"
					@showModal="(v:string)=> $emit('showModal', v)"
					@close="(v:any)=> deleteMessage()"
				/>
			</div>
	
			<div v-if="isTip" class="card-item primary tip">
				<div class="header">
					<CloseButton :aria-label="$t('chat.closeBt_aria')" @click.stop="deleteMessage()" />
					<div class="title">{{ $t("tips.title") }}</div>
				</div>
				<ChatTipAndTrickAd class="content"
					@showModal="(v:string)=> $emit('showModal', v)"
				/>
			</div>
	
			<div v-if="isDiscord" class="card-item primary discord">
				<div class="header">
					<CloseButton :aria-label="$t('chat.closeBt_aria')" @click.stop="deleteMessage()" />
					<div class="title">{{ $t('chat.discord.title') }}</div>
				</div>
				<div class="content">
					<img src="@/assets/icons/discord.svg" alt="discord" class="icon">
					<div v-html="$t('chat.discord.content')"></div>
				</div>
				<div class="ctas">
					<Button icon="discord"
						:href="discordURL"
						target="_blank"
						type="link">{{ $t('chat.discord.joinBt') }}</Button>
				</div>
			</div>
	
			<div v-if="isAdWarning" class="card-item primary">
				<div class="header">
					<CloseButton :aria-label="$t('chat.closeBt_aria')" @click.stop="confirmGngngnClose()" />
					<div class="title">{{ $t('chat.adalert.title') }}</div>
				</div>
				<div class="content left">
					<img src="@/assets/icons/twitchat.svg" alt="twitchat" class="icon">
					<div v-for="e in $tm('chat.adalert.contents')" v-html="e"></div>
				</div>
				<div class="ctas">
					<Button @click="openModal('gngngn')">{{ $t('chat.adalert.unacceptableBt') }}</Button>
					<Button icon="edit"
						@click="openParamPage(contentMainMenu, 'ad')">{{ $t('chat.adalert.customizeBt') }}</Button>
					<Button icon="premium" premium
						@click="openParamPage(contentPremium)">{{ $t('premium.become_premiumBt') }}</Button>
					<Button icon="follow" secondary
						@click="openParamPage(contentDonate)">{{ $t('chat.adalert.donateBt') }}</Button>
				</div>
			</div>
	
			<div v-if="isSponsorPublicPrompt" class="card-item primary sponsorPrompt">
				<div class="header">
					<CloseButton :aria-label="$t('chat.closeBt_aria')" @click.stop="deleteMessage()" />
					<div class="title">{{$t('chat.donor.title')}}</div>
				</div>
				<div class="content">
					<img src="@/assets/icons/follow.svg" alt="heart" class="icon">
					<div>{{ $t('chat.donor.info_1') }}</div>
					<i18n-t scope="global" tag="div" keypath="chat.donor.info_2">
						<template #LINK><a @click="openParamPage(contentDonate)">{{ $t('chat.donor.info_2_link') }}</a></template>
					</i18n-t>
					<div>{{ $t('chat.donor.info_3') }}</div>
					<div class="card-item" v-if="madeDonationPublic">
						<div>{{ $t('chat.donor.thanks') }}</div>
						<i18n-t scope="global" tag="div" keypath="chat.donor.thanks_change">
							<template #LINK><a @click="openParamPage(contentDonate)">{{ $t('chat.donor.thanks_change_link') }}</a></template>
						</i18n-t>
					</div>
				</div>
				<div class="ctas">
					<Button icon="follow"
						:loading="loading"
						@click="makeDonationPublic()"
						v-if="!madeDonationPublic">{{ $t('chat.donor.publicBt') }}</Button>
				</div>
			</div>
	
			<div v-if="isUpdateReminder" class="card-item primary updateReminder">
				<div class="content">
					<img src="@/assets/icons/firstTime.svg" class="icon small">
					<i18n-t scope="global" tag="span" keypath="chat.updateReminder.content">
						<template #CMD>
							<mark>/updates</mark>
						</template>
					</i18n-t>
				</div>
				<div class="ctas">
					<Button @click="openModal('updates')">{{ $t('chat.updateReminder.updatesBt') }}</Button>
				</div>
			</div>
	
			<div v-if="isAdBreakScopeRequest" class="card-item primary adBreak">
				<div class="header">
					<CloseButton :aria-label="$t('changelog.closeBt_aria')" @click.stop="deleteMessage()" />
					<div class="title"><img src="@/assets/icons/ad.svg" class="icon small"> {{ $t('chat.adBreakScope.header') }}</div>
				</div>
				<div class="content">
					<span>{{ $t("chat.adBreakScope.content") }}</span>
				</div>
				<div class="ctas">
					<Button icon="lock_fit" light @click="grantAdScopes()">{{ $t('chat.adBreakScope.grantBt') }}</Button>
				</div>
			</div>
	
			<div class="confirmClose" ref="confirmClose" v-if="showConfirm">
				<p class="label">{{ $t('chat.donor.close_confirm.info_1') }}</p>
				<p class="label">{{ $t('chat.donor.close_confirm.info_2') }}</p>
				<div class="ctaConfirm">
					<Button :loading="confirmDelay" @click="showConfirm=false" alert>{{ $t('chat.donor.close_confirm.cancelBt') }}</Button>
					<Button :loading="confirmDelay" @click="deleteMessage()">{{ $t('chat.donor.close_confirm.confirmBt') }}</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiController from '@/utils/ApiController';
import Config from '@/utils/Config';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import CloseButton from '../CloseButton.vue';
import Splitter from '../Splitter.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ChatChangelog from './ChatChangelog.vue';
import ChatTipAndTrickAd from './ChatTipAndTrickAd.vue';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';

@Component({
	components:{
		Button,
		Splitter,
		CloseButton,
		ToggleBlock,
		ChatChangelog,
		ChatTipAndTrickAd,
	},
	emits:["showModal", "onRead"]
})
export default class ChatAd extends Vue {

	@Prop
	public messageData!:TwitchatDataTypes.MessageTwitchatAdData;
	
	public voiceIcon:string = "";
	public ttsIcon:string = "";
	public pinIcon:string = "";
	public elgatoIcon:string = "";
	public followIcon:string = "";
	public kofiIcon:string = "";
	public showConfirm:boolean = false;
	public confirmDelay:boolean = false;
	public loading:boolean = false;
	public madeDonationPublic:boolean = false;

	public get isDonate():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.DONATE; }
	public get isDonateReminder():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.DONATE_REMINDER; }
	public get isUpdate():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.UPDATES; }
	public get isTip():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK; }
	public get isDiscord():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.DISCORD; }
	public get isAdWarning():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING; }
	public get isSponsorPublicPrompt():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_SPONSOR_PUBLIC_PROMPT; }
	public get isUpdateReminder():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.UPDATE_REMINDER; }
	public get isAdBreakScopeRequest():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.AD_BREAK_SCOPE_REQUEST; }
	
	public get discordURL():string { return Config.instance.DISCORD_URL; }
	public get isDonor():boolean { return StoreProxy.auth.twitch.user.donor.state; }

	public get contentAppearance():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.APPEARANCE; } 
	public get contentAccount():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ACCOUNT; } 
	public get contentFeatures():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.FEATURES; } 
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; } 
	public get contentDonate():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.DONATE; } 
	public get contentPremium():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.PREMIUM; } 
	public get contentStreamdeck():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.STREAMDECK; } 
	public get contentTriggers():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TRIGGERS; } 
	public get contentOverlays():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OVERLAYS; } 
	public get contentEmergency():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.EMERGENCY; } 
	public get contentSpoiler():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.SPOILER; } 
	public get contentAlert():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ALERT; } 
	public get contentTts():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TTS; } 
	public get contentVoice():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.VOICE; } 
	public get contentAutomod():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.AUTOMOD; } 
	public get contentMainMenu():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.MAIN_MENU; } 

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

	public openModal(modal:TwitchatDataTypes.ModalTypes):void { this.$emit("showModal", modal); }
	public openParamItem(paramPath:string):void { this.$store("params").searchParamByPath(paramPath); }
	public openParamPage(page:TwitchatDataTypes.ParameterPagesStringType, subContent?:TwitchatDataTypes.ParamDeepSectionsStringType):void { this.$store("params").openParamsPage(page, subContent); }

	public deleteMessage():void {
		if(this.isUpdate) {
			if(DataStore.get(DataStore.UPDATE_INDEX) != (this.$store("main").latestUpdateIndex as number).toString()) {
				DataStore.set(DataStore.UPDATE_INDEX, this.$store("main").latestUpdateIndex);
			}
		}
		if(this.isAdWarning) {
			DataStore.set(DataStore.TWITCHAT_AD_WARNED, true);
		}
		if(this.isAdBreakScopeRequest) {
			DataStore.set(DataStore.AD_BREAK_SCOPES_REQUEST, true);
		}
		if(this.isSponsorPublicPrompt) {
			DataStore.set(DataStore.TWITCHAT_SPONSOR_PUBLIC_PROMPT, true);
		}
		
		this.$store("chat").deleteMessage(this.messageData);
	}

	public confirmGngngnClose():void {
		this.showConfirm = true;
		this.confirmDelay = true;
		setTimeout(()=> {
			this.confirmDelay = false;
		}, 2000);
	}

	public async simulateEvent(type:TwitchatDataTypes.TwitchatMessageStringType):Promise<void> {
		this.$store("debug").simulateMessage(type, async (message)=> {
			//
		});
	}

	public async makeDonationPublic():Promise<void> {
		this.loading = true;
		try {
			ApiController.call("user/donor/anon", "POST", {public:true});
		}catch(error) {
		}
		this.loading = false;
		this.madeDonationPublic = true;
		DataStore.set(DataStore.TWITCHAT_SPONSOR_PUBLIC_PROMPT, true);
	}

	public grantAdScopes():void {
		this.$store("auth").requestTwitchScopes([TwitchScopes.ADS_READ, TwitchScopes.ADS_SNOOZE]);
		if(this.isAdBreakScopeRequest) {
			DataStore.set(DataStore.AD_BREAK_SCOPES_REQUEST, true);
		}
	}

}
</script>

<style scoped lang="less">
.chatad{
	.innerHolder {
		font-weight: 300;
		.confirmClose {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, .7);
			backdrop-filter: blur(5px);
			display: flex;
			align-items: center;
			flex-direction: column;
			justify-content: center;
			.label {
				font-size: 2em;
				text-shadow: 1px 1px 1px var(--color-dark);
				text-align: center;
				line-height: 1.2em;
			}
			.ctaConfirm {
				font-size: 1rem;
				max-width: 250px;
				margin-top: .5em;
				gap: 1em;
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;
			}
		}
	
		.header {
			position: relative;
			&>.title {
				font-size: 1.5em;
				.icon {
					height: 1em;
					margin-right: .5em;
				}
			}
		}
		.content {
			padding: .5em;
			&:not(.left) {
				text-align: center;
			}
			
			&>.icon {
				height: 4em;
				width: 4em;
				margin: 0 auto .5em auto;
				display: block;

				&.small {
					height: 1em;
					display: inline;
					width: auto;
					vertical-align: middle;
					margin-right: .5em;
				}
			}
	
			:deep(mark) {
				border: 1px dashed fade(#000, 20);
				background-color: fade(#000, 5);
				border-radius: .5em;
				padding: 0 .25em;
			}
			span {
				white-space: pre-line;
			}
		}

		.center {
			text-align: center;
		}
	
		.ctas {
			padding: .5em;
			gap: .5em;
			display: flex;
			flex-direction: column;
			align-items: center;
	
			.sponsorGif {
				width: 8em;
				margin-bottom: -.5em;//Compensate for flex gap
				cursor: pointer;
			}
		}
	}

}
</style>