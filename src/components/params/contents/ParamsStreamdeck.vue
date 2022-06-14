<template>
	<div class="paramsstreamdeck">
		<img src="@/assets/icons/elgato_purple.svg" alt="overlay icon" class="icon">

		<p class="head">A Stream Deck™ plugin allows you to control some Twitchat features with the push of a button</p>
		
		<Splitter title="Install steps" />

		<ol>
			<li><span class="index">1.</span>This plugin needs <a :href="obswsInstaller" target="_blank">OBS-websocket V5</a> plugin to be installed on OBS</li>
			
			<li><span class="index">2.</span> Install Stream Deck™ plugin:
				<Button :icon="getImage('assets/icons/elgato.svg')"
					title="Download plugin"
					href="https://apps.elgato.com/plugins/fr.twitchat"
					target="_blank"
					type="link"
					class="button elgatoBt"
				/>
			</li>

			<li><span class="index">3.</span>Once those plugins are installed, head over the <a @click="$emit('setContent', 'obs')">OBS tab</a> and set the OBS-Websocket credentials to connect Twitchat with OBS.</li>

			<li><span class="index">4.</span>On your Stream Deck™ software, drop any action from the Twitchat library, and watch the properties panel.
			<br>You should be asked to enter your OBS-Websocket credentials like this:
			<img src="@/assets/img/streamdeck_credentials.png" alt="credentials"></li>

			<li><span class="index">5.</span>Once everything is done you should be able to control Twitchat from your Stream Deck™ 🥳🎉</li>
		</ol>

	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Splitter from '@/components/Splitter.vue';
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
	
	public getImage(path:string):string { return new URL(`/src/${path}`, import.meta.url).href; }

	public get obswsInstaller():string { return Config.OBS_WEBSOCKET_INSTALLER; } 

}
</script>

<style scoped lang="less">
.paramsstreamdeck{

	.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}

	.head {
		margin-bottom: 1em;
		text-align: center;
	}
	
	ol {
		list-style-position: inside;
		list-style-type: none;
		li {
			margin-top: 1em;
			width: 100%;
			.index {
				display: blo;
				font-weight: bold;
				font-size: 1.2em;
				margin-right: .5em;
			}
			.button {
				margin: .5em auto 0 auto;
				padding-right: 1.5em;
				display: block;
				width: min-content;
			}

			:deep(img) {
				max-width: 100%;
			}
		}
	}
}
</style>