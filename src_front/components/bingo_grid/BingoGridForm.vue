<template>
	<div :class="classes" ref="rootEl" v-if="storeAuth.featureFlags.includes('bingo_grid')">
		<div class="head" v-if="embedMode === false">
			<ClearButton :aria-label="t('global.close')" @click="close()" />

			<h1 class="title">
				<Icon name="bingo_grid" class="icon" />{{ t("bingo_grid.form.title") }}
			</h1>

			<div class="description">{{ t("bingo_grid.form.description") }}</div>
		</div>

		<div class="content">
			<div class="overlayInstallCard">
				<h1><Icon name="obs" />{{ t("bingo_grid.form.install_title") }}</h1>
				<OverlayInstaller type="bingogrid" />
			</div>

			<ExtensionInstaller />

			<div class="card-item premium shareWithStreamer" v-if="storeAuth.isPremium">
				<h2><Icon name="user" />{{ t("bingo_grid.share_streamer.title") }}</h2>
				<div class="description" v-if="activeGrid">
					{{ t("bingo_grid.share_streamer.description", { GRID: activeGrid?.title }) }}
				</div>
				<SearchUserForm
					v-if="activeGrid"
					inline
					:excludedUserIds="[storeAuth.twitch.user.id]"
					:staticUserList="staticSearchList"
					:autofocus="false"
					@select="onShareSelect"
					@focus="searchFocused = true"
					@blur="searchFocused = false"
				/>
				<div class="noGrid" v-else>{{ t("bingo_grid.share_streamer.no_grid") }}</div>
			</div>

			<div class="card-item linkedList" v-if="linkedGrids.length > 0">
				<div class="linkedRow" v-for="bingo in linkedGrids" :key="bingo.id">
					<Icon name="bingo_grid" class="icon" />
					<div class="info">
						<span class="gridTitle">{{
							bingo.title || t("bingo_grid.form.default_title")
						}}</span>
						<span class="from">{{
							t("bingo_grid.share_streamer.from", {
								OWNER: bingo.remoteOwnerName,
							})
						}}</span>
					</div>
					<TTButton
						alert
						icon="trash"
						v-tooltip="t('bingo_grid.share_streamer.unlink_tt')"
						@click="storeBingoGrid.unlinkSharedGrid(bingo.id)"
					/>
				</div>

				<!-- Single style shared by ALL linked grids -->
				<ToggleBlock
					:icons="['overlay']"
					:title="t('bingo_grid.form.overlayParams_title')"
					:open="false"
					small
				>
					<div class="overlayParams">
						<ParamItem
							:paramData="linkedParam_textColor"
							v-model="storeBingoGrid.linkedGridStyle.textColor"
							@change="saveLinkedStyle()"
						/>
						<ParamItem
							:paramData="linkedParam_textSize"
							v-model="storeBingoGrid.linkedGridStyle.textSize"
							@change="saveLinkedStyle()"
						/>
						<ParamItem
							:paramData="linkedParam_showGrid"
							v-model="storeBingoGrid.linkedGridStyle.showGrid"
							@change="saveLinkedStyle()"
						/>
						<ParamItem
							:paramData="linkedParam_backgroundColor"
							v-model="storeBingoGrid.linkedGridStyle.backgroundColor"
							@change="saveLinkedStyle()"
						/>
						<ParamItem
							:paramData="linkedParam_backgroundAlpha"
							v-model="storeBingoGrid.linkedGridStyle.backgroundAlpha"
							@change="saveLinkedStyle()"
						/>
						<ParamItem
							:paramData="linkedParam_winSoundVolume"
							@change="(prevVal, newVal) => saveLinkedStyle(prevVal != newVal)"
							v-model="storeBingoGrid.linkedGridStyle.winSoundVolume"
						/>
						<ParamItem
							:paramData="linkedParam_autoHide"
							@change="saveLinkedStyle()"
							v-model="storeBingoGrid.linkedGridStyle.autoShowHide"
						/>
					</div>
				</ToggleBlock>

				<ParamItem
					:paramData="linkedParam_overlayAnnouncement"
					v-model="storeBingoGrid.linkedGridStyle.overlayAnnouncement"
					@change="saveLinkedStyle()"
				>
					<div class="parameter-child">
						<ToggleBlock
							:title="t('bingo_grid.form.param_overlayAnnouncement_permissions')"
							small
							:open="false"
							noTitle
						>
							<PermissionsForm
								v-model="
									storeBingoGrid.linkedGridStyle.overlayAnnouncementPermissions
								"
								@update:modelValue="saveLinkedStyle()"
							></PermissionsForm>
						</ToggleBlock>
					</div>
				</ParamItem>
			</div>

			<VueDraggable
				class="gridList"
				v-model="editableGrids"
				:group="{ name: 'bingo_grids' }"
				handle=".header"
				:animation="250"
			>
				<ToggleBlock
					v-for="bingo in editableGrids"
					editableTitle
					v-model:title="bingo.title"
					:titleDefault="t('bingo_grid.form.default_title')"
					:titleMaxLengh="30"
					:open="false"
					:key="bingo.id"
					:disabled="!bingo.enabled"
					@update:title="save(bingo, true)"
				>
					<template #left_actions>
						<ToggleButton
							small
							v-model="bingo.enabled"
							@click.stop
							@change="save(bingo, true)"
							:disabled="!storeAuth.isPremium && storeBingoGrid.gridList.length > 1"
						/>
					</template>

					<template #right_actions>
						<TTButton
							@click.stop="duplicateGrid(bingo.id)"
							data-close-popout
							icon="copy"
							v-tooltip="t('global.duplicate')"
							v-if="!maxGridReached"
						/>
						<TTButton
							@click.stop
							:copy="bingo.id"
							icon="id"
							v-tooltip="$t('global.copy_id')"
						/>
						<TTButton
							@click.stop="storeBingoGrid.removeGrid(bingo.id)"
							icon="trash"
							alert
						/>
					</template>

					<div class="form">
						<ToggleBlock
							:icons="['overlay']"
							:title="t('bingo_grid.form.overlayParams_title')"
							:open="false"
							small
						>
							<div class="overlayParams">
								<ParamItem
									:paramData="param_textColor[bingo.id]!"
									v-model="bingo.textColor"
									@change="save(bingo)"
								/>

								<ParamItem
									:paramData="param_textSize[bingo.id]!"
									v-model="bingo.textSize"
									@change="save(bingo)"
								/>

								<ParamItem
									:paramData="param_showGrid[bingo.id]!"
									v-model="bingo.showGrid"
									@change="save(bingo)"
								/>

								<ParamItem
									:paramData="param_backgroundColor[bingo.id]!"
									v-model="bingo.backgroundColor"
									@change="save(bingo)"
								/>

								<ParamItem
									:paramData="param_backgroundAlpha[bingo.id]!"
									v-model="bingo.backgroundAlpha"
									@change="save(bingo)"
								/>

								<ParamItem
									:paramData="param_winSoundVolume[bingo.id]!"
									@change="
										(prevVal, newVal) => save(bingo, false, prevVal != newVal)
									"
									v-model="bingo.winSoundVolume"
								></ParamItem>

								<ParamItem
									:paramData="param_autoHide[bingo.id]!"
									@change="save(bingo)"
									v-model="bingo.autoShowHide"
								></ParamItem>
							</div>
						</ToggleBlock>

						<div class="card-item sizes">
							<label>
								<Icon name="scale" />
								<span>{{ t("bingo_grid.form.param_size") }}</span>
							</label>
							<div class="forms">
								<ParamItem
									:paramData="param_cols[bingo.id]!"
									v-model="bingo.cols"
									@change="save(bingo, true)"
									noBackground
								/>
								<Icon name="cross" />
								<ParamItem
									:paramData="param_rows[bingo.id]!"
									v-model="bingo.rows"
									@change="save(bingo, true)"
									noBackground
								/>
							</div>
						</div>

						<VueDraggable
							class="card-item entryList"
							v-model="bingo.entries"
							filter=".locked"
							@start="onSortStart(bingo)"
							@end="onSortEnd(bingo)"
							:animation="250"
							:group="{ name: bingo.id + '_cell_entries' }"
						>
							<TransitionGroup name="flip-list">
								<div
									v-for="element in bingo.entries"
									:key="element.id"
									:class="getEntryClasses(element)"
									:style="{
										width: 'calc(' + (1 / bingo.cols) * 100 + '% - 3px)',
									}"
									@click="focusLabel(element.id)"
								>
									<ContentEditable
										class="cell"
										tag="div"
										v-model="element.label"
										:contenteditable="true"
										:no-html="true"
										:no-nl="false"
										:ref="(el: any) => setLabelRef(element.id, el)"
										:maxLength="60"
										@blur="save(bingo, true)"
									/>

									<ClearButton
										class="lockBt"
										v-tooltip="t('bingo_grid.form.lock_bt_tt')"
										:icon="element.lock ? 'lock' : 'unlock'"
										@click.stop="element.lock = !element.lock"
									></ClearButton>

									<ClearButton
										class="moveBt"
										icon="move"
										v-if="!element.lock"
									></ClearButton>
								</div>
							</TransitionGroup>

							<div class="ctas">
								<TTButton
									@click="storeBingoGrid.shuffleGrid(bingo.id)"
									icon="dice"
									>{{ t("bingo_grid.form.shuffle_bt") }}</TTButton
								>
								<TTButton
									@click="storeBingoGrid.resetCheckStates(bingo.id)"
									icon="refresh"
									>{{ t("bingo_grid.form.reset_bt") }}</TTButton
								>
								<TTButton
									@click="storeBingoGrid.resetLabels(bingo.id)"
									icon="trash"
									alert
									>{{ t("bingo_grid.form.clear_labels_bt") }}</TTButton
								>
							</div>
						</VueDraggable>

						<ParamItem :paramData="param_additional_cells[bingo.id]!">
							<template #custom
								><TTButton @click="storeBingoGrid.addCustomCell(bingo.id)">{{
									t("bingo_grid.form.add_cellBt")
								}}</TTButton></template
							>
							<div class="additionalItemList">
								<div
									class="additionalItem"
									v-for="item in bingo.additionalEntries || []"
									:key="item.id"
								>
									<TTButton
										@click="storeBingoGrid.removeCustomCell(bingo.id, item.id)"
										alert
										icon="trash"
									/>

									<ContentEditable
										class="label"
										tag="div"
										v-model="item.label"
										:contenteditable="true"
										:no-html="true"
										:no-nl="false"
										:maxLength="60"
										@blur="save(bingo, true)"
									/>
								</div>
							</div>
						</ParamItem>

						<ParamItem
							:paramData="param_overlayAnnouncement[bingo.id]!"
							v-model="bingo.overlayAnnouncement"
							@change="save(bingo)"
						>
							<div class="parameter-child">
								<ToggleBlock
									:title="
										t('bingo_grid.form.param_overlayAnnouncement_permissions')
									"
									small
									:open="false"
									noTitle
								>
									<PermissionsForm
										v-model="bingo.overlayAnnouncementPermissions"
									></PermissionsForm>
								</ToggleBlock>
							</div>
						</ParamItem>

						<ParamItem
							:paramData="param_chatAnnouncementEnabled[bingo.id]!"
							v-model="bingo.chatAnnouncementEnabled"
							@change="save(bingo)"
						>
							<div class="parameter-child">
								<ParamItem
									:paramData="param_chatAnnouncement[bingo.id]!"
									v-model="bingo.chatAnnouncement"
									noBackground
									@change="
										save(bingo);
										renderPreview(bingo.id, bingo.chatAnnouncement);
									"
									@focus="
										param_showMessage[bingo.id] = true;
										renderPreview(bingo.id, bingo.chatAnnouncement);
									"
									@blur="param_showMessage[bingo.id] = false"
								>
									<div
										class="parameter-child preview"
										v-if="param_showMessage[bingo.id]!"
									>
										<ChatMessage
											class="message"
											lightMode
											contextMenuOff
											:messageData="param_messagePreview[bingo.id]!"
										/>
									</div>
								</ParamItem>
							</div>
						</ParamItem>
					</div>
				</ToggleBlock>
			</VueDraggable>

			<div class="createForm">
				<TTButton class="addBt" v-if="!maxGridReached" @click="addGrid()" icon="add">{{
					t("bingo_grid.form.add_bt")
				}}</TTButton>

				<PremiumLimitMessage
					v-else
					label="bingo_grid.form.non_premium_limit"
					premiumLabel="bingo_grid.form.premium_limit"
					:max="$config.MAX_BINGO_GRIDS"
					:maxPremium="$config.MAX_BINGO_GRIDS_PREMIUM"
				/>
			</div>
		</div>
	</div>
	<Overlay404 v-else />
