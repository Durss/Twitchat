<template>
	<div class="triggeractionobsentry triggerActionForm" v-if="!obsConnected">
		<div class="info warn">
			<Icon name="info" alt="info" theme="light" />
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.obs.header">
				<template #LINK>
					<a @click="storeParams.openParamsPage(contentConnexions, subcontentObs)">{{
						t("triggers.actions.obs.header_link")
					}}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="triggeractionobsentry triggerActionForm" v-else>
		<ParamItem :paramData="param_obsAction_conf" v-model="action.obsAction" />

		<div
			class="info secondary"
			v-if="action.obsAction === 'pauserecord' || action.obsAction === 'resumerecord'"
		>
			{{ t("triggers.actions.obs.param_obs_action_pauserecord_alert") }}
		</div>

		<ParamItem
			v-else-if="action.obsAction === 'createchapter'"
			:paramData="param_record_chapter_name"
			v-model="action.recordChapterName"
		/>

		<template v-else-if="action.obsAction === 'emitevent'">
			<div class="info">{{ t("triggers.actions.obs.param_browser_info") }}</div>
			<ParamItem :paramData="param_browserEvent_name" v-model="action.browserEventName" />
			<ParamItem :paramData="param_browserEvent_param" v-model="action.browserEventParams" />
			<div class="info">
				<span>{{ t("triggers.actions.obs.param_browser_usage") }}</span>
				<div class="typescript">
					<pre class="codeBlock"><code v-html="highlightedCode"></code></pre>
					<TTButton
						class="copyBt"
						icon="copy"
						:copy="getBrowserEventCode()"
						transparent
					/>
				</div>
			</div>
		</template>

		<template v-else-if="action.obsAction === 'sources'">
			<ParamItem :paramData="param_source_conf" v-model="selectedSourceName" />
			<ParamItem
				:paramData="param_sourceAction_conf"
				v-model="action.action"
				v-if="selectedSourceName"
			/>
			<ParamItem :paramData="param_text_conf" v-model="action.text" v-if="isTextSource" />
			<ParamItem :paramData="param_url_conf" v-model="action.url" v-if="isBrowserSource" />
			<ParamItem
				:paramData="param_css_conf"
				v-model="action.browserSourceCss"
				v-if="isBrowserSource"
			/>
			<ParamItem
				:paramData="param_css_conf"
				v-model="action.browserSourceCss"
				v-if="isBrowserSource"
			/>
			<ParamItem
				:paramData="param_colorToggle_conf"
				v-model="param_colorToggle_conf.value"
				v-if="isColorSource"
				@change="changeColorToggle"
			>
				<SwitchButton
					:labels="[
						t('triggers.actions.obs.param_colorMode_color'),
						t('triggers.actions.obs.param_colorMode_placeholder'),
					]"
					:values="['color', 'placeholder']"
					v-model="action.colorSource_mode"
				/>
				<template v-if="action.colorSource_mode === 'color'">
					<ParamItem
						:paramData="param_color_conf"
						v-model="action.colorSource_color"
						noBackground
						class="child"
					/>
					<ParamItem
						:paramData="param_colorAlpha_conf"
						v-model="action.colorSource_alpha"
						noBackground
						class="child"
					/>
				</template>
				<template v-else>
					<ParamItem
						:paramData="param_colorPlaceholder_conf"
						v-model="action.colorSource_color"
						noBackground
						class="child"
					/>
				</template>
			</ParamItem>
			<ParamItem
				:paramData="param_x_conf"
				v-model="action.pos_x"
				v-if="action.action == 'move'"
			/>
			<ParamItem
				:paramData="param_y_conf"
				v-model="action.pos_y"
				v-if="action.action == 'move'"
			/>
			<ParamItem
				:paramData="param_width_conf"
				v-model="action.width"
				v-if="action.action == 'resize'"
			/>
			<ParamItem
				:paramData="param_height_conf"
				v-model="action.height"
				v-if="action.action == 'resize'"
			/>
			<ParamItem
				:paramData="param_angle_conf"
				v-model="action.angle"
				v-if="action.action == 'rotate'"
			/>
			<ParamItem
				:paramData="param_transformRelative_conf"
				v-model="action.relativeTransform"
				v-if="
					action.action == 'rotate' ||
					action.action == 'resize' ||
					action.action == 'move'
				"
			/>
			<ParamItem
				:paramData="param_transformAnimate_conf"
				v-model="action.animate"
				v-if="
					action.action == 'rotate' ||
					action.action == 'resize' ||
					action.action == 'move'
				"
			>
				<ParamItem
					:paramData="param_transformEasing_conf"
					v-model="action.animateEasing"
					noBackground
					class="child"
				/>
				<ParamItem
					:paramData="param_transformDuration_conf"
					v-model="action.animateDuration"
					noBackground
					class="child"
				/>
			</ParamItem>
			<ParamItem
				class="file"
				v-if="canSetMediaPath"
				:paramData="param_media_conf"
				v-model="action.mediaPath"
			/>

			<ParamItem
				class="url"
				:paramData="param_mediaEndEvent_conf"
				v-model="action.waitMediaEnd"
				v-if="canWaitForMediaEnd"
			/>

			<div v-if="showPlaceholderWarning" class="info">
				<Icon name="alert" alt="info" theme="light" />
				<i18n-t
					scope="global"
					class="label"
					tag="p"
					keypath="triggers.actions.obs.media_source"
				>
					<template #CMD1><mark>..</mark></template>
					<template #CMD2><mark>/</mark></template>
				</i18n-t>
				<div>
					<strong>{{ t("global.example") }}</strong>
					<i18n-t
						scope="global"
						class="label"
						tag="span"
						keypath="triggers.actions.obs.media_source_example"
					>
						<template #PATH1><mark>C:/sounds/{MESSAGE}.mp3</mark></template>
						<template #PATH2><mark>../secretfolder/somesecretfile</mark></template>
					</i18n-t>
				</div>
			</div>
		</template>

		<template v-else-if="action.obsAction === 'hotKey'">
			<Icon
				name="loader"
				alt="loader"
				class="card-item loading"
				v-if="(param_hotkeyAction_conf.listValues || []).length == 0"
			/>
			<ParamItem
				class="url"
				:paramData="param_hotkeyAction_conf"
				v-model="action.hotKeyAction"
				v-else
			/>
		</template>

		<template v-else-if="action.obsAction === 'screenshot'">
			<ParamItem :paramData="param_source_conf" v-model="selectedSourceName" />
			<ParamItem
				:paramData="param_screenImgFormat_conf"
				v-model="action.screenshotImgFormat"
			/>
			<ParamItem
				:paramData="param_screenImgSize_toggle_conf"
				v-model="action.screenshotImgCustomSize"
			>
				<ParamItem
					:paramData="param_screenImgSize_width_conf"
					v-model="action.screenshotImgWidth"
					noBackground
					:childLevel="1"
				/>
				<ParamItem
					:paramData="param_screenImgSize_height_conf"
					v-model="action.screenshotImgHeight"
					noBackground
					:childLevel="1"
				/>
			</ParamItem>

			<SwitchButton
				:labels="[
					t('triggers.actions.obs.param_screenImgSize_modeSave_conf'),
					t('triggers.actions.obs.param_screenImgSize_modeGet_conf'),
				]"
				:values="['save', 'get']"
				v-model="action.screenshotImgMode"
			/>

			<ParamItem
				v-if="action.screenshotImgMode == 'save'"
				:paramData="param_screenImgSavePath_conf"
				:error="isInvalidScreenFilePath"
				v-model="action.screenshotImgSavePath"
			/>

			<template v-if="action.screenshotImgMode == 'get'">
				<ParamItem
					:paramData="param_screenImgSavePH_conf"
					v-model="action.screenshotImgSavePlaceholder"
				/>

				<i18n-t
					scope="global"
					class="card-item primary"
					tag="div"
					keypath="triggers.actions.common.custom_placeholder_example"
					v-if="(action.screenshotImgSavePlaceholder || '').length > 0"
				>
					<template #PLACEHOLDER>
						<mark v-click2Select
							>{{ "{" }}{{ action.screenshotImgSavePlaceholder!.toUpperCase()
							}}{{ "}" }}</mark
						>
					</template>
				</i18n-t>
			</template>
		</template>

		<template
			v-if="
				action.obsAction === 'setPersistedData' || action.obsAction === 'getPersistedData'
			"
		>
			<ParamItem :paramData="param_persistedKey_conf" v-model="action.persistedDataKey" />
			<ParamItem
				:paramData="param_persistedValue_conf"
				v-model="action.persistedDataValue"
				v-if="action.obsAction === 'setPersistedData'"
			/>
			<ParamItem
				:paramData="param_persistedKeyPH_conf"
				v-model="action.persistedDataPlaceholder"
				v-if="action.obsAction === 'getPersistedData'"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import ParamItem from "@/components/params/ParamItem.vue";
