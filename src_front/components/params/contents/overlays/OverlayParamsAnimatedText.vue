<template>
	<div class="overlayparamsanimatedtext overlayParamsSection">
		<i18n-t tag="div" class="header" keypath="overlay.animatedText.header">
			<template #TRIGGERS>
				<a href="#" @click.prevent="openTriggers()">{{
					t("params.categories.triggers")
				}}</a>
			</template>
		</i18n-t>

		<VueDraggable
			class="entryList"
			v-model="storeAnimatedText.animatedTextList"
			:group="{ name: 'labels' }"
			handle=".header"
			:animation="250"
			@end="storeAnimatedText.saveData()"
		>
			<ToggleBlock
				v-for="entry in storeAnimatedText.animatedTextList"
				editableTitle
				v-model:title="entry.title"
				:titleDefault="t('overlay.animatedText.default_title')"
				:titleMaxLengh="30"
				:open="false"
				:key="entry.id"
				:disabled="!entry.enabled"
				@update:title="onChange(entry)"
			>
				<template #right_actions>
					<TTButton
						@click.stop="storeAnimatedText.deleteAnimatedText(entry.id)"
						icon="trash"
						alert
					/>
				</template>

				<template #left_actions>
					<ToggleButton
						v-model="entry.enabled"
						@change="onChange(entry)"
						@click.stop
						v-if="
							storeAuth.isPremium ||
							entry.enabled ||
							storeAnimatedText.animatedTextList.filter((v) => v.enabled).length <
								$config.MAX_ANIMATED_TEXT
						"
					/>
				</template>

				<div class="content">
					<div class="overlayInstallCard">
						<h1><Icon name="obs" />{{ t("bingo_grid.form.install_title") }}</h1>
						<OverlayInstaller
							type="animatedtext"
							:sourceSuffix="entry.title"
							:id="entry.id"
							:sourceTransform="{ width: 900, height: 350 }"
						/>
					</div>

					<form class="card-item dark simulate" @submit.prevent="onTest(entry.id)">
						<input type="text" v-model="testText" class="input-field" maxlength="100" />
						<TTButton type="submit" icon="test" class="button">{{
							t("overlay.animatedText.test_bt")
						}}</TTButton>
					</form>

					<ParamItem
						:paramData="param_animStyle[entry.id]!"
						v-model="entry.animStyle"
						@change="onChange(entry)"
					/>
					<ParamItem
						:paramData="param_animDurationScale[entry.id]!"
						v-model="entry.animDurationScale"
						@change="onChange(entry)"
					/>
					<ParamItem
						:paramData="param_animStrength[entry.id]!"
						v-model="entry.animStrength"
						@change="onChange(entry)"
					/>
					<ParamItem
						:paramData="param_textFont[entry.id]!"
						v-model="entry.textFont"
						@change="onChange(entry)"
					/>
					<ParamItem
						:paramData="param_textSize[entry.id]!"
						v-model="entry.textSize"
						@change="onChange(entry)"
					/>
					<ParamItem
						:paramData="param_colorBase[entry.id]!"
						v-model="entry.colorBase"
						@change="onChange(entry)"
					/>
					<ParamItem
						:paramData="param_colorHighlights[entry.id]!"
						v-model="entry.colorHighlights"
						@change="onChange(entry)"
					/>
				</div>
			</ToggleBlock>
		</VueDraggable>

		<section>
			<TTButton class="addBt" v-if="!maxReached" @click="addEntry()" icon="add">{{
				t("overlay.animatedText.add_bt")
			}}</TTButton>

			<PremiumLimitMessage
				v-else
				label="overlay.animatedText.non_premium_limit"
				premiumLabel="overlay.animatedText.premium_limit"
				:max="$config.MAX_ANIMATED_TEXT"
				:maxPremium="$config.MAX_ANIMATED_TEXT_PREMIUM"
			/>
		</section>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import { storeAnimatedText as useStoreAnimatedText } from "@/store/animated_text/storeAnimatedText";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { computed, onBeforeMount, ref } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useI18n } from "vue-i18n";