</template>

<script setup lang="ts">
import ContentEditable from "@/components/ContentEditable.vue";
import { asset } from "@/composables/useAsset";
import { useSidePanel } from "@/composables/useSidePanel";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeBingoGrid as useStoreBingoGrid } from "@/store/bingo_grid/storeBingoGrid";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { type TriggerActionBingoGridData, type TriggerData } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import {
	computed,
	nextTick,
	onBeforeMount,
	ref,
	useTemplateRef,
	watch,
	type ComponentPublicInstance,
} from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import PermissionsForm from "../PermissionsForm.vue";
import SearchUserForm from "../SearchUserForm.vue";
import TTButton from "../TTButton.vue";
import ToggleBlock from "../ToggleBlock.vue";
import ToggleButton from "../ToggleButton.vue";
import ChatMessage from "../messages/ChatMessage.vue";
import ParamItem from "../params/ParamItem.vue";
import PremiumLimitMessage from "../params/PremiumLimitMessage.vue";
import ExtensionInstaller from "../params/contents/overlays/ExtensionInstaller.vue";
import Overlay404 from "../params/contents/overlays/Overlay404.vue";
import OverlayInstaller from "../params/contents/overlays/OverlayInstaller.vue";

const props = withDefaults(
	defineProps<{
		//This is used by the trigger action form.
		action?: TriggerActionBingoGridData;
		triggerData?: TriggerData;
		embedMode?: boolean;
	}>(),
	{
		embedMode: false,
	},
);

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { getAsset } = asset();
const storeAuth = useStoreAuth();
const storeBingoGrid = useStoreBingoGrid();
const storeStream = useStoreStream();
const rootEl = useTemplateRef<HTMLElement>("rootEl");
const { close } = useSidePanel(rootEl, () => emit("close"), props.embedMode === false);

