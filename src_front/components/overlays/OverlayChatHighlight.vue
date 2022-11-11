<template>
	<div class="overlaychathighlight">
		<div :class="classes" ref="holder" id="highlight_holder" v-if="params && !clipData">
			<div class="profilePic" id="highlight_avatar" v-if="user?.avatarPath">
				<img :src="user.avatarPath">
			</div>
			<div class="infos" id="highlight_infos">
				<div class="login" id="highlight_login" v-if="user">{{user.displayName}}</div>
				<div class="message" id="highlight_message" v-html="message"></div>
			</div>
		</div>
		<div :class="classes" class="clipHolder" ref="clip_holder" id="clip_holder" v-if="clipData" v-show="!loadingClip">
			<iframe
				id="clip_player"
				:src="clipData.url"
				width="990"
				height="557"
				allowfullscreen
				:onload="onIFrameLoaded">
			</iframe>
			<div class="clipProgress" id="clip_progressbar" :style="clipStyles"></div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class OverlayChatHighlight extends Vue {

	public message:string = "";
	public clipData:TwitchatDataTypes.ClipInfo|null = null;
	public user:TwitchatDataTypes.TwitchatUser|null = null;
	public params:TwitchatDataTypes.ChatHighlightParams|null = null;
	public loadingClip:boolean = true;

	private showMessageHandler!:(e:TwitchatEvent)=>void;
	private overlayPresenceHandler!:(e:TwitchatEvent)=>void;
	private showClipHandler!:(e:TwitchatEvent)=>void;
	private clipPercent:number = 0;
	private iFrameInitTimeout:number = -1;
	private progressBarInterval:number = -1;

	public get classes():string[] {
		return [
			"holder",
			"position-"+this.params?.position
		];
	}

	public get clipStyles():any {
		return {
			width:(this.clipPercent*100)+"%",
		}
	}

	public async mounted():Promise<void> {
		// Display a debug message
		// const json = {
		// 	"message":"Ceci est un test",
		// 	"user":{"id":"29961813","login":"durss","display_name":"Durss","type":"","broadcaster_type":"affiliate","description":"Je conçois et fabrique des casse-têtes en bois plus ou moins stylés (check mon insta tavu) et je code des applications/outils plus ou moins stupides et utiles (check mon portfolio ou github tavu).","profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/1835e681-7306-49b8-a1e2-2775a17424ae-profile_image-300x300.png","offline_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/c43305dd-d577-4369-b60b-df0a4acdb7d8-channel_offline_image-1920x1080.jpeg","view_count":15289,"created_at":"2012-04-21T23:01:18Z"},"id":"d97d6594-6cc4-4400-b4f4-e3b688263fa2",
		// 	"params":{
		// 		"position":"bl"
		// 	}
		// };
		// this.onShowMessage(new TwitchatEvent(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, json));

		//Display a debug clip
		// this.onShowClip(new TwitchatEvent(TwitchatEvent.SHOW_CLIP,{
		// 	params:{position:"bl"},
		// 	clip:{
		// 		"id": "c512b3a0-be87-4e4b-87a3-4a9d98608f47",
		// 		"url": "https://clips.twitch.tv/CrowdedCrispyLettuceUnSane-H5_AtpejPgPcvBGC",
		// 		"embed_url": "https://clips.twitch.tv/embed?clip=CrowdedCrispyLettuceUnSane-H5_AtpejPgPcvBGC",
		// 		"broadcaster_id": "43809079",
		// 		"broadcaster_name": "Shakawah",
		// 		"creator_id": "37620928",
		// 		"creator_name": "leader_fox09",
		// 		"video_id": "1536352135",
		// 		"game_id": "490377",
		// 		"language": "fr",
		// 		"title": "La chanson fruitée",
		// 		"view_count": 36,
		// 		"created_at": "2022-07-19T22:33:05Z",
		// 		"thumbnail_url": "https://clips-media-assets2.twitch.tv/--ncnh-fwLaXoz4D3LwRgg/AT-cm%7C--ncnh-fwLaXoz4D3LwRgg-preview-480x272.jpg",
		// 		"duration": 51.2,
		// 		"vod_offset": 30692
		// 	}
		// }));
		
		this.showMessageHandler = (e:TwitchatEvent)=>this.onShowMessage(e);
		this.showClipHandler = (e:TwitchatEvent)=>this.onShowClip(e);
		this.overlayPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE); }

		PublicAPI.instance.addEventListener(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, this.showMessageHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE, this.overlayPresenceHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.SHOW_CLIP, this.showClipHandler);
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, this.showMessageHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE, this.overlayPresenceHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.SHOW_CLIP, this.showClipHandler);
	}

	private async onShowMessage(e:TwitchatEvent):Promise<void> {
		await this.hideCurrent();

		const data = (e.data as unknown) as TwitchatDataTypes.ChatHighlightInfo;
		this.message = data.message!;
		this.user = data.user!;
		this.params = data.params!;
		this.clipData = null;
		this.loadingClip = true;
		this.clipPercent = 0;

		if(this.message && this.params) {
			await this.$nextTick();
			this.showCurrent();
		}
	}

	private async onShowClip(e:TwitchatEvent):Promise<void> {
		await this.hideCurrent();
		
		const data = (e.data as unknown) as TwitchatDataTypes.ChatHighlightInfo;
		this.clipData = data.clip!;
		this.params = data.params!;
		this.message = "";
		this.user = null;
		this.clipPercent = 0;
		this.loadingClip = true;
		// const res = await fetch(Config.instance.API_PATH+"/clip?id=CrowdedCrispyLettuceUnSane-H5_AtpejPgPcvBGC", {method:"GET"});
		// const html = await res.text();
		// await this.$nextTick();
		// if(this.clipData) {
		// }
	}

	public onIFrameLoaded(e:unknown):void {
		clearInterval(this.iFrameInitTimeout);
		clearInterval(this.progressBarInterval);

		this.iFrameInitTimeout = setTimeout(async ()=> {
			this.loadingClip = false;
			await this.$nextTick();
			this.showCurrent();
			const startTime = Date.now();
			const duration = this.clipData!.duration;
			this.progressBarInterval = setInterval(()=> {
				this.clipPercent = (Date.now() - startTime) / (duration*1000);
				
				if(this.clipPercent >= 1) {
					clearInterval(this.progressBarInterval);
					PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, {}, true);
				}
			}, 50);
		}, 500);
	}

	private async hideCurrent():Promise<void> {
		clearInterval(this.iFrameInitTimeout);
		clearInterval(this.progressBarInterval);
		if(!this.params) return;
		if(!this.user && !this.clipData) return;

		const holder = (this.$refs.holder ?? this.$refs.clip_holder) as HTMLDivElement;
		if(!holder) return;

		if(this.params.position.indexOf("r") > -1){
			gsap.to(holder, {x:"100%", duration:1, ease:"sine.in"});
		}else
		if(this.params.position.indexOf("l") > -1){
			gsap.to(holder, {x:"-100%", duration:1, ease:"sine.in"});
		}else
		if(this.params.position == "t"){
			gsap.to(holder, {y:"-100%", duration:1, ease:"sine.in"});
		}else
		if(this.params.position == "b"){
			gsap.to(holder, {y:"100%", duration:1, ease:"sine.in"});
		}else
		if(this.params.position == "m"){
			gsap.to(holder, {scale:0, duration:1, ease:"back.in"});
		}
		await Utils.promisedTimeout(1000);
		this.message = "";
		this.user = null;
		this.params = null;
		this.clipData = null;
		this.loadingClip = true;
		this.clipPercent = 0;
		await this.$nextTick();
	}

	private showCurrent():void {
		if(!this.params) return;
		const holder = (this.$refs.holder ?? this.$refs.clip_holder) as HTMLDivElement;
		if(!holder) return;

		const bounds = holder.getBoundingClientRect();
		const winW = window.innerWidth;
		const winH = window.innerHeight;

		if(this.params.position.indexOf("r") > -1){
			gsap.from(holder, {x:winW, duration:1, ease:"sine.out"});
		}else
		if(this.params.position.indexOf("l") > -1){
			gsap.from(holder, {x:-(bounds.x+bounds.width), duration:1, ease:"sine.out"});
		}else
		if(this.params.position == "t"){
			gsap.from(holder, {y:-(bounds.y+bounds.height), duration:1, ease:"sine.out"});
		}else
		if(this.params.position == "b"){
			gsap.from(holder, {y:winH, duration:1, ease:"sine.out"});
		}else
		if(this.params.position == "m"){
			gsap.from(holder, {scale:0, duration:1, ease:"back.out"});
		}
	}
}
</script>

