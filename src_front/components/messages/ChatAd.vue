<template>
	<div class="chatad">
		<div class="innerHolder">
			<div v-if="isSponsor" class="sponsor">
				<div class="title">{{ $t('chat.sponsor.title') }}</div>
				<div class="content" v-html="$t('chat.sponsor.head')"></div>
				<div class="cta">
					<img @click.stop="openParamPage(contentSponsor)" src="@/assets/img/eating.gif" alt="nomnom" class="sponsorGif">
					
					<Button :aria-label="$t('chat.sponsor.tipBt_aria')"
					@click.stop="openParamPage(contentSponsor)"
					:title="$t('chat.sponsor.tipBt')" />
				</div>
			</div>
	
			<div v-else-if="isUpdate" class="updates">
				<Button class="closeBt"
					:aria-label="$t('changelog.closeBt_aria')"
					@click.stop="deleteMessage()"
					:icon="$image('icons/cross_white.svg')" />

				<div class="title">{{ $t('changelog.title') }}</div>

				<ChatChangelog class="content"
					@showModal="(v:string)=> $emit('showModal', v)"
					@close="(v:any)=> deleteMessage()"
					@openParam="(v:any)=> openParamPage(v)"
					@openParamItem="(v:string)=> openSpecificParam(v)"
				/>
			</div>
	
			<div v-if="isTip" class="tip">
				<Button :aria-label="$t('chat.closeBt_aria')" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
				<div class="title">{{ $t("tips.title") }}</div>
				<ChatTipAndTrickAd class="content"
					@showModal="(v:string)=> $emit('showModal', v)"
					@openParam="(v:any)=> openParamPage(v)"
					@openParamItem="(v:string)=> openSpecificParam(v)"
				/>
			</div>
	
			<div v-if="isDiscord" class="discord">
				<Button :aria-label="$t('chat.closeBt_aria')" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
				<div class="title">{{ $t('chat.discord.title') }}</div>
				<div class="content">
					<img src="@/assets/icons/discord_purple.svg" alt="discord" class="icon">
					<div v-html="$t('chat.discord.content')"></div>
				</div>
				<div class="cta">
					<Button :icon="$image('icons/discord.svg')"
						:title="$t('chat.discord.joinBt')"
						:href="discordURL"
						target="_blank"
						type="link"
					/>
				</div>
			</div>
	
			<div v-if="isAdWarning">
				<Button :aria-label="$t('chat.closeBt_aria')" @click.stop="confirmGngngnClose()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
				<div class="title">{{ $t('chat.adalert.title') }}</div>
				<div class="content left">
					<img src="@/assets/icons/twitchat_purple.svg" alt="twitchat" class="icon">
					<div v-for="e in $tm('chat.adalert.contents')" v-html="e"></div>
				</div>
				<div class="cta">
					<Button :title="$t('chat.adalert.unacceptableBt')" @click="openModal('gngngn')" />
					<Button :icon="$image('icons/edit.svg')"
						:title="$t('chat.adalert.customizeBt')"
						@click="openParamPage(contentMainMenu)"
					/>
					<Button :icon="$image('icons/follow.svg')"
						:title="$t('chat.adalert.donateBt')"
						@click="openParamPage(contentSponsor)"
					/>
				</div>
			</div>
	
			<div v-if="isSponsorPublicPrompt" class="sponsorPrompt">
				<Button :aria-label="$t('chat.closeBt_aria')" @click.stop="deleteMessage()" :icon="$image('icons/cross_white.svg')" class="closeBt" />
				<div class="title">{{$t('chat.donor.title')}}</div>
				<div class="content">
					<img src="@/assets/icons/follow_purple.svg" alt="heart" class="icon">
					<div>{{ $t('chat.donor.info_1') }}</div>
					<i18n-t scope="global" tag="div" keypath="chat.donor.info_2">
						<template #LINK><a @click="openParamPage(contentAbout)">{{ $t('chat.donor.info_2_link') }}</a></template>
					</i18n-t>
					<div>{{ $t('chat.donor.info_3') }}</div>
					<div v-if="madeDonationPublic">
						<div>{{ $t('chat.donor.thanks') }}</div>
						<i18n-t scope="global" tag="div" keypath="chat.donor.thanks_change">
							<template #LINK><a @click="openParamPage(contentAccount)">{{ $t('chat.donor.thanks_change_link') }}</a></template>
						</i18n-t>
					</div>
				</div>
				<div class="cta">
					<Button :icon="$image('icons/follow.svg')"
						:title="$t('chat.donor.publicBt')"
						:loading="loading"
						@click="makeDonationPublic()"
						v-if="!madeDonationPublic"
					/>
				</div>
			</div>
	
			<div class="confirmClose" ref="confirmClose" v-if="showConfirm">
				<p>{{ $t('chat.donor.close_confirm.info_1') }}</p>
				<p>{{ $t('chat.donor.close_confirm.info_2') }}</p>
				<div class="ctaConfirm">
					<Button :loading="confirmDelay" :title="$t('chat.donor.close_confirm.cancelBt')" @click="showConfirm=false" small highlight />
					<Button :loading="confirmDelay" :title="$t('chat.donor.close_confirm.confirmBt')" @click="deleteMessage()" small />
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
import Config from '@/utils/Config';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Splitter from '../Splitter.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ChatChangelog from './ChatChangelog.vue';
import ChatTipAndTrickAd from './ChatTipAndTrickAd.vue';