const param_cols = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_rows = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_backgroundColor = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_backgroundAlpha = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_textColor = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_textSize = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_showGrid = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_chatCmd = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_chatCmd_toggle = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_heat_toggle = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_additional_cells = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_winSoundVolume = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_autoHide = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_chatAnnouncement = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_chatAnnouncementEnabled = ref<{
	[key: string]: TwitchatDataTypes.ParameterData<boolean>;
}>({});
const param_overlayAnnouncement = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>(
	{},
);
const param_messagePreview = ref<{ [key: string]: TwitchatDataTypes.MessageChatData }>({});
const param_showMessage = ref<{ [key: string]: boolean }>({});

//Single set of params for the style shared by ALL linked (shared-to-us) grids.
const linkedParam_textColor = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "color",
	value: "#ffffff",
	labelKey: "bingo_grid.form.param_text_color",
	icon: "color",
});
const linkedParam_textSize = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 20,
	min: 2,
	max: 100,
	labelKey: "bingo_grid.form.param_text_size",
	icon: "fontSize",
});
const linkedParam_showGrid = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "bingo_grid.form.param_show_grid",
	icon: "show",
});
const linkedParam_backgroundColor = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "color",
	value: "#000000",
	labelKey: "bingo_grid.form.param_background_color",
	icon: "color",
});
const linkedParam_backgroundAlpha = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 45,
	min: 0,
	max: 100,
	labelKey: "bingo_grid.form.param_background_alpha",
	icon: "color",
});
const linkedParam_winSoundVolume = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 100,
	min: 0,
	max: 100,
	step: 10,
	labelKey: "bingo_grid.form.param_winSoundVolume",
	icon: "volume",
});
const linkedParam_autoHide = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "bingo_grid.form.param_autoHide",
	icon: "show",
});
const linkedParam_overlayAnnouncement = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "bingo_grid.form.param_overlayAnnouncement",
	icon: "announcement",
	premiumOnly: true,
});
const isDragging = ref(false);
const searchFocused = ref(false);
const liveFollingList = ref<TwitchDataTypes.UserInfo[]>([]);

