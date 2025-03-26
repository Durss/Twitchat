<template>
	<div :class="classes" v-show="!closed">
		<div class="menu">
			<div class="head" v-if="content == contentMain && !search || content == contentAd">
				<h1 class="title">{{$t('params.categories.'+content)}}</h1>
				<ClearButton :aria-label="$t('params.closeBt_aria')" @click="close()" />
			</div>

			<div class="static">
				<div class="automaticMessageHolder" v-if="!isDonor && !closed">
					<ParamsTwitchatAd :expand="content == contentAd" @collapse="openPage('main')" />
				</div>

				<div class="search">
					<input type="text" :placeholder="$t('params.search')" v-model="$store.params.currentParamSearch" v-autofocus ref="searchField">
				</div>
			</div>

			<div class="scrollable">
				<VueDraggable class="buttonList"
				v-model="pinnedMenuEntries"
				:group="{name:'menu_sections'}"
				animation="250"
				@end="onEditMenu()">
					<TTButton v-for="element in pinnedMenuEntries" @click="openPage(element.page, true)"
						class="menuItem"
						v-newflag="element.newflag"
						:class="[(element.premium ? 'premiumIndicator '+element.icon : element.icon)].filter(v=>v!='').join(' ')"
						:icon="element.icon"
						:primary="content==element.page"
						:secondary="element.theme == 'secondary'"
						:premium="element.theme == 'premium'">{{$t(element.labelKey)}}</TTButton>
				</VueDraggable>

				<ToggleBlock :title="$t('params.more_params')" small :open="false" v-newflag="newFlagMoreParams">
					<div class="dragInfo"><Icon name="hand" />{{ $t("params.customize_sections") }}</div>
					<VueDraggable class="buttonList"
					v-model="unpinnedMenuEntries"
					:group="{name:'menu_sections'}"
					animation="250"
					@end="onEditMenu()">
						<TTButton v-for="element in unpinnedMenuEntries" @click="openPage(element.page, true)"
							class="menuItem"
							v-newflag="element.newflag"
							:class="[(element.premium ? 'premiumIndicator '+element.icon : element.icon)].filter(v=>v!='').join(' ')"
							icon="dragZone"
							:primary="content==element.page"
							:secondary="element.theme == 'secondary'"
							:premium="element.theme == 'premium'">{{$t(element.labelKey)}}</TTButton>
					</VueDraggable>
				</ToggleBlock>

				<div class="buttonList">
					<TTButton @click="openPage(button_donate.page, true)"
						class="menuItem"
						v-newflag="button_donate.newflag"
						:class="[(button_donate.premium ? 'premiumIndicator '+button_donate.icon : button_donate.icon)].filter(v=>v!='').join(' ')"
						:icon="button_donate.icon"
						:primary="content==button_donate.page"
						:secondary="button_donate.theme == 'secondary'"
						:premium="button_donate.theme == 'premium'">{{$t(button_donate.labelKey)}}</TTButton>

					<TTButton @click="openPage(button_premium.page, true)"
						class="menuItem"
						v-newflag="button_premium.newflag"
						:class="[(button_premium.premium ? 'premiumIndicator '+button_premium.icon : button_premium.icon)].filter(v=>v!='').join(' ')"
						:icon="button_premium.icon"
						:primary="content==button_premium.page"
						:secondary="button_premium.theme == 'secondary'"
						:premium="button_premium.theme == 'premium'">{{$t(button_premium.labelKey)}}</TTButton>
				</div>

				<div class="automaticMessageHolder" v-if="isDonor && !closed">
					<ParamsTwitchatAd :expand="content == contentAd" @collapse="openPage('main')" />
				</div>

				<ThemeSelector class="themeSelector" />

				<TTButton :href="$config.DISCORD_URL" type="link" target="_blank" class="discordBt" transparent big icon="discord" />

				<mark class="version">v {{appVersion}}</mark>
			</div>
		</div>

		<div class="contentHolder" id="paramContentHolder">
			<div class="head">
				<ClearButton class="backBt" icon="back" @click="back()" v-if="content != contentMain || search.length > 0" />
				<h1 class="title" v-if="content">{{$t('params.categories.'+content)}}</h1>
				<ClearButton :aria-label="$t('params.closeBt_aria')" @click="close()" />
			</div>

			<div class="content" v-if="(content != contentMain && content != contentAd) || search" id="paramContentScrollableHolder">
				<div class="search" v-if="search || content == contentAppearance || content == contentFeatures">
					<input type="text" :placeholder="$t('params.search')" v-model="$store.params.currentParamSearch" v-autofocus ref="searchField">
				</div>
				<ParamsList v-if="isGenericListContent || filteredParams.length > 0" :category="content" :filteredParams="filteredParams" ref="currentContent" />
				<ParamsEmergency v-if="content == contentEmergency" ref="currentContent" />
				<ParamsTTS v-if="content == contentTts" ref="currentContent" />
				<ParamsSpoiler v-if="content == contentSpoiler" ref="currentContent" />
				<ParamsAlert v-if="content == contentAlert" ref="currentContent" />
				<ParamsAccount v-if="content == contentAccount" ref="currentContent" />
				<ParamsAbout v-if="content == contentAbout" ref="currentContent" />
				<ParamsOverlays v-if="content == contentOverlays" ref="currentContent" />
				<ParamsTriggers v-if="content == contentTriggers" ref="currentContent" />
				<ParamsVoiceBot v-if="content == contentVoice" ref="currentContent" />
				<ParamsAutomod v-if="content == contentAutomod" ref="currentContent" />
				<ParamsCounters v-if="content == contentCounters" ref="currentContent" />
				<ParamsConnections v-if="content == contentConnexions" ref="currentContent" />
				<ParamsPremium v-if="content == contentPremium" ref="currentContent" />
				<ParamsDonate v-if="content == contentDonate" ref="currentContent" />
				<ParamsValues v-if="content == contentValues" ref="currentContent" />
				<ParamsTimer v-if="content == contentTimers" ref="currentContent" />

				<div class="searchResult" v-if="search">
					<div class="noResult" v-if="filteredParams.length == 0">{{ $t("params.search_no_result") }}</div>
				</div>
			</div>

			<!-- default content for large screen -->
			<div class="content default" v-else>
				<div class="automaticMessageHolder">
					<ParamsTwitchatAd :expand="content == contentAd && !closed" @collapse="openPage('main')" />
				</div>
				<DonorState class="donorState" v-if="isDonor && content != contentAd" />
				<ParamsPremium v-else-if="content != contentAd" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from '@vue/runtime-core';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import ThemeSelector from '../ThemeSelector.vue';