import SwitchButton from "@/components/SwitchButton.vue";
import TTButton from "@/components/TTButton.vue";
import {
	type ITriggerPlaceholder,
	type TriggerActionObsData,
	type TriggerActionObsDataAction,
	type TriggerActionObsSourceDataAction,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { OBSFilter, OBSSceneItem, OBSSourceItem } from "@/utils/OBSWebsocket";
import { default as OBSWebSocket, type OBSInputItem } from "@/utils/OBSWebsocket";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { useI18n } from "vue-i18n";
import { ref, computed, watch, onBeforeMount, onMounted, nextTick } from "vue";
import { useHighlight } from "@/composables/useHighlight";

const { t, tm } = useI18n();
const storeParams = useStoreParams();
const { loadHighlightJs, highlight } = useHighlight();

const props = withDefaults(
	defineProps<{
		action: TriggerActionObsData;
		triggerData?: TriggerData;
		obsScenes?: OBSSceneItem[];
		obsSources?: OBSSourceItem[];
		obsInputs?: OBSInputItem[];
	}>(),
	{
		triggerData: () => [] as unknown as TriggerData,
		obsScenes: () => [],
		obsSources: () => [],
		obsInputs: () => [],
	},
);

const param_obsAction_conf = ref<
	TwitchatDataTypes.ParameterData<TriggerActionObsDataAction, TriggerActionObsDataAction>
>({
	type: "list",
	value: "sources",
	listValues: [],
	icon: "show",
	labelKey: "triggers.actions.obs.param_obsAction",
});
const param_sourceAction_conf = ref<
	TwitchatDataTypes.ParameterData<
		TriggerActionObsSourceDataAction,
		TriggerActionObsSourceDataAction
	>
>({
	type: "list",
	value: "show",
	listValues: [],
	icon: "show",
	labelKey: "triggers.actions.obs.param_sourceAction",
});
const param_source_conf = ref<TwitchatDataTypes.ParameterData<string, string, string>>({
	type: "list",
	value: "",
	listValues: [],
	icon: "list",
	children: [],
	labelKey: "triggers.actions.obs.param_source",
});
const param_filter_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "",
	listValues: [],
	labelKey: "triggers.actions.obs.param_filter",
});
const param_text_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	longText: true,
	value: "",
	icon: "whispers",
	maxLength: 500,
	labelKey: "triggers.actions.obs.param_text",
});
const param_url_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "url",
	maxLength: 10000,
	placeholder: "http://...",
	labelKey: "triggers.actions.obs.param_url",
});
const param_css_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	maxLength: 10000,
	icon: "color",
	placeholder: "",
	labelKey: "triggers.actions.obs.param_css",
});
const param_media_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "url",
	maxLength: 10000,
	placeholder: "C:/...",
	labelKey: "triggers.actions.obs.param_media",
});
const param_mediaEndEvent_conf = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "countdown",
	labelKey: "triggers.actions.obs.param_mediaEvent",
});
const param_x_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "coord_x",
	maxLength: 500,
	labelKey: "triggers.actions.obs.param_x",
});
const param_y_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "coord_y",
	maxLength: 500,
	labelKey: "triggers.actions.obs.param_y",
});
const param_angle_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "number",
	maxLength: 500,
	labelKey: "triggers.actions.obs.param_angle",
});
const param_width_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "number",
	maxLength: 500,
	labelKey: "triggers.actions.obs.param_width",
});
const param_height_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "number",
	maxLength: 500,
	labelKey: "triggers.actions.obs.param_height",
});
const param_transformRelative_conf = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "number",
});
const param_transformAnimate_conf = ref<TwitchatDataTypes.ParameterData<boolean, unknown, any>>({
	type: "boolean",
	value: false,
	icon: "animate",
	labelKey: "triggers.actions.obs.param_transform_animate",
});
const param_transformEasing_conf = ref<
	TwitchatDataTypes.ParameterData<TriggerActionObsData["animateEasing"]>
