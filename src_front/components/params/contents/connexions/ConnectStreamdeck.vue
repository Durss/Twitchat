<template>
	<div class="paramsstreamdeck parameterContent">
		<Icon name="elgato" alt="stream deck logo" class="icon" />

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
						<a @click="$store.params.openParamsPage(contentConnexions, subcontentOBS)">{{ $t("streamdeck.step_3_tab_link") }}</a>
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
import TTButton from '@/components/TTButton.vue';
import Splitter from '@/components/Splitter.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import type IParameterContent from '../IParameterContent';

@Component({
	components:{
		Button: TTButton,
		Splitter,
	},
	emits:[]
})
class ConnectStreamdeck extends Vue implements IParameterContent {
	
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNEXIONS; } 
	public get subcontentOBS():TwitchatDataTypes.ParamDeepSectionsStringType { return TwitchatDataTypes.ParamDeepSections.OBS; } 

	public onNavigateBack(): boolean { return false; }

}
export default toNative(ConnectStreamdeck);
</script>

<style scoped lang="less">
.paramsstreamdeck{
	ol {
		gap: 1em;
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