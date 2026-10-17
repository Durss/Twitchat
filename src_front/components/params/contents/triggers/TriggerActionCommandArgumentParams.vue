<template>
	<div class="triggeractioncommandargumentparams">
		<div class="head">
			<Icon name="placeholder" class="icon" />
			<label v-tooltip="t('triggers.slash_cmd.param_cmd_params_tt')">{{
				t("triggers.slash_cmd.param_cmd_params")
			}}</label>
			<TabMenu
				class="modeSelector"
				small
				v-model="captureMode"
				:values="modeValues"
				:labels="[
					t('triggers.slash_cmd.param_cmd_params_mode_simple'),
					t('triggers.slash_cmd.param_cmd_params_mode_regex'),
				]"
				@change="onChangeMode()"
			/>
		</div>

		<div class="form" v-if="capture">
			<!-- Simple pattern mode -->
			<template v-if="capture.mode == 'pattern'">
				<div class="addForm">
					<div class="input-field tagField">
						<PlaceholderField
							v-model="newTag"
							:suffix="newTagGreedy ? '...' : ''"
							:placeholder="t('triggers.slash_cmd.param_cmd_params_placeholder')"
							@keyup.enter="insertPlaceholder()"
						/>
					</div>
					<TabMenu
						class="greedySelector"
						small
						v-model="newTagGreedy"
						:values="greedyValues"
						:labels="[
							t('triggers.slash_cmd.param_cmd_params_greedy_word'),
							t('triggers.slash_cmd.param_cmd_params_greedy_rest'),
						]"
						:tooltips="[
							t('triggers.slash_cmd.param_cmd_params_greedy_word_tt'),
							t('triggers.slash_cmd.param_cmd_params_greedy_rest_tt'),
						]"
					/>
					<TTButton
						icon="add"
						small
						primary
						:disabled="newTag.length == 0"
						@click="insertPlaceholder()"
						>{{ t("triggers.slash_cmd.param_cmd_params_addBt") }}</TTButton
					>
				</div>
				<div class="patternField input-field" @click="focusPattern()">
					<span class="cmdPrefix" v-if="commandPrefix">{{ commandPrefix }}</span>
					<ContentEditable
						tag="div"
						class="patternInput"
						ref="patternInput"
						v-model="patternValue"
						:no-nl="true"
						:no-html="true"
						:max-length="500"
						:placeholder="t('triggers.slash_cmd.param_cmd_params_pattern_placeholder')"
						spellcheck="false"
						@keyup="onPatternCursor()"
						@click.stop="onPatternCursor()"
						@focus="onPatternCursor()"
					/>
				</div>
			</template>

			<!-- Regex mode -->
			<template v-else>
				<select class="presets" v-model="presetValue" @change="onSelectPreset()">
					<option value="" disabled>
						{{ t("triggers.slash_cmd.param_cmd_params_regex_presets") }}
					</option>
					<option v-for="preset in presets" :key="preset.labelKey" :value="preset.regex">
						{{ t(preset.labelKey) }}
					</option>
				</select>
				<div
					class="regexField input-field"
					v-tooltip="t('triggers.slash_cmd.param_cmd_params_regex_tt')"
				>
					<span class="cmdPrefix" v-if="commandPrefix">{{ commandPrefix }}</span>
					<input
						type="text"
						class="noBg regexInput"
						v-model="regexValue"
						:maxlength="maxRegexLength"
						spellcheck="false"
						autocomplete="off"
						placeholder="(?<DURATION>[0-9]+) (?<MESSAGE>.+)"
						@input="onRegexEdit()"
					/>
				</div>
			</template>

			<div class="card-item alert errors" v-if="errorList.length > 0 || duplicateError">
				<div v-if="duplicateError">
					{{ t("triggers.slash_cmd.param_cmd_params_error_duplicate_tag") }}
				</div>
				<i18n-t
					scope="global"
					:keypath="`triggers.slash_cmd.param_cmd_params_error_${error}`"
					v-for="error in errorList"
					:key="error"
				>
					<template #EXAMPLE
						><mark>{{
							t(`triggers.slash_cmd.param_cmd_params_error_${error}_example`)
						}}</mark></template
					>
				</i18n-t>
			</div>

			<ToggleBlock
				:title="t('triggers.slash_cmd.param_cmd_params_example')"
				small
				:open="false"
				class="usage"
				v-if="tagList.length > 0"
			>
				<div class="content">
					<div class="example input-field dark">
						<span class="command">{{ props.triggerData.chatCommand || "" }}&nbsp;</span>
						<input type="text" v-model="usage" />
					</div>
					<div class="result">
						<div class="values">
							<template v-for="tag in tagList" :key="tag">
								<mark @click="copy($event, tag)" v-click2Select
									>{{ "{" }}{{ tag }}{{ "}" }}</mark
								>
								<Icon name="right" class="arrow" />
								<span class="quote" v-if="testResult.values[tag]">{{
									testResult.values[tag]
								}}</span>
								<span class="quote noMatch" v-else>
									<Icon name="cross" />
								</span>
							</template>
						</div>
					</div>
				</div>
			</ToggleBlock>
		</div>
	</div>