@Component({
	components:{
		Button,
		Splitter,
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

	public get isUpdateWarning():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.UPDATE_WARNING; }
	public get isSponsor():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.SPONSOR; }
	public get isUpdate():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.UPDATES; }
	public get isTip():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK; }
	public get isDiscord():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.DISCORD; }
	public get isAdWarning():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING; }
	public get isSponsorPublicPrompt():boolean { return this.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_SPONSOR_PUBLIC_PROMPT; }
	
	public get discordURL():string { return Config.instance.DISCORD_URL; }
	
	public get isDonor():boolean { return StoreProxy.auth.twitch.user.donor.state; }

	public get contentAppearance():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.APPEARANCE; } 
	public get contentAccount():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.ACCOUNT; } 
	public get contentAbout():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.ABOUT; } 
	public get contentFeatures():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.FEATURES; } 
	public get contentObs():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.OBS; } 
	public get contentSponsor():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.SPONSOR; } 
	public get contentStreamdeck():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.STREAMDECK; } 
	public get contentTriggers():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.TRIGGERS; } 
	public get contentOverlays():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.OVERLAYS; } 
	public get contentEmergency():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.EMERGENCY; } 
	public get contentSpoiler():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.SPOILER; } 
	public get contentAlert():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.ALERT; } 
	public get contentTts():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.TTS; } 
	public get contentVoice():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.VOICE; } 
	public get contentAutomod():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.AUTOMOD; } 
	public get contentMainMenu():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.MAIN_MENU; } 

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

	public openParamPage(page:TwitchatDataTypes.ParamsContentStringType):void {
		this.$store("main").tempStoreValue = "CONTENT:"+page;
		this.$store("main").setShowParams(true);
	}

	public openSpecificParam(id:string):void {
		this.$store("main").tempStoreValue = "SEARCH:"+id;
		this.$store("main").setShowParams(true);
	}

	public openModal(modal:string):void { this.$emit("showModal", modal); }

	public deleteMessage():void {
		if(this.isUpdate) {
			if(DataStore.get(DataStore.UPDATE_INDEX) != (this.$store("main").latestUpdateIndex as number).toString()) {
				DataStore.set(DataStore.UPDATE_INDEX, this.$store("main").latestUpdateIndex);
			}
		}
		if(this.isAdWarning) {
			DataStore.set(DataStore.TWITCHAT_AD_WARNED, true);
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
			const options = {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer "+StoreProxy.auth.twitch.access_token,
					'App-Version': import.meta.env.PACKAGE_VERSION,
				},
				body: JSON.stringify({
					public:true,
				})
			}
			await fetch(Config.instance.API_PATH+"/user/donor/anon", options);
		}catch(error) {
		}
		this.loading = false;
		this.madeDonationPublic = true;
		DataStore.set(DataStore.TWITCHAT_SPONSOR_PUBLIC_PROMPT, true);
	}

}
</script>

<style scoped lang="less">
.chatad{
	.chatMessage();
	color:@mainColor_normal;

	.innerHolder {
		border-radius: 1em;
		overflow: hidden;
		position: relative;
		background-color: @mainColor_light;
	
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
			line-height: 1.2em;
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
			height: 2.5em;
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
			
			&>.icon {
				height: 4em;
				width: 4em;
				margin: 0 auto .5em auto;
				display: block;
			}
	
			.block {
				&:not(:last-of-type) {
					margin-bottom: .5em;
				}
				:deep(.header){
					color: @mainColor_light;
					background-color: @mainColor_normal;
					&:hover {
						background-color: lighten(@mainColor_normal, 5%);
					}
		
					.cmd {
						background-color: fade(@mainColor_normal, 15%);
						border-radius: .5em;
						padding: 0 .5em;
						font-family: 'Courier New', Courier, monospace;
					}
				}
			}

			:deep(mark) {
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

}
</style>