import DonorState from '../user/DonorState.vue';
import type IParameterContent from './contents/IParameterContent';
import ParamsAbout from './contents/ParamsAbout.vue';
import ParamsAccount from './contents/ParamsAccount.vue';
import ParamsAlert from './contents/ParamsAlert.vue';
import ParamsAutomod from './contents/ParamsAutomod.vue';
import ParamsConnections from './contents/ParamsConnections.vue';
import ParamsCounters from './contents/ParamsCounters.vue';
import ParamsDonate from './contents/ParamsDonate.vue';
import ParamsEmergency from './contents/ParamsEmergency.vue';
import ParamsList from './contents/ParamsList.vue';
import ParamsOverlays from './contents/ParamsOverlays.vue';
import ParamsPremium from './contents/ParamsPremium.vue';
import ParamsSpoiler from './contents/ParamsSpoiler.vue';
import ParamsTTS from './contents/ParamsTTS.vue';
import ParamsTriggers from './contents/ParamsTriggers.vue';
import ParamsTwitchatAd from './contents/ParamsTwitchatAd.vue';
import ParamsValues from './contents/ParamsValues.vue';
import ParamsVoiceBot from './contents/ParamsVoiceBot.vue';
import ToggleBlock from '../../components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import Config from '@/utils/Config';
import { VueDraggable } from 'vue-draggable-plus';
import ParamsTimer from './contents/ParamsTimer.vue';

@Component({
	components:{
		TTButton,
		ParamsTTS,
		DonorState,
		ParamsList,
		ToggleBlock,
		ClearButton,
		ParamsAbout,
		ParamsAlert,
		ParamsTimer,
		VueDraggable,
		ParamsDonate,
		ParamsValues,
		ParamsPremium,
		ParamsAutomod,
		ParamsSpoiler,
		ParamsAccount,
		ThemeSelector,
		ParamsCounters,
		ParamsOverlays,
		ParamsTriggers,
		ParamsVoiceBot,
		ParamsEmergency,
		ParamsTwitchatAd,
		ParamsConnections,
	}
})

