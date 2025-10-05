<template>
	<div :class="classes">
		<transition name="slide">
			<div class="content" v-if="isPlaying" id="music_holder">
				<div class="cover" id="music_cover" v-if="params?.showCover !== false">
					<img :src="cover">
				</div>

				<div class="infos" id="music_content">
					<div id="music_infos" class="trackHolder">
						<Vue3Marquee :duration="duration"
						:animateOnOverflowOnly="true"
						:clone="noScroll === false"
						v-if="noScroll !== true && !resetScrolling">
							<div class="track">
								<div class="custom" id="music_info_custom_template" v-if="customTrackInfo" v-html="customTrackInfo"></div>
								<div class="artist" id="music_artist" v-if="params?.showArtist !== false">{{artist}}</div>
								<div class="title" id="music_title" v-if="params?.showTitle !== false">{{title}}</div>
							</div>
						</Vue3Marquee>
						<div class="staticInfos">
							<div class="track" v-if="noScroll === true || resetScrolling">
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
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { gsap } from 'gsap/gsap-core';
import { watch } from 'vue';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import { Vue3Marquee } from 'vue3-marquee'
import AbstractOverlay from './AbstractOverlay';
import DOMPurify from 'isomorphic-dompurify';

@Component({
	components:{
		Vue3Marquee,
	},
	emits:["seek"]
})
class OverlayMusicPlayer extends AbstractOverlay {

	@Prop({
			type: Boolean,
			default: false,
		})
	public embed!:boolean;
	@Prop({
			type: Boolean,
			default: false,
		})
	public keepEmbedTransitions!:boolean;
	@Prop
	public playbackPos!:number;
	@Prop
	public staticTrackData!:TwitchatDataTypes.MusicTrackData;

	public artist = "";
	public title = "";
	public cover = "";
	public skin = "";
	public customTrackInfo = "";
	public progress = 0;
	public isPlaying = false;
	public resetScrolling = false;
	public params:TwitchatDataTypes.MusicPlayerParamsData|null = null;

	public get noScroll():boolean {
		if(Object.hasOwn(this.$route.query, "noScroll")) return true;
		if(this.params) {
			if(this.params.noScroll === true) return true;
		}
		return false;
	}

	private onTrackHandler!:(e:TwitchatEvent) => void;

	public get classes():string[] {
		let res = ["overlaymusicplayer"];
		if(this.embed !== false) res.push("embed")
		if(this.keepEmbedTransitions !== false) res.push("keepEmbedTransitions")
		if(this.params) {
			if(this.params.noScroll === true) res.push("noScroll")
			if(this.params.openFromLeft === true) res.push("left")
		}
		if(this.skin) res.push(this.skin);
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
								skin:string,
								params:TwitchatDataTypes.MusicPlayerParamsData,
							}
				this.artist = obj.artistName;
				this.title = obj.trackName;
				this.cover = obj.cover;
				this.skin = obj.skin;
				console.log(obj)
				this.isPlaying = true;
				let customTrackInfo = obj.params.customInfoTemplate;
				customTrackInfo = customTrackInfo.replace(/\{ARTIST\}/gi, this.artist || "no music");
				customTrackInfo = customTrackInfo.replace(/\{TITLE\}/gi, this.title || "no music");
				customTrackInfo = customTrackInfo.replace(/\{COVER\}/gi, this.cover);
				this.customTrackInfo = DOMPurify.sanitize(customTrackInfo);

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
					this.cover = this.$asset("img/defaultCover.svg");
				}
				gsap.killTweensOf(this);
				if(this.params) {
					this.params.showProgressbar = false;
				}
			}
			if(!/http?s:\/\/.{5,}/.test(this.cover)) {
				this.cover = this.$asset("img/defaultCover.svg");
			}
		};

		if(!this.staticTrackData) {
			PublicAPI.instance.addEventListener(TwitchatEvent.CURRENT_TRACK, this.onTrackHandler);
			//Wait a little to give it time to OBS websocket to establish connexion
		}else{
			this.onTrackChangeLocal();
			this.progress = 50;
		}
		if(this.embed) {
			//Called when seeking
			watch(()=>this.$store.music.musicPlayerParams, ()=> this.onTrackChangeLocal(), {deep:true});
			this.onTrackChangeLocal();
		}
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.CURRENT_TRACK, this.onTrackHandler);
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_CURRENT_TRACK);
	}

	public onSeek(e:MouseEvent):void {
		const bar = this.$refs.progressbar as HTMLDivElement;
		const bounds = bar.getBoundingClientRect();
		const percent = e.offsetX/bounds.width;
		this.$emit("seek", percent);
	}

	private onTrackChangeLocal():void {
		this.params = this.$store.music.musicPlayerParams as TwitchatDataTypes.MusicPlayerParamsData;
		if(this.staticTrackData) {
			this.artist = this.staticTrackData.artist;
			this.title = this.staticTrackData.title;
			this.cover = this.staticTrackData.cover;
			if(!this.cover) {
				this.cover = this.$asset("img/default_music_cover.png");
			}
			this.isPlaying = true;
			let customTrackInfo = this.params.customInfoTemplate;
			customTrackInfo = customTrackInfo.replace(/\{ARTIST\}/gi, this.artist || "no music");
			customTrackInfo = customTrackInfo.replace(/\{TITLE\}/gi, this.title || "no music");
			customTrackInfo = customTrackInfo.replace(/\{COVER\}/gi, this.cover);
			this.customTrackInfo = DOMPurify.sanitize(customTrackInfo);

			const newProgress = 600/this.staticTrackData.duration;
			this.progress = newProgress;
			const duration = this.staticTrackData.duration*(1-newProgress);
			gsap.killTweensOf(this);
			gsap.to(this, {duration, progress:1, ease:"linear"});
		}else{
			this.isPlaying = false;
		}
	}

}
export default toNative(OverlayMusicPlayer);
</script>

<style scoped lang="less">
.overlaymusicplayer{


	&.embed {
		width: 100%;
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
				width: 20%;
				height: 100%;
			}
			.infos {
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
		background-color: var(--color-dark);
		max-height: @maxHeight;
		max-width: 100%;
		border-radius: var(--border-radius);
		overflow: hidden;

		.cover {
			width: @maxHeight;
			height: @maxHeight;
			object-fit: cover;
			overflow:hidden;
			img {
				width: 100%;
				height: 100%;
			}
		}

		.infos {
			color: var(--color-light);
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
						padding-right: 1rem;
					}

					.artist, .title {
						padding-right: 1rem;
						display: flex;
						line-height: 1.2em;
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
					.track {
						// font-size: .8em;
						.artist, .title {
							width: 100%;
							padding-right: 0 !important;
							display: block;
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
						}
					}
				}
			}
		}
		.progressbar {
			height: .24em;
			max-width: 100%;
			.fill {
				background-color: var(--color-primary);
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

	&.etc {
		@maxHeight: ~"min(calc(100vh - 5vw), 25vw)";
		max-height: @maxHeight;
		max-width: calc(100% - 1.5vw);

		.cover {
			width: @maxHeight;
			height: @maxHeight;
		}

		.content {
			font-weight: bold;
			border: 1.5vw solid #000000;
			background-color: #aa45e5;
			border-radius: 5vw;
			filter: drop-shadow(1vw 1vw 0px #6bf9ff);
			.infos {
				color: #000;
			}
		}
		.progressbar {
			.fill {
				background-color: #6bf9ff;
			}
		}
	}
}
</style>
