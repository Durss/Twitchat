<template>
	<div class="parameters">
		<div class="dimmer" ref="dimmer" @click="toggle(true)" v-if="showMenu"></div>
		<div class="holder" ref="holder" v-if="showMenu">
			<div class="head">
				<span class="title">Params</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="toggle(true)" class="close" bounce/>
			</div>
			<div class="menu">
				<Button white bounce title="Features" @click="content='features'" :selected="content=='features'" />
				<Button white bounce title="Appearance" @click="content='appearance'" :selected="content=='appearance'" />
				<Button white bounce title="Filters" @click="content='filters'" :selected="content=='filters'" />
				<Button white bounce title="Account" @click="content='account'" :selected="content=='account'" />
			</div>
			<div class="content">
				<ParamsAppearence v-if="content=='appearance'" />
				<ParamsFilters v-if="content=='filters'" />
				<ParamsAccount v-if="content=='account'" />
				<ParamsFeatures v-if="content=='features'" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
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

	public content:'appearance' | 'filters' | 'account' | 'features' = 'features';

	public showMenu:boolean = false;

	public async mounted():Promise<void> {
		store.dispatch("showParams", false);
		watch(() => store.state.showParams, (value:boolean) => {
			this.toggle(!value);
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

	.holder {
		top: 0;
		transform: translate(-50%, 0);
	}

}
</style>