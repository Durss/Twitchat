<template>
	<div :class="classes" v-show="!closed">
		<div class="menu">
			<!-- v-if="content == contentMain && !search || content == contentAd"> -->
				<div class="head">
					<h1 class="title" v-if="content">{{$t('params.categories.'+content)}}</h1>
					<CloseButton :aria-label="$t('params.closeBt_aria')" @click="close()" />
				</div>
			
				<div class="automaticMessageHolder" v-if="!isDonor">
					<ParamsTwitchatAd :expand="content == contentAd" @collapse="openPage('main')" />
				</div>

				<div class="buttonList">
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
					<Button icon="heat"			@click="openPage(contentHeat)"			:selected="content==contentHeat">{{$t('params.categories.heat')}}</Button>
					<Button icon="voicemod"		@click="openPage(contentVoicemod)"		:selected="content==contentVoicemod">{{$t('params.categories.voicemod')}}</Button>
					<Button icon="elgato"		@click="openPage(contentStreamdeck)"	:selected="content==contentStreamdeck">{{$t('params.categories.streamdeck')}}</Button>
					<Button icon="goxlr"		@click="openPage(contentGoXLR)"			:selected="content==contentGoXLR">{{$t('params.categories.goxlr')}}</Button>
					<Button icon="offline"		@click="openPage(contentConnexions)"	:selected="content==contentConnexions">{{$t('params.categories.connexions')}}</Button>
					<Button icon="user"			@click="openPage(contentAccount)"		:selected="content==contentAccount">{{$t('params.categories.account')}}</Button>
					<Button icon="info"			@click="openPage(contentAbout)"			:selected="content==contentAbout">{{$t('params.categories.about')}}</Button>
				</div>

				<div class="automaticMessageHolder" v-if="isDonor">
					<ParamsTwitchatAd :expand="content == contentAd" @collapse="openPage('main')" />
				</div>

				<ThemeSelector class="themeSelector" />

				<mark class="version">v {{appVersion}}</mark>
			</div>
			
		<div class="contentHolder">
			<div class="head">
				<button class="backBt" @click="back()" v-if="content != contentMain || search.length > 0">
					<Icon name="back"/>
				</button>
				<h1 class="title" v-if="content">{{$t('params.categories.'+content)}}</h1>
				<CloseButton :aria-label="$t('params.closeBt_aria')" @click="close()" />
			</div>

			<div class="content" v-if="(content != contentMain && content != contentAd) || search">
				<div class="search" v-if="search || content == contentAppearance || content == contentFeatures">
					<input type="text" :placeholder="$t('params.search')" v-model="$store('params').currentParamSearch" v-autofocus>
				</div>
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
				<ParamsHeat v-if="content == contentHeat" ref="currentContent" />
				<!-- Used for direct link to sponsor content from chat ads -->
				<ParamsSponsor v-if="content == contentSponsor" ref="currentContent" />

				<div class="searchResult" v-if="search">
					<div class="noResult" v-if="filteredParams.length == 0">{{ $t("params.search_no_result") }}</div>
				</div>
			</div>

			<!-- default content for large screen -->
			<div class="content default" v-else>
				<div class="automaticMessageHolder">
					<ParamsTwitchatAd :expand="content == contentAd" @collapse="openPage('main')" />
				</div>
				<DonorState class="donorState" v-if="isDonor && content != contentAd" />
				<ParamsSponsor v-else-if="content != contentAd" />
			</div>
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
import type IParameterContent from './contents/IParameterContent';
import CloseButton from '../CloseButton.vue';
import DonorState from '../user/DonorState.vue';
import ThemeSelector from '../ThemeSelector.vue';
import ParamsHeat from './contents/ParamsHeat.vue';

