<template>
	<div class="fsdfdsfsdfdsfsd">
		<h1 class="title"><img src="@/assets/icons/deezer.svg">Deezer</h1>

		<OverlayMusicPlayer class="player" v-if="currentTrack" @seek="(percent:number)=>onSeek(percent)" embed />

		<div class="controls" v-if="currentTrack">
			<Button white small class="bt" @click="showQueue = !showQueue" :icon="$image('icons/list_purple.svg')" />
			<Button white small class="bt" @click="actionPlay()" :icon="$image('icons/play_purple.svg')" v-if="!playing" />
			<Button white small class="bt" @click="actionPause()" :icon="$image('icons/pause_purple.svg')" v-if="playing" />
			<Button white small class="bt" @click="actionNext()" :icon="$image('icons/next_purple.svg')" />
			<VolumeBar class="volume" v-model="volume" />
		</div>

		<div class="queue" v-if="showQueue">
			<div v-for="(t, index) in queue" :key="t.id" class="item">
				<Button class="deleteBt"
				small highlight
				@click="removeTrack(index)"
				:icon="$image('icons/cross_white.svg')" />
				
				<div class="infos" @click="playQueueItem(index)">
					<span class="artist">{{t.artist.name}}</span>
					<span class="title">{{t.title}}</span>
					<span class="duration">({{formatDuration(t.duration)}})</span>
				</div>
			</div>
		</div>
		
		<div class="form">
			<input type="text" placeholder="search track..." v-model="search">
			<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="searching">
		</div>

		<div class="searchResults" v-if="searchResults.length > 0">
			<div v-for="t in searchResults" :key="t.id" class="entry">
				<img :src="t.album.cover_small" alt="cover" class="cover">
				<div class="infos">
					<span class="artist">{{t.artist.name}}</span>
					<span class="title">{{t.title}}</span>
					<span class="duration">{{formatDuration(t.duration)}}</span>
				</div>
				<div class="actions">
					<Button @click="play(t)" :icon="$image('icons/play.svg')" small data-tooltip="Play" />
					<Button @click="addToQueue(t)" :icon="$image('icons/list.svg')" small data-tooltip="Add to queue" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import DeezerHelper from '@/utils/DeezerHelper';
import type { DeezerQueueItem, DeezerTrack } from '@/utils/DeezerHelper';
import type { MusicMessage } from '@/utils/TriggerActionHandler';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import OverlayMusicPlayer from '../overlays/OverlayMusicPlayer.vue';
import ParamItem from '../params/ParamItem.vue';
import VolumeBar from '../VolumeBar.vue';

@Options({
	props:{},
	components:{
		Button,
		VolumeBar,
		ParamItem,
		OverlayMusicPlayer,
	}
})
export default class DeezerState extends Vue {

	public volume = .8;
	public search = "";
	public searching = false;
	public showQueue = false;
	// public search_param:ParameterData = {type:"text", value:"salut", label:"Search track", placeholder:"search..."};
	public searchResults:DeezerTrack[] = [];

	public get currentTrack():MusicMessage|null { return DeezerHelper.instance.currentTrack; }
	public get queue():DeezerQueueItem[] { return DeezerHelper.instance.queue; }
	public get playing():boolean { return DeezerHelper.instance.playing; }

	private searchDebounce!:number

	public mounted():void {
		DeezerHelper.instance.createPlayer();

		watch(()=> this.search, ()=> {
			this.searching = true;
			clearTimeout(this.searchDebounce);
			this.searchDebounce = window.setTimeout(()=> {
				this.searchTrack();
			}, 500);
		});

		watch(()=>this.volume, ()=> {
			DeezerHelper.instance.setVolume(this.volume * 100);
		});
		this.searchTrack();
	}

	public formatDuration(d:number):string {
		return Utils.formatDuration(d*1000);
	}

	private async searchTrack():Promise<void> {
		if(this.search.trim().length == 0) {
			this.searchResults = [];
		}else{
			const tracks = await DeezerHelper.instance.searchTracks(this.search as string);
			this.searchResults = tracks;
		}
		this.searching = false;
	}

	public play(track:DeezerTrack):void {
		DeezerHelper.instance.playTrack(track);
	}

	public addToQueue(track:DeezerTrack):void {
		DeezerHelper.instance.addToQueue(track);
	}

