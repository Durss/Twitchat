<template>
	<div class="parameters">
		<div class="menu" v-if="showMenu">
			<div class="dimmer" ref="dimmer" @click="toggle(true)"></div>
			<div class="holder" ref="holder">
				<div class="head">Params</div>
				<div class="content">
					<Button @click="logout()" :icon="require('@/assets/icons/cross_white.svg')" title="Logout" highlight class="logoutBt" v-if="$store.state.authenticated" />
					
					<div class="row" v-for="(p,key) in toggles" :key="key">
						<label :for="'toggle'+key">{{p.label}}</label>
						<ToggleButton :id="'toggle'+key" v-model="p.value" />
					</div>

					<div class="spacer"></div>

					<label for="historySize">Chat history size ({{historySize}})</label>
					<input type="range" min="50" max="500" step="10" v-model="historySize">
				</div>
			</div>
		</div>
		<Button :icon="require('@/assets/icons/params.svg')" class="toggleBt" @click="toggle()" />
	</div>
</template>

<script lang="ts">
import store from '@/store';
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

	public toggles:{[key:string]:{value:boolean, label:string}} = {
		firstMessage: {value:true, label:"Show first message of every user"},
		highlightMentions: {value:false, label:"Highlight mentions"},
		ignoreSelf: {value:true, label:"Hide my messages"},
		hideBots: {value:false, label:"Hide bots"},
		hideEmotes: {value:false, label:"Hide emotes"},
		hideBadges: {value:false, label:"Hide badges"},
		minimalistBadges: {value:true, label:"Show minimalist badges"},
		displayTime: {value:true, label:"Display time"},
	};

	public showMenu:boolean = false;
	public historySize:number = 10;

	public mounted():void {
		// this.toggle();//TODO remove

		for (const key in this.toggles) {
			this.toggles[key].value = store.state.params[key as "firstMessage"];
			watch(() => this.toggles[key].value, (newValue:boolean) => {
				store.commit('setParam', {key, value:newValue});
			});
		}
		watch(() => this.historySize, (newValue:unknown) => {
			store.commit('setParam', {key:"historySize", value:parseInt(newValue as string)});
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
			gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:100, opacity:0, ease:"back.out", onComplete:()=> {
				this.showMenu = false;
			}});
		}
	}
}
</script>

<style scoped lang="less">
.parameters{
	.toggleBt {
		position: absolute;
		top: 0;
		right: 0;
	}
	
	.menu {
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
			.center();
			position: absolute;
			margin: auto;
			background-color: #fff;
			padding: 20px;
			border-radius: 10px;
			width: 90%;
			max-width: 400px;

			.head {
				text-transform: capitalize;
				font-size: 35px;
				text-align: center;
				margin-bottom: 20px;
			}

			.content {
				position: relative;
				display: flex;
				flex-direction: column;
				justify-content: center;
				.spacer {
					margin: 10px 0;
				}
				.row {
					display: flex;
					flex-direction: row;
					margin: 10px 0;
					label {
						flex-grow: 1;
						text-align: right;
						margin-right: 20px;
					}
				}
				.logoutBt {
					width: min-content;
					margin: auto;
				}
			}
		}
	}
}
</style>