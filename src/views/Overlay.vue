<template>
	<div class="overlay">
		<OverlaySpotifyPlayer v-if="overlay=='spotify'" />
	</div>
</template>

<script lang="ts">
import router from '@/router';
import { Options, Vue } from 'vue-class-component';
import OverlaySpotifyPlayer from '../components/overlays/OverlaySpotifyPlayer.vue';

@Options({
	props:{},
	components:{
		OverlaySpotifyPlayer,
	}
})
export default class Overlay extends Vue {

	public overlay:string = "";

	public mounted():void {
		this.overlay = router.currentRoute.value.params.id as string;
	}

}
</script>

<style scoped lang="less">
.overlay{
	
}
</style>