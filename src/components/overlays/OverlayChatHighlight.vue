<template>
	<div class="overlaychathighlight" v-if="params && user">
		<div :class="classes" ref="holder" id="highlight_holder">
			<div class="profilePic" id="highlight_avatar">
				<img :src="user.profile_image_url">
			</div>
			<div class="infos" id="highlight_infos">
				<div class="login" id="highlight_login">{{user.display_name}}</div>
				<div class="message" id="highlight_message" v-html="message"></div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { ChatHighlightOverlayData } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class OverlayChatHighlight extends Vue {

	public message:string = "";
	public user:TwitchDataTypes.UserInfo|null = null;
	public params:ChatHighlightOverlayData|null = null;

	private showMessageHandler!:(e:TwitchatEvent)=>void;
	private overlayPresenceHandler!:(e:TwitchatEvent)=>void;

	public get classes():string[] {
		return [
			"holder",
			"position-"+this.params?.position
		];
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
		
		this.showMessageHandler = (e:TwitchatEvent)=>this.onShowMessage(e);
		this.overlayPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE); }

		PublicAPI.instance.addEventListener(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, this.showMessageHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, this.showMessageHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	private async onShowMessage(e:TwitchatEvent):Promise<void> {
		if(this.user && this.params) {
			const holder = this.$refs.holder as HTMLDivElement;
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
			await this.$nextTick();
		}

		const data = (e.data as unknown) as {message:string, user:TwitchDataTypes.UserInfo, params:ChatHighlightOverlayData};
		this.message = data.message;
		this.user = data.user;
		this.params = data.params;

		if(this.message && this.params && this.user) {
			await this.$nextTick();
	
			const holder = this.$refs.holder as HTMLDivElement;
			if(this.params.position.indexOf("r") > -1){
				gsap.from(holder, {x:"100%", duration:1, ease:"sine.out"});
			}else
			if(this.params.position.indexOf("l") > -1){
				gsap.from(holder, {x:"-100%", duration:1, ease:"sine.out"});
			}else
			if(this.params.position == "t"){
				gsap.from(holder, {y:"-100%", duration:1, ease:"sine.out"});
			}else
			if(this.params.position == "b"){
				gsap.from(holder, {y:"100%", duration:1, ease:"sine.out"});
			}else
			if(this.params.position == "m"){
				gsap.from(holder, {scale:0, duration:1, ease:"back.out"});
			}
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
		font-size: 2em;
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
				:deep(.emote) {
					height: 1em;
					vertical-align: middle;
				}
			}
		}
	}
}
</style>