>({
	type: "list",
	value: "linear.none",
	icon: "easing",
	labelKey: "triggers.actions.obs.param_transform_animate_easing",
});
const param_transformDuration_conf = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 500,
	min: 0,
	max: 60000,
	icon: "timer",
	labelKey: "triggers.actions.obs.param_transform_animate_duration",
});
const param_browserEvent_name = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 100,
	icon: "label",
	labelKey: "triggers.actions.obs.param_browserEvent_name",
});
const param_browserEvent_param = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 10000,
	longText: true,
	icon: "placeholder",
	labelKey: "triggers.actions.obs.param_browserEvent_param",
});
const param_record_chapter_name = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 100,
	icon: "label",
	labelKey: "triggers.actions.obs.param_record_chapter_name",
});
const param_hotkeyAction_conf = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "list",
	value: "",
	icon: "press",
	labelKey: "triggers.actions.obs.param_record_hotkey_name",
});
const param_screenImgFormat_conf = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "list",
	value: "jpeg",
	icon: "screenshot",
	labelKey: "triggers.actions.obs.param_screenImgFormat_conf",
});
const param_screenImgSize_toggle_conf = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "scale",
	labelKey: "triggers.actions.obs.param_screenImgSize_toggle_conf",
});
const param_screenImgSize_width_conf = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 1920,
	min: 8,
	max: 4096,
	icon: "coord_x",
	labelKey: "triggers.actions.obs.param_screenImgSize_width_conf",
});
const param_screenImgSize_height_conf = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 1080,
	min: 8,
	max: 4096,
	icon: "coord_y",
	labelKey: "triggers.actions.obs.param_screenImgSize_height_conf",
});
const param_screenImgSavePath_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	placeholder: "D:/image.jpeg",
	maxLength: 500,
	icon: "save",
	labelKey: "triggers.actions.obs.param_screenImgSavePath_conf",
});
const param_screenImgSavePH_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "placeholder",
	value: "",
	maxLength: 30,
	allowedCharsRegex: "a-z0-9_",
	icon: "placeholder",
	labelKey: "triggers.actions.obs.param_screenImgSavePH_conf",
});
const param_persistedKey_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 100,
	icon: "key",
	labelKey: "triggers.actions.obs.param_persistedKey_conf",
});
const param_persistedValue_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 1000,
	icon: "font",
	labelKey: "triggers.actions.obs.param_persistedValue_conf",
});
const param_persistedKeyPH_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "placeholder",
	value: "",
	maxLength: 30,
	allowedCharsRegex: "a-z0-9_",
	icon: "placeholder",
	labelKey: "triggers.actions.obs.param_screenImgSavePH_conf",
});
const param_colorToggle_conf = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "color",
	labelKey: "triggers.actions.obs.param_colorToggle_conf",
});
const param_color_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "color",
	value: "",
	labelKey: "triggers.actions.obs.param_color_conf",
});
const param_colorPlaceholder_conf = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "list",
	value: "",
	maxLength: 30,
	allowedCharsRegex: "a-z0-9_",
	icon: "placeholder",
	labelKey: "triggers.actions.obs.param_colorPlaceholder_conf",
});
const param_colorAlpha_conf = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 100,
	min: 0,
	max: 100,
	labelKey: "triggers.actions.obs.param_colorAlpha_conf",
});

