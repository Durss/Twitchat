<template>
	<div :class="classes">
		<transition name="slide">
			<div class="content" v-if="isPlaying" id="music_holder">
				<img :src="cover" class="cover" id="music_cover">
				<div class="infos">
					<div id="music_infos" class="trackHolder">
						<Vue3Marquee :duration="duration" :clone="true">
							<div class="track">
								<div class="artist" id="music_artist">{{artist}}</div>
								<div class="title" id="music_title">{{track}}</div>
							</div>
						</Vue3Marquee>
					</div>
					<div class="progressbar" ref="progressbar" id="music_progress" @click="onSeek($event)">
						<div class="fill" id="music_progress_fill" :style="progressStyles"></div>
					</div>
				</div>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
import type { MusicMessage } from '@/types/TwitchatDataTypes';
import DeezerHelper from '@/utils/DeezerHelper';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import { Vue3Marquee } from 'vue3-marquee'
import 'vue3-marquee/dist/style.css'

@Options({
	props:{
		embed: {
			type: Boolean,
			default: false,
		},
		staticTrackData: Object,
	},
	components:{
		Vue3Marquee,
	},
	emits:["seek"]
})
export default class OverlayMusicPlayer extends Vue {

	public embed!:boolean;
	public playbackPos!:number;
	public staticTrackData!:MusicMessage;
	
	public artist = "";
	public track = "";
	public cover = "";
	public isPlaying = false;
	public progress = 0;

	public get paused():boolean { return !DeezerHelper.instance.playing; }

	private onTrackHandler!:(e:TwitchatEvent) => void;

	public get classes():string[] {
		let res = ["overlaymusicplayer"];
		if(this.embed !== false) res.push("embed")
		return res;
	}

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
				this.progress = newProgress;
				const duration = (obj.trackDuration*(1-newProgress))/1000;
				gsap.killTweensOf(this);
				gsap.to(this, {duration, progress:1, ease:"linear"});
			}else{
				this.isPlaying = false;
			}
		};
		
		if(!this.staticTrackData) {
			PublicAPI.instance.addEventListener(TwitchatEvent.CURRENT_TRACK, this.onTrackHandler);
			PublicAPI.instance.broadcast(TwitchatEvent.GET_CURRENT_TRACK);
		}else{
			this.onTrackChangeLocal();
			this.progress = 50
		}
		if(this.embed) {
			//Called when track changes
			watch(()=>DeezerHelper.instance.currentTrack, ()=>this.onTrackChangeLocal());
			//Called when play/pause track
			watch(()=>DeezerHelper.instance.playing, ()=>this.updateEmbedProgress());
			//Called when seeking
			watch(()=>DeezerHelper.instance.playbackPos, ()=> this.updateEmbedProgress());
			this.onTrackChangeLocal();
		}
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.CURRENT_TRACK, this.onTrackHandler);
	}

	public onSeek(e:MouseEvent):void {
		const bar = this.$refs.progressbar as HTMLDivElement;
		const bounds = bar.getBoundingClientRect();
		const percent = e.offsetX/bounds.width;
		this.$emit("seek", percent);
	}

	private onTrackChangeLocal():void {
		const track = this.staticTrackData? this.staticTrackData : DeezerHelper.instance.currentTrack;
		if(track) {
			this.artist = track.artist;
			this.track = track.title;
			this.cover = track.cover;
			this.isPlaying = true;

			const newProgress = ((this.staticTrackData? 600 : DeezerHelper.instance.playbackPos)/track.duration);
			this.progress = newProgress;
			const duration = track.duration*(1-newProgress);
			gsap.killTweensOf(this);
			gsap.to(this, {duration, progress:1, ease:"linear"});
		}else{
			this.isPlaying = false;
		}
	}

	private updateEmbedProgress():void {
		if(DeezerHelper.instance.currentTrack && DeezerHelper.instance.playing) {
			let trackDuration = DeezerHelper.instance.currentTrack.duration * 1000;
			const newProgress = ((DeezerHelper.instance.playbackPos*1000)/trackDuration);
			this.progress = newProgress;
			const duration = (trackDuration*(1-newProgress))/1000;
			gsap.killTweensOf(this);
			gsap.to(this, {duration, progress:1, ease:"linear"});
		}else{
			gsap.killTweensOf(this);
		}
	}

}
</script>

<style scoped lang="less">
.overlaymusicplayer{
	&.embed {
		width: 100%;
		max-width: 300px;
		aspect-ratio: 300 / 54;
		margin: auto;
		margin-top: .5em;
		margin-bottom: .5em;

		.content {
			width: 100%;
			height: 100%;
			max-width: unset;
			max-height: unset;

			.cover {
				width: auto;
				height: 100%;
			}
			.infos {
				height: 100%;
				font-size: 1em;
			}
		}

		.slide-enter-active {
			transition: unset;
		}

		.slide-leave-active {
			transition: unset;
		}
	}

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
					flex-direction: column-reverse;
					.artist, .title {
						padding-right: 10vw;
						display: flex;
					}
					.artist {
						font-weight: bold;
						font-size: .8em;
						align-items: flex-end;
					}
					.title {
						font-weight: bold;
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