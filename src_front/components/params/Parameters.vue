<template>
	<div class="parameters" v-if="content != contentClose">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<Button :aria-label="$t('params.backBt_aria')" :icon="$image('icons/back_purple.svg')" @click="back()" class="backBt clearButton" bounce v-if="content != contentMain" />
				<h1 class="title">{{$t('params.categories.'+content)}}</h1>
				<Button :aria-label="$t('params.closeBt_aria')" :icon="$image('icons/cross.svg')" @click="close()" class="clearButton" bounce />
			</div>

			<div class="search" v-if="content == contentMain">
				<input type="text" :placeholder="$t('params.search')" v-model="$store('params').currentParamSearch" v-autofocus>
			</div>
			
			<div class="content menu" v-if="content == contentMain && !search || content == contentAd">
				<div ref="adNoDonor"></div>

				<div class="buttonList" v-if="content != contentAd">
					<Button bounce white :icon="$image('icons/params_purple.svg')"		:title="$t('params.categories.features')"		@click="openPage(contentFeatures)" />
					<Button bounce white :icon="$image('icons/show_purple.svg')"		:title="$t('params.categories.appearance')"		@click="openPage(contentAppearance)" />
					<Button bounce white :icon="$image('icons/emergency_purple.svg')"	:title="$t('params.categories.emergency')"		@click="openPage(contentEmergency)" />
					<Button bounce white :icon="$image('icons/mod_purple.svg')"			:title="$t('params.categories.automod')"		@click="openPage(contentAutomod)" />
					<Button bounce white :icon="$image('icons/broadcast_purple.svg')"	:title="$t('params.categories.triggers')"		@click="openPage(contentTriggers)" />
					<Button bounce white :icon="$image('icons/count_purple.svg')"		:title="$t('params.categories.counters')"		@click="openPage(contentCounters)" />
					<Button bounce white :icon="$image('icons/overlay_purple.svg')"		:title="$t('params.categories.overlays')"		@click="openPage(contentOverlays)" />
					<Button bounce white :icon="$image('icons/tts_purple.svg')"			:title="$t('params.categories.tts')"			@click="openPage(contentTts)" />
					<Button bounce white :icon="$image('icons/voice_purple.svg')"		:title="$t('params.categories.voice')"			@click="openPage(contentVoice)" />
					<Button bounce white :icon="$image('icons/obs_purple.svg')"			:title="$t('params.categories.obs')"			@click="openPage(contentObs)" />
					<Button bounce white :icon="$image('icons/voicemod_purple.svg')"	:title="$t('params.categories.voicemod')"		@click="openPage(contentVoicemod)" />
					<Button bounce white :icon="$image('icons/elgato_purple.svg')"		:title="$t('params.categories.streamdeck')"		@click="openPage(contentStreamdeck)" />
					<Button bounce white :icon="$image('icons/offline_purple.svg')"		:title="$t('params.categories.connexions')"		@click="openPage(contentConnexions)" />
					<Button bounce white :icon="$image('icons/user_purple.svg')"		:title="$t('params.categories.account')"		@click="openPage(contentAccount)" />
					<Button bounce white :icon="$image('icons/info_purple.svg')"		:title="$t('params.categories.about')"			@click="openPage(contentAbout)" />
				</div>

				<div ref="adDonor"></div>

				<div class="version" v-if="content != contentAd">v {{appVersion}}</div>
			</div>
			
			<div class="content" v-if="(content != contentMain && content != contentAd) || search">
				<ParamsList v-if="isGenericListContent || filteredParams.length > 0" :category="content" :filteredParams="filteredParams" />
				<ParamsStreamdeck v-if="content == contentStreamdeck" />
				<ParamsOBS v-if="content == contentObs" />
				<ParamsEmergency v-if="content == contentEmergency" />
				<ParamsTTS v-if="content == contentTts" />
				<ParamsSpoiler v-if="content == contentSpoiler" />
				<ParamsAlert v-if="content == contentAlert" />
				<ParamsAccount v-if="content == contentAccount" />
				<ParamsAbout v-if="content == contentAbout" />
				<ParamsOverlays v-if="content == contentOverlays" />
				<ParamsTriggers v-if="content == contentTriggers" />
				<ParamsVoiceBot v-if="content == contentVoice" />
				<ParamsVoicemod v-if="content == contentVoicemod" />
				<ParamsAutomod v-if="content == contentAutomod" />
				<ParamsCounters v-if="content == contentCounters" />
				<ParamsConnexions v-if="content == contentConnexions" />
				<!-- Used for direct link to sponsor content from chat ads -->
				<ParamsSponsor v-if="content == contentSponsor" />

				<div class="searchResult" v-if="search">
					<div class="noResult" v-if="filteredParams.length == 0">{{ $t("params.search_no_result") }}</div>
				</div>
			</div>

			<teleport :to="adTarget" v-if="adTarget">
				<ParamsTwitchatAd :expand="content == contentAd" @collapse="openPage('main')" />
			</teleport>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ParamsAbout from './contents/ParamsAbout.vue';