<style scoped lang="less">
.overlaychathighlight{
	.holder {
		@margin: .5em;

		position: absolute;
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		font-size: 1.5em;
		background-color: darken(@mainColor_light, 10%);
		padding: .5em;
		border-top-right-radius: 1em;
		border-bottom-right-radius: 1em;
		box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
		max-width: calc(70vw - @margin);
		min-width: 7em;
	
		&.position-tl {
			top: @margin;
			left: 0;
		}
	
		&.position-t {
			top: 0;
			right: 50%;
			transform: translateX(50%);
			border-radius: 0;
			border-bottom-right-radius: 1em;
			border-bottom-left-radius: 1em;
		}
	
		&.position-tr {
			top: .5em;
			right: 0;
			border-radius: 0;
			border-top-left-radius: 1em;
			border-bottom-left-radius: 1em;
		}
	
		&.position-l {
			top: 50%;
			left: 0;
			transform: translateY(-50%);
		}
	
		&.position-m {
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			border-radius: 1em;
		}
	
		&.position-r {
			top: 50%;
			right: 0;
			transform: translateY(-50%);
			border-radius: 0;
			border-top-left-radius: 1em;
			border-bottom-left-radius: 1em;
		}
	
		&.position-bl {
			bottom: @margin;
			left: 0;
		}
	
		&.position-b {
			bottom: 0;
			right: 50%;
			transform: translateX(50%);
			border-radius: 0;
			border-top-right-radius: 1em;
			border-top-left-radius: 1em;
		}
	
	
		.profilePic {
			align-self: flex-start;
			padding-right: .5em;
			img {
				width: 3em;
				height: 3em;
				border-radius: 50%;
			}
		}
	
		&.position-br {
			bottom: .5em;
			right: 0;
			border-radius: 0;
			border-top-left-radius: 1em;
			border-bottom-left-radius: 1em;
		}
	
		.infos {
			.login {
				font-weight: bold;
				margin-bottom: .25em;
			}
			.message {
				color:@mainColor_dark;
				word-break: break-word;
				:deep(.emote) {
					max-height: 1.25em;
					vertical-align: middle;
				}
			}
		}
	}

	.clipHolder {
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		width: 100%;
		max-width: 50%;
		aspect-ratio: 16/9;

		video, iframe {
			width: 100%;
			height: 100%;
			// aspect-ratio: 16/9;
		}

		.clipProgress {
			height: 10px;
			background-color: @mainColor_alert;
			transition: width .5s linear;
		}
	}
}
</style>