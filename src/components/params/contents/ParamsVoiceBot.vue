<template>
	<div class="paramsvoicebot">
		<img src="@/assets/icons/voice.svg" alt="voice icon" class="icon">
		<div class="title">You can control <strong>Twitchat</strong> and some <strong>Twitch</strong> features with your voice</div>
		<p>This only works on Google Chrome, Microsoft Edge or Safari. This does <strong>NOT</strong> work on an OBS dock.</p>
		<p>If you use Twitchat from an OBS dock, you'll want to open twitchat on one of the above browsers an click </p>
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class ParamsVoiceBot extends Vue {

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
	}
}
</style>