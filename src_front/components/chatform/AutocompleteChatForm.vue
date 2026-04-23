<template>
	<div
		class="autocompletechatform blured-background-window"
		v-if="filteredItems.length > 0 || showGrantEmotesPermission"
	>
		<div
			v-for="(i, index) in filteredItems"
			:key="i.id"
			:ref="(el) => setItemRef(i.id, el as HTMLElement | null)"
			:class="getClasses(index, i)"
			@click="selectItem(i)"
			v-tooltip="{ content: i.type == 'slashCommand' ? i.tooltipKey : '' }"
		>
			<img
				class="image"
				loading="lazy"
				:src="i.emote"
				:alt="i.label"
				v-tooltip="i.label"
				v-if="i.type == 'emote'"
			/>

			<span class="image emoji" v-else-if="i.type == 'emojiShortcode'">{{ i.emoji }}</span>

			<Icon v-else-if="i.type == 'user'" class="image" name="user" />
			<Icon v-else-if="i.type == 'slashCommand'" class="image" name="commands" alt="cmd" />
			<Icon v-else-if="i.type == 'chatCommand'" class="image" name="chatCommand" alt="cmd" />
			<Icon
				v-if="i.type == 'slashCommand' && i.rawCmd && i.rawCmd.needAdmin"
				class="image small"
				name="lock_fit"
				alt="user"
				v-tooltip="t('global.cmd_admin')"
			/>
			<Icon
				v-if="i.type == 'slashCommand' && i.rawCmd && i.rawCmd.twitchCmd"
				class="image small"
				name="twitch"
				alt="user"
				v-tooltip="t('global.cmd_twitch')"
			/>
			<Icon
				v-if="i.type == 'slashCommand' && i.rawCmd && i.rawCmd.needModerator"
				class="image small"
				name="mod"
				alt="user"
				v-tooltip="t('global.cmd_mod')"
			/>
			<Icon
				v-if="i.type == 'slashCommand' && i.isTrigger"
				class="image trigger"
				name="broadcast"
			/>

			<div class="name">{{ i.label }}</div>
			<div class="source" v-if="i.type == 'emote' && i.source">
				{{ t("global." + i.source.toLowerCase() + "_emote") }}
			</div>
			<div class="source" v-else-if="i.type == 'emote'">{{ t("global.twitch_emote") }}</div>
			<div class="source" v-if="i.type == 'emojiShortcode'">{{ t("global.emoji") }}</div>
			<div class="infos" v-if="i.type == 'slashCommand' && (i.infos || i.infosKey)">
				{{ i.infos || t(i.infosKey || "") }}
			</div>
			<div class="name alias" v-else-if="i.type == 'slashCommand' && i.alias">
				(alias: {{ i.alias }})
			</div>
		</div>
		<div
			v-if="showGrantEmotesPermission"
			class="item grantPermission"
			@click="grantEmoteScope()"
		>
			<Icon class="image" name="lock_fit" />
			<div class="name">{{ t("global.emote_scope") }}</div>
		</div>
		<div v-else-if="showEmotesLoading" class="item">
			<Icon class="image" name="loader" /> <i>{{ t("chat.form.loading_emotes") }}</i>
		</div>
	</div>
</template>

<script setup lang="ts">
import { TriggerTypes, type TriggerData } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import BTTVUtils from "@/utils/emotes/BTTVUtils";
import FFZUtils from "@/utils/emotes/FFZUtils";
import SevenTVUtils from "@/utils/emotes/SevenTVUtils";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Database from "@/store/Database";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeTTS as useStoreTTS } from "@/store/tts/storeTTS";
import { storeDiscord as useStoreDiscord } from "@/store/discord/storeDiscord";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";

/**
 * This component is used to select an emote by typing ":xxx" on the
 * message field.
 */

const props = defineProps<{
	search: string;
	emotes: boolean;
	users: boolean;
	commands: boolean;
}>();

const emit = defineEmits<{
	selectItem: [value: string];
	close: [];
}>();

const { t } = useI18n();
const storeTriggers = useStoreTriggers();
const storeAuth = useStoreAuth();
const storeChat = useStoreChat();
const storeTTS = useStoreTTS();
const storeDiscord = useStoreDiscord();
const storeUsers = useStoreUsers();
const storeParams = useStoreParams();
const storeStream = useStoreStream();

const selectedIndex = ref(0);
const showEmotesLoading = ref(false);
const showGrantEmotesPermission = ref(false);
const filteredItems = ref<ListItem[]>([]);

let triggerCommands: TriggerData[] = [];
let emotesRequestToken = 0;
let emojiSearchToken = 0;