const colorMode = ref<boolean>(false);
const selectedSourceName = ref<string>("");
const filters = ref<OBSFilter[]>([]);

// Placeholder composable
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	param_text_conf.value.placeholderList =
		param_url_conf.value.placeholderList =
		param_media_conf.value.placeholderList =
		param_css_conf.value.placeholderList =
		param_record_chapter_name.value.placeholderList =
		param_screenImgSavePath_conf.value.placeholderList =
		param_browserEvent_param.value.placeholderList =
		param_persistedValue_conf.value.placeholderList =
			list;
	param_colorPlaceholder_conf.value.listValues = list.map((v) => {
		return { label: t(v.descKey, v.descReplacedValues ?? {}), value: v.tag };
	});

	param_x_conf.value.placeholderList =
		param_y_conf.value.placeholderList =
		param_angle_conf.value.placeholderList =
		param_width_conf.value.placeholderList =
		param_height_conf.value.placeholderList =
			list.filter((v) => v.numberParsable === true);
}

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);

// Computed
const obsConnected = computed<boolean>(() => {
	return OBSWebSocket.instance.connected.value;
});

const subcontentObs = computed<TwitchatDataTypes.ParamDeepSectionsStringType>(() => {
	return TwitchatDataTypes.ParamDeepSections.OBS;
});

const contentConnexions = computed<TwitchatDataTypes.ParameterPagesStringType>(() => {
	return TwitchatDataTypes.ParameterPages.CONNECTIONS;
});

const showPlaceholderWarning = computed<boolean>(() => {
	if (!isMediaSource.value || param_sourceAction_conf.value.value != "show") return false;
	return /\{[^ }]+\}/gi.test(param_media_conf.value.value);
});

const highlightedCode = computed(() => {
	if (props.action.obsAction != "emitevent") return "";
	const code = `window.addEventListener("${props.action.browserEventName}", (param) => {
	console.log(param.detail.data);
});`;
	return highlight(code, "javascript");
});

/**
 * Get if the selected source is a text source
 */
const isTextSource = computed<boolean>(() => {
	const input = props.obsSources.find(
		(v) => "source_" + v.sourceName == param_source_conf.value.value,
	);
	if (!input || !input.inputKind) return false;

	return (
		input.inputKind.indexOf("text_") > -1 &&
		param_filter_conf.value.value == "" &&
		param_sourceAction_conf.value.value == "show"
	);
});

/**
 * Get if the selected source is a browwer source
 */
