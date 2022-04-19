<template>
	<div class="paramsstreamdeck">
		<p class="head">A Stream Deck™ plugin allows you to control some Twitchat features with the push of a button</p>
		
		<p class="stepsHead">
			<span class="line"></span>
			<span>Install steps</span>
			<span class="line"></span>
		</p>
		<ol>
			<li><span class="index">1.</span>This plugin needs <a :href="obswsInstaller" target="_blank">OBS-websocket V5</a> plugin to be installed on OBS</li>
			
			<li><span class="index">2.</span> Install Stream Deck™ plugin:
				<Button :icon="require('@/assets/icons/elgato.svg')"
					title="Download plugin"
					href="./fr.twitchat.streamDeckPlugin"
					target="_blank"
					type="link"
					class="elgatoBt"
				/>
			</li>

			<li><span class="index">3.</span>Once those plugins are installed, head over the <strong>OBS tab</strong> above and set the OBS-Websocket credentials to connect Twitchat with OBS.</li>

			<li><span class="index">4.</span>On your Stream Deck™ software, drop any action from the Twitchat library, and watch the properties panel.
			<br>You should be asked to enter your OBS-Websocket credentials like this:
			<img src="@/assets/img/streamdeck_credentials.png" alt="credentials"></li>

			<li><span class="index">5.</span>Once everything is done you should be able to control Twitchat from your Stream Deck™ 🥳🎉</li>
		</ol>

	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Config from '@/utils/Config';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class ParamsStreamdeck extends Vue {

	public get obswsInstaller():string { return Config.OBS_WEBSOCKET_INSTALLER; } 

}
</script>

<style scoped lang="less">
.paramsstreamdeck{

	.head {
		margin-bottom: 1em;
		text-align: center;
	}

	.stepsHead {
		display: flex;
		flex-direction: row;
		font-weight: bold;
		justify-content: center;
		align-items: center;
		span {
			padding: 0 1em;
		}
		.line {
			flex-grow: 1;
			background-color: @mainColor_normal;
			height: 1px;
			// border-top: 1px solid @mainColor_normal;
			// border-bottom: 1px solid @mainColor_normal;
			// height: 10px;
		}
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
				display: block;
				width: min-content;
			}
		}
	}
}
</style>