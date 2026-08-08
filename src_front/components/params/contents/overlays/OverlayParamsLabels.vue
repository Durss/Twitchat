<template>
	<div class="overlayparamslabels overlayParamsSection">
		<div class="header">{{ t("overlay.labels.head") }}</div>

		<div class="createForm">
			<TTButton class="addBt" v-if="!maxLabelsReached" @click="addLabel()" icon="add">{{
				t("overlay.labels.addBt")
			}}</TTButton>

			<PremiumLimitMessage
				v-else
				label="overlay.labels.non_premium_limit"
				premiumLabel="overlay.labels.premium_limit"
				:max="Config.instance.MAX_LABELS"
				:maxPremium="Config.instance.MAX_LABELS_PREMIUM"
			/>
		</div>

		<VueDraggable
			class="labelList"
			v-model="storeLabels.labelList"
			:group="{ name: 'labels' }"
			handle=".header"
			:animation="250"
			@end="storeLabels.saveData()"
		>
			<ToggleBlock
				v-for="label in storeLabels.labelList"
				editableTitle
				v-model:title="label.title"
				:titleDefault="t('overlay.labels.default_title')"
				:titleMaxLengh="30"
				:open="false"
				:key="label.id"
				:disabled="!label.enabled"
				@update:title="save(label)"
			>
				<template #left_actions>
					<ToggleButton
						v-model="label.enabled"
						@click.stop
						@change="save(label)"
						v-if="
							storeAuth.isPremium ||
							label.enabled ||
							storeLabels.labelList.filter((v) => v.enabled).length <
								Config.instance.MAX_LABELS
						"
					/>
				</template>

				<template #right_actions>
					<TTButton
						@click.stop="duplicateLabel(label)"
						data-close-popout
						icon="copy"
						v-tooltip="t('global.duplicate')"
						v-if="!maxLabelsReached"
					/>
					<TTButton @click.stop="storeLabels.removeLabel(label.id)" icon="trash" alert />
				</template>

				<div class="form">
					<div class="overlayInstallCard">
						<h1><Icon name="obs" />{{ t("bingo_grid.form.install_title") }}</h1>
						<OverlayInstaller
							type="label"
							:sourceSuffix="label.title"
							:id="label.id"
							:sourceTransform="{ width: 300, height: 100 }"
						/>
					</div>

					<SwitchButton
						v-model="label.mode"
						@change="save(label)"
						:values="['placeholder', 'html']"
						:labels="[t('overlay.labels.togle_value'), 'HTML']"
					></SwitchButton>

					<ParamItem
						v-if="label.mode == 'html'"
						:paramData="param_customText[label.id]!"
						v-model="label.html"
						@change="save(label)"
					></ParamItem>
					<ParamItem
						v-if="label.mode == 'html'"
						:paramData="param_customCSS[label.id]!"
						v-model="label.css"
						@change="save(label)"
					></ParamItem>

					<ParamItem
						v-if="label.mode == 'placeholder'"
						:paramData="param_labelValue[label.id]!"
						v-model="label.placeholder"
						@change="save(label)"
					/>
					<Transition name="expand">
						<div
							v-if="label.mode == 'placeholder' && label.placeholder === 'TRIGGER'"
							class="triggerModeInfo"
						>
							<Icon name="info" /><i18n-t
								scope="global"
								keypath="overlay.labels.param_labelValue_triggers"
							>
								<template #TRIGGERS
									><a href="#" @click="openTriggers">Triggers</a></template
								>
							</i18n-t>
						</div>
					</Transition>

					<ParamItem
						:paramData="param_labelValueFont[label.id]!"
						v-model="label.fontFamily"
						@change="save(label)"
					>
						<template #composite>
							<ParamItem
								:paramData="param_textColor[label.id]!"
								v-model="label.fontColor"
								@change="save(label)"
								class="colorPicker"
								noBackground
							/>
						</template>
					</ParamItem>
					<ParamItem
						:paramData="param_labelValueSize[label.id]!"
						v-model="label.fontSize"
						@change="save(label)"
					/>
					<div class="card-item layout" v-if="label.mode == 'placeholder'">
						<Icon name="layout" />
						<label>{{ t("overlay.labels.param_textAlign") }}</label>
						<div class="layoutBtns">
							<TTButton
								icon="layout_colLeft"
								:selected="label.textAlign == 'left' || !label.textAlign"
								@click="
									label.textAlign = 'left';
									save(label);
								"
							/>
							<TTButton
								icon="layout_col"
								:selected="label.textAlign == 'center'"
								@click="
									label.textAlign = 'center';
									save(label);
								"
							/>
							<TTButton
								icon="layout_colRight"
								:selected="label.textAlign == 'right'"
								@click="
									label.textAlign = 'right';
									save(label);
								"
							/>
						</div>
					</div>
					<ParamItem
						:paramData="param_scrollable[label.id]!"
						v-model="label.scrollContent"
						@change="save(label)"
						v-if="label.mode == 'placeholder'"
					/>
					<ParamItem
						:paramData="param_backgroundEnabled[label.id]!"
						v-model="label.backgroundEnabled"
						@change="save(label)"
					>
						<ParamItem
							:childLevel="1"
							:paramData="param_backgroundColor[label.id]!"
							v-model="label.backgroundColor"
							@change="save(label)"
							noBackground
						/>
					</ParamItem>
				</div>
			</ToggleBlock>
		</VueDraggable>
	</div>
</template>

<script setup lang="ts">
import SwitchButton from "@/components/SwitchButton.vue";
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeLabels as useStoreLabels } from "@/store/labels/storeLabels";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { type LabelItemData } from "@/types/ILabelOverlayData";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { VueDraggable } from "vue-draggable-plus";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import PremiumLimitMessage from "../../PremiumLimitMessage.vue";
import OverlayInstaller from "./OverlayInstaller.vue";
import Icon from "@/components/Icon.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeLabels = useStoreLabels();
const storeParams = useStoreParams();

