<template>
	<div :class="classes">
		<transition name="slide">
			<div class="content" v-if="isPlaying" id="music_holder">
				<img :src="cover" class="cover" id="music_cover" v-if="params?.showCover !== false">
				
				<div class="infos">
					<div id="music_infos" class="trackHolder">
						<Vue3Marquee :duration="duration"
						:clone="params?.noScroll === false"
						v-if="params?.noScroll !== true && !resetScrolling">
							<div class="track">
								<div class="custom" id="music_info_custom_template" v-if="customTrackInfo" v-html="customTrackInfo"></div>
								<div class="artist" id="music_artist" v-if="params?.showArtist !== false">{{artist}}</div>
								<div class="title" id="music_title" v-if="params?.showTitle !== false">{{title}}</div>
							</div>
						</Vue3Marquee>
						<div class="staticInfos">
							<div class="track" v-if="params?.noScroll === true || resetScrolling">
								<div class="custom" id="music_info_custom_template" v-if="customTrackInfo" v-html="customTrackInfo"></div>
								<div class="artist" id="music_artist" v-if="params?.showArtist !== false">{{artist}}</div>
								<div class="title" id="music_title" v-if="params?.showTitle !== false">{{title}}</div>
							</div>
						</div>
					</div>
					<div class="progressbar" ref="progressbar" id="music_progress" @click="onSeek($event)" v-if="params?.showProgressbar !== false">
						<div class="fill" id="music_progress_fill" :style="progressStyles"></div>
					</div>
				</div>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import DeezerHelper from '@/utils/DeezerHelper';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import { Vue3Marquee } from 'vue3-marquee';
import 'vue3-marquee/dist/style.css';

@Options({
	props:{
		embed: {
			type: Boolean,
			default: false,
		},
		keepEmbedTransitions: {
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
	public keepEmbedTransitions!:boolean;
	public playbackPos!:number;
	public staticTrackData!:TwitchatDataTypes.MusicMessage;
	
	public artist = "";
	public title = "";
	public cover = "";
	public customTrackInfo = "";
	public progress = 0;
	public isPlaying = false;
	public resetScrolling = false;
	public params:TwitchatDataTypes.MusicPlayerParamsData|null = null;

	public get paused():boolean { return !DeezerHelper.instance.playing; }

	private onTrackHandler!:(e:TwitchatEvent) => void;

	public get classes():string[] {
		let res = ["overlaymusicplayer"];
		if(this.embed !== false) res.push("embed")
		if(this.keepEmbedTransitions !== false) res.push("keepEmbedTransitions")
		if(this.params) {
			if(this.params.noScroll === true) res.push("noScroll")
			if(this.params.openFromLeft === true) res.push("left")
		}
		return res;
	}

	public get duration():number {
		return Math.max(this.artist.length, this.title.length, 20) / 2;
	}

	public get progressStyles():{[key:string]:string} {
		return {
			width: `${this.progress*100}%`,
		};
	}

	public mounted():void {
		this.onTrackHandler = async (e:TwitchatEvent) => {
			if(e.data && ((e.data as unknown) as {params:TwitchatDataTypes.MusicPlayerParamsData}).params){
				const obj = (e.data as unknown) as  { params:TwitchatDataTypes.MusicPlayerParamsData }
				this.params = obj.params;
			}
			if((e.data as {trackName?:string}).trackName) {
				const prevArtist = this.artist;
				const prevTitle = this.title;
				const obj = (e.data as unknown) as 
							{
								trackName:string,
								artistName:string,
								trackDuration:number,
								trackPlaybackPos:number,
								cover:string,
								params:TwitchatDataTypes.MusicPlayerParamsData,
							}
				this.artist = obj.artistName;
				this.title = obj.trackName;
				this.cover = obj.cover;
				this.isPlaying = true;
				let customTrackInfo = obj.params.customInfoTemplate;
				if(this.customTrackInfo.length > 0) {
					customTrackInfo = customTrackInfo.replace(/\{ARTIST\}/gi, this.artist);
					customTrackInfo = customTrackInfo.replace(/\{TITLE\}/gi, this.title);
				}
				this.customTrackInfo = customTrackInfo;

				const newProgress = (obj.trackPlaybackPos/obj.trackDuration);
				this.progress = newProgress;
				const duration = (obj.trackDuration*(1-newProgress))/1000;
				gsap.killTweensOf(this);
				gsap.to(this, {duration, progress:1, ease:"linear"});

				if(this.params?.noScroll !== true) {
					//If it's a new track, reset the scrolling
					if(prevArtist != this.artist && prevTitle != this.title) {
						this.resetScrolling = true;
						await this.$nextTick();
						this.resetScrolling = false;
					}
				}
			}else{
				this.isPlaying = this.params?.autoHide !== false;
				if(this.params?.erase === true) {
					this.artist = "no music";
					this.title = "no music";
					this.cover = this.$image("img/defaultCover.svg");
				}
				gsap.killTweensOf(this);
				if(this.params) {
					this.params.showProgressbar = false;
				}
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
			//Called when seeking
			watch(()=>StoreProxy.music.musicPlayerParams, ()=> this.onTrackChangeLocal(), {deep:true});
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
		this.params = StoreProxy.music.musicPlayerParams as TwitchatDataTypes.MusicPlayerParamsData;
		if(track) {
			this.artist = track.artist;
			this.title = track.title;
			this.cover = track.cover;
			this.isPlaying = true;
			let customTrackInfo = this.params.customInfoTemplate;
			if(this.customTrackInfo.length > 0) {
				customTrackInfo = customTrackInfo.replace(/\{ARTIST\}/gi, this.artist);
				customTrackInfo = customTrackInfo.replace(/\{TITLE\}/gi, this.title);
			}
			this.customTrackInfo = customTrackInfo;

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

		&:not(.keepEmbedTransitions) {
			.slide-enter-active {
				transition: unset;
			}
	
			.slide-leave-active {
				transition: unset;
			}
		}
	}

	&.noScroll {
		.content {
			.infos {
				.trackHolder {
					.track {
						.custom {
							padding-right: 0 !important;
						}
					}
				}
			}
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
			padding: 0 .25em;
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

					.custom {
						padding-right: 10vw;
					}

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

				.staticInfos {
					width: 100%;
					.artist, .title {
						padding-right: 0;
						display: block;
						white-space: nowrap;
						overflow: hidden;
						text-overflow: ellipsis;
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

	&.left {
		.slide-enter-from,
		.slide-leave-to {
			transform: translateX(-100%);
		}
	}

}
</style>