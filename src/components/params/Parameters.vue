<template>
	<div class="parameters">
		<div class="dimmer" ref="dimmer" @click="toggle(true)" v-if="showMenu"></div>
		<div class="holder" ref="holder" v-if="showMenu">
			<div class="head">
				<span class="title">Params</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="toggle(true)" class="close" bounce/>
			</div>
			<div class="menu">
				<Button white bounce title="Features" @click="setContent('features')" :selected="content == 'features'" />
				<Button white bounce title="Appearance" @click="setContent('appearance')" :selected="content == 'appearance'" />
				<Button white bounce title="Filters" @click="setContent('filters')" :selected="content == 'filters'" />
				<Button white bounce title="Account" @click="setContent('account')" :selected="content == 'account'" />
			</div>
			<div class="search" v-if="content != 'account'">
				<input type="text" placeholder="Search a parameter..." v-model="search">
			</div>
			<div class="content">
				<ParamsAppearence v-if="content=='appearance'" />
				<ParamsFilters v-if="content=='filters'" />
				<ParamsAccount v-if="content=='account'" />
				<ParamsFeatures v-if="content=='features'" />
				<div class="searchResult" v-if="search">
					<div class="noResult" v-if="filteredParams.length == 0">No result</div>
					<ParamItem v-for="d in filteredParams"
						:key="d.name"
						:paramData="d"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store, { ParameterData } from '@/store';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleButton from '../ToggleButton.vue';
import ParamsAccount from './contents/ParamsAccount.vue';
import ParamsAppearence from './contents/ParamsAppearance.vue';
import ParamsFeatures from './contents/ParamsFeatures.vue';
import ParamsFilters from './contents/ParamsFilters.vue';
import ParamItem from './ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleButton,
		ParamsFilters,
		ParamsAccount,
		ParamsFeatures,
		ParamsAppearence,
	}
})
export default class Parameters extends Vue {

	public content:ParamsContenType = 'features';
	public prevContent:ParamsContenType = null;

	public showMenu:boolean = true;
	public filteredParams:ParameterData[] = [];

	public search:string = "";

	public async mounted():Promise<void> {
		store.dispatch("showParams", false);
		watch(() => store.state.showParams, (value:boolean) => {
			this.toggle(!value);
		});
		watch(() => this.search, (value:string) => {
			if(value.length == 0) {
				this.content = this.prevContent;
				return;
			}
			if(this.content) this.prevContent = this.content;
			this.content = null;
			this.filterParams(this.search);
		});
	}

	public async toggle(forceClose:boolean = false):Promise<void> {
		if(!this.showMenu && !forceClose) {
			this.showMenu = true;
			await this.$nextTick();
		
			gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
			gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
			gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
		}else{
			gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
			gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
			gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
				this.showMenu = false;
				store.dispatch("showParams", false);
			}});
		}
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
			//eslint-disable-next-line
			const category = (store.state.params as any)[categoryID] as {[ley:string]:ParameterData};
			for (const prop in category) {
				const data:ParameterData = category[prop];
				
				//Already done (via its parent probably), ignore it
				if(IDsDone[data.id as number] === true) continue;

				if(new RegExp(safeSearch, "gi").test(data.label)) {
					if(data.parent) {
						for (const key in category) {
							if(category[key].id == data.parent) {
								IDsDone[category[key].id as number] = true;
								this.filteredParams.push(category[key]);
							}
						}
					}else{
						this.filteredParams.push(data);
					}
				}
			}
		}
	}
}

export type ParamsContenType = 'appearance' | 'filters' | 'account' | 'features' | null ;
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
		margin-top: 5px;
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