const param_customText = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_customCSS = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_labelValue = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_labelValueFont = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_labelValueSize = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_textColor = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_backgroundEnabled = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>(
	{},
);
const param_backgroundColor = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_scrollable = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});

const placeholders: TwitchatDataTypes.PlaceholderEntry[] = [];

const maxLabelsReached = computed<boolean>(() => {
	const max = storeAuth.isPremium
		? Config.instance.MAX_LABELS_PREMIUM
		: Config.instance.MAX_LABELS;
	return storeLabels.labelList.length >= max;
});

onBeforeMount(() => {
	for (const key in storeLabels.allPlaceholders) {
		const p = storeLabels.allPlaceholders[key as keyof typeof storeLabels.allPlaceholders];
		if (!p) continue;
		placeholders.push({
			descKey: p.placeholder.descriptionKey,
			descReplacedValues: { NAME: p.placeholder.descriptionKeyName || "" },
			tag: p.placeholder.tag,
			category: p.category,
			example: "",
		});
	}
	placeholders.sort((a, b) => {
		if (a.category != b.category && a.category && b.category)
			return a.category.localeCompare(b.category);
		return a.tag.localeCompare(b.tag);
	});
	initParams();
});

/**
 * Saves given label
 */
function addLabel(): void {
	storeLabels.addLabel();
	initParams();
}

/**
 * Saves given label
 */
function save(label: LabelItemData): void {
	//If user clicks the "cross" to clear the "font family" field, the value
	//becomes "null" which is not allowed by the server. Force it to empty string
	if (!label.fontFamily) label.fontFamily = "";
	storeLabels.saveData(label.id);
}

/**
 * Duplicates given label
 */
function duplicateLabel(label: LabelItemData): void {
	storeLabels.duplicateLabel(label.id);
	initParams();
}

function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}

/**
 * Create parameters for a bingo entry
 * @param id
 */
function initParams(): void {
	storeLabels.labelList.forEach((entry) => {
		const id = entry.id;
		if (param_customText.value[id]) return;
		param_labelValue.value[id] = {
			type: "list",
			value: "",
			labelKey: "overlay.labels.param_labelValue",
			icon: "label",
		};
		param_labelValueFont.value[id] = {
			type: "font",
			value: "Inter",
			labelKey: "overlay.labels.param_labelValueFont",
			icon: "font",
		};
		param_labelValueSize.value[id] = {
			type: "number",
			value: 40,
			labelKey: "overlay.labels.param_labelValueSize",
			icon: "fontSize",
			min: 5,
			max: 300,
		};
		param_customText.value[id] = {
			type: "string",
			value: "",
			labelKey: "overlay.labels.param_customText",
			maxLength: 10000,
			longText: true,
			icon: "html",
		};
		param_customCSS.value[id] = {
			type: "string",
			value: "",
			labelKey: "overlay.labels.param_customCSS",
			maxLength: 10000,
			longText: true,
			icon: "css",
		};
		param_textColor.value[id] = { type: "color", value: "" };
		param_backgroundEnabled.value[id] = {
			type: "boolean",
			value: true,
			labelKey: "overlay.labels.param_backgroundEnabled",
			icon: "overlay",
		};
		param_backgroundColor.value[id] = {
			type: "color",
			value: "",
			labelKey: "overlay.labels.param_backgroundColor",
			icon: "color",
		};
		param_scrollable.value[id] = {
			type: "boolean",
			value: false,
			labelKey: "overlay.labels.param_scrollable",
			icon: "scroll_horizontal",
		};

		let values: TwitchatDataTypes.ParameterData<string>["listValues"] = [];
		let prevCat = "";
		let group: TwitchatDataTypes.ParameterDataListValue<string> = { value: "", group: [] };
		for (const entry of placeholders) {
			entry.globalTag = true;
			if (entry.category != prevCat) {
				if (group.value) values.push(group);
				group = {
					value: t("global.placeholder_selector_categories." + entry.category),
					label: t("global.placeholder_selector_categories." + entry.category),
					group: [],
				};
				prevCat = entry.category!;
			}
			group.group!.push({
				value: entry.tag,
				label: entry.descReplacedValues
					? t(entry.descKey, entry.descReplacedValues)
					: undefined,
				labelKey: entry.descKey,
			});

			group.group!.sort((a, b) => {
				if (a.label && b.label) return a.label.localeCompare(b.label);
				return a.value.localeCompare(b.value);
			});
		}
		if (group.value) values.push(group);

		param_labelValue.value[id]!.listValues = values;
		// Hide 'trigger' label from HTML mode
		param_customText.value[id]!.placeholderList = placeholders.filter(
			(v) => v.tag != "TRIGGER",
		);
	});
}
</script>

<style scoped lang="less">
.overlayparamslabels {
	.createForm {
		text-align: center;
	}

	.labelList,
	.form {
		gap: 0.5em;
		display: flex;
		flex-direction: column;

		.layout {
			gap: 0.5em;
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
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: flex-end;
		}

		.triggerModeInfo {
			overflow: hidden;
			max-height: 3em;
			background-color: var(--background-color-fadest);
			margin: 0 0.5em;
			margin-top: -0.5em;
			text-align: center;
			padding: 0.25em;
			border-bottom-left-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);
			transition: all 0.25s ease-in-out;

			&.expand-enter-from,
			&.expand-leave-to {
				max-height: 0;
				padding-top: 0;
				padding-bottom: 0;
				opacity: 0;
			}

			.icon {
				margin-right: 0.5em;
				vertical-align: middle;
			}
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