const isBrowserSource = computed<boolean>(() => {
	return (
		props.obsSources.find((v) => "source_" + v.sourceName == param_source_conf.value.value)
			?.inputKind == "browser_source" &&
		param_filter_conf.value.value == "" &&
		param_sourceAction_conf.value.value == "show"
	);
});

/**
 * Get if the selected source is a color source
 */
const isColorSource = computed<boolean>(() => {
	return (
		props.obsSources.find((v) => "source_" + v.sourceName == param_source_conf.value.value)
			?.inputKind == "color_source_v3" &&
		param_filter_conf.value.value == "" &&
		param_sourceAction_conf.value.value == "show"
	);
});

/**
 * Get if the "wait for media to end playing" option can be used
 */
const canWaitForMediaEnd = computed<boolean>(() => {
	return (
		isMediaSource.value && (props.action.action == "show" || props.action.action == "replay")
	);
});

/**
 * Get if we can modify the media path
 */
const canSetMediaPath = computed<boolean>(() => {
	return (
		isMediaSource.value &&
		param_filter_conf.value.value == "" &&
		param_sourceAction_conf.value.value == "show"
	);
});

/**
 * Get if custom file path for source screen shot contains a file name or not
 */
const isInvalidScreenFilePath = computed<boolean>(() => {
	return !/[^\\/]+\.[^\\/]+$/.test(props.action.screenshotImgSavePath || "");
});

/**
 * Get if the selected source is a media source
 */
const isMediaSource = computed<boolean>(() => {
	let sourceName = param_source_conf.value.selectedListValue
		? (param_source_conf.value.selectedListValue as SourceItem).name
		: "";
	const inputKind = props.obsSources.find((v) => v.sourceName == sourceName)?.inputKind;
	param_media_conf.value.labelKey = "triggers.actions.obs.param_media";
	if (inputKind === "image_source")
		param_media_conf.value.labelKey = "triggers.actions.obs.param_media_img";
	return (
		inputKind === "ffmpeg_source" || inputKind === "image_source" || inputKind === "vlc_source"
	);
});

/**
 * Get if source is a slideshow
 */
const isSlideshowSource = computed<boolean>(() => {
	let sourceName = param_source_conf.value.selectedListValue
		? (param_source_conf.value.selectedListValue as SourceItem).name
		: "";
	const inputKind = props.obsSources.find((v) => v.sourceName == sourceName)?.inputKind;
	return inputKind == "slideshow";
});

// Functions

/**
 * Called when copy button is clicked on browser event example
 */
function getBrowserEventCode(): string {
	return `window.addEventListener("${props.action.browserEventName}", (param) => {
	console.log(param.detail.data);
});`;
}

function changeColorToggle(): void {
	if (!param_colorToggle_conf.value.value) {
		props.action.colorSource_color = "";
		props.action.colorSource_alpha = 100;
	} else if (!props.action.colorSource_color) {
		props.action.colorSource_color = "#ffffff";
		props.action.colorSource_alpha = 100;
	}
}

/**
 * Called when selecting a new action and on init
 */
function onActionChange(): void {
	if (props.action.obsAction == "hotKey") {
		OBSWebSocket.instance.getHotkeys().then((list) => {
			const disallowList = ["libobs", "ObsBrowser", "MediaSource"];
			const hotkeys = list
				.filter((key) => disallowList.find((v) => key.includes(v)) == undefined)
				.map((v) => {
					return { label: v.replace(".", " "), value: v };
				});
			param_hotkeyAction_conf.value.listValues = hotkeys;
		});
	}
}

/**
 * Prefills the form
 */