const itemRefs = new Map<string, HTMLElement>();
function setItemRef(id: string, el: HTMLElement | null) {
	if (el) itemRefs.set(id, el);
	else itemRefs.delete(id);
}

function getClasses(index: number, item: ListItem): string[] {
	let res = ["item"];
	if (index == selectedIndex.value) res.push("selected");
	if (item.type == "slashCommand" && item.disabled) res.push("disabled");
	if (item.type == "slashCommand" && item.rawCmd) {
		if (item.rawCmd.needAdmin) res.push("admin");
		if (item.rawCmd.needModerator) res.push("mod");
		if (item.rawCmd.needBroadcaster) res.push("mod");
	}
	res.push(item.type);
	return res;
}

/**
 * Select an item via click or enter key
 * @param item
 */
function selectItem(item: ListItem): void {
	if (item.type == "slashCommand") {
		if (item.disabled) {
			if (item.rawCmd && item.rawCmd.twitch_scopes) {
				storeAuth.requestTwitchScopes(item.rawCmd.twitch_scopes);
			} else if (item.rawCmd && item.rawCmd.needTTS) {
				storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TTS);
			}
		} else {
			emit("selectItem", item.cmd);
		}
	} else if (item.type == "emojiShortcode") {
		emit("selectItem", item.emoji);
	} else {
		const prefix = item.type == "user" ? "@" : "";
		emit("selectItem", prefix + item.label);
	}
}

/**
 * Navigate through list via keyboard
 */
function onkeyUp(e: KeyboardEvent): void {
	switch (e.key) {
		case "Escape":
			emit("close");
			break;
		case "Enter": {
			const item = filteredItems.value[selectedIndex.value];
			if (item) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				selectItem(item);
			}
			break;
		}
	}
}

/**
 * Navigate through list via keyboard
 */
function onkeyDown(e: KeyboardEvent): void {
	switch (e.key) {
		case "PageUp": {
			selectedIndex.value -= 10;
			e.preventDefault();
			break;
		}
		case "PageDown": {
			selectedIndex.value += 10;
			e.preventDefault();
			break;
		}
		case "ArrowUp": {
			selectedIndex.value--;
			e.preventDefault();
			break;
		}
		case "ArrowDown": {
			selectedIndex.value++;
			e.preventDefault();
			break;
		}
		case "Tab": {
			const selectedItem = filteredItems.value[selectedIndex.value];
			if (selectedItem) {
				e.preventDefault();
				e.stopPropagation();
				selectItem(selectedItem);
			}
			break;
		}
		default:
			return;
	}

	const len = filteredItems.value.length;
	if (len === 0) return;

	selectedIndex.value = selectedIndex.value % len;
	if (selectedIndex.value < 0) selectedIndex.value = len - 1;
	const el = itemRefs.get(filteredItems.value[selectedIndex.value]!.id);
	if (el) {
		el.scrollIntoView({ block: "center", inline: "nearest" });
	}
}

/**
 * Requests for emote scope
 */
function grantEmoteScope(): void {
	TwitchUtils.requestScopes([TwitchScopes.READ_EMOTES]);
	emit("close");
}

/**
 * Called when writing somehting.
 * Search any item matching the search
 */
