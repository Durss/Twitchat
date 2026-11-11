<template>
	<div class="paramschatcommands parameterContent" ref="rootEl">
		<Icon name="chatCommand" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="p" keypath="chat_commands.header">
				<template #LINK_TRIGGER>
					<a @click="openTriggers()">{{ t("chat_commands.header_link_trigger") }}</a>
				</template>
			</i18n-t>
		</div>

		<div
			class="card-item manage"
			:class="{ disabled: !storeChatCommands.params.manageEnabled }"
		>
			<ParamItem
				noBackground
				:paramData="param_manageEnabled"
				v-model="storeChatCommands.params.manageEnabled"
				@change="save()"
			>
				<template #composite>
					<PermissionsForm
						class="permissionsBt"
						popoutMode
						v-model="storeChatCommands.params.managePermissions"
						@change="save()"
					/>
				</template>
			</ParamItem>
			<div class="usage">
				<ul>
					<li>
						<span>{{ t("chat_commands.manage.usage_create") }}</span>
						<mark
							><strong>{{ MANAGE_CMD }} add</strong> !socials
							{{ t("chat_commands.manage.usage_message") }}</mark
						>
					</li>
					<li>
						<span>{{ t("chat_commands.manage.usage_edit") }}</span>
						<mark
							><strong>{{ MANAGE_CMD }} edit</strong> !socials
							{{ t("chat_commands.manage.usage_message") }}</mark
						>
					</li>
					<li>
						<span>{{ t("chat_commands.manage.usage_delete") }}</span>
						<mark
							><strong>{{ MANAGE_CMD }} remove</strong> !socials</mark
						>
					</li>
				</ul>
			</div>
		</div>

		<div class="card-item listCmd">
			<div class="content">
				<p>
					<Icon name="info" /><mark
						><strong>{{ MANAGE_CMD }} list</strong></mark
					>
					{{ t("chat_commands.manage.usage_list") }}
				</p>
			</div>
			<PermissionsForm
				class="permissionsBt"
				popoutMode
				v-model="storeChatCommands.params.listPermissions"
				@change="save()"
			/>
		</div>

		<section>
			<TTButton icon="add" @click="addEntry()" v-if="!maxReached">{{
				t("chat_commands.addBt")
			}}</TTButton>

			<PremiumLimitMessage
				v-else
				label="chat_commands.nonpremium_limit"
				premiumLabel="chat_commands.premium_limit"
				:max="Config.instance.MAX_CHAT_COMMANDS"
				:maxPremium="Config.instance.MAX_CHAT_COMMANDS_PREMIUM"
			/>
		</section>

		<section v-if="storeChatCommands.entryList.length > 5">
			<SearchForm
				v-model="search"
				:debounce-delay="storeChatCommands.entryList.length > 50 ? 0.33 : 0"
			/>
		</section>

		<section v-if="!isFiltering && storeChatCommands.entryList.length > 0">
			<LimitCounter
				:count="enabledCount"
				:max="Config.instance.MAX_CHAT_COMMANDS"
				:maxPremium="Config.instance.MAX_CHAT_COMMANDS_PREMIUM"
			/>
		</section>

		<VueDraggable
			class="entryList"
			v-model="storeChatCommands.entryList"
			handle=".entry > .header"
			:animation="250"
			:disabled="isFiltering"
			@update="save()"
		>
			<ToggleBlock
				v-for="entry in filteredList"
				class="entry"
				:key="entry.id"
				:data-entry-id="entry.id"
				:open="entry.id == newEntryId"
				editableTitle
				:title="entry.title"
				:titleDefault="getDefaultTitle(entry)"
				:icons="getIcons(entry)"
				:disabled="!entry.enabled"
				@update:title="onTitleChange(entry, $event)"
			>
				<template #left_actions>
					<ToggleButton
						v-model="entry.enabled"
						@click.stop
						@change="save()"
						v-if="entry.enabled || canEnableMore"
					/>
				</template>

				<template #right_actions>
					<TTButton icon="copy" @click.stop="duplicate(entry)" v-if="!maxReached" />
					<TTButton alert icon="trash" @click.stop="deleteEntry(entry)" />
				</template>

				<ChatCommandEntryForm :entry="entry" @change="save()" />
			</ToggleBlock>
		</VueDraggable>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import PermissionsForm from "@/components/PermissionsForm.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import TTButton from "@/components/TTButton.vue";
import { useConfirm } from "@/composables/useConfirm";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import {
	MANAGE_CMD,
	storeChatCommands as useStoreChatCommands,
} from "@/store/chat_commands/storeChatCommands";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useI18n } from "vue-i18n";
import LimitCounter from "../LimitCounter.vue";
import ParamItem from "../ParamItem.vue";
import PremiumLimitMessage from "../PremiumLimitMessage.vue";
import ChatCommandEntryForm from "./chat_commands/ChatCommandEntryForm.vue";
import type IParameterContent from "./IParameterContent";
import SearchForm from "./SearchForm.vue";

const { t } = useI18n();
const { confirm } = useConfirm();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const storeChatCommands = useStoreChatCommands();

