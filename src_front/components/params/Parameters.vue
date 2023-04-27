<template>
	<div :class="classes" v-show="content != contentClose">
		<CloseButton :aria-label="$t('params.closeBt_aria')" @click="close()" />

		<div class="head">
			<button class="backBt" @click="back()" v-if="content != contentMain || search.length > 0">
				<img src="@/assets/icons/back.svg" alt="back">
			</button>
			<h1 class="title" v-if="content">{{$t('params.categories.'+content)}}</h1>
		</div>

		<div class="subHolder">
			<div class="menu">
				<!-- v-if="content == contentMain && !search || content == contentAd"> -->

				<div class="automaticMessageHolder" ref="adNoDonor"></div>

				<div class="buttonList" v-if="content != contentAd">
					<div class="search">
						<input type="text" :placeholder="$t('params.search')" v-model="$store('params').currentParamSearch" v-autofocus>
					</div>
					<Button icon="params"		@click="openPage(contentFeatures)"		:selected="content==contentFeatures">{{$t('params.categories.features')}}</Button>
					<Button icon="show"			@click="openPage(contentAppearance)"	:selected="content==contentAppearance">{{$t('params.categories.appearance')}}</Button>
					<Button icon="emergency"	@click="openPage(contentEmergency)"		:selected="content==contentEmergency">{{$t('params.categories.emergency')}}</Button>
					<Button icon="mod"			@click="openPage(contentAutomod)"		:selected="content==contentAutomod">{{$t('params.categories.automod')}}</Button>
					<Button icon="broadcast"	@click="openPage(contentTriggers)"		:selected="content==contentTriggers">{{$t('params.categories.triggers')}}</Button>
					<Button icon="count"		@click="openPage(contentCounters)"		:selected="content==contentCounters">{{$t('params.categories.counters')}}</Button>
					<Button icon="overlay"		@click="openPage(contentOverlays)"		:selected="content==contentOverlays">{{$t('params.categories.overlays')}}</Button>
					<Button icon="tts"			@click="openPage(contentTts)"			:selected="content==contentTts">{{$t('params.categories.tts')}}</Button>
					<Button icon="voice"		@click="openPage(contentVoice)"			:selected="content==contentVoice">{{$t('params.categories.voice')}}</Button>
					<Button icon="obs"			@click="openPage(contentObs)"			:selected="content==contentObs">{{$t('params.categories.obs')}}</Button>
					<Button icon="voicemod"		@click="openPage(contentVoicemod)"		:selected="content==contentVoicemod">{{$t('params.categories.voicemod')}}</Button>
					<Button icon="elgato"		@click="openPage(contentStreamdeck)"	:selected="content==contentStreamdeck">{{$t('params.categories.streamdeck')}}</Button>
					<Button icon="offline"		@click="openPage(contentConnexions)"	:selected="content==contentConnexions">{{$t('params.categories.connexions')}}</Button>
					<Button icon="user"			@click="openPage(contentAccount)"		:selected="content==contentAccount">{{$t('params.categories.account')}}</Button>
					<Button icon="info"			@click="openPage(contentAbout)"			:selected="content==contentAbout">{{$t('params.categories.about')}}</Button>
				</div>

				<div class="automaticMessageHolder" ref="adDonor"></div>

				<mark class="version" v-if="content != contentAd">v {{appVersion}}</mark>
			</div>
			
			<div class="content" v-if="(content != contentMain && content != contentAd) || search">
				<ParamsList v-if="isGenericListContent || filteredParams.length > 0" :category="content" :filteredParams="filteredParams" ref="currentContent" />
				<ParamsStreamdeck v-if="content == contentStreamdeck" ref="currentContent" />
				<ParamsOBS v-if="content == contentObs" ref="currentContent" />
				<ParamsEmergency v-if="content == contentEmergency" ref="currentContent" />
				<ParamsTTS v-if="content == contentTts" ref="currentContent" />
				<ParamsSpoiler v-if="content == contentSpoiler" ref="currentContent" />
				<ParamsAlert v-if="content == contentAlert" ref="currentContent" />
				<ParamsAccount v-if="content == contentAccount" ref="currentContent" />
				<ParamsAbout v-if="content == contentAbout" ref="currentContent" />
				<ParamsOverlays v-if="content == contentOverlays" ref="currentContent" />
				<ParamsTriggers v-if="content == contentTriggers" ref="currentContent" />
				<ParamsVoiceBot v-if="content == contentVoice" ref="currentContent" />
				<ParamsVoicemod v-if="content == contentVoicemod" ref="currentContent" />
				<ParamsAutomod v-if="content == contentAutomod" ref="currentContent" />
				<ParamsCounters v-if="content == contentCounters" ref="currentContent" />
				<ParamsConnexions v-if="content == contentConnexions" ref="currentContent" />
				<!-- Used for direct link to sponsor content from chat ads -->
				<ParamsSponsor v-if="content == contentSponsor" ref="currentContent" />

				<div class="searchResult" v-if="search">
					<div class="noResult" v-if="filteredParams.length == 0">{{ $t("params.search_no_result") }}</div>
				</div>
			</div>

			<!-- default content for large screen -->
			<div class="content default" v-else>
				<div class="automaticMessageHolder" ref="adNoDonor"></div>
				<div class="automaticMessageHolder" ref="adDonor"></div>
				<DonorState class="donorState" v-if="isDonor" />
				<div v-else>flk,fk,s,klfsd</div>
				<!-- <ParamsList :category="contentFeatures" ref="currentContent" /> -->
			</div>
		</div>

		<teleport :to="adTarget" v-if="adTarget">
			<ParamsTwitchatAd :expand="content == contentAd" @collapse="openPage('main')" />
		</teleport>
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
import type IParameterContent from './contents/IParameterContent';
import CloseButton from '../CloseButton.vue';
import DonorState from '../user/DonorState.vue';

