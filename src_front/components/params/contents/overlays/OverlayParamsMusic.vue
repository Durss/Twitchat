<template>
	<div class="overlayparamsmusic overlayParamsSection">
		<a
			href="https://www.youtube.com/playlist?list=PLJsQIzUbrDiEDuQ66YhtM6C8D3hZKL629"
			target="_blank"
			class="youtubeTutorialBt"
		>
			<Icon name="youtube" theme="light" />
			<span>{{ t("overlay.youtube_demo_tt") }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<section class="overlayInstallCard">
			<h1><Icon name="obs" />{{ t("bingo_grid.form.install_title") }}</h1>

			<OverlayInstaller type="music" :sourceTransform="{ width: 400, height: 100 }" />

			<ToggleBlock
				class="shrink"
				small
				:title="t('overlay.css_customization')"
				:open="false"
			>
				<div class="cssHead">{{ t("overlay.music_common.css") }}</div>
				<ul class="cssStructure">
					<li>#music_holder { ... }</li>
					<li>#music_cover { ... }</li>
					<li>#music_infos { ... }</li>
					<li>#music_title { ... }</li>
					<li>#music_artist { ... }</li>
					<li>#music_progress { ... }</li>
					<li>#music_progress_fill { ... }</li>
					<li>#music_info_custom_template { ... }</li>
				</ul>
			</ToggleBlock>
		</section>

		<section>
			<ParamItem
				:paramData="param_noScroll"
				v-model="storeMusic.musicPlayerParams.noScroll"
			/>
			<ParamItem
				:paramData="param_openFromLeft"
				v-model="storeMusic.musicPlayerParams.openFromLeft"
			/>
			<ParamItem
				:paramData="param_autoHide"
				v-model="storeMusic.musicPlayerParams.autoHide"
			/>
			<ParamItem
				:paramData="param_showCover"
				v-model="storeMusic.musicPlayerParams.showCover"
			/>
			<ParamItem
				:paramData="param_showArtist"
				v-model="storeMusic.musicPlayerParams.showArtist"
			/>
			<ParamItem
				:paramData="param_showTitle"
				v-model="storeMusic.musicPlayerParams.showTitle"
			/>
			<ParamItem
				:paramData="param_showProgress"
				v-model="storeMusic.musicPlayerParams.showProgressbar"
			/>
			<ParamItem
				:paramData="param_customTemplateToggle"
				v-model="param_customTemplateToggle.value"
			/>
		</section>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import DataStore from "@/store/DataStore";
import { storeMusic as useStoreMusic } from "@/store/music/storeMusic";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import SpotifyHelper from "@/utils/music/SpotifyHelper";
import { onBeforeMount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import OverlayInstaller from "./OverlayInstaller.vue";

const { t } = useI18n();
const storeMusic = useStoreMusic();

const param_noScroll = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "overlay.music_common.no_scroll",
});
const param_openFromLeft = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "overlay.music_common.open_from_left",
});
const param_autoHideErase = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "overlay.music_common.auto_hide_erase",
});
const param_showCover = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "overlay.music_common.show_cover",
});
const param_showArtist = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "overlay.music_common.show_artist",
});
const param_showTitle = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "overlay.music_common.show_title",
});
const param_showProgress = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "overlay.music_common.show_progress",
});
const param_customTemplate = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	labelKey: "overlay.music_common.custom_template",
});
const param_autoHide = ref<TwitchatDataTypes.ParameterData<boolean, unknown, boolean>>({
	type: "boolean",
	value: false,
	labelKey: "overlay.music_common.auto_hide",
});
const param_customTemplateToggle = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	type: "boolean",
	value: true,
	labelKey: "overlay.music_common.custom_template_toggle",
});

onBeforeMount(() => {
	param_customTemplate.value.placeholderList = [
		{ tag: "TITLE", descKey: "overlay.music_common.custom_template_placeholders.title" },
		{ tag: "ARTIST", descKey: "overlay.music_common.custom_template_placeholders.artist" },
		{ tag: "COVER", descKey: "overlay.music_common.custom_template_placeholders.cover" },
	];

	const params = storeMusic.musicPlayerParams as TwitchatDataTypes.MusicPlayerParamsData;
	param_autoHide.value.children = [param_autoHideErase.value];
	param_autoHideErase.value.value = params.erase;
	param_customTemplateToggle.value.children = [param_customTemplate.value];
	param_customTemplateToggle.value.value = params.customInfoTemplate?.length > 0;
	param_customTemplate.value.value = params.customInfoTemplate;

	watch(
		() => param_autoHideErase.value.value,
		() => {
			saveData();
		},
	);

	watch(
		() => storeMusic.musicPlayerParams,
		() => {
			saveData();
		},
		{ deep: true },
	);

	watch(
		() => param_customTemplateToggle.value.value,
		() => {
			saveData();
		},
	);

	watch(
		() => param_customTemplate.value.value,
		() => {
			saveData();
		},
	);
});

function saveData(): void {
	let template = param_customTemplate.value.value;
	if (!param_customTemplateToggle.value.value) template = "";
	storeMusic.musicPlayerParams.customInfoTemplate = template;
	storeMusic.musicPlayerParams.erase = param_autoHideErase.value.value;

	DataStore.set(DataStore.MUSIC_PLAYER_PARAMS, storeMusic.musicPlayerParams);
	//This forces overlay refresh
	SpotifyHelper.instance.getCurrentTrack();
}
</script>

<style scoped lang="less">
.overlayparamsmusic {
}
</style>