async function prefillForm(cleanData: boolean = true): Promise<void> {
	let list: SourceItem[] = [];
	//Add "--- Scenes ---" splitter
	list.push({
		labelKey: "triggers.actions.obs.param_source_splitter_scenes",
		value: "__scenes__",
		disabled: true,
		type: "scene",
		name: "__scene__",
	});
	//Add "current scene "item"
	list.push({
		labelKey: "triggers.actions.obs.param_source_currentScene",
		value: "scene_" + t("triggers.actions.obs.param_source_currentScene"),
		type: "scene",
		name: t("triggers.actions.obs.param_source_currentScene"),
	});
	//Add existing OBS scenes
	list = list.concat(
		props.obsScenes.map<SourceItem>((v) => {
			return {
				label: v.sceneName,
				value: "scene_" + v.sceneName,
				type: "scene",
				name: v.sceneName,
			};
		}),
	);
	//Get all OBS sources
	if (props.obsSources.length > 0) {
		list.push({
			labelKey: "triggers.actions.obs.param_source_splitter_sources",
			value: "__sources__",
			disabled: true,
			name: "__scene__",
			type: "source",
		});
		list = list.concat(
			props.obsSources.map<SourceItem>((v) => {
				return {
					label: v.sourceName,
					value: "source_" + v.sourceName,
					type: "source",
					name: v.sourceName,
				};
			}),
		);
	}

	//Get all OBS inputs.
	//Inputs are only really useful for a very specific case.
	//All inputs are also sources except for global audio devices defined on:
	//File => Settings => Audio => Global Audio Devices
	//If any is defined there they'll be listed in the inputs
	let inputs = JSON.parse(JSON.stringify(props.obsInputs)) as OBSInputItem[];
	//Dedupe entries as inputs are mostly sources
	inputs = inputs.filter((v) => {
		if (list.find((w) => w.name.toLowerCase() == v.inputName.toLowerCase())) return false;
		return true;
	});
	if (inputs.length > 0) {
		list.push({
			labelKey: "triggers.actions.obs.param_source_splitter_inputs",
			value: "__inputs__",
			disabled: true,
			name: "__input__",
			type: "input",
		});
		list = list.concat(
			inputs.map<SourceItem>((v) => {
				return {
					label: v.inputName,
					value: "input_" + v.inputName,
					type: "input",
					name: v.inputName,
				};
			}),
		);
	}

	//Add "select..." placeholder entry
	list.unshift({
		labelKey: "global.select_placeholder",
		value: "",
		name: "",
		type: "source",
	});
	param_source_conf.value.listValues = list;

	await onSourceChanged(true, cleanData);
}

/**
 * Called when selecting a new source
 * Loads filters associated to the given source to define
 * if the filters list should be displayed or not
 */
async function onSourceChanged(
	forceFilterEntry: boolean = false,
	cleanData: boolean = true,
): Promise<void> {
	filters.value = [];
	if (param_source_conf.value.value != "") {
		try {
			//the replace() is rather dirty... i made it so all items starts with their type, "source_xxx", "input_xxx", "scene_xxx"...
			filters.value = await OBSWebSocket.instance.getSourceFilters(
				param_source_conf.value.value.replace(/^[a-z]+_/gi, ""),
			);
		} catch (error) {
			filters.value = [];
		}
	}

	if (filters.value.length > 0 || props.action.filterName) {
		const list: TwitchatDataTypes.ParameterDataListValue<string>[] = (filters.value || []).map(
			(v) => {
				return { label: v.filterName, value: v.filterName };
			},
		);
		list.unshift({ labelKey: "triggers.actions.obs.param_filter_none", value: "" });
		//Add defined filter if missing from the list
		if (
			forceFilterEntry &&
			props.action.filterName &&
			!list.find((v) => v.value == props.action.filterName)
		) {
			list.push({ label: props.action.filterName, value: props.action.filterName });
		}
		param_filter_conf.value.value = props.action.filterName || list[0]!.value;
		if (list.length > 1 && props.action.obsAction != "screenshot") {
			param_filter_conf.value.listValues = list;
			param_source_conf.value.children = [param_filter_conf.value];
		} else {
			param_filter_conf.value.listValues = [];
			param_source_conf.value.children = [];
		}
	} else {
		param_source_conf.value.children = [];
	}
	updateFilter(cleanData);
}

/**
 * Called when selecting a filter
 * Updates the input's label or cleanup filter's name if any
 */
function updateFilter(cleanData: boolean = true): void {
	if (
		param_source_conf.value.children &&
		param_source_conf.value.children?.length > 0 &&
		param_filter_conf.value.value != ""
	) {
		param_sourceAction_conf.value.labelKey = "triggers.actions.obs.param_show_filter";
		props.action.filterName = param_filter_conf.value.value;
	} else {
		param_sourceAction_conf.value.labelKey = "triggers.actions.obs.param_sourceAction";
		delete props.action.filterName;
	}
	if (cleanData) updateActionsList();
}

/**
 * Updates available actions (show, hide, mute, unmute, replay, ...)
 */