const labelRefs: Record<string, ComponentPublicInstance> = {};
const lockedItems: {
	[key: string]: {
		index: number;
		data: TwitchatDataTypes.BingoGridConfig["entries"][number];
	}[];
} = {};

function getEntryClasses(col: TwitchatDataTypes.BingoGridConfig["entries"][number]) {
	let res: string[] = ["entry"];
	if (col.lock) res.push("locked");
	return res;
}
const classes = computed<string[]>(() => {
	const res = ["bingoform", "sidePanel"];
	if (props.embedMode !== false) res.push("embedMode");
	return res;
});

const staticSearchList = computed(() => {
	return searchFocused.value ? liveFollingList.value : undefined;
});

/**
 * Editable (non-shared) grids. The VueDraggable binds to this so shared grids
 * are never reordered/persisted with the user's own grids.
 */
const editableGrids = computed<TwitchatDataTypes.BingoGridConfig[]>({
	get() {
		return storeBingoGrid.gridList.filter((g) => !g.remoteOwnerId);
	},
	set(list) {
		const linked = storeBingoGrid.gridList.filter((g) => g.remoteOwnerId);
		storeBingoGrid.gridList = [...list, ...linked];
		void storeBingoGrid.saveData();
	},
});

/**
 * Grids shared TO this user by another streamer (rendered as read-only rows
 * with editable overlay params).
 */
