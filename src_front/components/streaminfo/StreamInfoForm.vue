<template>
	<div class="streaminfo sidePanel" ref="rootEl">
		<div class="head">
			<h1 class="title"><Icon name="info" class="icon" />{{ t("stream.form_title") }}</h1>
			<ClearButton @click="close()" />
		</div>

		<div class="content">
			<transition name="scale">
				<div
					class="success card-item primary"
					v-if="updateSuccess"
					@click="updateSuccess = false"
				>
					{{ t("stream.update_done") }}
				</div>
			</transition>

			<div v-if="storeStream.streamInfoPreset.length > 0" class="presets">
				<VueDraggable
					class="list"
					v-model="storeStream.streamInfoPreset"
					:group="{ name: 'streamPresets' }"
					:animation="250"
					@end="storeStream.saveStreamInfoPreset()"
				>
					<div v-for="p in storeStream.streamInfoPreset" :key="p.id" class="preset">
						<TTButton
							class="button"
							@click="applyPreset(p)"
							v-tooltip="t('stream.preset_setBt_tt')"
							:loading="saving"
							>{{ p.name }}</TTButton
						>

						<TTButton
							class="button"
							@click="editPreset(p)"
							icon="edit"
							secondary
							v-tooltip="t('stream.preset_editBt_tt')"
						/>

						<TTButton
							class="button delete"
							@click="deletePreset(p)"
							icon="trash"
							alert
							v-tooltip="t('stream.preset_deleteBt_tt')"
						/>
					</div>
				</VueDraggable>
			</div>

			<Icon class="loader" name="loader" v-if="loading" />

			<div v-else class="form">
				<StreamInfoSubForm
					v-model:title="title"
					v-model:tags="tags"
					v-model:category="category"
					v-model:branded="branded"
					v-model:labels="labels"
				/>

				<ParamItem
					class="card-item save"
					:paramData="param_savePreset"
					v-model="param_savePreset.value"
					v-if="!presetEditing"
				/>

				<div class="actions">
					<TTButton
						class="submitBt"
						@click="cancelPresetEdit()"
						:loading="saving"
						alert
						v-if="presetEditing"
						>{{ t("global.cancel") }}</TTButton
					>
					<TTButton class="submitBt" @click="updateStreamInfo()" :loading="saving">{{
						presetEditing ? t("global.update") : t("global.submit")
					}}</TTButton>
				</div>

				<div class="card-item alert error" v-if="error" @click="error = ''">
					<Icon name="alert" />{{ error }}
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useConfirm } from "@/composables/useConfirm";
import { useSidePanel } from "@/composables/useSidePanel";
import StoreProxy from "@/store/StoreProxy";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import TTButton from "../TTButton.vue";
import ParamItem from "../params/ParamItem.vue";
import StreamInfoSubForm from "./StreamInfoSubForm.vue";
import { VueDraggable } from "vue-draggable-plus";

const emit = defineEmits<{
	close: [];
}>();

const rootEl = useTemplateRef<HTMLElement>("rootEl");
const { t } = useI18n();
const storeStream = useStoreStream();
const storeCommon = useStoreCommon();
const { confirm } = useConfirm();
const { close } = useSidePanel(rootEl, emit);

const param_savePreset = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	value: false,
	type: "boolean",
	labelKey: "stream.form_save_preset",
});
const param_namePreset = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	maxLength: 50,
	labelKey: "stream.form_save_preset_name",
	placeholderKey: "stream.form_save_preset_name_placeholder",
});

const title = ref("");
const error = ref("");
const tags = ref<string[]>([]);
const branded = ref(false);
const updateSuccess = ref(false);
const labels = ref<{ id: string; enabled: boolean }[]>([]);
const category = ref<TwitchDataTypes.StreamCategory | null>(null);

const saving = ref(false);
const loading = ref(true);
const forceOpenForm = ref(true);
const presetEditing = ref<TwitchatDataTypes.StreamInfoPreset | null>(null);

/**
 * Updates stream info when submitting form
 */
async function updateStreamInfo(): Promise<void> {
	saving.value = true;
	if (param_savePreset.value.value === true || presetEditing.value) {
		const preset: TwitchatDataTypes.StreamInfoPreset = {
			name: presetEditing.value?.name?.substring(0, 50) ?? param_namePreset.value.value,
			id: Utils.getUUID(),
			title: title.value,
		};
		preset.labels = labels.value;
		preset.branded = branded.value;
		if (category.value) preset.categoryID = category.value.id;
		if (tags.value.length > 0) preset.tags = tags.value.concat();
		if (presetEditing.value) preset.id = presetEditing.value.id;
		storeStream.saveStreamInfoPreset(preset);
	}
	//If not editing, update the stream info
	if (!presetEditing.value) {
		const channelId = StoreProxy.auth.twitch.user.id;
		try {
			if (
				await storeStream.updateStreamInfos(
					"twitch",
					channelId,
					title.value,
					category.value?.id ?? "",
					tags.value,
					branded.value,
					labels.value,
				)
			) {
				updateSuccess.value = true;
				window.setTimeout(() => {
					updateSuccess.value = false;
				}, 5000);
			} else {
				error.value = t("error.stream_info_updating");
			}
		} catch (err: any) {
			error.value =
				t("error.stream_info_updating") +
				"\n\n" +
				err.message.replace(/TagsRequest\.Tags /i, "");
		}
	} else {
		presetEditing.value = null;
		forceOpenForm.value = false;
	}
	saving.value = false;
	param_savePreset.value.value = false;
}

