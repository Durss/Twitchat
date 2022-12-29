<template>
	<div class="paramsstreamdeck">
		<img src="@/assets/icons/elgato_purple.svg" alt="overlay icon" class="icon">

		<p class="head"></p>
		
		<ol>
			<li>
				<span class="index">1.</span>
				<i18n-t scope="global" tag="span" keypath="streamdeck.step_1.install">
					<template #OBS_VERSION>
						<strong>OBS v28+</strong>
					</template>
				</i18n-t>
				<br>
				<i18n-t scope="global" tag="i" keypath="streamdeck.step_1.install_option">
					<template #PLUGIN_LINK>
						<a :href="obswsInstaller" target="_blank" v-t="'obs.install_plugin_name'"></a>
					</template>
				</i18n-t>
			</li>
			
			<li>
				<span class="index">2.</span> 
				<Button :icon="$image('icons/elgato.svg')"
					:title="$t('streamdeck.step_2')"
					href="https://apps.elgato.com/plugins/fr.twitchat"
					target="_blank"
					type="link"
					class="button elgatoBt"
				/>
			</li>

			<li>
				<span class="index">3.</span>
				<i18n-t scope="global" tag="span" keypath="streamdeck.step_3">
					<template #TAB_LINK>
						<a @click="$emit('setContent', contentObs)" v-t="'streamdeck.step_3_tab_link'"></a>
					</template>
				</i18n-t>
			</li>

			<li>
				<span class="index">4.</span>
				<span v-t="'streamdeck.step_4_1'"></span>
				<span v-t="'streamdeck.step_4_2'"></span>
				<img src="@/assets/img/streamdeck_credentials.png" alt="credentials">
			</li>

			<li>
				<span class="index">5.</span>
				<span v-t="'streamdeck.step_5'"></span>
			</li>
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
			line-height: 1.2em;
			.index {
				display: blo;
				font-weight: bold;
				font-size: 1.2em;
				margin-right: .5em;
			}

			&>img {
				display: block;
				max-width: 100%;
				margin: auto;
				margin-top: .5em;
			}
			i {
				font-size: .9em;
			}
		}
	}
}
</style>