const linkedGrids = computed<TwitchatDataTypes.BingoGridConfig[]>(() =>
	storeBingoGrid.gridList.filter((g) => g.remoteOwnerId),
);

//A shared grid can be accepted (via SSE) while the form is open. Make sure its
//overlay params get initialized so they can be customized.
watch(
	() => linkedGrids.value.length,
	() => initParams(),
);

/**
 * The currently enabled own grid that the share field will share.
 */
const activeGrid = computed<TwitchatDataTypes.BingoGridConfig | undefined>(() =>
	storeBingoGrid.gridList.find((g) => g.enabled && !g.remoteOwnerId),
);

function onShareSelect(user: TwitchDataTypes.UserInfo): void {
	if (!activeGrid.value) return;
	void storeBingoGrid.shareGrid(activeGrid.value.id, user);
}

const maxGridReached = computed<boolean>(() => {
	const count = editableGrids.value.length;
	if (storeAuth.isPremium) {
		return count >= Config.instance.MAX_BINGO_GRIDS_PREMIUM;
	} else {
		return count >= Config.instance.MAX_BINGO_GRIDS;
	}
});

function setLabelRef(id: string, el: ComponentPublicInstance | null): void {
	if (el) {
		labelRefs[id] = el;
	} else {
		delete labelRefs[id];
	}
}

