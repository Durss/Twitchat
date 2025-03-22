<template>
	<div class="overlayparamsanimatedtext overlayParamsSection">

		<div class="header">{{ $t("overlay.animatedText.header") }}</div>

		<section>
			<TTButton class="addBt"
			v-if="$store.auth.isPremium || $store.animatedText.animatedTextList.length < $config.MAX_ANIMATED_TEXT"
			@click="addEntry()" icon="add">{{ $t("overlay.animatedText.add_bt") }}</TTButton>

			<div class="card-item secondary" v-else-if="$store.auth.isPremium && $store.animatedText.animatedTextList.length < $config.MAX_ANIMATED_TEXT_PREMIUM">{{ $t("overlay.animatedText.premium_limit") }}</div>

			<div class="card-item premium maximumReached" v-else>
				<div>{{ $t("overlay.animatedText.non_premium_limit", {MAX:$config.MAX_ANIMATED_TEXT_PREMIUM}) }}</div>
				<TTButton icon="premium" @click="openPremium()" light premium>{{$t('premium.become_premiumBt')}}</TTButton>
			</div>
		</section>

		<VueDraggable class="entryList"
		v-model="$store.animatedText.animatedTextList"
		:group="{name:'labels'}"
		handle=".header"
		animation="250">
			<ToggleBlock v-for="entry in $store.animatedText.animatedTextList"
			editableTitle
			v-model:title="entry.title"
			:titleDefault="$t('overlay.animatedText.default_title')"
			:titleMaxLengh="30"
			:open="false"
			:key="entry.id"
			@update:title="onChange(entry)">
				<template #right_actions>
					<div class="rightActions">
						<TTButton @click.stop="$store.animatedText.deleteAnimatedText(entry.id)" icon="trash" alert />
					</div>
				</template>

				<div class="content">
					<div class="card-item install">
						<label><Icon name="obs" />{{$t('bingo_grid.form.install_title')}}</label>
						<OverlayInstaller type="animatedtext" :sourceSuffix="entry.title" :id="entry.id"
						:sourceTransform="{width:900, height:350}" />
					</div>

					<form @submit.prevent="onTest(entry.id)">
						<input type="text" v-model="testText" class="input-field" maxlength="100" />
						<TTButton type="submit" icon="test" class="button">{{ $t("overlay.animatedText.test_bt") }}</TTButton>
					</form>

					<ParamItem :paramData="param_animStyle[entry.id]" v-model="entry.animStyle" @change="onChange(entry)" />
					<ParamItem :paramData="param_animDurationScale[entry.id]" v-model="entry.animDurationScale" @change="onChange(entry)" />
					<ParamItem :paramData="param_animStrength[entry.id]" v-model="entry.animStrength" @change="onChange(entry)" />
					<ParamItem :paramData="param_textFont[entry.id]" v-model="entry.textFont" @change="onChange(entry)" />
					<ParamItem :paramData="param_textSize[entry.id]" v-model="entry.textSize" @change="onChange(entry)" />
					<ParamItem :paramData="param_colorBase[entry.id]" v-model="entry.colorBase" @change="onChange(entry)" />
					<ParamItem :paramData="param_colorHighlights[entry.id]" v-model="entry.colorHighlights" @change="onChange(entry)" />
				</div>
			</ToggleBlock>
		</VueDraggable>

	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import ToggleBlock from '../../../ToggleBlock.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ParamItem from '../../ParamItem.vue';
import { VueDraggable } from 'vue-draggable-plus';
import TTButton from '../../../TTButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		ToggleBlock,
		VueDraggable,
		OverlayInstaller,
	}
})
class OverlayParamsAnimatedText extends Vue {

	public testText:string = "";
	public param_animDurationScale:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_animStrength:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_animStyle:{[key:string]:TwitchatDataTypes.ParameterData<TwitchatDataTypes.AnimatedTextData["animStyle"]>} = {};
	public param_colorBase:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_colorHighlights:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_textFont:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_textSize:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};

	public beforeMount():void {
		this.testText = this.$t('overlay.animatedText.test_default');
		this.initParams();
	}

	/**
	 * Create parameters for a bingo entry
	 * @param id
	 */
	private initParams():void {
		this.$store.animatedText.animatedTextList.forEach(entry=> {
			const id = entry.id;
			if(this.param_animStrength[id]) return;
			this.param_animDurationScale[id]	= {type:"slider", value:1, min: 0, step:.05, max:2, labelKey:"overlay.animatedText.param_animDurationScale", icon:"timer"};
			this.param_animStrength[id]			= {type:"slider", value:1, min: 0, step:.05, max:2, labelKey:"overlay.animatedText.param_animStrength", icon:"scale"};
			this.param_animStyle[id]			= {type:"list", value:"wave", labelKey:"overlay.animatedText.param_animStyle", icon:"easing"};
			this.param_colorBase[id]			= {type:"color", value:"", labelKey:"overlay.animatedText.param_colorBase", icon:"color"};
			this.param_colorHighlights[id]		= {type:"color", value:"", labelKey:"overlay.animatedText.param_colorHighlights", icon:"color"};
			this.param_textFont[id]				= {type:"font", value:"", labelKey:"overlay.animatedText.param_textFont", icon:"font"};
			this.param_textSize[id]				= {type:"slider", value:30, min:10, max:150, labelKey:"overlay.animatedText.param_textSize", icon:"fontSize"};

			this.param_animStyle[id].listValues = TwitchatDataTypes.AnimatedTextData_AnimStyles.map(v=>{
				return {
					value:v,
					labelKey:"overlay.animatedText.param_anim_styles."+v,
				}
			})
		});
	}

	/**
	 * Saves data on change
	 * @param entry
	 */
	public onChange(entry:TwitchatDataTypes.AnimatedTextData):void {
		this.$store.animatedText.saveData();
		this.$store.animatedText.broadcastStates(entry.id);
	}

	/**
	 * Opens the premium section
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Saves given label
	 */
	public addEntry():void {
		this.$store.animatedText.createAnimatedText();
		this.initParams();
	}

	/**
	 * Tests the text
	 */
	public onTest(overlayId:string):void {
		this.$store.animatedText.animateText(overlayId, this.testText, true, true);
	}
}
export default toNative(OverlayParamsAnimatedText);
</script>

<style scoped lang="less">
.overlayparamsanimatedtext{
	.entryList, .content {
		gap: .5em;
		display: flex;
		flex-direction: column;

		form {
			gap: 1px;
			display: flex;
			flex-direction: row;
			max-width: 80%;
			margin: auto;
			* {
				border-radius: 0;
			}
			*:first-child {
				border-radius: var(--border-radius) 0 0 var(--border-radius);
			}
			*:last-child {
				border-radius: 0 var(--border-radius) var(--border-radius) 0;
			}
			input {
				flex-grow: 1;
			}
		}
	}

	.install {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		.icon {
			height: 1em;
		}
		label {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
		}
	}

	.rightActions {
		gap: .25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-shrink: 0;
		.button {
			margin: -.5em 0;
			align-self: stretch;
			border-radius: 0;
			flex-shrink: 0;
			padding: 0 .5em;
		}
	}

	.maximumReached {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		white-space: pre-line;
	}
}
</style>