function updateActionsList(): void {
	const values: TwitchatDataTypes.ParameterDataListValue<TriggerActionObsSourceDataAction>[] = [];
	const selectedItem = param_source_conf.value.selectedListValue as SourceItem | undefined;

	if (param_filter_conf.value.value == "") {
		if (selectedItem && selectedItem.type != "scene") {
			values.push({ labelKey: "triggers.actions.obs.param_action_show", value: "show" });
			values.push({ labelKey: "triggers.actions.obs.param_action_hide", value: "hide" });
			values.push({
				labelKey: "triggers.actions.obs.param_action_toggle_visibility",
				value: "toggle_visibility",
			});
			values.push({ labelKey: "triggers.actions.obs.param_action_mute", value: "mute" });
			values.push({
				labelKey: "triggers.actions.obs.param_action_unmute",
				value: "unmute",
			});
		}

		if (isMediaSource.value) {
			values.push({
				labelKey: "triggers.actions.obs.param_action_replay",
				value: "replay",
			});
			values.push({ labelKey: "triggers.actions.obs.param_action_stop", value: "stop" });
		}

		if (isMediaSource.value || isSlideshowSource.value) {
			values.push({ labelKey: "triggers.actions.obs.param_action_prev", value: "prev" });
			values.push({ labelKey: "triggers.actions.obs.param_action_next", value: "next" });
		}

		if (selectedItem && selectedItem.type == "scene") {
			values.push({
				labelKey: "triggers.actions.obs.param_action_scene_switch",
				value: "switch_to",
			});
		} else {
			values.push({ labelKey: "triggers.actions.obs.param_action_move", value: "move" });
			values.push({
				labelKey: "triggers.actions.obs.param_action_rotate",
				value: "rotate",
			});
			values.push({
				labelKey: "triggers.actions.obs.param_action_resize",
				value: "resize",
			});
		}
	} else {
		values.push({
			labelKey: "triggers.actions.obs.param_action_show_filter",
			value: "show",
		});
		values.push({
			labelKey: "triggers.actions.obs.param_action_hide_filter",
			value: "hide",
		});
		values.push({
			labelKey: "triggers.actions.obs.param_action_toggle_filter",
			value: "toggle_visibility",
		});
	}

	param_sourceAction_conf.value.listValues = values;
	param_sourceAction_conf.value.value = props.action.action;
	cleanupData();
}

/**
 * Cleanup useless data to avoid unexpected trigger execution behavior
 */
async function cleanupData(): Promise<void> {
	await nextTick(); //Leave it time to form field to be unmounted

	if (!canSetMediaPath.value) {
		param_media_conf.value.value = "";
		delete props.action.mediaPath;
	}

	if (!canWaitForMediaEnd.value) {
		param_mediaEndEvent_conf.value.value = false;
		delete props.action.waitMediaEnd;
	}
	if (!isTextSource.value) {
		param_text_conf.value.value = "";
		delete props.action.text;
	}
	if (!isBrowserSource.value) {
		param_url_conf.value.value = "";
		param_css_conf.value.value = "";
		delete props.action.url;
		delete props.action.browserSourceCss;
	}

	if (
		props.action.action == "move" ||
		props.action.action == "resize" ||
		props.action.action == "rotate"
	) {
		if (!props.action.animateEasing) props.action.animateEasing = "linear.none";
		if (!props.action.animateDuration) props.action.animateDuration = 500;
		if (!props.action.relativeTransform) props.action.relativeTransform = false;

		if (props.action.action == "move") {
			param_transformRelative_conf.value.labelKey =
				"triggers.actions.obs.param_relative_transform_move";
		} else if (props.action.action == "resize") {
			param_transformRelative_conf.value.labelKey =
				"triggers.actions.obs.param_relative_transform_resize";
		} else if (props.action.action == "rotate") {
			param_transformRelative_conf.value.labelKey =
				"triggers.actions.obs.param_relative_transform_rotate";
		}
	} else {
		delete props.action.animateEasing;
		delete props.action.animateDuration;
		delete props.action.relativeTransform;
	}

	if (props.action.obsAction != "createchapter") {
		delete props.action.recordChapterName;
	}

	if (props.action.obsAction == "screenshot") {
		if (!props.action.screenshotImgMode) props.action.screenshotImgMode = "save";
		if (!props.action.screenshotImgCustomSize) props.action.screenshotImgCustomSize = false;
	} else {
		delete props.action.screenshotImgFormat;
		delete props.action.screenshotImgWidth;
		delete props.action.screenshotImgHeight;
		delete props.action.screenshotImgCustomSize;
		delete props.action.screenshotImgMode;
		delete props.action.screenshotImgSavePath;
	}

	if (props.action.obsAction != "hotKey") {
		delete props.action.hotKeyAction;
	}
}

// Lifecycle

onBeforeMount(() => {
	if (props.action.obsAction == undefined) props.action.obsAction = "sources";
	if (props.action.action == undefined) props.action.action = "show";
	const defaultFormats = ["jpeg", "jpg", "png", "bmp"];
	param_screenImgFormat_conf.value.listValues = (
		OBSWebSocket.instance.versionInfo?.supportedImageFormats ?? defaultFormats
	).map((v) => {
		return { label: v, value: v };
	});
});