function cancelPresetEdit(): void {
	presetEditing.value = null;
	forceOpenForm.value = false;
}

/**
 * Delete specified preset
 * @param p
 */
async function deletePreset(p: TwitchatDataTypes.StreamInfoPreset): Promise<void> {
	confirm(t("stream.form_delete_confirm.title"), t("stream.form_delete_confirm.description"))
		.then(() => {
			storeStream.deleteStreamInfoPreset(p);
		})
		.catch(() => {});
}

/**
 * Edit a preset
 * @param p
 */
async function editPreset(p: TwitchatDataTypes.StreamInfoPreset): Promise<void> {
	loading.value = true;
	forceOpenForm.value = true;
	presetEditing.value = p;

	try {
		title.value = p.title;
		labels.value = p.labels || [];
		branded.value = p.branded === true;
		if (p.categoryID) {
			const game = await TwitchUtils.getCategoryByID(p.categoryID);
			game.box_art_url = game.box_art_url.replace("{width}", "52").replace("{height}", "72");
			category.value = game;
			if (p.tags) {
				tags.value = p.tags.concat();
			}
		}
	} catch (err) {
		storeCommon.alert(t("stream.stream_info_preset_edit"));
	}

	loading.value = false;
}

/**
 * Applies a preset
 * @param p
 */
async function applyPreset(p: TwitchatDataTypes.StreamInfoPreset): Promise<void> {
	saving.value = true;
	const channelId = StoreProxy.auth.twitch.user.id;
	try {
		if (
			await storeStream.updateStreamInfos(
				"twitch",
				channelId,
				p.title,
				p.categoryID as string,
				p.tags,
				p.branded,
				p.labels,
			)
		) {
			updateSuccess.value = true;
			window.setTimeout(() => {
				updateSuccess.value = false;
			}, 5000);
		} else {
			storeCommon.alert(t("error.stream_info_updating"));
		}
	} catch (err) {}
	saving.value = false;
	populate();
}

/**
 * Populate form with current stream info
 */
async function populate(): Promise<void> {
	loading.value = true;
	const channelId = StoreProxy.auth.twitch.user.id;
	let [streamInfos] = await TwitchUtils.getCurrentStreamInfo([channelId]);
	const result = await TwitchUtils.getChannelInfo([channelId]);
	const channelInfos = result[0];
	try {
		let titleVal: string = "";
		let gameId: string = "";
		let tagsVal: string[] = [];
		if (streamInfos) {
			titleVal = streamInfos.title;
			gameId = streamInfos.game_id;
			tagsVal = streamInfos.tags;
		} else if (channelInfos) {
			//Fallback to channel info if we're not live
			titleVal = channelInfos.title;
			gameId = channelInfos.game_id;
			tagsVal = channelInfos.tags;
		}
		title.value = titleVal;
		branded.value = channelInfos?.is_branded_content === true;
		labels.value =
			channelInfos?.content_classification_labels
				.filter((v) => v != "MatureGame")
				.map((v) => {
					return { id: v, enabled: true };
				}) || [];
		tags.value = tagsVal.concat();
		if (gameId) {
			const game = await TwitchUtils.getCategoryByID(gameId);
			game.box_art_url = game.box_art_url.replace("{width}", "52").replace("{height}", "72");
			category.value = game;
		}
	} catch (err) {
		console.log(err);
		storeCommon.alert(t("error.stream_info_loading"));
	}

	loading.value = false;
}

onMounted(() => {
	param_savePreset.value.children = [param_namePreset.value];
	populate();
});
</script>

<style scoped lang="less">
.streaminfo {
	.presets {
		width: 100%;
		text-align: center;
		.list {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
		}
		.preset {
			gap: 1px;
			display: inline-flex;
			flex-direction: row;
			.button {
				border-radius: 0;
			}
			.button:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			.button:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
			.button {
				:deep(.label) {
					white-space: break-spaces;
				}
			}
		}
	}

	.form {
		width: 100%;
	}

	.loader {
		width: 3em;
		margin: auto;
		display: block;
	}

	.actions {
		display: flex;
		gap: 1em;
		flex-direction: row;
		justify-content: center;
		margin-top: 0.5em;
	}

	.error {
		cursor: pointer;
		margin-top: 0.5em;
		text-align: center;
		white-space: pre-line;
		.icon {
			height: 1em;
			vertical-align: middle;
			margin-right: 0.5em;
		}
	}

	.success {
		flex-shrink: 0;
		text-align: center;
		cursor: pointer;
		&.scale-enter-active {
			transition: all 0.25s;
		}

		&.scale-leave-active {
			transition: all 0.25s;
		}

		&.scale-enter-from,
		&.scale-leave-to {
			height: 0;
			padding-top: 0;
			padding-bottom: 0;
			margin-top: 0;
			margin-bottom: -1em;
		}
	}

	.save {
		margin-top: 0.5em;
	}
}
</style>
