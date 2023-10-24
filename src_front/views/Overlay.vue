<template>
	<div :class="classes">
		<OverlayTimer v-if="overlay=='timer' || overlay=='unified'" />
		<OverlaysRaffleWheel v-if="overlay=='wheel' || overlay=='unified'" />
		<OverlayEndingCredits v-if="overlay=='credits' || overlay=='unified'" />
		<OverlayChatHighlight v-if="overlay=='chathighlight' || overlay=='unified'" />
		<OverlayMusicPlayer v-if="overlay=='music' || overlay=='unified'" :embed="overlay=='unified'" keepEmbedTransitions ref="music" class="music" />
		<OverlayTTS v-if="overlay=='tts' || overlay=='unified'" />
		<OverlayCounter v-if="overlay=='counter'" />
		<OverlayUlule v-if="overlay=='ulule'" />
		<OverlayHeatDebug v-if="overlay=='heatdebug'" />
		<OverlayAdBreak v-if="overlay=='adbreak'" />
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import OverlayEndingCredits from '../components/overlays/OverlayEndingCredits.vue';
import OverlayMusicPlayer from '../components/overlays/OverlayMusicPlayer.vue';
import OverlaysRaffleWheel from '../components/overlays/OverlaysRaffleWheel.vue';
import OverlayTimer from '../components/overlays/OverlayTimer.vue';
import OverlayChatHighlight from '../components/overlays/OverlayChatHighlight.vue';
import OverlayCounter from '../components/overlays/OverlayCounter.vue';
import OverlayUlule from '@/components/overlays/OverlayUlule.vue';
import Utils from '@/utils/Utils';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import OverlayHeatDebug from '@/components/overlays/OverlayHeatDebug.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OverlayTTS from '@/components/params/contents/overlays/OverlayTTS.vue';
import OverlayAdBreak from '@/components/overlays/OverlayAdBreak.vue';

@Component({
	components:{
		OverlayTTS,
		OverlayUlule,
		OverlayTimer,
		OverlayAdBreak,
		OverlayCounter,
		OverlayHeatDebug,
		OverlayMusicPlayer,
		OverlaysRaffleWheel,
		OverlayEndingCredits,
		OverlayChatHighlight,
	}
})
export default class Overlay extends Vue {

	public overlay:TwitchatDataTypes.OverlayTypes|"" = "";

	private heatEventHandler!:(event:{detail:{anonymous:boolean, x:number, y:number, uid:string, shift:boolean, alt:boolean, ctrl:boolean, testMode:boolean, login:string, page:string}}) => void;

	public get classes():string[] {
		const res:string[] = ["overlay"];
		if(this.overlay == "unified") res.push("unified")
		return res;
	}

	public beforeMount():void {
		this.overlay = this.$router.currentRoute.value.params.id as TwitchatDataTypes.OverlayTypes;
	}

	public mounted():void {
		// //Add a GUID to the parameters.
		// //This is used to match an OBS source with a spacific overlay
		// if(!this.$router.currentRoute.value.query.guid) {
		// 	const query = JSON.parse(JSON.stringify(this.$route.query));
		// 	query.guid = Utils.getUUID();
		// 	this.$router.replace({path: this.$route.path, query})
		// }
		if(this.overlay === "unified") {
			this.heatEventHandler = (e) => this.onHeatClick(e);
			//@ts-ignore
			window.addEventListener("heat-click", this.heatEventHandler);
		}
	}
	
	public beforeUnmount():void {
		//@ts-ignore
		window.removeEventListener("heat-click", this.heatEventHandler);
	}

	private async onHeatClick(event:{detail:{anonymous:boolean, x:number, y:number, uid:string, shift:boolean, alt:boolean, ctrl:boolean, testMode:boolean, login:string, page:string}}):Promise<void> {
		//Check if the heat event is for the current page
		const hash = await Utils.sha256(document.location.href);
		if(event.detail.page != hash) return;

		const px = event.detail.x * document.body.clientWidth;
		const py = event.detail.y * document.body.clientHeight;
		const player = (this.$refs.music as Vue).$el;
		const bounds = player.getBoundingClientRect();

		// Check if the point is over the player
		if(px >= bounds.left &&
		px <= bounds.right &&
		py >= bounds.top &&
		py <= bounds.bottom) {
			PublicAPI.instance.broadcast(TwitchatEvent.MUSIC_PLAYER_HEAT_CLICK, event.detail);
		}
	}

}
</script>

<style scoped lang="less">
.overlay{
	height: 100%;

	&.unified {
		.music {
			position: absolute;
			bottom: 0;
			right: 0;
			max-width: 20vw;
			height: 10vh;
			min-width: 200px;
			min-height: 80px;
			font-size: 2em;
		}
	}
}
</style>