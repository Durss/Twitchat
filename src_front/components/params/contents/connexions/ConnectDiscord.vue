<template>
	<div class="paramsdiscord parameterContent">
		<Icon name="discord" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="p" keypath="discord.header"></i18n-t>
			<TTButton
				icon="discord"
				primary
				type="link"
				:href="Config.instance.DISCORD_BOT_URL"
				target="_blank"
				>{{ t("discord.install_bt") }}</TTButton
			>
		</div>

		<TTButton
			class="unlinkBt"
			icon="offline"
			v-if="storeDiscord.discordLinked"
			alert
			@click="unlink()"
			:loading="submitting"
			>{{ t("discord.unkinkBt", { GUILD: storeDiscord.linkedToGuild }) }}</TTButton
		>

		<TTButton
			class="refreshBt"
			icon="refresh"
			v-if="storeDiscord.discordLinked"
			@click="refreshChannels()"
			:loading="refreshingChans"
			>{{ t("discord.refreshChansBt") }}</TTButton
		>

		<div class="content">
			<template v-if="storeDiscord.discordLinked">
				<section class="card-item colSelector">
					<Icon name="split" />
					<span>{{ t("discord.chat_col") }}</span>
					<div class="columnList">
						<TTButton
							v-for="(col, index) in storeParams.chatColumnsConfig"
							:key="index"
							@click="selectColumn(col.order)"
							:secondary="storeDiscord.chatCols.indexOf(col.order) > -1"
							>{{ index + 1 }}</TTButton
						>
					</div>
				</section>

				<section class="card-item reactions">
					<Icon name="emote" />
					<ParamItem
						:paramData="param_reactions"
						noBackground
						v-model="storeDiscord.reactionsEnabled"
						@change="saveParams()"
					/>
					<div class="message">
						<MessageItem :messageData="messagePreview"></MessageItem>
					</div>
				</section>

				<section class="card-item">
					<Icon name="mod" />
					<span>{{ t("discord.channel_ban_log") }}</span>
					<select v-model="storeDiscord.banLogTarget" @change="saveParams()">
						<option v-for="chan in channelList" :key="chan.id" :value="chan.id">
							{{ chan.name }}
						</option>
					</select>
					<ParamItem
						:paramData="param_banLogThread"
						noBackground
						v-model="storeDiscord.banLogThread"
						@change="saveParams()"
					/>
				</section>

				<section class="card-item">
					<Icon name="commands" />
					<i18n-t scope="global" tag="p" keypath="discord.channel_cmd">
						<template #CMD
							><mark>{{
								storeChat.commands.find((v) => v.id == "discord")?.cmd
							}}</mark></template
						>
					</i18n-t>
					<select v-model="storeDiscord.chatCmdTarget" @change="saveParams()">
						<option v-for="chan in channelList" :key="chan.id" :value="chan.id">
							{{ chan.name }}
						</option>
					</select>
				</section>

				<section class="card-item">
					<Icon name="rightClick" />
					<span>{{ t("discord.quick_actions") }}</span>
					<ParamsDiscordQuickActions channelList @change="saveParams()" />
				</section>

				<section class="card-item">
					<Icon name="save" />
					<span>{{ t("discord.channel_logs") }}</span>
					<select v-model="storeDiscord.logChanTarget" @change="saveParams()">
						<option v-for="chan in channelList" :key="chan.id" :value="chan.id">
							{{ chan.name }}
						</option>
					</select>
					<div class="card-item info">
						<Icon name="info" />
						<i18n-t scope="global" tag="span" keypath="discord.channel_logs_info">
							<template #OPTION
								><mark>{{ t("chat.context_menu.export_discord") }}</mark></template
							>
						</i18n-t>
					</div>
				</section>

				<section class="card-item slashCmd">
					<Icon name="broadcast" />
					<i18n-t scope="global" tag="span" keypath="discord.public_triggers">
						<template #TRIGGER_LINK
							><a @click.stop="openTriggers()">{{
								t("params.categories.triggers")
							}}</a></template
						>
						<template #SLASH_CMD
							><strong>{{
								t("triggers.events.SLASH_COMMAND.label")
							}}</strong></template
						>
						<template #OPTION
							><strong>{{ t("triggers.slash_cmd.param_discord") }}</strong></template
						>
						<template #ICON><Icon name="info" /></template>
					</i18n-t>
				</section>

				<section class="card-item helpDesk">
					<Icon name="helpDesk" />
					<span>{{ t("discord.ticket") }}</span>
					<span>{{ t("discord.ticket_chan") }}</span>
					<select v-model="storeDiscord.ticketChanTarget" @change="saveParams()">
						<option v-for="chan in channelList" :key="chan.id" :value="chan.id">
							{{ chan.name }}
						</option>
					</select>
					<div class="card-item info">
						<Icon name="info" />
						<i18n-t scope="global" tag="span" keypath="discord.ticket_chan_info">
							<template #ACTION
								><strong>{{
									t("chat.context_menu.discord_ticket")
								}}</strong></template
							>
						</i18n-t>
					</div>
				</section>
			</template>

			<section class="card-item confirm" v-else-if="askLinkConfirmation">
				<div>{{ t("discord.install_confirm") }}</div>
				<mark class="discordName">{{ discordName }}</mark>
				<div class="ctas">
					<TTButton
						icon="cross"
						alert
						@click="
							askLinkConfirmation = false;
							errorCode = '';
						"
						>{{ t("global.cancel") }}</TTButton
					>
					<TTButton
						icon="checkmark"
						primary
						@click="confirmLink()"
						:loading="submitting"
						>{{ t("global.confirm") }}</TTButton
					>
				</div>
			</section>

			<section class="card-item codeForm" v-else>
				<i18n-t scope="global" tag="p" keypath="discord.install_code">
					<template #CMD><mark>/link</mark></template>
				</i18n-t>
				<div class="code">
					<input
						type="text"
						placeholder="_"
						v-for="(i, index) in codeLength"
						@keydown="onKeyDown"
						@input="onChange"
						:value="code[index]"
						v-click2Select
						ref="codeInput"
					/>
				</div>

				<div class="info">
					<Icon name="alert" />
					<i18n-t scope="global" keypath="discord.install_warn">
						<template #CMD><mark>/link</mark></template>
					</i18n-t>
				</div>
				<Icon class="loader" name="loader" v-if="linkLoading" />
			</section>
		</div>
		<div @click="errorCode = ''" v-if="errorCode" class="card-item alert error">
			{{ t("error.discord." + errorCode, { CHANNEL: errorChan }) }}
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import MessageItem from "@/components/messages/MessageItem.vue";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeDiscord as useStoreDiscord } from "@/store/discord/storeDiscord";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import { computed, nextTick, onBeforeMount, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import ParamsDiscordQuickActions from "../discord/ParamsDiscordQuickActions.vue";

const { t } = useI18n();
const storeChat = useStoreChat();
const storeDiscord = useStoreDiscord();
const storeParams = useStoreParams();

const codeInput = useTemplateRef("codeInput");

const code = ref("");
const codeLength = ref(4);
const discordName = ref("");
const validateDebounce = ref(-1);
const submitting = ref(false);
const refreshingChans = ref(false);
const linkLoading = ref(false);
const askLinkConfirmation = ref(false);
const errorCode = ref("");
const errorChan = ref("");
const param_reactions = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "discord.reactions",
});
const param_banLogThread = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "discord.channel_ban_log_thread",
});
const messagePreview = ref<TwitchatDataTypes.MessageCustomData>({
	channel_id: "",
	date: Date.now(),
	id: Utils.getUUID(),
	platform: "twitchat",
	type: TwitchatDataTypes.TwitchatMessageType.CUSTOM,
	message: "Lorem ipsum dolor sit amet.",
	icon: "discord",
	user: {
		name: "DiscordUser",
	},
});

