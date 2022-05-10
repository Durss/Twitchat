<template>
	<div class="paramsvoicebot">
		<img src="@/assets/icons/voice.svg" alt="voice icon" class="icon">
		<div class="title">You can control <strong>Twitchat</strong> and some <strong>Twitch</strong> features with your voice</div>
		<p>This only works on Google Chrome, Microsoft Edge or Safari. This does <strong>NOT</strong> work on an OBS dock.</p>
		<!-- <p>If you use Twitchat from an OBS dock, you'll want to open twitchat on one of the above browsers.</p> -->
		<VoiceControlForm v-if="obsConnected" />
	</div>
</template>

<script lang="ts">
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Options, Vue } from 'vue-class-component';
import VoiceControlForm from '../../voice/VoiceControlForm.vue';

@Options({
	props:{},
	components:{
		VoiceControlForm,
	}
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
}
</style>