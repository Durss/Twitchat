<template>
	<div class="connecttwitchatcompanion parameterContent">
		<Icon name="twitchat_companion" alt="twitchat extension icon" class="icon" />

		<div class="head">
			<p>{{ $t("twitchat_companion.header") }}</p>
		</div>

		<ExtensionInstaller v-model:extensionReady="extensionReady" />

		<template v-if="extensionReady">
			<TTButton class="center" primary icon="quiz" @click="openQuiz()">{{
				t("twitchat_companion.start_quiz")
			}}</TTButton>
			<TTButton class="center" primary icon="bingo_grid" @click="openBingo()">{{
				t("twitchat_companion.start_bingo")
			}}</TTButton>

			<ParamItem class="enableBt" :paramData="param_enabled" v-model="param_enabled.value" />

			<div
				class="content fadeHolder"
				:style="holderStyles"
				v-if="storeExtension.companionEnabled"
			>
				<HeatOverlayClick />

				<HeatScreenList
					:open="subContent == 'heatAreas'"
					:class="subContent == 'heatAreas' ? 'selected' : ''"
				/>

				<HeatDebug />
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { storeExtension as useStoreExtension } from "@/store/extension/storeExtension";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref, type StyleValue } from "vue";
import ParamItem from "../../ParamItem.vue";
import HeatDebug from "../heat/HeatDebug.vue";
import HeatOverlayClick from "../heat/HeatOverlayClick.vue";
import HeatScreenList from "../heat/HeatScreenList.vue";
import ExtensionInstaller from "../overlays/ExtensionInstaller.vue";
import TTButton from "@/components/TTButton.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeExtension = useStoreExtension();
const storeParams = useStoreParams();

const extensionReady = ref(false);
const param_enabled = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "twitchat_companion.enable_click",
});

const holderStyles = computed<StyleValue>(() => {
	return {
		opacity: param_enabled.value.value === true ? 1 : 0.5,
		pointerEvents: param_enabled.value.value === true ? "all" : "none",
	};
});

const subContent = computed(() => {
	return storeParams.currentPageSubContent;
});

function openQuiz() {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.OVERLAYS,
		TwitchatDataTypes.ParamDeepSections.QUIZ,
	);
}

function openBingo() {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.OVERLAYS,
		TwitchatDataTypes.ParamDeepSections.BINGO_GRID,
	);
}
</script>

<style scoped lang="less">
.connecttwitchatcompanion {
	.center {
		align-self: center;
	}

	.content {
		gap: 1em;
		display: flex;
		flex-direction: column;
	}

	.fadeHolder {
		transition: opacity 0.25s;
		.selected {
			border: 5px solid transparent;
			border-radius: 1em;
			animation: blink 0.5s 3 forwards;
			animation-delay: 1s;
			@keyframes blink {
				0% {
					border-color: var(--color-secondary);
				}
				50% {
					border-color: transparent;
				}
				100% {
					border-color: var(--color-secondary);
				}
			}
		}
	}
}
</style>
