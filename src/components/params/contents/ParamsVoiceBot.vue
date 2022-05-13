<template>
	<div class="paramsvoicebot">
		<img src="@/assets/icons/voice_purple.svg" alt="voice icon" class="icon">
		<div class="title">Control <strong>Twitchat</strong> with your voice</div>
		<p class="infos">This only works on Google Chrome, Microsoft Edge or Safari. This does <strong>NOT</strong> work on an OBS dock.</p>
		<!-- <p>If you use Twitchat from an OBS dock, you'll want to open twitchat on one of the above browsers.</p> -->
		
		<VoiceControlForm v-if="obsConnected" class="form" />

		<div class="connectObs" v-if="!obsConnected">
			<div>This features needs you to connect with OBS.</div>
			<Button class="button" title="Connect to OBS" white @click="$emit('setContent', 'obs')" />
		</div>
	</div>
</template>

<script lang="ts">
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Options, Vue } from 'vue-class-component';
import VoiceControlForm from '../../voice/VoiceControlForm.vue';
import Button from '../../Button.vue';

@Options({
	props:{},
	components:{
		Button,
		VoiceControlForm,
	},
	emits:["setContent"]
})
export default class ParamsVoiceBot extends Vue {

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }

}

</script>

<style scoped lang="less">
.paramsvoicebot{
	.icon {
		height: 5em;
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