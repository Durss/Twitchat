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

		<ToggleBlock
			class="manage"
			:open="false"
			:title="t('chat_commands.manage.title')"
			:icons="['mod']"
			medium
			primary
		>
			<div class="manageForm">
				<ParamItem
					:paramData="param_manageEnabled"
					v-model="storeChatCommands.params.manageEnabled"
					:error="storeChatCommands.params.manageEnabled && manageConflict != null"
					:errorMessage="t('chat_commands.form.conflict', { CMD: manageConflict })"
					@change="save()"
				>
					<div class="children">
						<ToggleBlock
							:open="false"
							:title="t('chat_commands.manage.allowed_users')"
							:icons="['user']"
							small
						>
							<PermissionsForm
								v-model="storeChatCommands.params.managePermissions"
								@change="save()"
							/>
						</ToggleBlock>
						<div class="card-item usage">
							<p><Icon name="info" />{{ t("chat_commands.manage.usage_title") }}</p>
							<ul>
								<li>
									<mark
										>{{ MANAGE_CMD }} add !socials
										{{ t("chat_commands.manage.usage_message") }}</mark
									>
								</li>
								<li>
									<mark
										>{{ MANAGE_CMD }} edit !socials
										{{ t("chat_commands.manage.usage_message") }}</mark
									>
								</li>
								<li>
									<mark>{{ MANAGE_CMD }} remove !socials</mark>
								</li>
								<li>
									<mark>{{ MANAGE_CMD }} list</mark>
									{{ t("chat_commands.manage.usage_list") }}
								</li>
							</ul>
						</div>
					</div>
				</ParamItem>
			</div>
		</ToggleBlock>

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

		<section>
			<SearchForm
				v-if="storeChatCommands.entryList.length > 5"
				v-model="search"
				:debounce-delay="storeChatCommands.entryList.length > 50 ? 0.33 : 0"
			/>
		</section>

		<section v-if="!isFiltering">
			<span class="count" v-if="storeChatCommands.entryList.length > 0"
				>{{ enabledCount }} / {{ maxEntries }}</span
			>
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

const manageConflict = computed(() => {
	return storeChatCommands.getConflict([MANAGE_CMD], undefined, true);
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
	// ToggleBlock emits the default title when cleared, don't store it so it keeps
	// following the command name/message
	const value = title == getDefaultTitle(entry) ? "" : title;
	// Avoid undefined => "" update that would make ToggleBlock reset its title to ""
	if ((entry.title || "") == value) return;
	entry.title = value;
	save();
}

/**
 * Title displayed when no custom one is defined
 */
function getDefaultTitle(entry: TwitchatDataTypes.ChatCommandData): string {
	if (entry.command.enabled && entry.command.name) return entry.command.name;
	return getExcerpt(entry.message) || t("chat_commands.untitled");
}

function getIcons(entry: TwitchatDataTypes.ChatCommandData): string[] {
	const res: string[] = [];
	if (entry.command.enabled) res.push("chatCommand");
	if (entry.schedule.enabled) res.push("timer");
	return res;
}

function getExcerpt(message: string): string {
	const text = message.trim();
	return text.length > 50 ? text.substring(0, 50) + "…" : text;
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

		.count {
			font-size: 0.85em;
			opacity: 0.6;
			align-self: flex-end;
		}
	}

	.manage,
	.entry {
		width: calc(100% - 2em);
		margin: auto;
	}

	.manageForm {
		.children {
			display: flex;
			flex-direction: column;
			gap: 0.25em;
			margin-top: 0.25em;
		}
		.usage {
			font-size: 0.9em;
			ul {
				margin-top: 0.25em;
				padding-left: 1.5em;
				line-height: 1.5em;
				li {
					margin-bottom: 0.25em;
				}
			}
			.icon {
				margin-right: 0.25em;
				vertical-align: middle;
			}
		}
	}

	.entryList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}
}
</style>
