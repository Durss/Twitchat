<template>
	<div class="parameters">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<Button aria-label="Back to menu" :icon="$image('icons/back_white.svg')" @click="setContent(null)" class="close" bounce v-if="content != null" />
				<h1 class="title">Parameters</h1>
				<Button aria-label="Close parameters" :icon="$image('icons/cross_white.svg')" @click="close()" class="close" bounce />
			</div>
			

			<div class="search" v-if="content == null">
			<!-- <div class="search" v-if="isGenericListContent"> -->
				<input type="text" placeholder="Search a parameter..." v-model="search">
			</div>
			
			<div class="menu" v-if="content == null && !search">
				<Button bounce white :icon="$image('icons/params_purple.svg')" title="Features" @click="setContent('features')" :selected="content == 'features' || content == 'emergency' || content == 'spoiler'" />
				<Button bounce white :icon="$image('icons/show_purple.svg')" title="Appearance" @click="setContent('appearance')" :selected="content == 'appearance'" />
				<Button bounce white :icon="$image('icons/filters_purple.svg')" title="Filters" @click="setContent('filters')" :selected="content == 'filters'" />
				<Button bounce white :icon="$image('icons/obs_purple.svg')" title="OBS" @click="setContent('obs')" :selected="content == 'obs' || content=='eventsAction'" />
				<Button bounce white :icon="$image('icons/overlay_purple.svg')" title="Overlays" @click="setContent('overlays')" :selected="content == 'overlays'" />
				<Button bounce white :icon="$image('icons/broadcast_purple.svg')" title="Triggers" @click="setContent('triggers')" :selected="content == 'triggers'" />
				<Button bounce white :icon="$image('icons/elgato_purple.svg')" title="Stream Deck" @click="setContent('streamdeck')" :selected="content == 'streamdeck'" />
				<Button bounce white :icon="$image('icons/user_purple.svg')" title="Account" @click="setContent('account')" :selected="content == 'account'" />
				<Button bounce white :icon="$image('icons/info_purple.svg')" title="About" @click="setContent('about')" :selected="content == 'about' || content == 'sponsor'" />

				<div class="version">v {{appVersion}}</div>
			</div>
			
			<div class="content" v-if="content != null || search">
				<ParamsList v-if="(content && isGenericListContent) || filteredParams.length > 0" :category="content" :filteredParams="filteredParams" @setContent="setContent" />
				<ParamsStreamdeck v-if="content == 'streamdeck'" @setContent="setContent" />
				<ParamsOBS v-if="content == 'obs'" @setContent="setContent" />
				<ParamsTriggers v-if="content == 'triggers'" @setContent="setContent" />
				<ParamsEmergency v-if="content == 'emergency'" @setContent="setContent" />
				<ParamsSpoiler v-if="content == 'spoiler'" @setContent="setContent" />
				<ParamsAlert v-if="content == 'alert'" @setContent="setContent" />
				<ParamsAccount v-if="content == 'account'" @setContent="setContent" />
				<ParamsAbout v-if="content == 'about'" @setContent="setContent" />
				<ParamsOverlays v-if="content == 'overlays'" @setContent="setContent" />

				<!-- Used for direct link to sponsor content from chat ads -->
				<ParamsSponsor v-if="content == 'sponsor'" @setContent="setContent" />

				<div class="searchResult" v-if="search">
					<div class="noResult" v-if="filteredParams.length == 0">No result</div>
				</div>
		
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { ParameterCategory, ParameterData, ParamsContenType } from '@/types/TwitchatDataTypes';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleButton from '../ToggleButton.vue';
import ParamsList from './contents/ParamsList.vue';
import ParamsOBS from './contents/ParamsOBS.vue';
import ParamsSponsor from './contents/ParamsSponsor.vue';
import ParamsStreamdeck from './contents/ParamsStreamdeck.vue';
import ParamItem from './ParamItem.vue';
import ParamsAbout from './contents/ParamsAbout.vue';
import ParamsAccount from './contents/ParamsAccount.vue';
import ParamsOverlays from './contents/ParamsOverlays.vue';
import ParamsTriggers from './contents/ParamsTriggers.vue';
import ParamsEmergency from './contents/ParamsEmergency.vue';
import ParamsSpoiler from './contents/ParamsSpoiler.vue';
import StoreProxy from '@/utils/StoreProxy';
import ParamsAlert from './contents/ParamsAlert.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ParamsOBS,
		ParamsList,
		ParamsAbout,
		ParamsAlert,
		ToggleButton,
		ParamsSpoiler,
		ParamsAccount,
		ParamsSponsor,
		ParamsOverlays,
		ParamsTriggers,
		ParamsEmergency,
		ParamsStreamdeck,
	}
})

