<template>
	<div class="triggeractioncustombadge triggerActionForm">
		<ParamItem :paramData="param_userSource" v-model="props.action.customBadgeUserSource" />

		<div class="card-item">
			<div class="list" v-if="storeUsers.customBadgeList.length > 0">
				<CustomBadgeSelector
					noTooltip
					v-tooltip="t('triggers.actions.customBadge.param_add_badgeBt')"
				/>
				<draggable
					class="group"
					v-model="storeUsers.customBadgeList"
					:group="{ name: 'badge', pull: 'clone', put: false }"
					item-key="id"
					ghost-class="ghost"
					direction="horizontal"
					:animation="250"
				>
					<template
						#item="{
							element,
							index,
						}: {
							element: { id: string; img: string };
							index: number;
						}"
					>
						<button class="badge" :key="element.id">
							<img :src="element.img" />
						</button>
					</template>
				</draggable>
			</div>
			<div class="list" v-else>
				<CustomBadgeSelector
					noTooltip
					v-tooltip="t('triggers.actions.customBadge.param_add_badgeBt')"
				/>
			</div>

			<div class="targets">
				<div class="col">
					<div class="head">
						<Icon name="cross" theme="alert" />
						<span>{{ t("triggers.actions.customBadge.badge_to_del") }}</span>
					</div>
					<div class="dropZone">
						<div class="placeholder" v-if="badgesDel.length == 0">
							{{ t("triggers.actions.customBadge.no_badge") }}
						</div>
						<draggable
							class="group"
							group="badge"
							item-key="id"
							ghost-class="ghost"
							direction="horizontal"
							:animation="250"
							v-model="badgesDel"
							@change="listUpdate(badgesDel)"
						>
							<template
								#item="{
									element,
									index,
								}: {
									element: { id: string; img: string };
									index: number;
								}"
							>
								<button class="badge" @click="removeBadge(badgesDel, index)">
									<img :src="element.img" />
								</button>
							</template>
						</draggable>
					</div>
				</div>

				<div class="col">
					<div class="head">
						<Icon name="add" />
						<span>{{ t("triggers.actions.customBadge.badge_to_add") }}</span>
					</div>
					<div class="dropZone">
						<div class="placeholder" v-if="badgesAdd.length == 0">
							{{ t("triggers.actions.customBadge.no_badge") }}
						</div>
						<draggable
							class="group"
							group="badge"
							item-key="id"
							ghost-class="ghost"
							direction="horizontal"
							:animation="250"
							v-model="badgesAdd"
							@change="listUpdate(badgesAdd)"
						>
							<template
								#item="{
									element,
									index,
								}: {
									element: { id: string; img: string };
									index: number;
								}"
							>
								<button class="badge" @click="removeBadge(badgesAdd, index)">
									<img :src="element.img" />
								</button>
							</template>
						</draggable>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import CustomBadgeSelector from "@/components/user/CustomBadgeSelector.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import {
	COUNTER_EDIT_SOURCE_CHATTERS,
	COUNTER_EDIT_SOURCE_EVERYONE,
	COUNTER_EDIT_SOURCE_SENDER,
	COUNTER_VALUE_PLACEHOLDER_PREFIX,
	type ITriggerPlaceholder,
	type TriggerCustomBadgesData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";

const props = defineProps<{
	action: TriggerCustomBadgesData;
	triggerData: TriggerData;
}>();

const { t } = useI18n();
const storeUsers = useStoreUsers();

const param_userSource = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "list",
	value: "",
	labelKey: "triggers.actions.customBadge.param_user",
});
const badgesAdd = ref<TwitchatDataTypes.TwitchatCustomUserBadge[]>([]);
const badgesDel = ref<TwitchatDataTypes.TwitchatCustomUserBadge[]>([]);

const userPLaceholders = ref<ITriggerPlaceholder<any>[]>([]);

/**
 * Build user trigger source list
 */
