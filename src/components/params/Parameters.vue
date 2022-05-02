<template>
	<div class="parameters">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Params</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="menu">
				<Button white bounce title="Features" @click="setContent('features')" :selected="content == 'features'" />
				<Button white bounce title="Appearance" @click="setContent('appearance')" :selected="content == 'appearance'" />
				<Button white bounce title="Filters" @click="setContent('filters')" :selected="content == 'filters'" />
				<Button white bounce title="OBS" @click="setContent('obs')" :selected="content == 'obs' || content=='eventsAction'" />
				<Button white bounce title="Stream Deck" @click="setContent('streamdeck')" :selected="content == 'streamdeck'" />
				<Button white bounce title="Account" @click="setContent('account')" :selected="content == 'account'" />
				<Button white bounce title="About" @click="setContent('about')" :selected="content == 'about' || content == 'sponsor'" />
			</div>
			<div class="search" v-if="isGenericListContent">
				<input type="text" placeholder="Search a parameter..." v-model="search">
			</div>
			<div class="content">
				<ParamsList v-if="content && isGenericListContent" :category="content" @setContent="setContent" />
				<ParamsAccount v-if="content == 'account'" @setContent="setContent" />
				<ParamsStreamdeck v-if="content == 'streamdeck'" @setContent="setContent" />
				<ParamsOBS v-if="content == 'obs'" @setContent="setContent" />
				<OBSEventsAction v-if="content == 'eventsAction'" @setContent="setContent" />
				<ParamsAbout v-if="content == 'about'" @setContent="setContent" />
				<!-- Used for direct link to sponsor content from chat ads -->
				<ParamsSponsor v-if="content == 'sponsor'" @setContent="setContent" />
				<div class="searchResult" v-if="search">
					<div class="noResult" v-if="filteredParams.length == 0">No result</div>
					<ParamItem v-for="d in filteredParams"
						:key="d.id"
						:paramData="d"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
export type ParamsContenType = 'appearance' | 'filters' | 'account' | 'about' | 'features' | 'obs' | 'eventsAction' | 'sponsor' | null ;

import store, { ParameterCategory, ParameterData } from '@/store';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleButton from '../ToggleButton.vue';
import OBSEventsAction from './contents/obs/OBSEventsAction.vue';
import ParamsAbout from './contents/ParamsAbout.vue';
import ParamsAccount from './contents/ParamsAccount.vue';
import ParamsList from './contents/ParamsList.vue';
import ParamsOBS from './contents/ParamsOBS.vue';
import ParamsSponsor from './contents/ParamsSponsor.vue';
import ParamsStreamdeck from './contents/ParamsStreamdeck.vue';
import ParamItem from './ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ParamsOBS,
		ParamsList,
		ParamsAbout,
		ToggleButton,
		ParamsAccount,
		ParamsSponsor,
		ParamsStreamdeck,
		OBSEventsAction,
	}
})

export default class Parameters extends Vue {

	public content:ParamsContenType = 'features';
	public prevContent:ParamsContenType = null;

	public showMenu:boolean = false;
	public filteredParams:ParameterData[] = [];

	public search:string = "";

	public get isGenericListContent():boolean {
		return this.content == "features" || this.content == "appearance" || this.content == "filters" || this.search.length>0;
	}

	public async beforeMount():Promise<void> {
		const v = store.state.tempStoreValue as string;
		if(!v) return;
		if(v.indexOf("CONTENT:") === 0) {
			//Requesting sponsor page
			this.content = v.replace("CONTENT:", "") as ParamsContenType;
			store.state.tempStoreValue = null;

		}else if(v.indexOf("SEARCH:") === 0) {
			//Prefilled search
			const chunks = v.replace("SEARCH:", "").split(".");
			if(chunks.length == 2) {
				const cat = chunks[0] as ParameterCategory;
				const paramKey = chunks[1];
				this.search = store.state.params[cat][paramKey].label;
			}

		}
	}

	public async mounted():Promise<void> {
		watch(() => this.search, (value:string) => {
			if(value.length == 0) {
				this.content = this.prevContent;
				return;
			}
			if(this.content) this.prevContent = this.content;
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
			store.dispatch("showParams", false);
		}});
	}

	public setContent(id:ParamsContenType):void {
		if(this.search.length == 0) {
			this.content = id;
		}else{
			//If a search is in progress, fake the prev content to
			//the one selected and clear the search.
			//Clearing the search will trigger a watcher that will
			//set the content to the one that was selected before
			//starting the search.
			this.prevContent = id;
			this.search = "";
		}
	}

	public async filterParams(search:string):Promise<void> {
		this.filteredParams = [];
		const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		const IDsDone:{[key:number]:boolean} = {};
		for (const categoryID in store.state.params) {
			const category = store.state.params[categoryID as ParameterCategory] as {[ley:string]:ParameterData};
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

	.menu {
		text-align: center;
		border-top: 1px solid @mainColor_normal;
		margin-top: 20px;
		.button {
			background: transparent;
			border: 1px solid @mainColor_normal;
			border-top: none;
			border-top-left-radius: 0;
			border-top-right-radius: 0;
			transform-origin: top;//So the bouncy effect looks better
			&.selected {
				background-color: @mainColor_normal_light;
			}
		}
	}

	.search{
		margin:auto;
		margin-top: 15px;
		margin-bottom: -10px;
		z-index: 1;
	}

	.searchResult {
		.noResult {
			text-align: center;
			font-style: italic;
		}
	}

	.dimmer {
		z-index: 1;
	}

	.holder {
		top: 0;
		transform: translate(-50%, 0);
		z-index: 2;
	}

}
</style>