/**
 * Get discord channel list
 */
const channelList = computed<{ id: string; name: string }[]>(() => {
	const list = (storeDiscord.channelList || []).concat();
	list.unshift({ id: "", name: t("global.select_placeholder") });
	return list;
});

onBeforeMount(() => {
	saveParams();
});

/**
 * Called when pressing a key on an input of the code form
 */
function onKeyDown(event: KeyboardEvent): void {
	if (event.key == "Backspace") {
		//Set focus to prev input
		const inputs = codeInput.value!;
		let index = inputs.findIndex((v) => v === event.target);
		let currentInput = event.target as HTMLInputElement;
		if (currentInput.selectionEnd) {
			//Remove all chars after the carret
			currentInput.value = "";
		}
		index--;
		if (index < 0) index = 0;
		inputs[index]!.focus();
		inputs[index]!.select();
		event.stopPropagation();
		event.preventDefault();
		//Define new code as a concatenation of all inputs values
		code.value = inputs
			.map((v) => v.value)
			.join("")
			.substring(0, codeLength.value);
	}
}

/**
 * Called anytime an input's value changes
 * cycles the focus and manage copy/paste properly
 */
function onChange(event: Event): void {
	const inputs = codeInput.value!;
	const currentInput = event.target as HTMLInputElement;
	if (currentInput.selectionEnd) {
		//Remove all chars after the carret
		currentInput.value = currentInput.value.substring(0, currentInput.selectionEnd);
	}

	//Set focus to next input
	let index = inputs.findIndex((v) => v === event.target);
	index++;
	if (index > inputs.length - 1) index = 0;
	inputs[index]!.focus();
	inputs[index]!.select();

	//Define new code as a concatenation of all inputs values
	code.value = inputs
		.map((v) => v.value)
		.join("")
		.substring(0, codeLength.value);

	if (code.value.length == codeLength.value) {
		linkLoading.value = true;
		errorCode.value = "";
		//Debounce updates to avoid spamming server
		clearTimeout(validateDebounce.value);
		validateDebounce.value = window.setTimeout(() => {
			validateCode();
		}, 500);
	}
}

