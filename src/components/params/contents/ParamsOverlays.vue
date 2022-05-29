<template>
	<div class="paramsoverlays">
		<img src="@/assets/icons/overlay_purple.svg" alt="overlay icon" class="icon">
		<div class="title">Add overlays to your stream</div>
		<p class="infos">In order to work, the overlays need Twitchat to be running as they will need to comunicate with it</p>
		
		<SpotifyParams v-if="obsConnected" @setContent="(v:string) => $emit('setContent', v)" />

		<div class="connectObs" v-if="!obsConnected">
			<div>This features needs you to connect with OBS.</div>
			<Button class="button" title="Connect with OBS" white @click="$emit('setContent', 'obs')" />
		</div>
	</div>
</template>

<script lang="ts">
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';
import SpotifyParams from './overlays/SpotifyParams.vue';

@Options({
	props:{},
	components:{
		Button,
		SpotifyParams,
	},
	emits:["setContent"]
})
export default class ParamsOverlays extends Vue {
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }

	public mounted():void {

	}

}
</script>

<style scoped lang="less">
.paramsoverlays{
	.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}
	.title {
		text-align: center;
		margin-bottom: 1em;
	}
	.infos {
		font-size: .9em;
		text-align: center;
		margin-bottom: 1em;
	}
	.form {
		margin-top: 1em;
	}
	.connectObs {
		text-align: center;
		color: @mainColor_light;
		background-color: @mainColor_alert;
		padding: .5em;
		border-radius: .5em;
		margin-top: 1em;
		.button {
			margin-top: .5em;
		}
	}
}
</style>