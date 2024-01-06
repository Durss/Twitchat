<template>
	<div :class="classes">
		<OverlayTimer v-if="overlay=='timer' || overlay=='unified'" />
		<OverlaysRaffleWheel v-if="overlay=='wheel' || overlay=='unified'" />
		<OverlayEndingCredits v-if="overlay=='credits' || overlay=='unified'" />
		<OverlayChatHighlight v-if="overlay=='chathighlight' || overlay=='unified'" />
		<OverlayMusicPlayer v-if="overlay=='music' || overlay=='unified'" :embed="overlay=='unified'" keepEmbedTransitions ref="music" class="music" />
		<OverlayCounter v-if="overlay=='counter'" />
		<OverlayUlule v-if="overlay=='ulule'" />
		<OverlayHeatDebug v-if="overlay=='heatdebug'" />
		<OverlayAdBreak v-if="overlay=='adbreak'" />
		<OverlayDistort v-if="overlay=='distort'" />
		<OverlayBitsWall v-if="overlay=='bitswall'" />
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import Utils from '@/utils/Utils';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TTButton from '@/components/TTButton.vue';
import { defineAsyncComponent } from 'vue';
// import OverlayBitsWall from '@/components/overlays/OverlayBitsWall.vue';
// const OverlayBitsWall = () => import('@/components/overlays/OverlayBitsWall.vue');
const OverlayBitsWall = defineAsyncComponent({
  loader: () => import('@/components/overlays/OverlayBitsWall.vue'),
//   loadingComponent: LoadingComponent /* shows while loading */,
//   errorComponent: ErrorComponent /* shows if there's an error */,
//   delay: 1000 /* delay in ms before showing loading component */,
//   timeout: 3000 /* timeout after this many ms */,
})
const OverlayHeatDebug = defineAsyncComponent({loader: () => import('../components/overlays/OverlayHeatDebug.vue')});
const OverlayEndingCredits = defineAsyncComponent({loader: () => import('../components/overlays/OverlayEndingCredits.vue')});
const OverlayMusicPlayer = defineAsyncComponent({loader: () => import('../components/overlays/OverlayMusicPlayer.vue')});
const OverlaysRaffleWheel = defineAsyncComponent({loader: () => import('../components/overlays/OverlaysRaffleWheel.vue')});
const OverlayTimer = defineAsyncComponent({loader: () => import('../components/overlays/OverlayTimer.vue')});
const OverlayChatHighlight = defineAsyncComponent({loader: () => import('../components/overlays/OverlayChatHighlight.vue')});
const OverlayCounter = defineAsyncComponent({loader: () => import('../components/overlays/OverlayCounter.vue')});
const OverlayUlule = defineAsyncComponent({loader: () => import('@/components/overlays/OverlayUlule.vue')});
const OverlayAdBreak = defineAsyncComponent({loader: () => import('@/components/overlays/OverlayAdBreak.vue')});
const OverlayDistort = defineAsyncComponent({loader: () => import('@/components/overlays/OverlayDistort.vue')});

@Component({
	components:{
		Button: TTButton,
		OverlayUlule,
		OverlayTimer,
		OverlayAdBreak,
		OverlayCounter,
		OverlayDistort,
		OverlayBitsWall,
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
		//Check if it matches the player's bounds
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