onBeforeMount(() => {
	initParams();
	if (!storeAuth.isPremium && storeBingoGrid.gridList.filter((v) => v.enabled).length === 0) {
		storeBingoGrid.gridList[0]!.enabled = true;
	}
});

/**
 * Save data to storage
 */
function save(
	grid: TwitchatDataTypes.BingoGridConfig,
	broadcastUpdate: boolean = false,
	playWinSound: boolean = false,
): void {
	if (param_chatCmd_toggle.value[grid.id]!.value && !grid.chatCmd) {
		grid.chatCmd = "!bingo";
	}
	if (!param_chatCmd_toggle.value[grid.id]!.value) {
		delete grid.chatCmd;
	}
	storeBingoGrid.saveData(grid.id, undefined, broadcastUpdate);

	if (playWinSound && grid.winSoundVolume) {
		const audio = new Audio(getAsset("sounds/win.mp3"));
		audio.volume = param_winSoundVolume.value[grid.id]!.value / 100;
		audio.play();
	}
}

/**
 * Persists the global linked-grid style and applies it to all linked grids.
 */
function saveLinkedStyle(playWinSound: boolean = false): void {
	storeBingoGrid.saveLinkedGridStyle();

	if (playWinSound && storeBingoGrid.linkedGridStyle.winSoundVolume) {
		const audio = new Audio(getAsset("sounds/win.mp3"));
		audio.volume = storeBingoGrid.linkedGridStyle.winSoundVolume / 100;
		audio.play();
	}
}

/**
 * Create a new grid
 */
function addGrid(): void {
	storeBingoGrid.addGrid();
	initParams();
}

/**
 * Duplicate given grid ID
 */
function duplicateGrid(id: string): void {
	storeBingoGrid.duplicateGrid(id);
	initParams();
}

/**
 * Called after sorting items
 */
function onSortEnd(grid: TwitchatDataTypes.BingoGridConfig): void {
	isDragging.value = false;
	let items = grid.entries.filter((v) => v.lock !== true);
	lockedItems[grid.id]!.forEach((item) => {
		items.splice(item.index, 0, item.data);
	});
	grid.entries = items;
	save(grid);
}

/**
 * Called when starting to sort items
 */
function onSortStart(grid: TwitchatDataTypes.BingoGridConfig): void {
	isDragging.value = true;
	const entries = grid.entries;
	lockedItems[grid.id] = [];
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i]!;
		if (entry.lock === true) {
			lockedItems[grid.id]!.push({
				index: i,
				data: entry,
			});
		}
	}
}

/**
 * Called when clicking a cell to reroute focus to editable element
 */
function focusLabel(id: string): void {
	(labelRefs[id]!.$el as HTMLElement).focus();
}

async function renderPreview(id: string, rawMessage: string): Promise<void> {
	const prevState = param_showMessage.value[id]!;
	param_showMessage.value[id] = false;
	await nextTick();
	let announcementColor: "primary" | "purple" | "blue" | "green" | "orange" | undefined =
		undefined;
	if (rawMessage.indexOf("/announce") == 0) {
		announcementColor = rawMessage.replace(/\/announce([a-z]+)?\s.*/i, "$1") as
			| "primary"
			| "purple"
			| "blue"
			| "green"
			| "orange";
		rawMessage = rawMessage.replace(/\/announce([a-z]+)?\s(.*)/i, "$2");
	}

	rawMessage = rawMessage.replace(
		/\{WINNERS\}/gi,
		param_chatAnnouncement.value[id]!.placeholderList![0]!.example!,
	);

	const chunks = TwitchUtils.parseMessageToChunks(rawMessage, undefined, true);
	const message_html = TwitchUtils.messageChunksToHTML(chunks);

	param_messagePreview.value[id]!.message = rawMessage;
	param_messagePreview.value[id]!.message_chunks = chunks;
	param_messagePreview.value[id]!.message_html = message_html;
	param_messagePreview.value[id]!.twitch_announcementColor = announcementColor;
	param_showMessage.value[id] = prevState;
}