</template>

<script setup lang="ts">
import ContentEditable from "@/components/ContentEditable.vue";
import Icon from "@/components/Icon.vue";
import PlaceholderField from "@/components/PlaceholderField.vue";
import TabMenu from "@/components/TabMenu.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import type { TriggerChatCommandParam, TriggerData } from "@/types/TriggerActionDataTypes";
import ChatCommandCaptureUtils, {
	type CaptureMatchResult,
	type CaptureValidationError,
} from "@/utils/triggers/ChatCommandCaptureUtils";
import Utils from "@/utils/Utils";
import { gsap } from "gsap";
import { computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const props = defineProps<{
	triggerData: TriggerData;
}>();

const modeValues: ("pattern" | "regex")[] = ["pattern", "regex"];
const greedyValues: boolean[] = [false, true];
const maxRegexLength = ChatCommandCaptureUtils.MAX_REGEX_LENGTH;
const presets: { labelKey: string; regex: string }[] = [
	{
		labelKey: "triggers.slash_cmd.param_cmd_params_preset_number_text",
		regex: "(?<NUMBER>[0-9]+)\\s+(?<MESSAGE>.+)",
	},
	{
		labelKey: "triggers.slash_cmd.param_cmd_params_preset_word_text",
		regex: "(?<TARGET>\\S+)\\s+(?<MESSAGE>.+)",
	},
	{
		labelKey: "triggers.slash_cmd.param_cmd_params_preset_user_text",
		regex: "@?(?<USER>[a-zA-Z0-9_]{3,25})\\s+(?<MESSAGE>.+)",
	},
	{
		labelKey: "triggers.slash_cmd.param_cmd_params_preset_quotes",
		regex: '"(?<QUOTE>[^"]+)"',
	},
	{
		labelKey: "triggers.slash_cmd.param_cmd_params_preset_chars",
		regex: "(?<START>.{1,10})",
	},
];

const usage = ref('Lorem ipsum "dolor" sit amet');
const newTag = ref("");
const newTagGreedy = ref<boolean | undefined>(false);
const captureMode = ref<"pattern" | "regex" | undefined>("pattern");
const patternValue = ref("");
const regexValue = ref("");
const presetValue = ref("");
const duplicateError = ref(false);
const lastCaretIndex = ref(-1);
const patternInput = ref<InstanceType<typeof ContentEditable>>();

// Class name for CSS Highlight API to highlight placeholders on content editable
const HIGHLIGHT_NAME = "twitchat-cmd-param-token";

const capture = computed(() => props.triggerData.chatCommandCapture);
const commandPrefix = computed(() => (props.triggerData.chatCommand || "").trim());

const tagList = computed<string[]>(() =>
	capture.value ? ChatCommandCaptureUtils.getTags(capture.value) : [],
);

const errorList = computed<CaptureValidationError[]>(() =>
	capture.value ? ChatCommandCaptureUtils.validate(capture.value) : [],
);

const testResult = computed<CaptureMatchResult>(() => {
	if (!capture.value) return { values: {} };
	let text = usage.value.trim();
	//Strip the command the same way the trigger runtime does
	if (commandPrefix.value) {
		const cmdSafe = commandPrefix.value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		text = text.replace(new RegExp(cmdSafe, "i"), "").trim();
	}
	return ChatCommandCaptureUtils.match(capture.value, text);
});

onBeforeMount(() => {
	if (!props.triggerData.chatCommandCapture) {
		props.triggerData.chatCommandCapture = {
			mode: "pattern",
			pattern: "",
			regex: "",
			regexEdited: false,
		};
	}
	captureMode.value = props.triggerData.chatCommandCapture.mode;
	patternValue.value = props.triggerData.chatCommandCapture.pattern;
	regexValue.value = props.triggerData.chatCommandCapture.regex;
	syncParams();
});

watch(tagList, () => syncParams());
watch(patternValue, () => onPatternEdit());

onMounted(() => {
	nextTick().then(() => updateHighlights());
});

onBeforeUnmount(() => {
	if (supportsHighlightAPI()) CSS.highlights.delete(HIGHLIGHT_NAME);
});

function onChangeMode(): void {
	if (!capture.value) return;
	capture.value.mode = captureMode.value == "regex" ? "regex" : "pattern";
	if (capture.value.mode == "regex" && !capture.value.regexEdited) {
		//Prefill regex from the compiled pattern as long as it wasn't hand-edited
		capture.value.regex =
			capture.value.pattern.trim().length > 0
				? ChatCommandCaptureUtils.compilePattern(capture.value.pattern).strict
				: "";
		regexValue.value = capture.value.regex;
	}
	if (capture.value.mode == "pattern") {
		nextTick().then(() => updateHighlights());
	} else if (supportsHighlightAPI()) {
		CSS.highlights.delete(HIGHLIGHT_NAME);
	}
}

function onPatternEdit(): void {
	if (!capture.value) return;
	capture.value.pattern = patternValue.value;
	if (!capture.value.regexEdited) {
		capture.value.regex =
			patternValue.value.trim().length > 0
				? ChatCommandCaptureUtils.compilePattern(patternValue.value).strict
				: "";
		regexValue.value = capture.value.regex;
	}
	nextTick().then(() => updateHighlights());
}

function supportsHighlightAPI(): boolean {
	return typeof Highlight != "undefined" && typeof CSS != "undefined" && !!CSS.highlights;
}

/**
 * Highlights all {PLACEHOLDERS} with CSS highlight API
 */
function updateHighlights(): void {
	if (!supportsHighlightAPI()) return;
	const el = patternInput.value?.$el as HTMLElement;
	if (!el) return;
	const textNodes: { node: Text; start: number }[] = [];
	let totalLength = 0;
	el.childNodes.forEach((node) => {
		if (node instanceof Text) {
			textNodes.push({ node, start: totalLength });
			totalLength += node.length;
		}
	});
	const fullText = textNodes.map((entry) => entry.node.data).join("");
	const highlight = new Highlight();
	const reg = /\{[a-z0-9_]+(?:\.\.\.)?\}/gi;
	let match: RegExpExecArray | null;
	while ((match = reg.exec(fullText)) != null) {
		const range = buildRange(textNodes, match.index, match.index + match[0].length);
		if (range) highlight.add(range);
	}
	CSS.highlights.set(HIGHLIGHT_NAME, highlight);
}

/**
 * Builds a Range from global text offsets, mapped onto the given text nodes
 */
function buildRange(
	textNodes: { node: Text; start: number }[],
	start: number,
	end: number,
): Range | null {
	let startNode: Text | null = null;
	let startOffset = 0;
	let endNode: Text | null = null;
	let endOffset = 0;
	for (const entry of textNodes) {
		const nodeEnd = entry.start + entry.node.length;
		if (!startNode && start >= entry.start && start <= nodeEnd) {
			startNode = entry.node;
			startOffset = start - entry.start;
		}
		if (end >= entry.start && end <= nodeEnd) {
			endNode = entry.node;
			endOffset = end - entry.start;
			break;
		}
	}
	if (!startNode || !endNode) return null;
	const range = new Range();
	range.setStart(startNode, startOffset);
	range.setEnd(endNode, endOffset);
	return range;
}

/**
 * Gets the caret position within the pattern field's text.
 * Returns -1 if the selection isn't inside the field.
 */
function getCaretIndex(): number {
	const el = patternInput.value?.$el as HTMLElement;
	const selection = window.getSelection();
	if (!el || !selection || selection.rangeCount == 0) return -1;
	const range = selection.getRangeAt(0);
	if (!el.contains(range.startContainer)) return -1;
	const preRange = document.createRange();
	preRange.selectNodeContents(el);
	preRange.setEnd(range.startContainer, range.startOffset);
	return preRange.toString().length;
}

function onRegexEdit(): void {
	if (!capture.value) return;
	capture.value.regex = regexValue.value;
	//Erasing the regex re-enables auto-generation from the simple mode pattern
	capture.value.regexEdited = regexValue.value.trim().length > 0;
}

function onSelectPreset(): void {
	if (!presetValue.value) return;
	regexValue.value = presetValue.value;
	presetValue.value = "";
	onRegexEdit();
}

/**
 * Memorizes the caret position so placeholders get inserted where the
 * user left it
 */
function onPatternCursor(): void {
	const index = getCaretIndex();
	if (index > -1) lastCaretIndex.value = index;
}

async function insertPlaceholder(): Promise<void> {
	if (!capture.value || newTag.value.length == 0) return;
	const tag = newTag.value.toUpperCase();
	if (tagList.value.includes(tag)) {
		duplicateError.value = true;
		window.setTimeout(() => (duplicateError.value = false), 3000);
		return;
	}
	const token = "{" + tag + (newTagGreedy.value === true ? "..." : "") + "}";
	let index = patternValue.value.length;
	if (lastCaretIndex.value > -1 && lastCaretIndex.value <= patternValue.value.length) {
		index = lastCaretIndex.value;
	}
	const before = patternValue.value.substring(0, index);
	const after = patternValue.value.substring(index);
	let insert = token;
	if (before.length > 0 && !/\s$/.test(before)) insert = " " + insert;
	if (after.length > 0 && !/^\s/.test(after)) insert += " ";
	patternValue.value = before + insert + after;
	newTag.value = "";

	await nextTick();
	const input = patternInput.value;
	if (input) {
		input.focus();
		input.moveCaretTo((before + insert).length);
		onPatternCursor();
	}
}

/**
 * Keeps triggerData.chatCommandParams in sync with the capture definition.
 * That list is consumed by the placeholders/conditions systems and remains
 * the fallback format for older clients.
 */
function syncParams(): void {
	const prevParams = props.triggerData.chatCommandParams || [];
	props.triggerData.chatCommandParams = tagList.value.map<TriggerChatCommandParam>(
		(tag) => prevParams.find((p) => p.tag.toUpperCase() == tag) || { type: "TEXT", tag },
	);
}

function focusPattern(): void {
	patternInput.value?.focus();
}

function copy(event: MouseEvent, tag: string): void {
	Utils.copyToClipboard("{" + tag + "}");
	gsap.fromTo(
		event.currentTarget,
		{ scale: 1.2 },
		{ duration: 0.5, scale: 1, ease: "back.out(1.7)" },
	);
}
</script>

<style scoped lang="less">
.triggeractioncommandargumentparams {
	display: flex;
	flex-direction: column;
	gap: 0.5em;

	.head {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5em;
		.icon {
			height: 1em;
			width: 1em;
			object-fit: fill;
		}
		label {
			flex-grow: 1;
			cursor: pointer;
		}
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		margin-left: 1.5em;
	}

	.patternField,
	.regexField {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 0;
		&::-webkit-scrollbar-track {
			box-shadow: inset 0 0 5px F2F2F2;
			border-radius: 0px;
			margin: 5px;
		}
		&::-webkit-scrollbar-thumb {
			background-color: var(--color-text-fade);
		}
		&::-webkit-scrollbar {
			height: 5px;
		}
		.cmdPrefix {
			opacity: 0.7;
			padding-left: 0.5em;
			margin-right: -0.25em;
			user-select: none;
			font-family: var(--font-inter);
		}
	}

	.patternField {
		cursor: text;
		overflow-x: auto;
		overflow-y: hidden;

		.patternInput {
			flex-grow: 1;
			min-width: 0;
			padding: 0.25em 0.5em;
			white-space: pre;

			&::highlight(twitchat-cmd-param-token) {
				background-color: var(--color-primary);
				color: var(--color-light);
			}
		}
	}

	.regexField {
		.regexInput {
			width: 100%;
			box-shadow: none;
			font-family: "Courier New", monospace;
		}
	}

	.presets {
		align-self: flex-start;
		max-width: 100%;
	}

	.addForm {
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5em;
		.tagField {
			padding: 0 0.5em;
		}
	}

	.errors {
		white-space: pre-line;
		mark {
			white-space: pre;
			font-family: monospace;
		}
	}

	.usage {
		.content {
			background-color: var(--color-primary-fadest);
			padding: 0.5em;
			border-radius: 0.5em;
			display: flex;
			flex-direction: column;
			gap: 0.5em;
			.example {
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: stretch;
				flex: 1;
				.command {
					opacity: 0.8;
					flex-shrink: 0;
				}
				input {
					flex: 1;
					background: transparent;
					font-weight: inherit;
					padding-left: 0;
					justify-self: stretch;
					&:focus {
						outline: none;
						box-shadow: none;
					}
				}
			}
			.result {
				display: flex;
				flex-direction: column;
				align-items: stretch;
				gap: 0.5em;
			}
			.arrow {
				height: 0.75em;
				margin: 0 0.5em;
			}
			.noMatch {
				color: var(--color-alert-light);
				.icon {
					vertical-align: middle;
				}
			}
			.values {
				display: grid;
				grid-template-columns: auto auto 1fr;
				align-items: center;
				gap: 0.25em;
			}
			mark {
				cursor: pointer !important;
			}
		}
	}
}
</style>
