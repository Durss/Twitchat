<template>
	<ToggleBlock :open="open" class="OverlayParamsDeezer" title="Deezer" :icons="['deezer_purple']">
		<div class="holder">

			<div v-if="!deezerConnected">{{ $t("overlay.music_common.music") }}</div>
			
			<div class="row player_holder">
				<div class="label">{{ $t("global.example") }}</div>
				<OverlayMusicPlayer class="player" v-if="currentTrack" :staticTrackData="currentTrack" embed />
			</div>
			
			<div v-if="!deezerConnected" class="warning">{{ $t("overlay.deezer.shit_api") }}</div>
		
			<Button v-if="!deezerConnected" :title="$t('overlay.deezer.authBt')" @click="authenticate()" class="authBt" :loading="authenticating" />
	
			<div v-if="deezerConnected" class="row">
				<label for="deezer_overlay_url">{{ $t("$t('overlay.music_common.music_url')") }}</label>
				<OverlayParamsMusic />
			</div>
			
			<div v-if="deezerConnected" class="row">
				<i18n-t scope="global" tag="div" keypath="overlay.music_common.infos">
					<template #TRIGGERS>
						<a @click="$store('params').openParamsPage(contentTriggers)">{{ $t("overlay.music_common.triggerBt") }}</a>
					</template>
				</i18n-t>

				<i18n-t scope="global" tag="div" keypath="overlay.deezer.control">
					<template #ICON>
						<img src="@/assets/icons/deezer_purple.svg" alt="deezer" class="icon">
					</template>
				</i18n-t>

				<div class="warning">{{ $t("overlay.deezer.shit_api") }}</div>
			</div>

			<Button v-if="deezerConnected" :title="$t('global.disconnect')" @click="disconnect()" class="authBt" highlight />
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import DeezerHelper from '@/utils/music/DeezerHelper';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../../../Button.vue';
import OverlayMusicPlayer from '../../../overlays/OverlayMusicPlayer.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import OverlayParamsMusic from './OverlayParamsMusic.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
		OverlayParamsMusic,
		OverlayMusicPlayer,
	},
	emits:[]
})
export default class OverlayParamsDeezer extends Vue {
	
	@Prop({default:false})
	public open!:boolean;

	public authenticating = false;
	public currentTrack:TwitchatDataTypes.MusicTrackData = {title:"Mitchiri Neko march",artist:"Mitchiri MitchiriNeko",album:"MitchiriNeko",cover:"https://i.scdn.co/image/ab67616d0000b2735b2419cbca2c5f1935743722",duration:1812,url:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=2b3eff5aba224d87"};

	public get deezerConnected():boolean { return this.$store("music").deezerConnected; }
	public get contentTriggers():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TRIGGERS; } 

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

	.holder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;

		.error {
			justify-self: center;
			color: var(--mainColor_light);
			display: block;
			text-align: center;
			padding: 5px;
			border-radius: 5px;
			margin: auto;
			margin-top: 10px;
			background-color: var(--mainColor_alert);
			cursor: pointer;
		}

		.row {
			display: flex;
			flex-direction: column;
			gap:1em;
		}

		&.spotifasshole {
			margin-top: .5em;
			.info {
				color: var(--mainColor_alert);
				font-size: .9em;
			}
			form {
				margin-top: .5em;
			}
		}
		
		.player_holder {
			border: 1px dashed var(--mainColor_normal);
			background: fade(@mainColor_normal, 15%);
			border-radius: .25em;
			margin-left: auto;
			margin-right: auto;
			padding: .5em;
			width: 100%;
			max-width: 300px;
			
			.label {
				text-align: center;
				margin: 0;
				margin-bottom: .5em;
			}
			
			.player {
				margin: 0;
				margin-top: -1em;//No idea why i need that...
			}
		}
	}
}
</style>