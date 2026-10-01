<template>
	<div class="overlaytimer overlayParamsSection">
		<!-- <a href="https://www.youtube.com/watch?v=x_OnsPRA8Bs" target="_blank" class="youtubeTutorialBt">
			<Icon name="youtube" theme="light" />
			<span>{{ $t('overlay.youtube_demo_tt') }}</span>
			<Icon name="newtab" theme="light" />
		</a> -->

		<div class="header">{{ t("overlay.timer.header") }}</div>

		<section>
			<TTButton @click="openTimerParams" icon="edit">{{
				t("overlay.timer.createTimer_bt")
			}}</TTButton>
		</section>

		<section class="timerList">
			<ToggleBlock
				v-for="entry in storeTimer.timerList"
				:title="entry.title"
				:titleDefault="t('overlay.timer.default_title')"
				:titleMaxLengh="30"
				:open="false"
				:key="entry.id"
			>
				<template #left_actions>
					<Icon name="timer" class="timerTypeIcon" v-if="entry.type == 'timer'" />
					<Icon name="countdown" class="timerTypeIcon" v-if="entry.type == 'countdown'" />
				</template>

				<div class="content">
					<div class="info" v-if="entry.isDefault">
						<Icon name="info" />
						<i18n-t scope="global" tag="span" keypath="overlay.timer.default_timer">
							<template v-if="entry.type == 'countdown'" #CMD
								><mark>/countdown...</mark></template
							>
							<template v-if="entry.type == 'timer'" #CMD
								><mark>/timer...</mark></template
							>
						</i18n-t>
					</div>

					<div class="overlayInstallCard">
						<h1><Icon name="obs" />{{ t("bingo_grid.form.install_title") }}</h1>
						<OverlayInstaller
							type="timer"
							:sourceSuffix="entry.title"
							:id="entry.isDefault ? '' : entry.id"
							:sourceTransform="{ width: 300, height: 100 }"
						/>
					</div>

					<ParamItem
						:paramData="param_style[entry.id]!"
						v-model="entry.overlayParams.style"
						class="selectList"
						v-if="!entry.isDefault && entry.type == 'countdown'"
						@change="onChange(entry)"
					/>

					<template v-if="entry.overlayParams.style != 'bar'">
						<ParamItem
							:paramData="param_showIcon[entry.id]!"
							v-model="entry.overlayParams.showIcon"
							@change="onChange(entry)"
						/>
						<ParamItem
							:paramData="param_bgEnabled[entry.id]!"
							v-model="entry.overlayParams.bgEnabled"
							@change="onChange(entry)"
						>
							<ParamItem
								:paramData="param_bgColor[entry.id]!"
								v-model="entry.overlayParams.bgColor"
								:childLevel="1"
								noBackground
								@change="onChange(entry)"
							/>
						</ParamItem>
						<ParamItem
							:paramData="param_textFont[entry.id]!"
							v-model="entry.overlayParams.textFont"
							class="selectList"
							@change="onChange(entry)"
						/>
						<ParamItem
							:paramData="param_textSize[entry.id]!"
							v-model="entry.overlayParams.textSize"
							@change="onChange(entry)"
						/>
						<ParamItem
							:paramData="param_textColor[entry.id]!"
							v-model="entry.overlayParams.textColor"
							@change="onChange(entry)"
						/>
					</template>

					<template v-else>
						<ParamItem
							:paramData="param_progressStyle[entry.id]!"
							v-model="entry.overlayParams.progressStyle"
							class="selectList"
							@change="onChange(entry)"
						/>
						<ParamItem
							:paramData="param_bgColor[entry.id]!"
							v-model="entry.overlayParams.bgColor"
							@change="onChange(entry)"
						/>
						<ParamItem
							:paramData="param_progressSize[entry.id]!"
							v-model="entry.overlayParams.progressSize"
							@change="onChange(entry)"
						/>
					</template>

					<!-- <ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
						<div class="cssHead">{{ $t("overlay.timer.css") }}</div>
						<ul class="cssStructure" v-if="entry.type == 'timer'">
							<li>#timer { ... }</li>
							<li class="sublist">
								<ul>
									<li>#timer_icon { ... }</li>
									<li>#timer_label { ... }</li>
								</ul>
							</li>
						</ul>
						<ul class="cssStructure" v-if="entry.type == 'countdown'">
							<li>#countdown { ... }</li>
							<li class="sublist">
								<ul>
									<li>#countdown_icon { ... }</li>
									<li>#countdown_label { ... }</li>
								</ul>
							</li>
						</ul>
					</ToggleBlock> -->
				</div>
			</ToggleBlock>
		</section>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeTimer as useStoreTimer } from "@/store/timer/storeTimer";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ToggleBlock from "../../../ToggleBlock.vue";