onMounted(async () => {
	const sourceNameBackup = props.action.sourceName;
	const actionBackup = props.action.action;
	param_screenImgSavePath_conf.value.errorMessage = t(
		"triggers.actions.obs.param_screenImgSavePath_conf_error",
	);
	param_colorToggle_conf.value.value = !!props.action.colorSource_color;

	// this.transformAnimate_conf.children = [this.transformEasing_conf, this.transformDuration_conf];

	const easing = tm("triggers.actions.obs.param_transform_animate_easing_list") as {
		[key: string]: string;
	};
	const easingList: TwitchatDataTypes.ParameterDataListValue<string>[] = [];
	for (const ease in easing) {
		easingList.push({ value: ease, label: easing[ease] });
	}
	param_transformEasing_conf.value.listValues = easingList;

	// this.transformEasing_conf.editCallback = (param) => this.action.animateEasing = param.value;
	// this.transformDuration_conf.editCallback = (param) => this.action.animateDuration = param.value;
	// this.transformEasing_conf.value = this.action.animateEasing ?? "sine.out";
	// this.transformDuration_conf.value = this.action.animateDuration ?? 0;

	//Prefill forms
	await prefillForm(false);

	const list = param_source_conf.value.listValues as SourceItem[];
	//If entry does not exist on the available items, push a fake
	//item to avoid losing it
	if (sourceNameBackup && !list.find((v) => v.name == sourceNameBackup)) {
		selectedSourceName.value = "source_" + sourceNameBackup;
		list.push({
			label: sourceNameBackup,
			value: selectedSourceName.value,
			name: sourceNameBackup,
			type: "source",
		});
	} else {
		const source = list.find((v: SourceItem) => v.value == "source_" + sourceNameBackup);
		const scene = list.find((v: SourceItem) => v.value == "scene_" + sourceNameBackup);
		const input = list.find((v: SourceItem) => v.value == "input_" + sourceNameBackup);
		selectedSourceName.value = (
			actionBackup == "switch_to"
				? scene?.value
				: source?.value || scene?.value || input?.value
		)!;
	}

	//Prefill may change the action during its build.
	//Force it to the actual requested value.
	//There must be a better way to handle this async issue but it's 5am
	//my brain is half-working I want to sleep T_T
	nextTick().then(() => {
		props.action.action = actionBackup;
	});

	const actionList: TwitchatDataTypes.ParameterDataListValue<TriggerActionObsDataAction>[] = [];
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_sources",
		value: "sources",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_startstream",
		value: "startstream",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_stopstream",
		value: "stopstream",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_startrecord",
		value: "startrecord",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_pauserecord",
		value: "pauserecord",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_resumerecord",
		value: "resumerecord",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_stoprecord",
		value: "stoprecord",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_createchapter",
		value: "createchapter",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_startvirtualcam",
		value: "startvirtualcam",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_stopvirtualcam",
		value: "stopvirtualcam",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_emitevent",
		value: "emitevent",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_hotkey",
		value: "hotKey",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_screenshot",
		value: "screenshot",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_getPersistedData",
		value: "getPersistedData",
	});
	actionList.push({
		labelKey: "triggers.actions.obs.param_obs_action_setPersistedData",
		value: "setPersistedData",
	});
	param_obsAction_conf.value.listValues = actionList;

	watch(
		() => props.action.obsAction,
		() => {
			onActionChange();
		},
	);
	watch(
		() => props.obsScenes,
		() => {
			prefillForm();
		},
		{ deep: true },
	);
	watch(
		() => props.obsInputs,
		() => {
			prefillForm();
		},
		{ deep: true },
	);
	watch(
		() => props.obsSources,
		() => {
			prefillForm();
		},
		{ deep: true },
	);
	watch(
		() => param_sourceAction_conf.value.value,
		() => cleanupData(),
	);
	watch(
		() => param_source_conf.value.value,
		() => onSourceChanged(),
	);
	watch(
		() => param_filter_conf.value.value,
		() => updateFilter(),
	);
	watch(
		() => selectedSourceName.value,
		() => {
			if (param_source_conf.value.selectedListValue) {
				props.action.sourceName = (
					param_source_conf.value.selectedListValue as SourceItem
				).name;
			} else {
				props.action.sourceName = "";
			}
		},
	);
	onActionChange();
});

interface SourceItem extends TwitchatDataTypes.ParameterDataListValue<string> {
	type: "scene" | "source" | "input";
	name: string;
}
</script>

<style scoped lang="less">
.triggeractionobsentry {
	.paramitem {
		:deep(select),
		:deep(input) {
			flex-basis: 250px;
		}
	}

	.copyBt {
		position: absolute;
		top: 0.25em;
		right: 0.25em;
		font-weight: 0.7em;
	}

	.typescript {
		position: relative;
	}

	.loading {
		height: 2em;
		margin: auto;
	}
}
</style>