function onSearchChange(): void {
	let res: ListItem[] = [];
	const s = props.search.toLowerCase();
	if (s?.length > 0) {
		//Search for users
		if (props.users) {
			const users = storeUsers.users;
			for (let j = 0; j < users.length; j++) {
				const userName = users[j]!.displayNameOriginal;
				if (userName.toLowerCase().indexOf(s) == 0) {
					res.push({
						type: "user",
						label: userName,
						id: userName,
					});
				}
			}
		}

		//Search for emotes
		if (props.emotes) {
			let emotes = TwitchUtils.emotesCache ?? [];
			if (TwitchUtils.hasScopes([TwitchScopes.READ_EMOTES])) {
				if (emotes.length === 0) {
					// Emotes not loaded yet, load them or wait for them to load
					showEmotesLoading.value = true;
					emotesRequestToken++;
					const currentToken = emotesRequestToken;
					TwitchUtils.getEmotes()
						.then(() => {
							if (emotesRequestToken === currentToken) {
								showEmotesLoading.value = false;
								onSearchChange();
							}
						})
						.catch(() => {
							if (emotesRequestToken === currentToken) {
								showEmotesLoading.value = false;
							}
						});
					showGrantEmotesPermission.value = false;
				}
			} else {
				showGrantEmotesPermission.value = true;
			}
			if (storeParams.appearance.bttvEmotes.value === true) {
				emotes = emotes.concat(BTTVUtils.instance.emotes);
			}

			if (storeParams.appearance.sevenTVEmotes.value === true) {
				emotes = emotes.concat(SevenTVUtils.instance.emotes);
			}

			if (storeParams.appearance.ffzEmotes.value === true) {
				emotes = emotes.concat(FFZUtils.instance.emotes);
			}

			if (emotes) {
				for (const e of emotes) {
					if (e.code.toLowerCase().indexOf(s) > -1) {
						res.push({
							type: "emote",
							label: e.code,
							emote: e.images.url_1x,
							id: e.id,
							source: e.source,
						});
					}
				}
			}

			//Search emoji shortcodes from IndexedDB
			emojiSearchToken++;
			const emojiToken = emojiSearchToken;
			Database.instance.searchEmojiShortcodes(s, 50).then((results) => {
				// If search changed while getting result, ignore those results
				if (emojiSearchToken !== emojiToken) return;
				if (results.length === 0) return;
				const emojiItems: ListItem[] = results.map((r) => ({
					type: "emojiShortcode" as const,
					id: "emoji_" + r.shortcode,
					label: ":" + r.shortcode + ":",
					emoji: r.emoji,
				}));
				filteredItems.value = [...filteredItems.value, ...emojiItems];
			});
		}

		//Search for slash commands
		if (props.commands) {
			const currentChanId = storeStream.currentChatChannel.id;
			const me = storeAuth.twitch.user;
			const cmds = storeChat.commands;
			const hasChannelPoints = me.is_affiliate || me.is_partner;
			const hastoreDiscordCmd = storeDiscord.discordLinked && storeDiscord.chatCmdTarget;
			const isBroadcaster = me.id === currentChanId;
			const isAdmin = storeAuth.twitch.user.is_admin === true;
			const isMod = me.channelInfo[currentChanId]?.is_moderator === true;

			//Search in global slash commands
			for (let j = 0; j < cmds.length; j++) {
				const e = cmds[j] as TwitchatDataTypes.CommandData;
				if (
					e.cmd.toLowerCase().indexOf(s) > -1 ||
					(e.alias?.toLowerCase().indexOf(s) ?? -1) > -1
				) {
					let disabled = false;

					//Remove TTS related commands if TTS isn't enabled
					if (e.needTTS === true && !storeTTS.params.enabled) disabled = true;

					//Remove admin specific commands if we're not an admin
					if (e.needAdmin === true && !isAdmin) continue;

					//Remove broadcaster specific commands if we're not a mod
					if (e.needBroadcaster === true && !isBroadcaster) continue;

					//Remove moderator specific commands if we're not a mod
					if (e.needModerator === true && !isMod) continue;

					//Remove channel point related commands if user isn't affiliate or partner
					if (e.needChannelPoints === true && !hasChannelPoints) continue;

					//Remove discord related command if discord not configured
					if (e.needDiscordChan === true && !hastoreDiscordCmd) continue;

					res.push({
						type: "slashCommand",
						label: e.cmd.replace(/{(.*?)\}/gi, "$1"),
						cmd: e.cmd,
						infos: e.details,
						infosKey: e.detailsKey,
						id: e.id,
						alias: e.alias?.replace(/{(.*?)\}/gi, "$1"),
						disabled:
							disabled ||
							(e.twitch_scopes !== undefined &&
								!TwitchUtils.hasScopes(e.twitch_scopes)),
						rawCmd: e,
					});
				}
			}

			//Search on custom slash commands in the triggers
			for (const tr of triggerCommands) {
				if (!tr.enabled) continue;
				if (tr.chatCommand && tr.chatCommand.toLowerCase().indexOf(s) > -1) {
					const params = tr.chatCommandParams ?? [];
					let paramsTxt =
						params.length > 0
							? " " + params.map((v) => "{" + v.tag + "}").join(" ")
							: "";
					if (!tr.enabled) {
						paramsTxt += " " + t("chat.form.trigger_cmd_disabled");
					}

					res.push({
						type: tr.type == TriggerTypes.CHAT_COMMAND ? "chatCommand" : "slashCommand",
						label: tr.chatCommand + paramsTxt.replace(/\{/g, "[").replace(/\}/g, "]"),
						cmd: tr.chatCommand + paramsTxt,
						infos: tr.name ?? "",
						isTrigger: true,
						id: tr.id,
						disabled: !tr.enabled,
						tooltipKey: tr.enabled ? "" : t("chat.form.trigger_cmd_disabled_tt"),
					});
				}
			}
		}

		res.sort((a, b) => {
			if (a.type == "slashCommand" && b.type == "slashCommand") {
				if (a.disabled && !b.disabled) return 1;
				if (!a.disabled && b.disabled) return -1;
				if (a.rawCmd && !b.rawCmd) return -1;
				if (!a.rawCmd && b.rawCmd) return 1;
				if (a.rawCmd && b.rawCmd) {
					if (a.rawCmd.needAdmin && !b.rawCmd.needAdmin) return -1;
					if (!a.rawCmd.needAdmin && b.rawCmd.needAdmin) return 1;
					if (a.rawCmd.needModerator && !b.rawCmd.needModerator) return -1;
					if (!a.rawCmd.needModerator && b.rawCmd.needModerator) return 1;
					if (a.rawCmd.twitchCmd && !b.rawCmd.twitchCmd) return -1;
					if (!a.rawCmd.twitchCmd && b.rawCmd.twitchCmd) return 1;
				}
			}
			if (a.label < b.label) return -1;
			if (a.label > b.label) return 1;
			return 0;
		});

		filteredItems.value = res;
	}
}

