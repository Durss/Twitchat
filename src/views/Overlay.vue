<template>
	<div class="overlay">
		<OverlaysRaffleWheel v-if="overlay=='wheel'" />
		<OverlayMusicPlayer v-if="overlay=='music'" />
	</div>
</template>

<script lang="ts">
import router from '@/router';
import { Options, Vue } from 'vue-class-component';
import OverlayMusicPlayer from '../components/overlays/OverlayMusicPlayer.vue';
import OverlaysRaffleWheel from '../components/overlays/OverlaysRaffleWheel.vue';

@Options({
	props:{},
	components:{
		OverlaysRaffleWheel,
		OverlayMusicPlayer,
	}
})
export default class Overlay extends Vue {

	public overlay = "";

	public mounted():void {
		this.overlay = router.currentRoute.value.params.id as string;
	}

}
</script>

<style scoped lang="less">
.overlay{
	height: 100%;
}
</style>