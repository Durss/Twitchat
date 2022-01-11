<template>
	<div class="parameters">
		<div class="menu" v-if="showMenu">
			<div class="dimmer" ref="dimmer" @click="toggle(true)"></div>
			<div class="holder" ref="holder">
				<div class="head">Parameters</div>
				<div class="content">
					<Button @click="logout()" :icon="require('@/assets/icons/cross_white.svg')" title="Logout" highlight class="logoutBt" v-if="$store.state.authenticated" />
					
					<div class="spacer"></div>

					<div class="row">
						<label for="firstMessage">Show first message of every user:</label>
						<ToggleButton id="firstMessage" v-model="firstMessage" />
					</div>
					
					<div class="spacer"></div>

					<div class="row">
						<label for="hideBots">Hide bots</label>
						<ToggleButton id="hideBots" v-model="hideBots" />
					</div>
					
					<div class="spacer"></div>

					<div class="row">
						<label for="highlightMentions">Highlight mentions</label>
						<ToggleButton id="highlightMentions" v-model="highlightMentions" />
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

	public showMenu:boolean = false;
	public firstMessage:boolean = false;
	public hideBots:boolean = false;
	public highlightMentions:boolean = false;
	public historySize:number = 10;

	public mounted():void {
		this.firstMessage = store.state.params.firstMessage;
		this.hideBots = store.state.params.hideBots;
		this.historySize = store.state.params.historySize;
		this.highlightMentions = store.state.params.highlightMentions;
		// this.toggle();//TODO remove
		watch(() => this.firstMessage, (newValue:boolean) => {
			store.commit('setParam', {key:"firstMessage", value:newValue});
		});
		watch(() => this.hideBots, (newValue:boolean) => {
			store.commit('setParam', {key:"hideBots", value:newValue});
		});
		watch(() => this.highlightMentions, (newValue:boolean) => {
			store.commit('setParam', {key:"highlightMentions", value:newValue});
		});
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