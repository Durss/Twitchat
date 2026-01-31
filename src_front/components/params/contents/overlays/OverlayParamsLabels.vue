<template>
	<div class="overlayparamslabels overlayParamsSection">

		<div class="header">{{ $t("overlay.labels.head") }}</div>

		<div class="createForm">

			<TTButton class="addBt"
			v-if="!maxLabelsReached"
			@click="addLabel()" icon="add">{{ $t("overlay.labels.addBt") }}</TTButton>

			<PremiumLimitMessage v-else
				label="overlay.labels.non_premium_limit"
				premiumLabel="overlay.labels.premium_limit"
				:max="$config.MAX_LABELS"
				:maxPremium="$config.MAX_LABELS_PREMIUM" />
		</div>

		<VueDraggable class="labelList"
		v-model="$store.labels.labelList"
		:group="{name:'labels'}"
		handle=".header"
		animation="250">
			<ToggleBlock v-for="label in $store.labels.labelList"
			editableTitle
			v-model:title="label.title"
			:titleDefault="$t('overlay.labels.default_title')"
			:titleMaxLengh="30"
			:open="false"
			:key="label.id"
			@update:title="save(label)">

				<template #left_actions>
					<ToggleButton v-model="label.enabled" @click.native.stop @change="save(label)" v-if="$store.auth.isPremium || label.enabled || $store.labels.labelList.filter(v=>v.enabled).length < $config.MAX_LABELS" />
				</template>

				<template #right_actions>
					<TTButton @click.stop="duplicateLabel(label)" data-close-popout icon="copy" v-tooltip="$t('global.duplicate')" v-if="!maxLabelsReached" />
					<TTButton @click.stop="$store.labels.removeLabel(label.id)" icon="trash" alert />
				</template>

				<div class="form">
					<div class="card-item install">
						<label><Icon name="obs" />{{$t('bingo_grid.form.install_title')}}</label>
						<OverlayInstaller type="label" :sourceSuffix="label.title" :id="label.id" :sourceTransform="{width:300, height:100}" />
					</div>

					<SwitchButton v-model="label.mode"
					@change="save(label)"
					:values="['placeholder', 'html']"
					:labels="[$t('overlay.labels.togle_value'), 'HTML']"></SwitchButton>

					<ParamItem v-if="label.mode == 'html'" :paramData="param_customText[label.id]" v-model="label.html" @change="save(label)"></ParamItem>
					<ParamItem v-if="label.mode == 'html'" :paramData="param_customCSS[label.id]" v-model="label.css" @change="save(label)"></ParamItem>

					<ParamItem v-if="label.mode == 'placeholder'" :paramData="param_labelValue[label.id]" v-model="label.placeholder" @change="save(label)" />

					<ParamItem :paramData="param_labelValueFont[label.id]" v-model="label.fontFamily" @change="save(label)">
						<template #composite>
							<ParamItem :paramData="param_textColor[label.id]" v-model="label.fontColor" @change="save(label)" class="colorPicker" noBackground />
						</template>
					</ParamItem>
					<ParamItem :paramData="param_labelValueSize[label.id]" v-model="label.fontSize" @change="save(label)" />
					<div class="card-item layout" v-if="label.mode == 'placeholder'">
						<Icon name="layout" />
						<label>{{ $t("overlay.labels.param_textAlign") }}</label>
						<div class="layoutBtns">
							<TTButton icon="layout_colLeft" :selected="label.textAlign == 'left' || !label.textAlign" @click="label.textAlign = 'left'; save(label)" />
							<TTButton icon="layout_col" :selected="label.textAlign == 'center'" @click="label.textAlign = 'center'; save(label)" />
							<TTButton icon="layout_colRight" :selected="label.textAlign == 'right'" @click="label.textAlign = 'right'; save(label)" />
						</div>
					</div>
					<ParamItem :paramData="param_scrollable[label.id]" v-model="label.scrollContent" @change="save(label)" v-if="label.mode == 'placeholder'" />
					<ParamItem :paramData="param_backgroundEnabled[label.id]" v-model="label.backgroundEnabled" @change="save(label)">
						<ParamItem :childLevel="1" :paramData="param_backgroundColor[label.id]" v-model="label.backgroundColor" @change="save(label)" noBackground />
					</ParamItem>
				</div>
			</ToggleBlock>
		</VueDraggable>
	</div>
</template>

<script lang="ts">
import SwitchButton from '@/components/SwitchButton.vue';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import { type LabelItemData } from '@/types/ILabelOverlayData';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { VueDraggable } from 'vue-draggable-plus';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { ParamItem } from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import PremiumLimitMessage from '../../PremiumLimitMessage.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
		SwitchButton,
		ToggleButton,
		VueDraggable,
		OverlayInstaller,
		PremiumLimitMessage,
	},
	emits:[],
})
class OverlayParamsLabels extends Vue {

