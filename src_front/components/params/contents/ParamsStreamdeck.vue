<template>
	<div class="paramsstreamdeck">
		<img src="@/assets/icons/elgato_purple.svg" alt="overlay icon" class="icon">

		<p class="head">A Stream Deck™ plugin allows you to control some Twitchat features with the push of a button</p>
		
		<Splitter>Install steps</Splitter>

		<ol>
			<li><span class="index">1.</span>This plugin needs <strong>OBS 28+</strong> or <a :href="obswsInstaller" target="_blank">OBS-websocket V5+</a> plugin to be installed</li>
			
			<li><span class="index">2.</span> 
				<Button :icon="$image('icons/elgato.svg')"
					title="Download Stream Deck™ plugin"
					href="https://apps.elgato.com/plugins/fr.twitchat"
					target="_blank"
					type="link"
					class="button elgatoBt"
				/>
			</li>

			<li><span class="index">3.</span>Head over the <a @click="$emit('setContent', contentObs)">OBS tab</a> and set the OBS-Websocket credentials to link Twitchat with OBS.</li>

			<li><span class="index">4.</span>On your Stream Deck™ software, drop any action from the Twitchat library, and watch the properties panel.
			<br>You should be asked to enter your OBS-Websocket credentials:
			<img src="@/assets/img/streamdeck_credentials.png" alt="credentials"></li>

			<li><span class="index">5.</span>Once everything is done you should be able to control Twitchat from your Stream Deck™ 🥳🎉</li>
		</ol>

	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Splitter from '@/components/Splitter.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{
		Button,
		Splitter,
	},
	emits:["setContent"]
})
export default class ParamsStreamdeck extends Vue {
	
	public get contentObs():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.OBS; } 

	public get obswsInstaller():string { return Config.instance.OBS_WEBSOCKET_INSTALLER; } 

}
</script>

<style scoped lang="less">
.paramsstreamdeck{
	.parameterContent();
	
	ol {
		list-style-position: inside;
		list-style-type: none;
		li {
			margin-top: 1em;
			border-radius: .5em;
			background-color: fade(@mainColor_normal_extralight, 30%);
			padding: .5em;
			width: 100%;
			.index {
				display: blo;
				font-weight: bold;
				font-size: 1.2em;
				margin-right: .5em;
			}

			&>:deep(img) {
				max-width: 100%;
				margin-top: .5em;
			}
		}
	}
}
</style>