class Parameters extends Vue {

	public closed:boolean = true;
	public showCTA:boolean = true;
	public showNewFlagOnPin:boolean = false;
	public filteredParams:TwitchatDataTypes.ParameterData<unknown>[] = [];
	public pinnedMenuEntries:MenuEntry[] = [];
	public unpinnedMenuEntries:MenuEntry[] = [];
	public newFlagMoreParams:{id:string, date:number}|null = null;

	public button_donate:MenuEntry = {pinned:true, icon:"coin", page:TwitchatDataTypes.ParameterPages.DONATE, labelKey:'params.categories.donate', newflag:{date:1693519200000, id:'params_donate'}, theme:"secondary"};
	public button_premium:MenuEntry = {pinned:true, icon:"premium", page:TwitchatDataTypes.ParameterPages.PREMIUM, labelKey:'params.categories.premium', newflag:{date:1693519200000, id:'params_premium'}, theme:"premium"};

	private closing:boolean = false;
	private keydownCaptureTarget:Element|null = null;
	private history:TwitchatDataTypes.ParameterPagesStringType[] = [];

	public get isDonor():boolean { return this.$store.auth.donorLevel > -1 || this.$store.auth.isPremium; }
	public get contentMain():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.MAIN_MENU; }
	public get contentAd():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.AD; }
	public get contentAppearance():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.APPEARANCE; }
	public get contentAccount():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ACCOUNT; }
	public get contentAbout():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ABOUT; }
	public get contentFeatures():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.FEATURES; }
	public get contentDonate():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.DONATE; }
	public get contentTriggers():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TRIGGERS; }
	public get contentCounters():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.COUNTERS; }
	public get contentValues():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.VALUES; }
	public get contentOverlays():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OVERLAYS; }
	public get contentEmergency():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.EMERGENCY; }
	public get contentSpoiler():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.SPOILER; }
	public get contentAlert():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ALERT; }
	public get contentTts():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TTS; }
	public get contentVoice():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.VOICE; }
	public get contentAutomod():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.AUTOMOD; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNECTIONS; }
	public get contentPremium():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.PREMIUM; }
	public get contentTimers():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TIMERS; }

	private keyDownHandler!:(e:KeyboardEvent) => void;
	private keyDownCaptureHandler!:(e:KeyboardEvent) => void;
	private menuEntries:MenuEntry[] = [
		{pinned:true, icon:"params", page:TwitchatDataTypes.ParameterPages.FEATURES, labelKey:'params.categories.features', newflag:{date:Config.instance.NEW_FLAGS_DATE_V11, id:'params_chatfeatures_1'}},
		{pinned:true, icon:"show", page:TwitchatDataTypes.ParameterPages.APPEARANCE, labelKey:'params.categories.appearance', newflag:{date:Config.instance.NEW_FLAGS_DATE_V13, id:'params_chatappearance_1'}},
		{pinned:true, icon:"overlay", page:TwitchatDataTypes.ParameterPages.OVERLAYS, labelKey:'params.categories.overlays', newflag:{date:Config.instance.NEW_FLAGS_DATE_V13, id:'params_overlays_3'}},
		{pinned:true, icon:"offline", page:TwitchatDataTypes.ParameterPages.CONNECTIONS, labelKey:'params.categories.connexions', newflag:{date:Config.instance.NEW_FLAGS_DATE_V16, id:'params_connexion_2'}},
		{pinned:false, icon:"broadcast", page:TwitchatDataTypes.ParameterPages.TRIGGERS, labelKey:'params.categories.triggers', newflag:{date:Config.instance.NEW_FLAGS_DATE_V11, id:'paramsparams_triggers_1'}},
		{pinned:false, icon:"placeholder", page:TwitchatDataTypes.ParameterPages.VALUES, labelKey:'params.categories.values', newflag:{date:Config.instance.NEW_FLAGS_DATE_V11, id:'paramsparams_values'}},
		{pinned:true, icon:"count", page:TwitchatDataTypes.ParameterPages.COUNTERS, labelKey:'params.categories.counters'},
		{pinned:false, icon:"tts", page:TwitchatDataTypes.ParameterPages.TTS, labelKey:'params.categories.tts'},
		{pinned:false, icon:"emergency", page:TwitchatDataTypes.ParameterPages.EMERGENCY, labelKey:'params.categories.emergency'},
		{pinned:false, icon:"mod", page:TwitchatDataTypes.ParameterPages.AUTOMOD, labelKey:'params.categories.automod'},
		{pinned:false, icon:"voice", page:TwitchatDataTypes.ParameterPages.VOICE, labelKey:'params.categories.voice'},
		{pinned:true, icon:"user", page:TwitchatDataTypes.ParameterPages.ACCOUNT, labelKey:'params.categories.account'},
		{pinned:false, icon:"info", page:TwitchatDataTypes.ParameterPages.ABOUT, labelKey:'params.categories.about', newflag:{date:1693519200000, id:'params_about'}},
		{pinned:false, icon:"timer", page:TwitchatDataTypes.ParameterPages.TIMERS, labelKey:'params.categories.timers', newflag:{date:Config.instance.NEW_FLAGS_DATE_V16, id:'params_timers'}},
	];

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

	public get content():TwitchatDataTypes.ParameterPagesStringType { return this.$store.params.currentPage; }

	public get search():string { return this.$store.params.currentParamSearch; }

	public get classes():string[] {
		let res = ["parameters", "sidePanel"];
		if(this.content != "main" || this.search) res.push("hasContent");
		return res;
	}

	public async beforeMount():Promise<void> {
		this.showCTA = DataStore.get(DataStore.PARAMS_SECTIONS_CTA) !== "true";

		const sectionsJSON = DataStore.get(DataStore.PARAMS_SECTIONS);
		if(sectionsJSON) {
			const sections = JSON.parse(sectionsJSON);
			if(!Array.isArray(sections)) return;
			//Sort entries and set pinned states
			for (let i = 0; i < sections.length; i++) {
				const item = sections[i];
				const entry = this.menuEntries.find(v => v.page == item.id);
				if(!entry) continue;
				entry.pinned = item.pinned;
				if(entry.pinned) {
					this.pinnedMenuEntries.push(entry)
				}else{
					this.unpinnedMenuEntries.push(entry)
				}
			}
		}

		//Check if any entry from the "menuEntries" is missing from the final
		//list. Add them to the beginning if so.
		for (let i = 0; i < this.menuEntries.length; i++) {
			const item = this.menuEntries[i];
			if(this.pinnedMenuEntries.findIndex(v=>v.page == item.page) > -1) continue;
			if(this.unpinnedMenuEntries.findIndex(v=>v.page == item.page) > -1) continue;
			//Missing item, add it to the top
			if(item.pinned) {
				this.pinnedMenuEntries.unshift(item);
			}else{
				this.unpinnedMenuEntries.unshift(item);
				this.newFlagMoreParams = item.newflag ?? null;
			}
		}
	}

	public async mounted():Promise<void> {
		if(this.content != TwitchatDataTypes.ParameterPages.CLOSE) {
			this.open();
		}

		watch(() => this.$store.params.currentPage, (value:TwitchatDataTypes.ParameterPagesStringType, oldValue:TwitchatDataTypes.ParameterPagesStringType) => {
			if(value === this.history[this.history.length-1]) this.history.pop();
			if(value != TwitchatDataTypes.ParameterPages.CLOSE
			&& value != TwitchatDataTypes.ParameterPages.MAIN_MENU) {
				this.history.push(value);
			}

			if(value == TwitchatDataTypes.ParameterPages.CLOSE) this.close();
			else this.open();

			if(value != TwitchatDataTypes.ParameterPages.MAIN_MENU) this.filteredParams = [];
		});

		watch(() => this.$store.params.currentParamSearch, (value:string) => {
			if(value) this.openPage(this.contentMain);
			this.filterParams(value);
		});

		this.keyDownHandler = (e:KeyboardEvent) => this.onKeyDown(e);
		this.keyDownCaptureHandler = (e:KeyboardEvent) => this.onKeyDown(e, true);
		document.addEventListener("keydown", this.keyDownHandler);
		document.addEventListener("keydown", this.keyDownCaptureHandler, {capture:true});

		this.showNewFlagOnPin = this.$el.querySelectorAll(".menuItem.newFlag").length > 0
	}

	public beforeUnmount():void {
		document.removeEventListener("keydown", this.keyDownHandler);
		document.removeEventListener("keydown", this.keyDownCaptureHandler, {capture:true});
	}

	public async open():Promise<void> {
		if(!this.closed) return;
		this.history = [];
		await this.$nextTick();

		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.1, translateX:"115%", delay:.2, ease:"sine.out", onComplete:()=>{
			//Give focus to search field only after transition complete otherwise the browser
			//will bring it into view before which causes glitches on opening animation
			(this.$refs.searchField as HTMLInputElement)?.focus();
		}});
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
			this.$store.params.closeParameters();
		}});
	}

	public back():void {
		const content = this.$refs.currentContent as IParameterContent;
		this.$store.params.currentParamSearch = "";

		//Check if current content wants to override the navigation
		if(content && content.onNavigateBack && content.onNavigateBack() === true) return;

		this.history.pop();//Remove current page from history
		this.openPage(this.history.pop() || TwitchatDataTypes.ParameterPages.MAIN_MENU);
	}

	/**
	 * Called when searching for a parameter
	 * @param search
	 */
	public async filterParams(search:string):Promise<void> {
		this.filteredParams = [];
		const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		const IDsDone:{[key:number]:boolean} = {};
		for (const categoryID in this.$store.params.$state) {
			const category = this.$store.params.$state[categoryID as TwitchatDataTypes.ParameterCategory] as {[ley:string]:TwitchatDataTypes.ParameterData<unknown>};
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

	/**
	 * Opens up a parameter section
	 */
	public openPage(page:TwitchatDataTypes.ParameterPagesStringType, blockIfEditing:boolean = false):void {
		// if(blockIfEditing && this.editPins) return;

		const content = this.$refs.currentContent as IParameterContent;
		//Check if current content wants to override the navigation
		if(content && content.reload) content.reload();

		this.$store.params.openParamsPage(page);
	}

	/**
	 * Called when menu items are sorted
	 */
	public onEditMenu():void {

		const sections:RawMenuEntry[] = this.pinnedMenuEntries.map(v=> {
			return {id:v.page, pinned:true};
		}).concat(this.unpinnedMenuEntries.map(v=> {
			return {id:v.page, pinned:false};
		}));
		DataStore.set(DataStore.PARAMS_SECTIONS, sections);
	}

	/**
	 * Called when CTA is clicked
	 */
	public hideCTA():void {
		DataStore.set(DataStore.PARAMS_SECTIONS_CTA, true);
		this.showCTA = false;
	}

	/**
	 * Closes the window on escape if the focus isn't on an input.
	 * The "keydownCaptureTarget" is here to store the currently focused
	 * element with "capture" flag so it's called before the browser
	 * natively removes focus from the field.
	 *
	 * This avoids a tricky situation when user is writing on a field
	 * and presses escape key. If we were listening to the keydown event
	 * without the capture flag, the browser would first remove the focus
	 * from the field, then call this function and the "activeElement"
	 * wouldn't be the field anymore.
	 * To avoid that, we listen to the keyDown event with capture flag
	 * so it's called before the field loses focus.
	 * BUT, if we were only doing this, a child component wouldn't be
	 * able to stop the escape key propagation (ex: the heat screen editor)
	 * so the window wouldn't close if other things than just input
	 * elements had focus.
	 * The heat editor allows to drag areas and unselect them with the
	 * escape key. This cannot generically be handle here, the event
	 * needs to be stoped from the editor itself.
	 *
	 * This is why we only register the focused element on capture and
	 * use it on a non-capture event. This fixes both above situations.
	 *
	 * @param e
	 * @param isCapture
	 */
	private onKeyDown(e:KeyboardEvent, isCapture:boolean = false):void {
		if(this.closed) return;
		if(isCapture) {
			this.keydownCaptureTarget = document.activeElement;
			return;
		}
		const node = this.keydownCaptureTarget ?? document.activeElement?.nodeName;
		const isContentEditable = document.activeElement?.getAttribute("contenteditable");
		if(e.key?.toLowerCase() == "escape" && node != "INPUT" && node != "TEXTAREA" && !isContentEditable) {
			this.close();
		}
	}
}

interface MenuEntry {
	pinned:boolean;
	icon:string;
	labelKey:string;
	page:TwitchatDataTypes.ParameterPagesStringType;
	theme?:"secondary"|"premium";
	premium?:true;
	newflag?:{date:number, id:string};
}

interface RawMenuEntry {
	id:TwitchatDataTypes.ParameterPagesStringType;
	pinned:boolean;
}
export default toNative(Parameters);
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
			color: inherit;
		}

		.backBt {
			left: 0;
			right: auto;
		}
	}
	.automaticMessageHolder {
		display: none !important;
		margin: 0 auto;
		&:empty {
			display: none;
		}
	}
	.search{
		margin:auto;
		z-index: 1;
		align-self: center;
		input {
			text-align: center;
			width: 100%;
			max-width: 250px;
			margin: auto;
			display: block;
		}
	}

	.static {
		display: flex;
		flex-direction: column;
		padding-right: 1em;
	}

	.menu {
		height: 100%;
		display: flex;
		flex-direction: column;
		width: fit-content;
		border-right: 1px solid var(--splitter-color);
		.head {
			display:none;
		}

		.scrollable {
			display: flex;
			flex-direction: column;
			padding-top: .5em;
			gap: 1em;
			overflow-x: visible;
			overflow-y: auto;
			padding-right: 1em;
			height: 100%;

			.dragInfo {
				// width: 280px;
				margin-bottom: .5em;
				font-style: italic;
				text-align: center;
				.icon {
					height: 1em;
					vertical-align: bottom;
					margin-right: .25em;
				}
			}

			.buttonList {
				width: 100%;
				display: flex;
				flex-direction: column;
				justify-content: center;
				gap: 10px;
				&>.button {
					flex: 1;
					flex-wrap: nowrap;
					transform-origin: center right;
					&.beta {
						overflow: hidden;
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
					&.youtube {
						// Youtube requires their logo to be at least 20px high.. let's fuck up UI for them \o/
						:deep(.icon) {
							min-height: 20px;
							max-width: unset;
							width: unset;
						}
					}

					&.premiumIndicator {
						:deep(.background) {
							border-left: 3px solid var(--color-premium);
						}
					}
				}
			}

			.themeSelector {
				display: block;
				margin: 0 auto;
				flex-shrink: 0;
			}

			.discordBt {
				height: 2em;
				max-height: unset;
				min-height: unset;
				margin: 0 auto;
				:deep(.icon) {
					height: 100%;
					max-width: unset;
				}
			}

			.version {
				display: block;
				margin: 0 auto;
				padding: .5em;
				font-style: italic;
				font-size: .8em;
				margin-top: auto
			}
		}
	}

	.contentHolder {
		display: flex;
		flex-direction: column;
		flex-grow: 1;

		.head {
			padding: 1em 0;
		}

		.search {
			display: none;
		}
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
				.automaticMessageHolder {
					display: block !important;
				}
			}
			&>* {
				max-width: 600px;
				margin: 0 auto;
			}
		}
	}

	.searchResult {
		.noResult {
			font-style: italic;
			text-align: center;
			margin-top: 1em;
		}
	}

	&.hasContent {
		.head {
			justify-content: flex-end;
			.title {
				padding: 0 2em;
			}
		}
	}

	&:not(.hasContent) {
		.head {
			justify-content: flex-end;
		}
	}
}

@media only screen and (max-width: 800px) {
	.parameters {
		max-height: var(--vh);
		.head {
			height: 3em;
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
				margin-bottom: 1em;
				.title {
					display: block;
				}
			}
			.automaticMessageHolder {
				display: block !important;
				margin: 0 auto;
			}
			.scrollable {
				.buttonList {
					flex-direction: column;
					flex-wrap: nowrap;
					// max-width: 250px;
					&>.button {
						flex-wrap: nowrap;
						flex-direction: row;
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

		.contentHolder {
			display:none;
			.content {
				margin-top: 1em;
				padding: 0;

				.search {
					display: block;
					margin-bottom: .5em;
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
</style>
