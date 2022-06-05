<template>
	<ToggleBlock :open="open" class="OverlayParamsDeezer" title="Deezer" :icons="['deezer_purple']">

		<div v-if="!deezerConnected">
			Display the currently playing track on your overlay and allow your users to add tracks to the queue or control the playback.
			<div class="infos">Deezer API being terribly bad, chances of having issues are high. Also, you'll have to reconnect again everytime you start Twitchat.</div>
		</div>
		<Button v-if="!deezerConnected" title="Authenticate" @click="authenticate()" class="authBt" :loading="authenticating" />

		<div v-if="deezerConnected" class="content">
			<div class="row">
				<label for="deezer_overlay_url">Set this in an OBS browser source to display currently playing deezer track:</label>
				<input type="text" id="deezer_overlay_url" v-model="overlayUrl">
				<ToggleBlock small title="CSS customization" :open="false">
					<div>You can change the appearance of the player by overriding these CSS IDs on OBS browser source params</div>
					<ul>
						<li>#music_cover { ... }</li>
						<li>#music_title { ... }</li>
						<li>#music_artist { ... }</li>
						<li>#music_progress { ... }</li>
					</ul>
				</ToggleBlock>
				
			</div>
			<div class="row">
				<div>You can allow your viewers to control playback or add musics to the queue from chat commands !</div>
				<div>Head over the <a @click="$emit('setContent', 'triggers')">Triggers tab</a></div>
				<div>Click on the Deezer icon on the bottom right of the screen to add tracks, view the queue, and control the playback !</div>
				<div class="infos">Deezer API being terribly bad, chances of having issues are high. Also, you'll have to reconnect again everytime you start Twitchat.</div>
			</div>
			<Button v-if="deezerConnected" title="Disconnect" @click="disconnect()" class="authBt" highlight />
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import store from '@/store';
import DeezerHelper from '@/utils/DeezerHelper';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
	},
	emits:["setContent"]
})
export default class OverlayParamsDeezer extends Vue {

	public open:boolean = false;
	public authenticating:boolean = false;

	public get deezerConnected():boolean { return store.state.deezerConnected; }
	public get overlayUrl():string { return Utils.getOverlayURL("music"); }

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
		store.dispatch("setDeezerConnected", false);
	}

}
</script>

<style scoped lang="less">
.OverlayParamsDeezer{
	
	.authBt, .loader {
		display: block;
		margin:auto;
		margin-top: 1em;
	}

	.error {
		justify-self: center;
		color: @mainColor_light;
		display: block;
		text-align: center;
		padding: 5px;
		border-radius: 5px;
		margin: auto;
		margin-top: 10px;
		background-color: @mainColor_alert;
		cursor: pointer;
	}

	.content {
		.row {
			display: flex;
			flex-direction: column;
			&:not(:first-child) {
				margin-top: 1em;
			}

			ul {
				li {
					list-style-type: disc;
					list-style-position: inside;
				}
			}
		}
	}

	.infos {
		margin-top: .5em;
		font-size: .9em;
		color: @mainColor_alert;
	}

}
</style>