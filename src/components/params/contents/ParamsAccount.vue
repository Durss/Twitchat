<template>
	<div class="paramsaccount">
		<img :src="userPP" alt="profile pic" class="profilePic">

		<div class="title">Connected as <strong>{{userName}}</strong></div>

		<ParamItem class="param" :paramData="$store.state.accountParams.syncDataWithServer" v-model="syncEnabled" />

		<div class="donor" v-if="isDonor" ref="donorHolder">
			<div class="title">
				<p class="outline">Thank you</p>
				<p class="text">Thank you</p>
			</div>
			<!-- <p class="subtitle">for being a donor</p> -->
			<img class="beatingHeat" src="@/assets/icons/donor.svg" alt="heart" ref="heart" @click="burstStars(true)">
		
			<div class="stars">
				<!-- <div class="star" v-for="s in stars" :style="getStarStyles(s)"></div> -->
				<img src="@/assets/icons/follow.svg" alt="heart" class="star" v-for="s in stars" :style="getStarStyles(s)">
			</div>
		</div>

		<Button class="button" v-if="canInstall" @click="ahs()" title="Add Twitchat to home screen" :icon="$image('icons/twitchat.svg')" />
		<Button class="button logoutBt" @click="logout()" bounce title="Logout" highlight :icon="$image('icons/logout.svg')" />
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import Store from '@/store/Store';
import StoreProxy from '@/utils/StoreProxy';
import UserSession from '@/utils/UserSession';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';
import ParamItem from '../ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	}
})
export default class ParamsAccount extends Vue {

	public showSuggestions = false;
	public showObs = false;
	public disposed = false;
	public showCredits = true;
	public syncEnabled = false;
	public stars:StarData[] = [];

	public get canInstall():boolean { return StoreProxy.store.state.ahsInstaller != null || true; }
	public get userName():string { return UserSession.instance.authToken.login; }
	public get isDonor():boolean { return UserSession.instance.isDonor; }
	public get userPP():string {
		let pp:string|undefined = UserSession.instance.user?.profile_image_url;
		if(!pp) {
			pp = this.$image("icons/user_purple.svg");
		}
		return pp;
	}
	public getStarStyles(s:StarData):StyleValue {
		return {
			opacity: s.a.toString(),
			transform: "translate("+s.x+"px, "+s.y+"px) rotate("+s.r+"deg) scale("+s.s+")",
		}
	}

	public logout():void {
		StoreProxy.store.dispatch('logout');
		this.$router.push({name:'logout'});
	}

	public mounted():void {
		this.syncEnabled = Store.get(Store.SYNC_DATA_TO_SERVER) == "true";
		watch(()=> this.syncEnabled, ()=> Store.set(Store.SYNC_DATA_TO_SERVER, this.syncEnabled, false));
		if(this.isDonor) {
			this.initHeart();
		}
	}

	public beforeUnmount():void {
		this.disposed = false;
		const heart = this.$refs.heart as HTMLDivElement;
		gsap.killTweensOf(heart);
	}

	public ahs():void {
		if(!StoreProxy.store.state.ahsInstaller) return;
		// Show the prompt
		StoreProxy.store.state.ahsInstaller.prompt();
		// // Wait for the user to respond to the prompt
		// StoreProxy.store.state.ahsInstaller.userChoice.then((choiceResult) => {
		// 	this.canInstall = false;
		// })
	}

	private initHeart():void {
		const heart = this.$refs.heart as HTMLDivElement;
		gsap.fromTo(heart, {scale:1.2, x:"-50%"}, {duration:.35, scale:1, x:"-50%", ease:"back.out", repeat:-1, repeatDelay:1.5, onRepeat:()=>{
			this.burstStars();
		}});
		gsap.fromTo(heart, {scale:1.15, x:"-50%"}, {duration:.35, delay:.2, scale:1, x:"-50%", ease:"back.out", repeat:-1, repeatDelay:1.5, onRepeat:()=>{
			this.burstStars();
		}});
		
		this.renderStars();
	}