	public playQueueItem(index:number):void {
		DeezerHelper.instance.bringQueuedTrackToTop( index );
	}

	public removeTrack(index:number):void {
		DeezerHelper.instance.removeTrack( index );
	}

	public actionPlay():void {
		DeezerHelper.instance.resume();
	}

	public actionPause():void {
		DeezerHelper.instance.pause();
	}

	public actionNext():void {
		DeezerHelper.instance.nextTrack();
	}

	public onSeek(percent:number):void {
		DeezerHelper.instance.seek(percent*100);
	}


}
</script>

<style scoped lang="less">
.fsdfdsfsdfdsfsd{
	color: @mainColor_light;
	position: relative;

	&>.title {
		width: 100%;
		text-align: center;
		padding-bottom: 10px;
		word-break: break-word;
		img {
			width: 20px;
			margin-right: 10px;
		}
	}

	.player {
		width: 100%;
		max-width: 300px;
		height: 3em;
		margin: auto;
		margin-bottom: .5em;
	}

	.controls {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin:auto;
		margin-bottom: .5em;
		.bt {
			height: 1em;
			margin-right: .25em;
		}
	}

	.queue {
		font-size: .7em;
		width: 100%;
		max-width: 300px;
		margin: auto;
		margin-bottom: .5em;
		border: 1px solid @mainColor_light;
		border-radius: .25em;
		padding: .25em;

		.item {
			display: flex;
			flex-direction: row;
			align-items: center;
			padding: .5em 0;
			transition: background-color .2s ease;
	
			&:hover {
				background-color: rgba(255, 255, 255, .10);
			}

			&:nth-child(odd) {
				background-color: rgba(255, 255, 255, .05);
				&:hover {
					background-color: rgba(255, 255, 255, .15);
				}
			}
			&:not(:last-child) {
				border-bottom: 1px solid rgba(255, 255, 255, .5);;
			}
			
			.deleteBt {
				width: 1.5em;
				min-width: 1.5em;
				height: 1.5em;
				padding: 2px;
				margin-right: .5em;
			}
			.infos {
				cursor: pointer;
				text-indent: -.5em;
				padding-left: .5em;
				.artist {
					font-weight: bold;
					margin-right: .5em;
				}
				.title {
					margin-right: .5em;
				}
				.duration {
					font-style: italic;
					font-size: .8em;
				}
			}
		}
	}

	.form {
		position: relative;
		max-width: 300px;
		margin: auto;
		margin-bottom: .5em;
		input {
			color: @mainColor_dark;
			border-color: @mainColor_dark;
			background-color: @mainColor_light;
			width: 100%;
			&::placeholder {
				color: fade(@mainColor_dark_extralight, 50%);
			}
		}
		.loader {
			position: absolute;
			height: 1em;
			right: 4px;
			top: 50%;
			transform: translateY(-50%);
		}
	}


	.searchForm {
		overflow-y: visible;
	}

	.searchResults {
		max-height: 30vh;
		overflow-y: auto;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		border: 1px solid @mainColor_light;
		border-radius: .25em;
		min-height: 200px;
		.entry {
			@margin: .25em;
			display: flex;
			flex-direction: row;
			align-items: center;
			background-color: rgba(255, 255, 255, .1);
			width: calc(50% - @margin/2);
			position: relative;
			cursor: pointer;
			transition: background-color .5s;

			&:hover {
				.actions {
					opacity: 1;
					transition: all .2s;
					backdrop-filter: blur(3px);
				}
			}

			&:not(:last-of-type) {
				margin-bottom: @margin;
			}
			.cover {
				width: 2em;
				height: 2em;
				margin-right: @margin;
			}
			.infos {
				font-size: .7em;
				display: flex;
				flex-direction: column;
				.artist {
					font-weight: bold;
				}
				.duration {
					position: absolute;
					bottom: 0;
					right: 0;
					font-size: .8em;
				}
			}

			.actions {
				position: absolute;
				top: 0;
				left: 0;
				background-color: rgba(255, 255, 255, .5);
				backdrop-filter: blur(0);
				width: 100%;
				height: 100%;
				opacity: 0;
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;
				align-items: center;
				.button {
					width: 1.5em;
					height: 1.5em;
				}
			}
		}
	}
}
</style>