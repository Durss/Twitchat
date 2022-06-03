<template>
	<div class="OverlayMusicPlayer">
		<transition name="slide">
			<div class="content" v-if="isPlaying">
				<img :src="cover" class="cover" id="music_cover">
				<div class="infos">
					<Vue3Marquee :duration="duration" class="trackHolder">
						<div class="track">
							<div class="artist" id="music_artist">{{artist}}</div>
							<div class="title" id="music_title">{{track}}</div>
						</div>
					</Vue3Marquee>
					<div class="progressbar" id="music_progress">
						<div class="fill" :style="progressStyles"></div>
					</div>
				</div>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import { Vue3Marquee } from 'vue3-marquee'
import 'vue3-marquee/dist/style.css'

@Options({
	props:{},
	components:{
		Vue3Marquee,
	}
})
export default class OverlayMusicPlayer extends Vue {

	public artist:string = "";
	public track:string = "";
	public cover:string = "";
	public isPlaying:boolean = false;
	public progress:number = 0;

	private onTrackHandler!:(e:TwitchatEvent) => void;

	public get duration():number {
		return Math.max(this.artist.length, this.track.length, 20) / 2;
	}

	public get progressStyles():{[key:string]:string} {
		return {
			width: `${this.progress*100}%`,
		};
	}

	public mounted():void {
		this.onTrackHandler = (e:TwitchatEvent) => {
			if((e.data as {trackName?:string}).trackName) {
				const wasPlaying = this.isPlaying;
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

				const newProgress = (obj.trackPlaybackPos/obj.trackDuration);
				//There's a slight offset (~3%) between the local progress
				//and what spotify gives us due to the query execution duration
				//wich makes the progressbar jump back on every event
				//This condition avoids reseting the progressbar animation
				//unless there's a more a than 5% offset
				if(Math.abs(newProgress - this.progress) > .05
				|| this.progress == 0
				|| wasPlaying != this.isPlaying) {
					this.progress = newProgress;
					const duration = (obj.trackDuration*(1-newProgress))/1000;
					console.log(duration, newProgress);
					gsap.killTweensOf(this);
					gsap.to(this, {duration, progress:1, ease:"linear"});
				}
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
.OverlayMusicPlayer{
	.content {
		@maxHeight: ~"min(100vh, 25vw)";
		display: flex;
		flex-direction: row;
		background-color: @mainColor_dark;
		max-height: @maxHeight;
		max-width: 100%;

		.cover {
			width: @maxHeight;
			height: @maxHeight;
			object-fit: cover;
		}
		
		.infos {
			@infoHeight: calc(@maxHeight/2 - .25em/2);
			color: @mainColor_light;
			@minFontSize: calc(@maxHeight/3);
			font-size: ~"min(@{minFontSize}, 50vh)";
			flex: 1;
			// padding: .25em 0;
			min-width: 0px;//Tell flexbox it's ok to shrink it
			display: flex;
			flex-direction: column;
			justify-content: stretch;
			align-items: stretch;
			justify-items: stretch;

			:deep(.vue3-marquee) {
				overflow-y: hidden;
				align-items: center;
			}

			.trackHolder {
				flex-grow: 1;
				display: flex;
				flex-direction: column;
				justify-content: center;
				.track {
					display: flex;
					flex-direction: column;
					.artist, .track {
						padding-right: 10vw;
						display: flex;
					}
					.artist {
						font-weight: bold;
						align-items: flex-end;
					}
					.title {
						font-size: .8em;
						align-items: flex-start;
					}
				}
			}
		}
		.progressbar {
			height: .24em;
			max-width: 100%;
			.fill {
				background-color: @mainColor_light;
				height: 100%;
			}
		}
	}

	.slide-enter-active {
		transition: all 0.5s ease-out;
	}

	.slide-leave-active {
		transition: all 0.5s ease-out;
	}
	
	.slide-enter-from,
	.slide-leave-to {
		transform: translateX(100%);
	}

}
</style>