import ToggleBlock from "../../../ToggleBlock.vue";
import TTButton from "../../../TTButton.vue";
import ParamItem from "../../ParamItem.vue";
import PremiumLimitMessage from "../../PremiumLimitMessage.vue";
import OverlayInstaller from "./OverlayInstaller.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const storeAnimatedText = useStoreAnimatedText();

const testText = ref("");
const param_animDurationScale = ref<{
	[key: string]: TwitchatDataTypes.ParameterData<number>;
}>({});
const param_animStrength = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_animStyle = ref<{
	[key: string]: TwitchatDataTypes.ParameterData<TwitchatDataTypes.AnimatedTextData["animStyle"]>;
}>({});
const param_colorBase = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_colorHighlights = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_textFont = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_textSize = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});

const maxReached = computed(() => {
	const count = storeAnimatedText.animatedTextList.length;
	const max = storeAuth.isPremium
		? Config.instance.MAX_ANIMATED_TEXT_PREMIUM
		: Config.instance.MAX_ANIMATED_TEXT;
	return count >= max;
});

onBeforeMount(() => {
	testText.value = t("overlay.animatedText.test_default");
	initParams();
});

/**
 * Create parameters for a bingo entry
 * @param id
 */
function initParams(): void {
	storeAnimatedText.animatedTextList.forEach((entry) => {
		const id = entry.id;
		if (param_animStrength.value[id]) return;
		param_animDurationScale.value[id] = {
			type: "slider",
			value: 1,
			min: 0,
			step: 0.05,
			max: 2,
			labelKey: "overlay.animatedText.param_animDurationScale",
			icon: "timer",
		};
		param_animStrength.value[id] = {
			type: "slider",
			value: 1,
			min: 0,
			step: 0.05,
			max: 2,
			labelKey: "overlay.animatedText.param_animStrength",
			icon: "scale",
		};
		param_animStyle.value[id] = {
			type: "list",
			value: "wave",
			labelKey: "overlay.animatedText.param_animStyle",
			icon: "easing",
		};
		param_colorBase.value[id] = {
			type: "color",
			value: "",
			labelKey: "overlay.animatedText.param_colorBase",
			icon: "color",
		};
		param_colorHighlights.value[id] = {
			type: "color",
			value: "",
			labelKey: "overlay.animatedText.param_colorHighlights",
			icon: "color",
		};
		param_textFont.value[id] = {
			type: "font",
			value: "",
			labelKey: "overlay.animatedText.param_textFont",
			icon: "font",
		};
		param_textSize.value[id] = {
			type: "slider",
			value: 30,
			min: 10,
			max: 150,
			labelKey: "overlay.animatedText.param_textSize",
			icon: "fontSize",
		};

		param_animStyle.value[id].listValues = TwitchatDataTypes.AnimatedTextData_AnimStyles.map(
			(v) => {
				return {
					value: v,
					labelKey: "overlay.animatedText.param_anim_styles." + v,
				};
			},
		);
	});
}

/**
 * Saves data on change
 * @param entry
 */
function onChange(entry: TwitchatDataTypes.AnimatedTextData): void {
	if (!entry.textFont) {
		entry.textFont = "Inter";
	}
	storeAnimatedText.saveData();
	storeAnimatedText.broadcastStates(entry.id);
}

/**
 * Opens the triggers
 */
function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}

/**
 * Saves given label
 */
function addEntry(): void {
	storeAnimatedText.createAnimatedText();
	initParams();
}

/**
 * Tests the text
 */
function onTest(overlayId: string): void {
	storeAnimatedText.animateText(overlayId, testText.value, true, true);
}
</script>

<style scoped lang="less">
.overlayparamsanimatedtext {
	.entryList,
	.content {
		gap: 0.5em;
		display: flex;
		flex-direction: column;

		.simulate {
			gap: 1px;
			display: flex;
			flex-direction: row;
			justify-content: center;
			& > * {
				border-radius: 0;
			}
			& > *:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			& > *:last-child {
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
}
</style>
