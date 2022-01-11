<template>
	<div class="parameters">
		<div class="menu" v-if="showMenu">
			<div class="dimmer" ref="dimmer" @click="toggle(true)"></div>
			<div class="holder" ref="holder">
				<div class="head">
					<span class="title">Params</span>
					<Button :icon="require('@/assets/icons/cross_white.svg')" @click="toggle(true)" class="close" bounce/>
				</div>
				<div class="content">
					<div class="row" v-for="(p,key) in toggles" :key="key">

						<div v-if="p.type == 'toggle'" class="toggle">
							<label :for="'toggle'+key">{{p.label}}</label>
							<ToggleButton :id="'toggle'+key" v-model="p.value" />
						</div>
						
						<div v-if="p.type == 'slider'" class="slider">
							<label :for="'slider'+key">
								<img :src="p.icon" v-if="p.icon">
								{{p.label}} <span>({{p.value}})</span>
							</label>
							<input type="range" :min="p.min" :max="p.max" :step="p.step" :id="'slider'+key" v-model="p.value">
						</div>

					</div>
					<Button @click="logout()" :icon="require('@/assets/icons/cross_white.svg')" bounce title="Logout" highlight class="logoutBt" v-if="$store.state.authenticated" />
				</div>
			</div>
		</div>
		<Button :icon="require('@/assets/icons/params.svg')" class="toggleBt" @click="toggle()" bounce />
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { Event } from '@/utils/EventDispatcher';
import IRCClient from '@/utils/IRCClient';
import IRCEvent from '@/utils/IRCEvent';
import TwitchUtils from '@/utils/TwitchUtils';
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

	public toggles:{[key:string]:{type:string, value:boolean|number, label:string, min?:number, max?:number, step?:number, icon?:string}} = {
		firstMessage: {type:"toggle", value:true, label:"Show the first message of every viewer on a seperate list so you don't forget to say hello"},
		highlightMentions: {type:"toggle", value:false, label:"Highlight messages i'm mentioned in"},
		ignoreSelf: {type:"toggle", value:true, label:"Hide my messages"},
		hideBots: {type:"toggle", value:false, label:"Hide bots"},
		hideEmotes: {type:"toggle", value:false, label:"Hide emotes"},
		hideBadges: {type:"toggle", value:false, label:"Hide badges"},
		minimalistBadges: {type:"toggle", value:true, label:"Show minimalist badges"},
		displayTime: {type:"toggle", value:true, label:"Display time"},
		ignoreCommands: {type:"toggle", value:true, label:"Hide commands (messages starting with \"!\")"},
		historySize: {type:"slider", value:0, label:"Max chat message count", min:50, max:500, step:10},
		defaultSize: {type:"slider", value:0, label:"Default text size", min:1, max:4, step:1},
		modsSize: {type:"slider", value:0, label:"Text size of moderators", min:1, max:4, step:1, icon:""},
		vipsSize: {type:"slider", value:0, label:"Text size of VIPs", min:1, max:4, step:1, icon:""},
		subsSize: {type:"slider", value:0, label:"Text size of subs", min:1, max:4, step:1, icon:""},
	};

	public showMenu:boolean = false;

	public async mounted():Promise<void> {
		// this.toggle();//TODO remove

		//populate badges images when available
		IRCClient.instance.addEventListener(IRCEvent.BADGES_LOADED, (e:Event):void=>{
			const badges = TwitchUtils.getBadgesImagesFromRawBadges(store.state.user.user_id, {moderator:"1", vip:"1", subscriber:"0"});
			this.toggles.modsSize.icon = badges[0].image_url_1x;
			this.toggles.vipsSize.icon = badges[1].image_url_1x;
			this.toggles.subsSize.icon = badges[2].image_url_1x;
		})

		for (const key in this.toggles) {
			let v:number|boolean = store.state.params[key as "firstMessage"];
			if(typeof(v) == "string") v = parseInt(v);
			this.toggles[key].value = v;
			watch(() => this.toggles[key].value, (newValue:boolean|number) => {
				store.commit('setParam', {key, value:typeof(newValue) == "string"? parseInt(newValue) : newValue});
			});
			watch(() => store.state.authenticated, (newValue:boolean) => {
				if(!newValue) this.toggle(true);
			});
		}
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
		transform-origin: top right;
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
			.block();
			.center();
			position: absolute;
			margin: auto;
			width: 90%;
			max-width: 460px;
			max-height: 80vh;
			overflow-y: auto;
			padding: 0 20px;

			.head {
				text-transform: capitalize;
				position: sticky;
				top: 0;
				z-index: 1;
				padding: 20px 0;
				display: flex;
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
				position: relative;
				display: flex;
				flex-direction: column;
				justify-content: center;
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
					width: min-content;
					margin: auto;
				}
			}
		}
	}
}
</style>