import ParamsAccount from './contents/ParamsAccount.vue';
import ParamsAlert from './contents/ParamsAlert.vue';
import ParamsAutomod from './contents/ParamsAutomod.vue';
import ParamsCounters from './contents/ParamsCounters.vue';
import ParamsEmergency from './contents/ParamsEmergency.vue';
import ParamsList from './contents/ParamsList.vue';
import ParamsOBS from './contents/ParamsOBS.vue';
import ParamsOverlays from './contents/ParamsOverlays.vue';
import ParamsSpoiler from './contents/ParamsSpoiler.vue';
import ParamsSponsor from './contents/ParamsSponsor.vue';
import ParamsStreamdeck from './contents/ParamsStreamdeck.vue';
import ParamsTriggers from './contents/ParamsTriggers.vue';
import ParamsTTS from './contents/ParamsTTS.vue';
import ParamsTwitchatAd from './contents/ParamsTwitchatAd.vue';
import ParamsVoiceBot from './contents/ParamsVoiceBot.vue';
import ParamsVoicemod from './contents/ParamsVoicemod.vue';
import ParamsConnexions from './contents/ParamsConnexions.vue';

@Component({
	components:{
		Button,
		ParamsOBS,
		ParamsTTS,
		ParamsList,
		ParamsAbout,
		ParamsAlert,
		ParamsAutomod,
		ParamsSpoiler,
		ParamsAccount,
		ParamsSponsor,
		ParamsCounters,
		ParamsOverlays,
		ParamsTriggers,
		ParamsVoiceBot,
		ParamsVoicemod,
		ParamsEmergency,
		ParamsStreamdeck,
		ParamsTwitchatAd,
		ParamsConnexions,
	}
})

export default class Parameters extends Vue {

	public filteredParams:TwitchatDataTypes.ParameterData[] = [];
	public adTarget:HTMLDivElement | null = null;
	
	private closed:boolean = true;
	private closing:boolean = false;
	private history:TwitchatDataTypes.ParameterPagesStringType[] = [];

	public get isDonor():boolean { return this.$store("auth").twitch.user.donor.state; }
	public get contentClose():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CLOSE; } 
	public get contentMain():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.MAIN_MENU; } 
	public get contentAd():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.AD; } 
	public get contentAppearance():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.APPEARANCE; } 
	public get contentAccount():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ACCOUNT; } 
	public get contentAbout():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ABOUT; } 
	public get contentFeatures():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.FEATURES; } 
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; } 
	public get contentVoicemod():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.VOICEMOD; } 
	public get contentSponsor():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.SPONSOR; } 
	public get contentStreamdeck():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.STREAMDECK; } 
	public get contentTriggers():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TRIGGERS; } 
	public get contentCounters():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.COUNTERS; } 
	public get contentOverlays():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OVERLAYS; } 
	public get contentEmergency():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.EMERGENCY; } 
	public get contentSpoiler():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.SPOILER; } 
	public get contentAlert():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ALERT; } 
	public get contentTts():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TTS; } 
	public get contentVoice():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.VOICE; } 
	public get contentAutomod():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.AUTOMOD; } 
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNEXIONS; } 
	
	/**
	 * If true, will display a search field at the top of the view to
	 * search params by their labels
	 */
	public get isGenericListContent():boolean {
		return this.content == "features"
			|| this.content == "appearance"
			|| this.search.length>0;
	}

	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }

	public get content():TwitchatDataTypes.ParameterPagesStringType { return this.$store("params").currentPage; }
	
	public get search():string { return this.$store("params").currentParamSearch; }

	public async beforeMount():Promise<void> {
	}

	public async mounted():Promise<void> {
		if(this.content != TwitchatDataTypes.ParameterPages.CLOSE) {
			this.open();
		}

		watch(() => this.$store('params').currentPage, (value:TwitchatDataTypes.ParameterPagesStringType, oldValue:TwitchatDataTypes.ParameterPagesStringType) => {
			if(value === this.history[this.history.length-1]) this.history.pop();
			if(value != TwitchatDataTypes.ParameterPages.CLOSE
			 && value != TwitchatDataTypes.ParameterPages.MAIN_MENU) {
				this.history.push(value);
			 }
			
			if(value != TwitchatDataTypes.ParameterPages.CLOSE) this.open();
			else this.close();

			if(value != TwitchatDataTypes.ParameterPages.MAIN_MENU) this.filteredParams = [];
			if(value == TwitchatDataTypes.ParameterPages.MAIN_MENU || value == this.contentAd) {
				this.$nextTick().then(()=>{
					this.adTarget = this.$refs[this.isDonor? "adDonor" : "adNoDonor"] as HTMLDivElement;
				});
			}
		});

		watch(() => this.$store("params").currentParamSearch, (value:string) => {
			if(value) this.openPage(this.contentMain);
			this.filterParams(value);
		});

	}

	public async open():Promise<void> {
		if(!this.closed) return;
		this.closed = false;
		await this.$nextTick();

		gsap.set(this.$refs.holder as HTMLElement, {x:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.5, x:"100%", ease:"back.out"});

		this.adTarget = this.$refs[this.isDonor? "adDonor" : "adNoDonor"] as HTMLDivElement;

		if(this.search) {
			await this.$nextTick();
			this.openPage(this.contentMain);
			this.filterParams(this.search);
		}
	}

	public async close():Promise<void> {
		if(this.closing || this.closed) return;
		this.closing = true;
		this.closed = true;
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.5, x:"100%", ease:"back.in", onComplete:()=> {
			this.closing = false;
			this.filteredParams = [];
			this.$store("params").closeParameters();
		}});
	}

	public back():void {
		this.history.pop();//Remove current page from history
		this.openPage(this.history.pop() || TwitchatDataTypes.ParameterPages.MAIN_MENU);
	}

	public async filterParams(search:string):Promise<void> {
		this.filteredParams = [];
		const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		const IDsDone:{[key:number]:boolean} = {};
		for (const categoryID in this.$store("params").$state) {
			const category = this.$store("params").$state[categoryID as TwitchatDataTypes.ParameterCategory] as {[ley:string]:TwitchatDataTypes.ParameterData};
			for (const prop in category) {
				const data:TwitchatDataTypes.ParameterData = category[prop];
				
				//Already done (via its parent probably), ignore it
				if(IDsDone[data.id as number] === true) continue;

				let label = data.label;
				let labelKey = data.labelKey;
				if(labelKey) label = this.$t(labelKey);

				if(label && new RegExp(safeSearch, "gi").test(label)) {
					if(data.parent) {
						for (const key in category) {
							if(category[key].id == data.parent && IDsDone[category[key].id as number] !== true) {
								IDsDone[category[key].id as number] = true;
								this.filteredParams.push(category[key]);
							}
						}
					}else{
						IDsDone[data.id as number] = true;
						this.filteredParams.push(data);
					}
				}
			}
		}
	}

	public openPage(page:TwitchatDataTypes.ParameterPagesStringType):void {
		this.$store("params").openParamsPage(page);
	}
}
</script>