@Component({
	components:{
		Button,
		ParamsOBS,
		ParamsTTS,
		DonorState,
		ParamsHeat,
		ParamsList,
		CloseButton,
		ParamsAbout,
		ParamsAlert,
		ParamsAutomod,
		ParamsSpoiler,
		ParamsAccount,
		ParamsSponsor,
		ThemeSelector,
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
	public closed:boolean = true;
	
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
	public get contentHeat():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.HEAT; }
	public get contentVoicemod():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.VOICEMOD; }
	public get contentSponsor():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.SPONSOR; }
	public get contentStreamdeck():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.STREAMDECK; }
	public get contentGoXLR():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.GOXLR; }
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

	private keyDownHandler!:(e:KeyboardEvent) => void;
	
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
		if(this.content != "main" || this.search) res.push("hasContent");
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
			
			if(value == TwitchatDataTypes.ParameterPages.CLOSE) this.close();
			else this.open();

			if(value != TwitchatDataTypes.ParameterPages.MAIN_MENU) this.filteredParams = [];
		});

		watch(() => this.$store("params").currentParamSearch, (value:string) => {
			if(value) this.openPage(this.contentMain);
			this.filterParams(value);
		});

		this.keyDownHandler = (e:KeyboardEvent) => this.onKeyDown(e);
		document.addEventListener("keydown", this.keyDownHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("keydown", this.keyDownHandler);
	}

	public async open():Promise<void> {
		if(!this.closed) return;
		this.history = [];
		await this.$nextTick();
		
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.1, translateX:"115%", delay:.2, ease:"sine.out"});
		gsap.fromTo(ref, {scaleX:1.1}, {duration:.5, delay:.3, scaleX:1, clearProps:"scaleX,translateX", ease:"elastic.out(1)"});

		this.closed = false;

		if(this.search) {
			await this.$nextTick();
			this.openPage(this.contentMain);
			this.filterParams(this.search);
		}
	}

	public async close():Promise<void> {
		if(this.closing || this.closed) return;
		this.closing = true;
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.1, scaleX:1.1, ease:"sin.in"});
		gsap.to(ref, {duration:.1, translateX:"100%", scaleX:1, delay:.1, clearProps:"all", ease:"sin.out", onComplete:() => {
			this.closing = false;
			this.closed = true;
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

	private onKeyDown(e:KeyboardEvent):void {
		if(this.closed) return;
		const node = document.activeElement?.nodeName;
		if(e.key?.toLowerCase() == "escape" && node != "INPUT") {
			this.close();
		}
	}
}
</script>

<style scoped lang="less">
.parameters{
	left: auto;
	top: 0;
	right: 0;
	transform-origin: bottom right;
	z-index: 3;
	padding: 1em;
	position: absolute;
	width: 100%;
	height: 100%;
	max-height: calc(var(--vh) - var(--chat-form-height));
	box-sizing: border-box;
	display:flex;
	flex-direction:row;

	.head {
		position:relative;
		margin-top: -1em;
		display: flex;
		width: 100%;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		.title {
			display: none;
			flex-grow: 1;
			text-align: center;
		}

		.closebutton {
			position: unset;
		}

		.backBt {
			padding: 1em;
			.icon {
				height: 1em;
				transition: transform .15s;
			}
			&:hover {
				.icon {
					transform: scale(1.2);
				}
			}
		}
	}
	
	.automaticMessageHolder {
		&:empty {
			display: none;
		}
	}

	.menu {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 1em;
		width: fit-content;
		border-right: 1px solid var(--splitter-color);
		padding-right: 1em;
		overflow-y: auto;
		.head {
			display:none;
		}
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
				overflow: hidden;
				&.beta {
					&::before {
						content: "beta";
						z-index: 1;
						position: absolute;
						top: 2px;
						right: -25px;
						background-color: var(--color-alert);
						color: var(--color-light);
						padding: 5px 30px;
						text-transform: uppercase;
						font-size: .7em;
						font-weight: bold;
						transform: rotate(45deg);
					}
				}
			}
		}

		.themeSelector {
			display: block;
			margin: 0 auto;
			flex-shrink: 0;
		}

		.version {
			display: block;
			margin: 0 auto;
			padding: .5em;
			font-style: italic;
			font-size: .8em;
		}
	}

	.contentHolder {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		.content {
			margin: 0 auto;
			margin-top: -1em;
			padding: 0 1em;
			flex-grow: 1;
			overflow: auto;
			width: 100%;
			&.default {
				gap: 1em;
				display: flex;
				flex-direction: column;
				.donorState {
					margin-top: 1em;
				}
			}
			&>* {
				max-width: 600px;
				margin: 0 auto;
			}

			.search {
				display: none;
				width: 100%;
				margin-bottom: 1em;
				input {
					// min-width: 250px;
					width: 100%;
					max-width: 250px;
					margin: auto;
					display: block;
				}
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

	&:not(.hasContent) {
		.head {
			justify-content: flex-end;
			.title {
				padding-left: 2.5em;
			}
		}
	}
}

@media only screen and (max-width: 800px) {
	.parameters {
		max-height: var(--vh);
		.head {
			border-bottom: 1px solid var(--color-dark-extralight);
			.title {
				display: block;
			}
		}
		.menu {
			border: none;
			width: 100%;
			.head {
				display:flex;
				.title {
					display: block;
				}
			}
			.automaticMessageHolder {
				display: block !important;
				margin: 0 auto;
			}
			.search {
				// display: none;
				width: 100%;
				margin-bottom: 1em;
				input {
					// min-width: 250px;
					width: 100%;
					max-width: 250px;
					margin: auto;
					display: block;
				}
			}
			.buttonList {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				justify-content: center;
				gap: 4px;
				width: 100%;
				margin: auto;
				&>.button {
					width: 180px;
					flex-direction: column;
					border-radius: var(--border-radius);
					:deep(.icon) {
						height: 2em;
						width: 2em;
						max-height: unset;
						max-width: unset;
						object-fit: fill;
						object-position: center center;
						margin: 0 0 .5em 0;
					}
					:deep(.label) {
						white-space: normal;
					}
					&.beta {
						&::before {
							top: 10px;
							right: -50px;
							padding: 5px 50px;
							font-size: 18px;
						}
					}
				}
			}
		}

		.contentHolder {
			display:none;
			.content {
				margin-top: 1em;
				padding: 0;

				.search {
					display: block;
				}
			}
		}

		&.hasContent {
			.menu {
				display: none;
			}
			.contentHolder {
				display:flex;
			}
		}
	}
}

@media only screen and (max-width: 410px) {
	.parameters {
		.menu {
			margin: 0 auto;
			.buttonList {
				flex-direction: column;
				flex-wrap: nowrap;
				max-width: 250px;
				&>.button {
					width: unset;
					flex-direction: unset;
					:deep(.icon) {
						height: 1em;
						width: 1em;
						margin: 0;
					}
					&.beta {
						&::before {
							top: 2px;
							right: -25px;
							padding: 5px 30px;
							font-size: .7em;
						}
					}
				}
			}
		}
	}
}
</style>