	public burstStars(clickOrigin:boolean = false):void {
		const heart = this.$refs.heart as HTMLDivElement;
		const donorHolder = this.$refs.donorHolder as HTMLDivElement;
		
		if(clickOrigin) {
			gsap.fromTo(heart, {scale:1.2}, {duration:.25, scale:1, ease:"back.out"});
		}
		
		const bounds = heart.getBoundingClientRect();
		// console.log(bounds);
		for (let i = 0; i < 20; i++) {
			const s:StarData = { x:0, vx:0, y:0, vy:0, r:0, vr:0, a:1, va:0, s:0};
			const cx = (donorHolder.offsetWidth)/2;
			const cy = (donorHolder.offsetHeight)/2;
			s.x = cx + (Math.random()-Math.random()) * bounds.width/2;
			s.y = cy + (Math.random()-Math.random()) * bounds.height/2;

			const a = Math.atan2(s.y - cy, s.x - cx);

			s.r = Math.random() * 360;
			s.vx = Math.cos(a)*5;
			s.vy = Math.sin(a)*2.5;
			s.vr = (Math.random() - Math.random()) * 30;
			s.va = Math.random()*.1+.01;
			s.s = Math.random()*1+.5;
			this.stars.push(s);
		}
	}

	private renderStars():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderStars())

		for (let i = 0; i < this.stars.length; i++) {
			const s = this.stars[i];
			s.x += s.vx;
			s.y += s.vy;
			s.r += s.vr;
			s.vx *= .94;
			s.vy -= .1;
			s.a -= s.va;
			if(s.a < .01) {
				this.stars.splice(i, 1);
				i--;
			}
		}
	}
}

interface StarData {
	x:number;
	y:number;
	vx:number;
	vy:number;
	r:number;
	vr:number;
	a:number;
	va:number;
	s:number;
}
</script>

<style scoped lang="less">
.paramsaccount{
	display: flex;
	flex-direction: column;
	align-items: center;
	&>* {
		margin-bottom: 1em;
	}

	.profilePic {
		height: 4em;
		width: 4em;
		display: block;
		border-radius: 50%;
	}
	
	.button {
		display: block;
	}
	
	.title {
		text-align: center;
	}

	.param {
		width: 300px;
	}

	.donor {
		// background-color: @mainColor_alert;
		color: @mainColor_light;
		padding: 1.5em;
		padding-bottom: 3em;
		border-radius: 1em;
		position: relative;
		margin-top: 1em;
		// border-radius: 2em;
		// border-bottom-left-radius: 10em;
		// border-bottom-right-radius: 10em;
		background: url('@/assets/icons/follow_alert.svg');
		background-repeat: no-repeat;
		background-position: center center;
		height: 10em;
		filter: drop-shadow(0 0 .5em rgba(0,0,0,.25));
		
		.title {
			.center();
			position: absolute;
			font-family: "Nunito";
			font-size: 3em;
			text-align: center;
			margin: auto;
			margin-top: -2em;
			position: relative;
			z-index: 1;
			width: 180px;
			height: 40px;
			line-height: 2.5em;
			
			.outline {
				position: absolute;
				-webkit-text-stroke: .4em @mainColor_alert;
			}
			.text {
				position: absolute;
				z-index: 1;
				top: 0;
				left: 0;
			}
		}
		
		.subtitle {
			font-size: 1em;
			text-align: center;
		}

		.beatingHeat {
			.center();
			position: absolute;
			height: 5em;
			cursor: pointer;
			transition: height .25s;
			z-index: 1;
			filter: drop-shadow(0 0 .5em rgba(0,0,0,.25));
			&:hover {
				height: 6em;
			}
		}

		.stars {
			position: absolute;
			top:0;
			left:0;
			z-index: 2;

			.star {
				position: fixed;
				pointer-events: none;
				width: 15px;
				height: 15px;
			}
		}
	}

}
</style>