<style scoped lang="less">
.parameters{
	z-index: 3;
	.modal();

	.dimmer {
		opacity: 0;
	}
	
	.holder {
		right: 0;
		left: auto;
		transform: translateX(100%);
		z-index: 1;
		max-width: 900px;

		.head {
			border-bottom: 1px solid @mainColor_normal;
			padding-bottom: .5em;
			&:has(.backBt) {
				.title {
					padding-left: 0;
				}
			}
		}

		.menu {
			max-width: 840px;
			margin: auto;
			.buttonList {
				padding: 1em;
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				justify-content: center;
				&>.button {
					box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
					flex-direction: column;
					width: 180px;
					margin: 1px;
					padding: 1em .25em;
					justify-content: flex-start;
					:deep(.icon) {
						height: 3em;
						width: 3em;
						max-height: unset;
						max-width: unset;
						margin: 0 0 .5em 0;
						object-fit: fill;
						object-position: center center;
					}
					:deep(.label) {
						white-space: normal;
					}
	
					&.beta1, &.beta2 {
						&::before {
							content: "beta";
							position: absolute;
							top: 10px;
							right: -50px;
							background-color: @mainColor_normal;
							color: @mainColor_light;
							padding: 5px 50px;
							border-radius: 10px;
							text-transform: uppercase;
							font-size: 18px;
							transform: rotate(45deg);
						}
						&.beta2 {
							&::before {
								background: linear-gradient(-90deg, fade(@mainColor_normal, 0) 0%, fade(@mainColor_normal, 50%) 30%, fade(@mainColor_normal, 50%) 100%);
							}
						}
					}
				}
			}

			.version {
				font-style: italic;
				text-align: center;
				font-size: .8em;
				margin-top: 1em;
			}
		}

		.search{
			margin:auto;
			margin-top: 1em;
			z-index: 1;
			input {
				text-align: center;
			}
		}

		.searchResult {
			.noResult {
				text-align: center;
				font-style: italic;
			}
		}

		.content {
			//This avoids black space over sticky items inside the content
			padding: 30px;
			&:not(.menu) {
				width: 100%;
				max-width: 600px;
				margin: auto;
			}

			&::-webkit-scrollbar-thumb {
				background-color: @mainColor_normal_extralight;
			}
		}
	}

	.dimmer {
		z-index: 1;
	}

}
</style>