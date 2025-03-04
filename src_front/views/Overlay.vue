<template>
	<div :class="classes">
		<OverlayTimer v-if="overlay=='timer' || overlay=='unified'" />
		<OverlaysRaffleWheel v-if="overlay=='wheel' || overlay=='unified'" />
		<OverlayChatHighlight v-if="overlay=='chathighlight' || overlay=='unified'" />
		<OverlayMusicPlayer v-if="overlay=='music' || overlay=='unified'" :embed="overlay=='unified'" keepEmbedTransitions ref="music" class="music" />
		<OverlayEndingCredits v-if="overlay=='credits'" />
		<OverlayCounter v-if="overlay=='counter'" />
		<OverlayUlule v-if="overlay=='ulule'" />
		<OverlayHeatDebug v-if="overlay=='heatdebug'" />
		<OverlayAdBreak v-if="overlay=='adbreak'" />
		<OverlayDistort v-if="overlay=='distort'" />
		<OverlayBitsWall v-if="overlay=='bitswall'" />
		<OverlayPredictions v-if="overlay=='predictions'" />
		<OverlayPoll v-if="overlay=='polls'" />
		<OverlayChatPoll v-if="overlay=='chatPoll'" />
		<OverlayBingoGrid v-if="overlay=='bingogrid'" ref="bingoGrid" />
		<OverlayDonationGoals v-if="overlay=='donationgoals'" />
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import Utils from '@/utils/Utils';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { defineAsyncComponent } from 'vue';
import { type OverlayBingoGrid as OverlayBingoGridClass } from '@/components/overlays/OverlayBingoGrid.vue';
const OverlayBitsWall = defineAsyncComponent({loader: () => import('@/components/overlays/OverlayBitsWall.vue')})
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
const OverlayPredictions = defineAsyncComponent({loader: () => import('@/components/overlays/OverlayPredictions.vue')});
const OverlayPoll = defineAsyncComponent({loader: () => import('@/components/overlays/OverlayPoll.vue')});
const OverlayBingoGrid = defineAsyncComponent({loader: () => import('@/components/overlays/OverlayBingoGrid.vue')});
const OverlayDonationGoals = defineAsyncComponent({loader: () => import('@/components/overlays/OverlayDonationGoals.vue')});
const OverlayChatPoll = defineAsyncComponent({loader: () => import('@/components/overlays/OverlayChatPoll.vue')});

@Component({
	components:{
		OverlayPoll,
		OverlayUlule,
		OverlayTimer,
		OverlayAdBreak,
		OverlayCounter,
		OverlayDistort,
		OverlayChatPoll,
		OverlayBitsWall,
		OverlayHeatDebug,
		OverlayBingoGrid,
		OverlayPredictions,
		OverlayMusicPlayer,
		OverlaysRaffleWheel,
		OverlayDonationGoals,
		OverlayEndingCredits,
		OverlayChatHighlight,
	}
})
class Overlay extends Vue {

	public overlay:TwitchatDataTypes.OverlayTypes|"" = "";

	private heatEventHandler!:(event:{detail:TwitchatDataTypes.HeatClickData}) => void;

	public get classes():string[] {
		const res:string[] = ["overlay"];
		if(this.overlay == "unified") res.push("unified")
		return res;
	}

	public beforeMount():void {
		this.overlay = this.$router.currentRoute.value.params.id as TwitchatDataTypes.OverlayTypes;
	}

	public mounted():void {
		this.heatEventHandler = (e) => this.onHeatClick(e);
		//@ts-ignore
		window.addEventListener("heat-click", this.heatEventHandler);
	}

	public beforeUnmount():void {
		//@ts-ignore
		window.removeEventListener("heat-click", this.heatEventHandler);
	}

	private async onHeatClick(event:{detail:TwitchatDataTypes.HeatClickData}):Promise<void> {
		//Check if the heat event is for the current page
		const hash = await Utils.sha256(document.location.href);
		if(event.detail.page != hash) return;

		const px = event.detail.x * document.body.clientWidth;
		const py = event.detail.y * document.body.clientHeight;

		const player = this.$refs.music as Vue;
		const bingoGrid = this.$refs.bingoGrid as OverlayBingoGridClass;

		//Check if it matches the player's bounds
		if(this.overlay === "unified" && player) {
			const bounds = player.$el.getBoundingClientRect();
			// Check if the point is over the player
			if(px >= bounds.left &&
			px <= bounds.right &&
			py >= bounds.top &&
			py <= bounds.bottom) {
				PublicAPI.instance.broadcast(TwitchatEvent.MUSIC_PLAYER_HEAT_CLICK, event.detail);
			}
		}

		//Check if clicking on bingo grid to tick cells
		if(bingoGrid) {
			const bounds = bingoGrid.$el.getBoundingClientRect();
			// Check if the point is over the player
			if(px >= bounds.left &&
			px <= bounds.right &&
			py >= bounds.top &&
			py <= bounds.bottom) {
				bingoGrid.onHeatClick(event.detail, px, py);
			}
		}
	}

}
export default toNative(Overlay);
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