const rootEl = useTemplateRef("rootEl");
const newEntryId = ref("");
const search = ref("");

let saveTimeout = -1;

const param_manageEnabled = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "mod",
	labelKey: "chat_commands.manage.enabled",
});

const maxEntries = computed(() => {
	return storeAuth.isPremium
		? Config.instance.MAX_CHAT_COMMANDS_PREMIUM
		: Config.instance.MAX_CHAT_COMMANDS;
});

const enabledCount = computed(() => {
	return storeChatCommands.entryList.filter((v) => v.enabled).length;
});

const canEnableMore = computed(() => {
	return enabledCount.value < maxEntries.value;
});

const maxReached = computed(() => {
	return (
		!canEnableMore.value ||
		storeChatCommands.entryList.length >= Config.instance.MAX_CHAT_COMMANDS_PREMIUM
	);
});

const isFiltering = computed(() => search.value.trim() != "");

const filteredList = computed(() => {
	const s = search.value.trim().toLocaleLowerCase();
	if (!s) return storeChatCommands.entryList;
	return storeChatCommands.entryList.filter((entry) => {
		return (
			entry.title?.toLowerCase().includes(s) ||
			entry.command.name.toLowerCase().includes(s) ||
			entry.command.aliases.findIndex((alias) => alias.toLowerCase().includes(s)) > -1 ||
			entry.message.toLowerCase().includes(s)
		);
	});
});

onBeforeUnmount(() => {
	//Flush pending save
	if (saveTimeout > -1) {
		clearTimeout(saveTimeout);
		storeChatCommands.saveData();
	}
});

defineExpose<IParameterContent>({
	onNavigateBack: () => {
		return false;
	},
});

function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}

/**
 * Saves data after a short delay to avoid saving on every key stroke
 */
function save(): void {
	clearTimeout(saveTimeout);
	saveTimeout = window.setTimeout(() => {
		saveTimeout = -1;
		storeChatCommands.saveData();
	}, 300);
}

function addEntry(): void {
	const entry = storeChatCommands.createEntry();
	if (!storeChatCommands.addEntry(entry)) return;
	newEntryId.value = entry.id;
	void nextTick(() => {
		const holder = rootEl.value?.querySelector(`[data-entry-id="${entry.id}"]`);
		holder?.scrollIntoView({ behavior: "smooth", block: "center" });
	});
}

function deleteEntry(entry: TwitchatDataTypes.ChatCommandData): void {
	confirm(t("chat_commands.delete_confirm.title"), t("chat_commands.delete_confirm.desc"))
		.then(() => {
			storeChatCommands.deleteEntry(entry.id);
		})
		.catch(() => {
			/* ignore */
		});
}

function onTitleChange(entry: TwitchatDataTypes.ChatCommandData, title: string): void {
	// Avoid undefined => "" update that would trigger a useless save
	if ((entry.title || "") == title) return;
	entry.title = title;
	save();
}

/**
 * Title displayed when no custom one is defined
 */
function getDefaultTitle(entry: TwitchatDataTypes.ChatCommandData): string {
	if (entry.command.enabled && entry.command.name) return entry.command.name;
	let label = entry.message.trim();
	if (label.length > 50) {
		return label.substring(0, 50) + "…";
	}
	return label || t("chat_commands.untitled");
}

function getIcons(entry: TwitchatDataTypes.ChatCommandData): string[] {
	const res: string[] = [];
	if (entry.command.enabled) res.push("chatCommand");
	if (entry.schedule.enabled) res.push("timer");
	return res;
}

function duplicate(entry: TwitchatDataTypes.ChatCommandData): void {
	storeChatCommands.duplicateEntry(entry);
}
</script>

<style scoped lang="less">
.paramschatcommands {
	section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5em;
		width: 100%;
		width: calc(100% - 2em);
	}

	mark {
		font-weight: normal;
	}

	.manage,
	.entry {
		width: calc(100% - 2em);
		margin: auto;
	}

	.manage {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		.icon {
			height: 1em;
			margin-right: 0.25em;
			vertical-align: middle;
		}
		.usage {
			font-size: 0.9em;
			padding-left: 1.5em;
			ul {
				margin-top: 0.25em;
				line-height: 1.5em;
				li {
					margin-bottom: 0.25em;
					display: flex;
					flex-direction: column;
					mark {
						margin-left: 1em;
					}
				}
			}
		}

		.permissionsBt {
			align-self: flex-start;
			margin-left: 0.5em;
		}

		&.disabled {
			@c1: rgba(128, 128, 128, 0);
			@c2: rgba(128, 128, 128, 0.1);
			background-image: repeating-linear-gradient(-45deg, @c1, @c1 7px, @c2 7px, @c2 15px);
			.usage {
				opacity: 0.5;
			}
		}
	}

	.listCmd {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5em;
		font-size: 0.9em;
		margin: auto;
		.icon {
			height: 1em;
			margin-right: 0.25em;
			vertical-align: middle;
		}
		.content {
			flex-grow: 1;
			line-height: 1.5em;
		}
		.error {
			font-weight: bold;
		}
	}
	.entryList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}
}
</style>
