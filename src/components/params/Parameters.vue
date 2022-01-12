<template>
	<div class="parameters">
		<div class="dimmer" ref="dimmer" @click="toggle(true)" v-if="showMenu"></div>
		<div class="holder" ref="holder" v-if="showMenu">
			<div class="head">
				<span class="title">Params</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="toggle(true)" class="close" bounce/>
			</div>
			<div class="content">
				<div class="row" v-for="(p,key) in params" :key="key">

					<div v-if="p.type == 'toggle'" class="toggle">
						<label :for="'toggle'+key">{{p.label}}</label>
						<ToggleButton :id="'toggle'+key" v-model="p.value" />
					</div>
					
					<div v-if="p.type == 'slider'" class="slider">
						<label :for="'slider'+key">
							<img :src="p.icon" v-if="p.icon">
							{{p.label}} <span>({{p.value}})</span>
						</label>
						<input type="range" :min="p.min" :max="p.max" :step="p.step" :id="'slider'+key" v-model.number="p.value">
					</div>

				</div>
				<Button @click="logout()" :icon="require('@/assets/icons/cross_white.svg')" bounce title="Logout" highlight class="logoutBt" v-if="$store.state.authenticated" />
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

@Options({
	props:{},
	components:{
		Button,
		ToggleButton,
	}
})
export default class Parameters extends Vue {

	public get params():{[key:string]:ParameterData} {
		return store.state.params;
	}

	public showMenu:boolean = true;

	public async mounted():Promise<void> {
		store.dispatch("showParams", false);
		watch(() => store.state.showParams, (value:boolean) => {
			this.toggle(!value);
		});
	}

	public logout():void {
		store.dispatch('logout');
		this.$router.push({name:'login'});
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
	.holder {
		.block();
		.center();
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
			padding: 20px 0;
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
			.spacer {
				margin: 10px 0;
			}
			.row {
				margin: 10px 0;
				.toggle {
					display: flex;
					flex-direction: row;
					label {
						flex-grow: 1;
						text-align: right;
						margin-right: 20px;
					}
				}
				.slider {
					display: flex;
					flex-direction: column;
					label {
						text-align: center;
					}
				}
			}
			.logoutBt {
				// width: min-content;
				margin: auto;
				display: block;
			}
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
			max-height: 100vh;
		}

		.dimmer {
			display: none;
		}
	}
}
</style>