@Component({
	components:{
		Button,
		ParamsOBS,
		ParamsTTS,
		DonorState,
		ParamsList,
		CloseButton,
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

	public filteredParams:TwitchatDataTypes.ParameterData<unknown>[] = [];
	public adTarget:HTMLDivElement | null = null;
	
	private closed:boolean = true;
	private closing:boolean = false;
	private history:TwitchatDataTypes.ParameterPagesStringType[] = [];

	public get donorLevel():number { return this.$store("auth").twitch.user.donor.level; }
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

	private keyUpHandler!:(e:KeyboardEvent) => void;
	
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

	public get classes():string[] {
		let res = ["parameters", "sidePanel"];
		if(this.content != "main") res.push("hasContent");
		return res;
	}

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

		this.keyUpHandler = (e:KeyboardEvent) => this.onKeyUp(e);
		document.addEventListener("keyup", this.keyUpHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("keyup", this.keyUpHandler);
	}

	public async open():Promise<void> {
		if(!this.closed) return;
		this.closed = false;
		this.history = [];
		await this.$nextTick();

		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.1, translateX:"115%", delay:.2, ease:"sine.out"});
		gsap.fromTo(ref, {scaleX:1.1}, {duration:.5, delay:.3, scaleX:1, clearProps:"scaleX,translateX", ease:"elastic.out(1)"});

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
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.1, scaleX:1.1, ease:"sin.in"});
		gsap.to(ref, {duration:.1, translateX:"100%", scaleX:1, delay:.1, clearProps:"all", ease:"sin.out", onComplete:() => {
			this.closing = false;
			this.filteredParams = [];
			this.$store("params").closeParameters();
		}});
	}

	public back():void {
		const content = this.$refs.currentContent as IParameterContent;
		this.$store("params").currentParamSearch = "";
		
		//Check if current content wants to override the navigation
		if(content && content.onNavigateBack() === true) return;

		this.history.pop();//Remove current page from history
		this.openPage(this.history.pop() || TwitchatDataTypes.ParameterPages.MAIN_MENU);
	}

	public async filterParams(search:string):Promise<void> {
		this.filteredParams = [];
		const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		const IDsDone:{[key:number]:boolean} = {};
		for (const categoryID in this.$store("params").$state) {
			const category = this.$store("params").$state[categoryID as TwitchatDataTypes.ParameterCategory] as {[ley:string]:TwitchatDataTypes.ParameterData<unknown>};
			for (const prop in category) {
				const data:TwitchatDataTypes.ParameterData<unknown> = category[prop];
				
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

	private onKeyUp(e:KeyboardEvent):void {
		if(e.key.toLowerCase() == "escape") {
			this.close();
		}
	}
}
</script>

<style scoped lang="less">
.parameters{
	z-index: 3;
	left: auto;
	top: 0;
	right: 0;
	transform-origin: bottom right;
	z-index: 2;
	padding: 1em;
	position: absolute;
	width: 100%;
	height: 100%;
	box-sizing: border-box;

	.closebutton {
		height: 3.5em;
	}

	.head {
		display: none;
		padding: 0 3em 1em 3em;
		border-bottom: 1px solid var(--color-dark-extralight);

		.backBt {
			position: absolute;
			top: 0;
			left: 0;
			padding: 1em;
			height: 3.5em;
			img {
				height: 1em;
				transition: transform .15s;
			}
			&:hover {
				img {
					transform: scale(1.2);
				}
			}
		}
	}

	box-sizing: border-box;
	.subHolder {
		//This avoids black space over sticky items inside the content
		// padding: 30px;
		box-sizing: border-box;
		gap: 1em;
		height: 100%;
		display: flex;
		flex-direction: row;
		align-items: stretch;
		justify-content: stretch;
		justify-items: stretch;
		flex: 1;
		
		.menu {
			height: 100%;
			display: flex;
			flex-direction: column;
			gap: 1em;
			width: fit-content;
			border-right: 1px solid var(--color-light-fader);
			padding-right: 5px;
			overflow-y: auto;
			.automaticMessageHolder {
				display: none;
			}
			.buttonList {
				display: flex;
				flex-direction: column;
				justify-content: center;
				gap: 10px;
				&>.button {
					flex-wrap: nowrap;
					&.beta1, &.beta2 {
						&::before {
							content: "beta";
							position: absolute;
							top: 10px;
							right: -50px;
							background-color: var(--mainColor_normal);
							color: var(--mainColor_light);
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
				display: block;
				margin: 0 auto;
				padding: .5em;
				font-style: italic;
				font-size: .8em;
			}
		}

		.content {
			width: 100%;
			margin: 2.5em auto 0 auto;
			padding-right: 10px;
			max-height: 100%;
			overflow: auto;
			&.default {
				.donorState {
					margin-top: 1em;
				}
			}
			&>* {
				max-width: 600px;
				margin: auto;
			}
		}
	}

	.search{
		margin:auto;
		z-index: 1;
		input {
			text-align: center;
			width: 100%;
		}
	}

	.searchResult {
		.noResult {
			font-style: italic;
			text-align: center;
			margin-top: 1em;
		}
	}

}

@media only screen and (max-width: 800px) {
	.parameters {
		.head {
			display: block;
		}
		.subHolder {
			padding:0 1em;
			.menu {
				border: none;
				.automaticMessageHolder {
					display: block;
				}
				.search {
					display: none;
				}
				.buttonList {
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					justify-content: center;
					gap: 10px;
					width: 100%;
					&>.button {
						width: 180px;
						flex-direction: column;
						border-radius: var(--border-radius);
						// :deep(.background) {
						// 	background-color: var(--color-dark-extralight);
						// }
						:deep(.icon) {
							height: 2em;
							width: 2em;
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
								background-color: var(--mainColor_normal);
								color: var(--mainColor_light);
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
			}

			.content {
				margin-top: 0;
				&.default {
					display: none;
				}
			}
		}

		&.hasContent {
			.menu {
				display: none;
			}

			.content {
				.title {
					display: none;
				}
			}
		}
	}
}

@media only screen and (max-width: 400px) {
	.parameters {
		.subHolder {
			.menu {
				margin: 0 auto;
				.buttonList {
					flex-direction: column;
					flex-wrap: nowrap;
					&>.button {
						width: unset;
						flex-direction: unset;
						:deep(.icon) {
							height: 1em;
							width: 1em;
							max-height: unset;
							max-width: unset;
							margin: 0 0 .5em 0;
							object-fit: fill;
							object-position: center center;
						}
						:deep(.label) {
							white-space: normal;
						}
					}
				}
			}
		}
	}
}
</style>