const userSourceOptions = computed((): TwitchatDataTypes.ParameterDataListValue<string>[] => {
	const res: TwitchatDataTypes.ParameterDataListValue<string>[] = [
		//Add static sources "sender" and "everyone"
		{
			labelKey: "triggers.actions.customBadge.user_source_sender",
			value: COUNTER_EDIT_SOURCE_SENDER,
		},
		{
			labelKey: "triggers.actions.customBadge.user_source_chatters",
			value: COUNTER_EDIT_SOURCE_CHATTERS,
		},
		{
			labelKey: "triggers.actions.customBadge.user_source_everyone",
			value: COUNTER_EDIT_SOURCE_EVERYONE,
		},
	];

	//Add command's placeholders
	if (props.triggerData.chatCommandParams) {
		props.triggerData.chatCommandParams.forEach((v) => {
			res.push({
				label: t("triggers.actions.count.user_source_placeholder", {
					PLACEHOLDER: v.tag.toUpperCase(),
				}),
				value: v.tag,
			});
		});
	}

	//Add global placeholders that may contain a user name
	userPLaceholders.value
		.filter((v) => v.tag.indexOf(COUNTER_VALUE_PLACEHOLDER_PREFIX) == -1)
		.forEach((v) => {
			res.push({
				label: t("triggers.actions.count.user_source_placeholder", {
					PLACEHOLDER: v.tag.toUpperCase(),
				}),
				value: v.tag,
			});
		});
	return res;
});

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);

if (!props.action.customBadgeAdd) props.action.customBadgeAdd = [];
if (!props.action.customBadgeDel) props.action.customBadgeDel = [];
if (!props.action.customBadgeUserSource)
	props.action.customBadgeUserSource = COUNTER_EDIT_SOURCE_SENDER;

badgesAdd.value = props.action.customBadgeAdd
	.map((v) => {
		return {
			id: v,
			img: storeUsers.customBadgeList.find((w) => w.id === v)?.img || "",
		};
	})
	.filter((v) => v.img != "");

badgesDel.value = props.action.customBadgeDel
	.map((v) => {
		return {
			id: v,
			img: storeUsers.customBadgeList.find((w) => w.id === v)?.img || "",
		};
	})
	.filter((v) => v.img != "");

function listUpdate(list: TwitchatDataTypes.TwitchatCustomUserBadge[]): void {
	//Avoid badges duplicates
	const idDone = new Set<string>();
	for (let i = 0; i < list.length; i++) {
		const id = list[i]!.id;
		if (idDone.has(id)) {
			list.splice(i, 1);
			i--;
		} else {
			idDone.add(id);
		}
	}

	//Avoid having a badge on both cols
	const cleanup = list == badgesAdd.value ? badgesDel.value : badgesAdd.value;
	for (let i = cleanup.length - 1; i >= 0; i--) {
		if (idDone.has(cleanup[i]!.id)) cleanup.splice(i, 1);
	}

	saveToAction();
}

/**
 * Removes a badge from the "add" or "delete" list
 */
function removeBadge(list: TwitchatDataTypes.TwitchatCustomUserBadge[], index: number): void {
	list.splice(index, 1);
	saveToAction();
}

/**
 * Writes the displayed badge lists back to the trigger action data
 */
function saveToAction(): void {
	props.action.customBadgeAdd = badgesAdd.value.map((v) => v.id);
	props.action.customBadgeDel = badgesDel.value.map((v) => v.id);
}

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	userPLaceholders.value = list;
	param_userSource.value.listValues = userSourceOptions.value;
}
</script>

<style scoped lang="less">
.triggeractioncustombadge {
	.list,
	.group {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		max-height: 300px;
		overflow-x: hidden;
		padding: 1px;

		.badge {
			padding: 2px;
			outline: 1px solid var(--color-light-fade);
			img,
			.icon {
				display: block;
				width: 32px;
				height: 32px;
			}

			&:hover {
				outline: 1px solid var(--color-light);
			}
		}
	}

	.targets {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		.col {
			width: 50%;
			padding: 0.5em;
			background-color: var(--grayout);
			border-radius: var(--border-radius);

			.head {
				gap: 0.5em;
				display: flex;
				flex-direction: row;
				justify-content: center;
				.icon {
					height: 1em;
					margin-bottom: 0.5em;
				}
			}

			.dropZone {
				position: relative;
				.group {
					min-height: 3em;
					overflow: hidden;
					z-index: 1;
					position: relative;
				}
				.placeholder,
				.placeholder_hidden {
					position: absolute;
					width: 100%;
					height: 100%;
					font-style: italic;
					text-align: center;
					opacity: 0.5;
					padding: 1em;
					// min-height: 3.5em;
					border: 1px dashed var(--color-text);
					border-radius: var(--border-radius);
				}

				.placeholder_hidden {
					opacity: 0;
					position: relative;
				}

				.badge {
					cursor: not-allowed;
				}
			}
		}
	}
}
</style>
