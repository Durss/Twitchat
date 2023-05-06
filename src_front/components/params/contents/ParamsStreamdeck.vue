<template>
	<div class="paramsstreamdeck parameterContent">
		<img src="@/assets/icons/elgato.svg" alt="overlay icon" class="icon">

		<p class="head">{{ $t("streamdeck.header") }}</p>
		
		<ol>
			<li class="card-item">
				<span class="index">1.</span>
				<i18n-t scope="global" tag="span" keypath="streamdeck.step_1.install">
					<template #OBS_VERSION>
						<strong>OBS v28+</strong>
					</template>
				</i18n-t>
			</li>
			
			<li class="card-item">
				<span class="index">2.</span> 
				<Button icon="elgato"
					href="https://apps.elgato.com/plugins/fr.twitchat"
					target="_blank"
					type="link"
					class="button elgatoBt">{{ $t('streamdeck.step_2') }}</Button>
			</li>

			<li class="card-item">
				<span class="index">3.</span>
				<i18n-t scope="global" tag="span" keypath="streamdeck.step_3">
					<template #TAB_LINK>
						<a @click="$store('params').openParamsPage(contentObs)">{{ $t("streamdeck.step_3_tab_link") }}</a>
					</template>
				</i18n-t>
			</li>

			<li class="card-item">
				<span class="index">4.</span>
				<span>{{ $t("streamdeck.step_4_1") }}</span>
				<span>{{ $t("streamdeck.step_4_2") }}</span>
				<img src="@/assets/img/streamdeck_credentials.png" alt="credentials">
			</li>

			<li class="card-item">
				<span class="index">5.</span>
				<span>{{ $t("streamdeck.step_5") }}</span>
			</li>
		</ol>

	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Splitter from '@/components/Splitter.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Button,
		Splitter,
	},
	emits:[]
})
export default class ParamsStreamdeck extends Vue implements IParameterContent {
	
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; } 

	public onNavigateBack(): boolean { return false; }

}
</script>

<style scoped lang="less">
.paramsstreamdeck{
	ol {
		gap: .5em;
		display: flex;
		flex-direction: column;
		list-style-position: inside;
		list-style-type: none;
		li {
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