/**
 * Loads currently live following for fast channel access
 */
async function loadLiveFollowing(): Promise<void> {
	liveFollingList.value = [];
	const list = await TwitchUtils.getActiveFollowedStreams();
	liveFollingList.value = await TwitchUtils.getUserInfo(list.map((v) => v.user_id));
}

if (storeAuth.isPremium) {
	try {
		loadLiveFollowing();
	} catch (_) {
		// ignore
	}
}

/**
 * Create parameters for a bingo entry
 */
function initParams(): void {
	storeBingoGrid.gridList.forEach((entry) => {
		const id = entry.id;
		if (param_cols.value[id]) return;

		const winnersPlaceholder: TwitchatDataTypes.PlaceholderEntry[] = [
			{
				tag: "WINNERS",
				descKey: "bingo_grid.form.winners_placeholder",
				example: "Twitch (x1) ▬ Durss (x4) ▬ TwitchFR (x2)",
			},
		];

		param_cols.value[id] = { type: "number", value: 5, min: 2, max: 10 };
		param_rows.value[id] = { type: "number", value: 5, min: 2, max: 10 };
		param_backgroundColor.value[id] = {
			type: "color",
			value: "#000000",
			labelKey: "bingo_grid.form.param_background_color",
			icon: "color",
		};
		param_backgroundAlpha.value[id] = {
			type: "slider",
			value: 0,
			min: 0,
			max: 100,
			labelKey: "bingo_grid.form.param_background_alpha",
			icon: "color",
		};
		param_textSize.value[id] = {
			type: "number",
			value: 30,
			min: 2,
			max: 100,
			labelKey: "bingo_grid.form.param_text_size",
			icon: "fontSize",
		};
		param_textColor.value[id] = {
			type: "color",
			value: "#000000",
			labelKey: "bingo_grid.form.param_text_color",
			icon: "color",
		};
		param_showGrid.value[id] = {
			type: "boolean",
			value: false,
			labelKey: "bingo_grid.form.param_show_grid",
			icon: "show",
		};
		param_autoHide.value[id] = {
			type: "boolean",
			value: true,
			labelKey: "bingo_grid.form.param_autoHide",
			icon: "show",
		};
		param_chatCmd.value[id] = {
			type: "string",
			value: "",
			maxLength: 20,
			labelKey: "bingo_grid.form.param_chat_cmd",
			icon: "chatCommand",
		};
		param_chatCmd_toggle.value[id] = {
			type: "boolean",
			value: entry.chatCmd != undefined,
			labelKey: "bingo_grid.form.param_chat_cmd_enabled",
			icon: "show",
		};
		param_heat_toggle.value[id] = {
			type: "boolean",
			value: false,
			labelKey: "bingo_grid.form.param_heat_enabled",
			icon: "heat",
		};
		param_additional_cells.value[id] = {
			type: "custom",
			value: true,
			labelKey: "bingo_grid.form.param_additional_cells",
			icon: "add",
		};
		param_winSoundVolume.value[id] = {
			type: "slider",
			value: 100,
			min: 0,
			max: 100,
			step: 10,
			labelKey: "bingo_grid.form.param_winSoundVolume",
			icon: "volume",
		};
		param_chatAnnouncement.value[id] = {
			type: "string",
			value: "",
			longText: true,
			labelKey: "bingo_grid.form.param_chatAnnouncement",
			icon: "whispers",
			placeholderList: winnersPlaceholder,
		};
		param_chatAnnouncementEnabled.value[id] = {
			type: "boolean",
			value: storeAuth.isPremium,
			labelKey: "bingo_grid.form.param_chatAnnouncementEnabled",
			icon: "announcement",
			premiumOnly: true,
		};
		param_overlayAnnouncement.value[id] = {
			type: "boolean",
			value: storeAuth.isPremium,
			labelKey: "bingo_grid.form.param_overlayAnnouncement",
			icon: "announcement",
			premiumOnly: true,
		};

		const me = storeAuth.twitch.user;
		param_messagePreview.value[id] = {
			id: Utils.getUUID(),
			date: Date.now(),
			channel_id: me.id,
			platform: "twitch",
			type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			answers: [],
			user: me,
			is_short: false,
			message: "",
			message_chunks: [],
			message_html: "",
			message_size: 0,
		};
	});
}
</script>

