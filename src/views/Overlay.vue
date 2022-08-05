<template>
	<div class="overlay">
		<OverlaysRaffleWheel v-if="overlay=='wheel'" />
		<OverlayMusicPlayer v-if="overlay=='music'" />
		<OverlayTimer v-if="overlay=='timer'" />
		<OverlayChatHighlight v-if="overlay=='chathighlight'" />
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import OverlayMusicPlayer from '../components/overlays/OverlayMusicPlayer.vue';
import OverlaysRaffleWheel from '../components/overlays/OverlaysRaffleWheel.vue';
import OverlayTimer from '../components/overlays/OverlayTimer.vue';
import OverlayChatHighlight from '../components/overlays/OverlayChatHighlight.vue';

@Options({
	props:{},
	components:{
		OverlayTimer,
		OverlayMusicPlayer,
		OverlaysRaffleWheel,
		OverlayChatHighlight,
	}
})
export default class Overlay extends Vue {

	public overlay = "";

	public mounted():void {
		this.overlay = this.$router.currentRoute.value.params.id as string;
	}

}
</script>

<style scoped lang="less">
.overlay{
	height: 100%;
}
</style>