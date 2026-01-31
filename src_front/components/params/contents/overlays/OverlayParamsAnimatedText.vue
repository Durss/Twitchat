<template>
	<div class="overlayparamsanimatedtext overlayParamsSection">

		<i18n-t tag="div" class="header" keypath="overlay.animatedText.header">
			<template #TRIGGERS>
				<a href="#" @click.prevent="openTriggers()">{{ $t("params.categories.triggers") }}</a>
			</template>
		</i18n-t>

		<section>
			<TTButton class="addBt" v-if="!maxReached"
			@click="addEntry()" icon="add">{{ $t("overlay.animatedText.add_bt") }}</TTButton>

			<PremiumLimitMessage v-else
				label="overlay.animatedText.non_premium_limit"
				premiumLabel="overlay.animatedText.premium_limit"
				:max="$config.MAX_ANIMATED_TEXT"
				:maxPremium="$config.MAX_ANIMATED_TEXT_PREMIUM" />
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
					<TTButton @click.stop="$store.animatedText.deleteAnimatedText(entry.id)" icon="trash" alert />
				</template>
				
				<template #left_actions>
					<ToggleButton v-model="entry.enabled" @change="onChange(entry)" @click.stop
						v-if="$store.auth.isPremium || entry.enabled || $store.animatedText.animatedTextList.filter(v=>v.enabled).length < $config.MAX_ANIMATED_TEXT" />
				</template>

				<div class="content">
					<div class="card-item install">
						<label><Icon name="obs" />{{$t('bingo_grid.form.install_title')}}</label>
						<OverlayInstaller type="animatedtext" :sourceSuffix="entry.title" :id="entry.id"
						:sourceTransform="{width:900, height:350}" />
					</div>

					<form class="card-item dark simulate" @submit.prevent="onTest(entry.id)">
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
import ToggleButton from '@/components/ToggleButton.vue';
import PremiumLimitMessage from '../../PremiumLimitMessage.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		ToggleBlock,
		VueDraggable,
		ToggleButton,
		OverlayInstaller,
		PremiumLimitMessage,
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

	public get maxReached():boolean {
		const count = this.$store.animatedText.animatedTextList.length;
		const max = this.$store.auth.isPremium ? this.$config.MAX_ANIMATED_TEXT_PREMIUM : this.$config.MAX_ANIMATED_TEXT;
		return count >= max;
	}
		
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
		if(!entry.textFont) {
			entry.textFont = "Inter";
		}
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
	 * Opens the triggers
	 */
	public openTriggers():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
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

		.simulate {
			gap: 1px;
			display: flex;
			flex-direction: row;
			justify-content: center;
			&>*{
				border-radius: 0;
			}
			&>*:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			&>*:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
			input {
				text-align: center;
				width: 0;
				flex-basis: 70%;
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
}
</style>