export default class Parameters extends Vue {

	public content:ParamsContenType = null;

	public showMenu = false;
	public filteredParams:ParameterData[] = [];

	public search = "";

	/**
	 * If true, will display a search field at the top of the view to
	 * search params by their labels
	 */
	public get isGenericListContent():boolean {
		return this.content == "features"
			|| this.content == "appearance"
			|| this.content == "filters"
			|| this.search.length>0;
	}

	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }

	public async beforeMount():Promise<void> {
		const v = StoreProxy.store.state.tempStoreValue as string;
		if(!v) return;
		if(v.indexOf("CONTENT:") === 0) {
			//Requesting sponsor page
			this.content = v.replace("CONTENT:", "") as ParamsContenType;

		}else if(v.indexOf("SEARCH:") === 0) {
			//Prefilled search
			const chunks = v.replace("SEARCH:", "").split(".");
			if(chunks.length == 2) {
				const cat = chunks[0] as ParameterCategory;
				const paramKey = chunks[1];
				this.search = StoreProxy.store.state.params[cat][paramKey].label;
			}
		}
		StoreProxy.store.state.tempStoreValue = null;
	}

	public async mounted():Promise<void> {
		watch(() => this.content, () => {
			if(this.content) this.filteredParams = [];
		});

		watch(() => this.search, (value:string) => {
			this.content = null;
			this.filterParams(this.search);
		});

		await this.$nextTick();
	
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
		
		if(this.search) {
			await this.$nextTick();
			this.content = null;
			this.filterParams(this.search);
		}
	}

	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.showMenu = false;
			this.filteredParams = [];
			StoreProxy.store.dispatch("showParams", false);
		}});
	}

	public setContent(id:ParamsContenType):void {
		if(id == this.content) {
			//Refresh content if already active
			this.content = null;
			this.$nextTick().then(()=>{
				this.content = id;
			})
		}else{
			this.content = id;
		}
		if(id == null && this.search.length > 0) {
			this.search = "";
		}
	}

	public async filterParams(search:string):Promise<void> {
		this.filteredParams = [];
		const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		const IDsDone:{[key:number]:boolean} = {};
		for (const categoryID in StoreProxy.store.state.params) {
			const category = StoreProxy.store.state.params[categoryID as ParameterCategory] as {[ley:string]:ParameterData};
			for (const prop in category) {
				const data:ParameterData = category[prop];
				
				//Already done (via its parent probably), ignore it
				if(IDsDone[data.id as number] === true) continue;

				if(new RegExp(safeSearch, "gi").test(data.label)) {
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
}
</script>

<style scoped lang="less">
.parameters{
	.modal();

	.holder {
		top: 0;
		transform: translate(-50%, 0);
		z-index: 2;

		.head {
			border-bottom: 1px solid @mainColor_normal;
			padding-bottom: .5em;
		}

		.menu {
			padding: 1em;
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			.button:not(:first-child) {
				margin-top: 10px;
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
			padding: 20px;
		}
	}

	.dimmer {
		z-index: 1;
	}

}
</style>