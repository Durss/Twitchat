<template>
	<ToggleBlock :open="open" class="OverlayParamsDeezer" title="Deezer" :icons="['deezer_purple']">

		<div v-if="!deezerConnected">Display the currently playing track on your overlay and allow your users to add tracks to the queue or control the playback.</div>
		
		<div class="player">
			<div class="label">Example</div>
			<OverlayMusicPlayer v-if="currentTrack" :staticTrackData="currentTrack" embed />
		</div>
		
		<div v-if="!deezerConnected" class="infos">Deezer API being terribly bad, chances of having issues are high. Also, you'll have to reconnect again everytime you start Twitchat.</div>
	
		<Button v-if="!deezerConnected" title="Authenticate" @click="authenticate()" class="authBt" :loading="authenticating" />

		<div v-if="deezerConnected" class="content">
			<div class="row">
				<label for="deezer_overlay_url">Set this URL in an OBS browser source to display currently playing Deezer track:</label>
				<OverlayParamsMusic />
				
			</div>
			<div class="row">
				<div>You can allow your viewers to control playback or add musics to the queue from chat commands !</div>
				<div>Head over the <a @click="$emit('setContent', contentTriggers)">Triggers tab</a></div>
				<div class="infos">Click on the <strong>Deezer icon</strong> <img src="@/assets/icons/deezer_purple.svg" alt="deezer" class="icon"> on the bottom right of the screen to add tracks, view the queue, and control the playback !</div>
				<div class="warning">Deezer API being terribly bad, chances of having issues are high. Also, you'll have to reconnect again everytime you start Twitchat.</div>
			</div>
			<Button v-if="deezerConnected" title="Disconnect" @click="disconnect()" class="authBt" highlight />
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import DeezerHelper from '@/utils/DeezerHelper';
import { Options, Vue } from 'vue-class-component';
import Button from '../../../Button.vue';
import OverlayMusicPlayer from '../../../overlays/OverlayMusicPlayer.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import OverlayParamsMusic from './OverlayParamsMusic.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
		OverlayParamsMusic,
		OverlayMusicPlayer,
	},
	emits:["setContent"]
})
export default class OverlayParamsDeezer extends Vue {

	public open = false;
	public authenticating = false;
	public currentTrack:TwitchatDataTypes.MusicMessage = {type:"music",title:"Mitchiri Neko march",artist:"Mitchiri MitchiriNeko",album:"MitchiriNeko",cover:"https://i.scdn.co/image/ab67616d0000b2735b2419cbca2c5f1935743722",duration:1812,url:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=2b3eff5aba224d87"};

	public get deezerConnected():boolean { return this.$store("music").deezerConnected; }
	public get contentTriggers():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsContentType.TRIGGERS; } 

	public mounted():void {
		this.currentTrack.cover = this.$image("img/musicExampleCover.jpg");
	}

	public async authenticate():Promise<void> {
		this.authenticating = true;
		try{
			await DeezerHelper.instance.createPlayer();
		}catch(error) {
			//Ignore
		}
		this.authenticating = false;
	}

	public disconnect():void {
		this.$store("music").setDeezerConnected(false);
	}

}
</script>

<style scoped lang="less">
.OverlayParamsDeezer{
	.authBt {
		display: block;
		margin:auto;
		margin-top: 1em;
	}

	.content {
		.row {
			display: flex;
			flex-direction: column;
			&:not(:first-child) {
				margin-top: 1em;
			}
		}
	}

	.infos {
		margin-top: .5em;
	}

	.warning {
		margin-top: .5em;
		font-size: .9em;
		color: @mainColor_alert;
	}

	.icon {
		height: 1em;
		vertical-align: middle;
	}

	.player {
		border: 1px dashed @mainColor_normal;
		background: fade(@mainColor_normal, 15%);
		border-radius: .25em;
		overflow: hidden;
		display: inline-block;
		left: auto;
		right: auto;
		padding: .5em;
		position: relative;
		left: 50%;
		transform: translateX(-50%);

		.label {
			text-align: center;
			margin-bottom: .5em;
		}

		:deep(.overlaymusicplayer) {
			margin: 0;
		}
	}

}
</style>