import TTButton from "../../../TTButton.vue";
import ParamItem from "../../ParamItem.vue";
import OverlayInstaller from "./OverlayInstaller.vue";

const { t } = useI18n();
const storeTimer = useStoreTimer();
const storeParams = useStoreParams();

const param_style = ref<{
	[key: string]: TwitchatDataTypes.ParameterData<
		string,
		TwitchatDataTypes.TimerData["overlayParams"]["style"]
	>;
}>({});
const param_bgColor = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_bgEnabled = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_textFont = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_textSize = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_textColor = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_showIcon = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_progressSize = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_progressStyle = ref<{
	[key: string]: TwitchatDataTypes.ParameterData<
		string,
		TwitchatDataTypes.TimerData["overlayParams"]["progressStyle"]
	>;
}>({});

onBeforeMount(() => {
	initParams();
});

/**
 * Create parameters for a bingo entry
 * @param id
 */
function initParams(): void {
	storeTimer.timerList.forEach((entry) => {
		const id = entry.id;
		if (param_style.value[id]) return;
		const styleList: TwitchatDataTypes.ParameterDataListValue<
			TwitchatDataTypes.TimerData["overlayParams"]["style"]
		>[] = [
			{ value: "text", labelKey: "overlay.timer.param_style_text" },
			{ value: "bar", labelKey: "overlay.timer.param_style_bar" },
		];
		const progressStyleList: TwitchatDataTypes.ParameterDataListValue<
			TwitchatDataTypes.TimerData["overlayParams"]["progressStyle"]
		>[] = [
			{ value: "empty", labelKey: "overlay.timer.param_progressStyle_empty" },
			{ value: "fill", labelKey: "overlay.timer.param_progressStyle_fill" },
		];
		param_style.value[id] = {
			type: "list",
			value: "",
			labelKey: "overlay.timer.param_style",
			icon: "css",
			listValues: styleList,
		};
		param_bgColor.value[id] = {
			type: "color",
			value: "",
			labelKey: "overlay.timer.param_bgColor",
			icon: "color",
		};
		param_showIcon.value[id] = {
			type: "boolean",
			value: true,
			labelKey: "overlay.timer.param_showIcon",
			icon: entry.type == "timer" ? "timer" : "countdown",
		};
		param_bgEnabled.value[id] = {
			type: "boolean",
			value: true,
			labelKey: "overlay.timer.param_bgEnabled",
			icon: "overlay",
		};
		param_textFont.value[id] = {
			type: "font",
			value: "",
			labelKey: "overlay.timer.param_textFont",
			icon: "font",
		};
		param_textSize.value[id] = {
			type: "number",
			value: 20,
			labelKey: "overlay.timer.param_textSize",
			icon: "fontSize",
		};
		param_textColor.value[id] = {
			type: "color",
			value: "",
			labelKey: "overlay.timer.param_textColor",
			icon: "color",
		};
		param_progressSize.value[id] = {
			type: "number",
			value: 10,
			labelKey: "overlay.timer.param_progressSize",
			icon: "scale",
		};
		param_progressStyle.value[id] = {
			type: "list",
			value: "",
			labelKey: "overlay.timer.param_progressStyle",
			icon: "color",
			listValues: progressStyleList,
		};
	});
}

function onChange(entry: TwitchatDataTypes.TimerData): void {
	storeTimer.saveData();
	storeTimer.broadcastStates(entry.id);
}

function openTimerParams(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TIMERS);
}
</script>

<style scoped lang="less">
.overlaytimer {
	.actions {
		margin: auto;
		display: flex;
		flex-direction: row;
		justify-content: center;
		flex-wrap: wrap;
		gap: 1em;
	}

	.content {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		.info {
			text-align: center;
			font-size: 0.8em;
			margin-bottom: 0.25em;
			.icon {
				height: 1em;
				margin-right: 0.5em;
			}
		}
	}

	.selectList {
		:deep(select),
		:deep(.v-select) {
			flex-basis: 200px !important;
		}
	}
}
</style>