<style scoped lang="less">
.bingoform {
	min-width: 330px !important;

	.createForm {
		text-align: center;
	}

	.gridList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.shareWithStreamer {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		background-color: var(--color-premium-fadest);
		color: var(--color-text);
		h2 {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			.icon {
				height: 1em;
			}
		}
		.description {
			font-size: 0.8em;
			text-align: center;
		}
		.noGrid {
			font-style: italic;
			text-align: center;
			opacity: 0.7;
			font-size: 0.9em;
		}
	}

	.linkedList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		background-color: var(--background-color-primary);
		padding: 0.5em;
		.linkedRow {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			.icon {
				height: 1.5em;
				flex-shrink: 0;
			}
			.info {
				display: flex;
				flex-direction: column;
				flex-grow: 1;
				overflow: hidden;
				.gridTitle {
					font-weight: bold;
				}
				.from {
					font-size: 0.8em;
					opacity: 0.8;
				}
			}
		}
	}

	.entryList {
		width: 100%;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 3px;
		.entry {
			display: block;
			aspect-ratio: 1/1;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			background-color: var(--grayout-fader);
			border-radius: var(--border-radius);
			position: relative;
			cursor: text;
			.cell {
				text-align: center;
				width: 100%;
			}
			.lockBt {
				position: absolute;
				top: 0;
				right: 0;
				padding: 0.25em;
				display: none;
				&:hover {
					background-color: var(--background-color-fader);
					border-bottom-left-radius: var(--border-radius);
				}
			}
			.moveBt {
				position: absolute;
				top: 0;
				left: 0;
				right: auto;
				padding: 0.25em;
				display: none;
				&:hover {
					background-color: var(--background-color-fader);
					border-bottom-right-radius: var(--border-radius);
				}
			}
			&:hover {
				.lockBt,
				.moveBt {
					display: block;
				}
			}

			&.locked {
				@c1: var(--grayout-fadest);
				@c2: transparent;
				background-color: @c2;
				background-image: repeating-linear-gradient(
					-45deg,
					@c1,
					@c1 20px,
					@c2 20px,
					@c2 40px
				);
			}
		}
	}

	.sizes {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		.icon {
			height: 1em;
		}
		label {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			align-items: center;
		}
		.forms {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			align-items: center;
		}
	}

	.ctas {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		margin-top: 0.5em;
		width: 100%;
		align-items: center;
	}

	.flip-list-move {
		transition: all 0.25s;
	}
	.flip-list-leave-to {
		display: none !important;
	}

	.parameter-child {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		.icon {
			height: 1em;
			margin-right: 0.5em;
		}
	}

	.preview {
		background-color: var(--grayout);
		padding: 0.25em;
		border-radius: var(--border-radius);
	}

	.additionalItemList {
		margin-top: 0.5em;
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		.additionalItem {
			display: flex;
			flex-direction: row;
			.label {
				padding: 0.25em;
				width: 100%;
				background-color: var(--grayout);
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
				text-align: center;
			}
			.button {
				flex-shrink: 0;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
		}
	}

	.overlayParams {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
	}
}
</style>
