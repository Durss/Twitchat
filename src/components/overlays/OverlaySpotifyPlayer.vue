<template>
	<div class="overlayspotifyplayer">
		<div class="content" v-if="isPlaying">
			<img :src="cover" class="cover">
			<div class="infos">
				<div class="artist">{{artist}}</div>
				<div class="track">{{track}}</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class OverlaySpotifyPlayer extends Vue {

	public artist:string = "";
	public track:string = "";
	public cover:string = "";
	public isPlaying:boolean = false;

	private onTrackHandler!:(e:TwitchatEvent) => void;

	public mounted():void {
		this.onTrackHandler = (e:TwitchatEvent) => {
			if(e.data) {
				const obj = e.data as 
							{
								trackName:string,
								artistName:string,
								trackDuration:number,
								trackPlaybackPos:number,
								cover:string,
							}
				this.artist = obj.artistName;
				this.track = obj.trackName;
				this.cover = obj.cover;
				this.isPlaying = true;
			}else{
				this.isPlaying = false;
			}
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.CURRENT_TRACK, this.onTrackHandler);
		PublicAPI.instance.broadcast(TwitchatEvent.GET_CURRENT_TRACK);
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.CURRENT_TRACK, this.onTrackHandler);
	}

}
</script>

<style scoped lang="less">
.overlayspotifyplayer{
	.content {
		display: flex;
		flex-direction: row;

		.cover {
			width: 100vh;
			max-width: 30vw;
			margin-right: 10vh;
			object-fit: cover;
		}
		
		.infos {
			font-size: 30vh;
			flex-grow: 1;

			.artist {
				font-weight: bold;
			}

			.track {
				font-size: .8em;
			}
		}
	}
}
</style>