	public param_customText:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_customCSS:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_labelValue:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_labelValueFont:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_labelValueSize:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_textColor:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_backgroundEnabled:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_backgroundColor:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_textAlign:{[key:string]:TwitchatDataTypes.ParameterData<LabelItemData["textAlign"]>} = {};
	public param_scrollable:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};

	private placeholders:TwitchatDataTypes.PlaceholderEntry[] = [];

	public get maxLabelsReached():boolean {
		const max = this.$store.auth.isPremium ? this.$config.MAX_LABELS_PREMIUM : this.$config.MAX_LABELS;
		return this.$store.labels.labelList.length >= max;
	}

	public beforeMount():void {
		for (const key in this.$store.labels.allPlaceholders) {
			const p = this.$store.labels.allPlaceholders[key as keyof typeof this.$store.labels.allPlaceholders];
			if(!p) continue;
			this.placeholders.push({
				descKey:p.placeholder.descriptionKey,
				descReplacedValues:{"NAME":p.placeholder.descriptionKeyName || ""},
				tag:p.placeholder.tag,
				category:p.category,
			});
		}
		this.placeholders = this.placeholders.sort((a,b)=>{
			if(a.category != b.category && a.category && b.category) return a.category.localeCompare(b.category);
			return a.tag.localeCompare(b.tag);
		});
		this.initParams();
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
	public addLabel():void {
		this.$store.labels.addLabel()
		this.initParams();
	}

	/**
	 * Saves given label
	 */
	public save(label:LabelItemData):void {
		//If user clicks the "cross" to clear the "font family" field, the value
		//becomes "null" which is not allowed by the server. Force it to empty string
		if(!label.fontFamily) label.fontFamily = "";
		this.$store.labels.saveData(label.id);
	}

	/**
	 * Duplicates given label
	 */
	public duplicateLabel(label:LabelItemData):void {
		this.$store.labels.duplicateLabel(label.id);
		this.initParams();
	}

	/**
	 * Create parameters for a bingo entry
	 * @param id
	 */
	private initParams():void {
		this.$store.labels.labelList.forEach(entry=> {
			const id = entry.id;
			if(this.param_customText[id]) return;
			this.param_labelValue[id]			= {type:"list", value:"", labelKey:"overlay.labels.param_labelValue", icon:"label"};
			this.param_labelValueFont[id]		= {type:"font", value:"Inter", labelKey:"overlay.labels.param_labelValueFont", icon:"font"};
			this.param_labelValueSize[id]		= {type:"number", value:40, labelKey:"overlay.labels.param_labelValueSize", icon:"fontSize", min:5, max:300};
			this.param_customText[id]			= {type:"string", value:"", labelKey:"overlay.labels.param_customText", maxLength:10000, longText:true, icon:"html"};
			this.param_customCSS[id]			= {type:"string", value:"", labelKey:"overlay.labels.param_customCSS", maxLength:10000, longText:true, icon:"css"};
			this.param_textColor[id]			= {type:"color", value:""};
			this.param_backgroundEnabled[id]	= {type:"boolean", value:true, labelKey:"overlay.labels.param_backgroundEnabled", icon:"overlay"};
			this.param_backgroundColor[id]		= {type:"color", value:"", labelKey:"overlay.labels.param_backgroundColor", icon:"color"};
			this.param_scrollable[id]			= {type:"boolean", value:false, labelKey:"overlay.labels.param_scrollable", icon:"scroll_horizontal"};

			let values:typeof this.param_labelValue[string]["listValues"] = [];
			let prevCat = "";
			let group:TwitchatDataTypes.ParameterDataListValue<string> = {value:"", group:[]};
			for (const entry of this.placeholders) {
				entry.globalTag = true;
				if(entry.category != prevCat) {
					if(group.value) values.push(group);
					group = {
						value:this.$t("global.placeholder_selector_categories."+entry.category),
						label:this.$t("global.placeholder_selector_categories."+entry.category),
						group:[],
					};
					prevCat = entry.category!;
				}
				group.group!.push({
					value:entry.tag,
					label:entry.descReplacedValues? this.$t(entry.descKey, entry.descReplacedValues) : undefined,
					labelKey:entry.descKey,
				});

				group.group!.sort((a,b)=>{
					if(a.label && b.label) return a.label.localeCompare(b.label);
					return a.value.localeCompare(b.value);
				});
			}
			if(group.value) values.push(group);

			this.param_labelValue[id].listValues = values;
			this.param_customText[id].placeholderList = this.placeholders;
		});
	}

}
export default toNative(OverlayParamsLabels);
</script>

<style scoped lang="less">
.overlayparamslabels{
	.createForm {
		text-align: center;
	}

	.labelList, .form {
		gap: .5em;
		display: flex;
		flex-direction: column;

		.layout {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			.icon {
				height: 1em;
			}
			label {
				flex-grow: 1;
			}
		}

		.layoutBtns {
			gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: flex-end;
			.button {
				width: 2em;
				opacity: 1;//Do not fade when disabled as its holder will already be faded
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

	.colorPicker {
		width: 30px;
		min-width: 30px;
		margin-left: 5px;
		:deep(.inputHolder) {
			height: 30px !important;
		}
	}
}
</style>