watch(
	() => props.search,
	() => {
		onSearchChange();
	},
);

onMounted(() => {
	selectedIndex.value = 0;

	triggerCommands = storeTriggers.triggerList.filter(
		(v) => v.type == TriggerTypes.SLASH_COMMAND || v.type == TriggerTypes.CHAT_COMMAND,
	);

	document.addEventListener("keyup", onkeyUp, true);
	document.addEventListener("keydown", onkeyDown, true);

	onSearchChange();
});

onBeforeUnmount(() => {
	emotesRequestToken = -1;
	document.removeEventListener("keyup", onkeyUp, true);
	document.removeEventListener("keydown", onkeyDown, true);
});

type ListItem = UserItem | EmoteItem | CommandItem | EmojiShortcodeItem;

interface UserItem {
	type: "user";
	id: string;
	label: string;
}

interface EmojiShortcodeItem {
	type: "emojiShortcode";
	id: string;
	label: string;
	emoji: string;
}

interface EmoteItem {
	type: "emote";
	id: string;
	label: string;
	emote: string;
	source?: "BTTV" | "FFZ" | "7TV";
}

interface CommandItem {
	/**
	 * chatCommand starts with "!" and slashCommand starts with "/"
	 */
	type: "slashCommand" | "chatCommand";
	id: string;
	label: string;
	cmd: string;
	infos?: string;
	infosKey?: string;
	alias?: string;
	disabled?: boolean;
	tooltipKey?: string;
	rawCmd?: TwitchatDataTypes.CommandData;
	isTrigger?: boolean;
}
</script>

<style scoped lang="less">
.autocompletechatform {
	padding: 10px;
	box-shadow: 0px 0px 20px 0px rgba(0, 0, 0, 1);
	border-radius: 10px;
	max-width: 100%;
	display: flex;
	flex-direction: column;
	transform-origin: bottom center;
	left: auto;
	margin-left: auto;
	right: 0;
	overflow-x: hidden;
	overflow-y: auto;
	max-height: 80vh;

	.item {
		gap: 5px;
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
		cursor: pointer;
		min-height: 1.8em;
		color: var(--color-text);

		&.selected,
		&:hover {
			background-color: var(--background-color-fader);
		}

		&.slashCommand,
		&.chatCommand {
			// display: flex;
			// flex-direction: row;
			// justify-content: space-between;
			// align-items: center;
			.name {
				flex-grow: 1;
				white-space: nowrap;
				margin-right: 5px;
			}
			.image {
				padding: 5px;
			}

			&.admin {
				background-color: var(--color-secondary-fadest);

				&.selected,
				&:hover {
					background-color: var(--color-secondary-fader);
				}
			}

			&.mod {
				background-color: var(--color-primary-fadest);

				&.selected,
				&:hover {
					background-color: var(--color-primary-fader);
				}
			}
			&.disabled {
				// pointer-events: none;
				opacity: 0.5;
				font-style: italic;
			}
		}

		&.grantPermission {
			background-color: var(--color-secondary);
			border-radius: var(--border-radius);
			.image {
				width: auto;
				height: 1.5em;
				margin: 0 0.25em;
			}
		}

		.name {
			font-size: 0.8em;
			flex: 1;
		}
		.source {
			font-size: 0.8em;
		}

		.source {
			opacity: 0.5;
			margin-left: 0.5em;
		}

		.infos {
			font-size: 0.7em;
			font-style: italic;
			text-align: right;
			padding-right: 0.5em;
			opacity: 0.8;
			flex-shrink: 0;
			flex-basis: auto;
			align-self: flex-end;
			justify-self: flex-end;
		}

		.image {
			height: 1.5em;
			padding: 0.2em;
			object-fit: fill;
			&.small {
				height: 1em;
				width: 1em;
				padding: 0.1em;
			}
			&.emoji {
				width: 1.5em;
			}
		}
		.alias {
			flex-basis: 100%;
			margin-left: 3em;
			font-style: italic;
			opacity: 0.8;
		}
	}
}
</style>
