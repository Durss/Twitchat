<template>
	<div class="parameters">
		<div class="dimmer" ref="dimmer" @click="toggle(true)" v-if="showMenu"></div>
		<div class="holder" ref="holder" v-if="showMenu">
			<div class="head">
				<span class="title">Params</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="toggle(true)" class="close" bounce/>
			</div>
			<div class="menu">
				<Button white bounce title="Appearance" @click="content='appearance'" :selected="content=='appearance'" />
				<Button white bounce title="Filters" @click="content='filters'" :selected="content=='filters'" />
				<Button white bounce title="Account" @click="content='account'" :selected="content=='account'" />
			</div>
			<div class="content">
				<ParamsAppearence v-if="content=='appearance'" />
				<ParamsFilters v-if="content=='filters'" />
				<ParamsAccount v-if="content=='account'" />
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
		ParamsAppearence,
	}
})
export default class Parameters extends Vue {

	public content:'appearance' | 'filters' | 'account' = 'appearance';

	public showMenu:boolean = true;

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
			gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:100, opacity:0, ease:"back.out"});
		}else{
			gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
			gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
			gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:100, opacity:0, ease:"back.in", onComplete:()=> {
				this.showMenu = false;
				store.dispatch("showParams", false);
			}});
		}
	}
}
</script>

<style scoped lang="less">
.parameters{
	.dimmer {
		backdrop-filter: blur(5px);
		background-color: rgba(0,0,0,.7);
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
	}

	.menu {
		text-align: center;
		border-top: 1px solid @mainColor_normal;
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
		.block();
		left: 50%;
		top: 0;
		transform: translate(-50%, 0);
		position: absolute;
		margin: auto;
		width: 90%;
		max-width: 500px;
		max-height: 80vh;
		// overflow-y: auto;
		display: flex;
		flex-direction: column;

		.head {
			text-transform: capitalize;
			z-index: 1;
			padding: 20px 20px;
			display: flex;
			flex-direction: row;
			.title {
				flex-grow: 1;
				font-size: 35px;
				text-align: center;
				padding-left: 30px;
			}
			.close {
				width: 30px;
				height: 30px;
				max-width: 30px;
				max-height: 30px;
				padding: 5px;
				border-radius: 5px;
			}
		}

		.content {
			flex-grow: 1;
			overflow-y: auto;
		}
	}
}

@media only screen and (max-width: 500px) {
	.parameters{
		
		.holder {
			.block();
			.center();
			position: absolute;
			margin: auto;
			width: 100%;
			height: 100vh;
			max-height: 100vh;
		}

		.dimmer {
			display: none;
		}
	}
}
</style>