/**
 * Validate current code
 */
async function validateCode(): Promise<void> {
	linkLoading.value = true;

	const res = await storeDiscord.validateCode(code.value);
	if (res.success) {
		discordName.value = res.guildName || "???";
		askLinkConfirmation.value = true;
	} else {
		errorCode.value = res.errorCode || "UNKNOWN";
	}

	linkLoading.value = false;
}

/**
 * Validate discord linking
 */
async function confirmLink(): Promise<void> {
	submitting.value = true;

	const res = await storeDiscord.submitCode(code.value);
	if (res !== true) {
		errorCode.value = res.code;
		errorChan.value = res.channelName || "???";
	}
	askLinkConfirmation.value = false;

	submitting.value = false;
	await nextTick();
	saveParams();
}

/**
 * Unlink discord
 */
async function unlink(): Promise<void> {
	submitting.value = true;

	const res = await storeDiscord.unlinkDiscord();
	if (res !== true) errorCode.value = res;

	submitting.value = false;
}

/**
 * Unlink discord
 */
async function refreshChannels(): Promise<void> {
	refreshingChans.value = true;

	await storeDiscord.loadChannelList();

	//Make sure loader is visible and avoid spam
	await Utils.promisedTimeout(500);

	refreshingChans.value = false;
}

/**
 * Called when selecting a column
 */
function selectColumn(index: number): void {
	const arrayIndex = storeDiscord.chatCols.indexOf(index);
	if (arrayIndex == -1) {
		storeDiscord.chatCols.push(index);
	} else {
		storeDiscord.chatCols.splice(arrayIndex, 1);
	}
	saveParams();
}

/**
 * Saves params
 */
async function saveParams(): Promise<void> {
	if (storeDiscord.reactionsEnabled) {
		const actions: TwitchatDataTypes.MessageCustomData["actions"] = [];
		["👌", "❤️", "😂", "😟", "⛔"].forEach((reaction) => {
			actions.push({
				label: reaction,
			});
		});
		messagePreview.value.actions = actions;
	} else {
		messagePreview.value.actions = [];
	}
	storeDiscord.saveParams();
}

/**
 * Open triggers page
 */
function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}

defineExpose({
	onNavigateBack: () => false,
});
</script>

<style scoped lang="less">
.paramsdiscord {
	max-width: calc(100vw - 350px) !important;

	.error {
		cursor: pointer;
		align-self: center;
	}

	.loader {
		height: 2em;
		margin: auto;
		display: block;
	}

	.unlinkBt,
	.refreshBt {
		align-self: center;
	}

	.content {
		align-self: center;
		max-width: 1000px;
		gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		align-items: flex-start;

		section {
			margin: unset;
			&:not(.codeForm) {
				max-width: 320px;
			}
			& > .icon {
				height: 2em;
				margin: auto;
				vertical-align: middle;
			}
			span {
				line-height: 1.25em;
				white-space: pre-line;
			}

			ul {
				max-height: 200px;
				overflow: auto;
				li {
					margin-bottom: 0.25em;
					.button {
						width: 100%;
					}
				}
			}
			.info {
				font-size: 0.8em;
				text-align: justify;
				background-color: var(--color-secondary-fadest);
				.icon {
					height: 1em;
					margin-right: 0.25em;
				}
			}
			.columnList {
				gap: 0.5em;
				row-gap: 0.25em;
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				justify-content: center;
			}

			&.reactions {
				max-width: 320px;
				.message {
					border-radius: var(--border-radius);
					background-color: var(--background-color-primary);
				}
			}
			&.slashCmd {
				font-size: 0.9em;
				span .icon {
					height: 1em;
					vertical-align: middle;
				}
			}
		}
	}

	.confirm {
		text-align: center;
		align-items: center;
		.discordName {
			font-size: 1.5em;
		}

		.ctas {
			gap: 1em;
			row-gap: 0.5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
		}
	}
	.codeForm {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		max-width: 400px;
		line-height: 1.2em;
		.code {
			gap: 1em;
			display: flex;
			flex-direction: row;
			input {
				text-transform: uppercase;
				font-size: 3em;
				width: 1.5em;
				text-align: center;
				padding: 0.25em;
			}
		}
	}
}
@media only screen and (max-width: 800px) {
	.paramsdiscord {
		max-width: unset !important;
		.codeForm {
			.code {
				input {
					font-size: 2.5em;
				}
			}
		}
	}
}
</style>
