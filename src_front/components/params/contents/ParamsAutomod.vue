<template>
	<div class="paramsautomod parameterContent">
		<Icon name="mod" class="icon" />

		<div class="head">{{ t("automod.header") }}</div>

		<ParamItem
			class="enableBt"
			:paramData="param_enabled"
			v-model="automodData.enabled"
			@change="save()"
		/>

		<div class="card-item disclaimers">
			<ToggleBlock
				class="infos first"
				:title="t('automod.disclaimers.why.title')"
				small
				:open="false"
			>
				<p
					v-for="label in <string[]>tm('automod.disclaimers.why.contents')"
					v-html="label"
				></p>
			</ToggleBlock>
			<ToggleBlock
				class="infos"
				:title="t('automod.disclaimers.delete.title')"
				small
				:open="false"
			>
				<p
					v-for="label in <string[]>tm('automod.disclaimers.delete.contents')"
					v-html="label"
				></p>
			</ToggleBlock>
		</div>

		<div class="fadeHolder" :style="holderStyles">
			<Splitter class="splitter">{{ t("automod.rule.title") }}</Splitter>

			<section>
				<div class="ruleList" v-if="automodData.keywordsFilters.length > 0">
					<ToggleBlock
						class="rule"
						v-for="f in automodData.keywordsFilters"
						:key="f.id"
						:title="f.label.length > 0 ? f.label : t('automod.rule.new')"
						:open="keywordToOpen[f.id]"
					>
						<template #left_actions>
							<ToggleButton
								class="toggleButton"
								v-model="f.enabled"
								@click.stop=""
								clear
								v-tooltip="t('automod.rule.toggle_tt')"
							/>
						</template>
						<template #right_actions>
							<TTButton
								icon="trash"
								alert
								class="deleteBt"
								@click.stop="deleteRule(f)"
							/>
						</template>
						<div class="ruleContent">
							<ParamItem
								class="sync"
								:paramData="param_ruleSync[f.id]!"
								v-model="f.serverSync"
								v-tooltip="t('automod.rule.sync_tt')"
							/>
							<ParamItem
								class="emergency"
								:paramData="param_ruleEmergency[f.id]!"
								v-model="f.emergency"
								v-tooltip="t('automod.rule.emergency_tt')"
							/>
							<ParamItem
								class="onlyFirst"
								:paramData="param_ruleOnlyFirst[f.id]!"
								v-model="f.firstTimeChatters"
								v-tooltip="t('automod.rule.firstTime_tt')"
							/>
							<ParamItem
								class="ruleName"
								:paramData="param_ruleLabel[f.id]!"
								v-model="f.label"
							/>
							<ParamItem
								class="rule"
								:paramData="param_ruleRegex[f.id]!"
								v-model="f.regex"
								:error="keywordToValid[f.id] === false"
								:errorMessage="t('automod.rule.invalid_rule')"
								@change="onRegexChange(f)"
							/>
						</div>
					</ToggleBlock>
				</div>
				<TTButton icon="add" class="addBt" @click="addRule()">{{
					t("automod.rule.add")
				}}</TTButton>
			</section>

			<Splitter class="splitter">{{ t("automod.test.title") }}</Splitter>

			<section class="card-item testForm">
				<input
					type="text"
					v-model="testStr"
					:placeholder="t('automod.test.input_placeholder')"
				/>
				<div class="result" v-if="testClean" v-tooltip="t('automod.test.result_tt')">
					{{ testClean }}
				</div>
				<div class="card-item secondary matchingRules" v-if="blockedBy.length > 0">
					<p class="title">{{ t("automod.test.blocked_title", blockedBy.length) }}</p>
					<ul>
						<li v-for="r in blockedBy">{{ r.label }}</li>
					</ul>
				</div>
				<div class="card-item primary pass" v-else-if="testStr.length > 0">
					{{ t("automod.test.no_block") }}
				</div>
			</section>

			<Splitter class="splitter">{{ t("automod.options.title") }}</Splitter>

			<section class="card-item options">
				<ParamItem
					class=""
					:paramData="param_banUserNames"
					v-model="automodData.banUserNames"
					@change="save()"
					noBackground
				/>
				<div class="permsTitle">
					<Icon name="user" />{{ t("automod.options.exclude_users") }}
				</div>
				<PermissionsForm class="perms" v-model="automodData.exludedUsers" />
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import Splitter from "@/components/Splitter.vue";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import UnicodeUtils from "@/utils/UnicodeUtils";
import Utils from "@/utils/Utils";
import { computed, onBeforeMount, ref, watch, type CSSProperties } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../../TTButton.vue";
import ToggleBlock from "../../ToggleBlock.vue";
import ToggleButton from "../../ToggleButton.vue";
import ParamItem from "../ParamItem.vue";
import PermissionsForm from "../../PermissionsForm.vue";
import type IParameterContent from "./IParameterContent";
import Icon from "@/components/Icon.vue";
import { useConfirm } from "@/composables/useConfirm";
import { storeAutomod as useStoreAutomod } from "@/store/automod/storeAutomod";

const { t, tm } = useI18n();
const { confirm } = useConfirm();
const storeAutomod = useStoreAutomod();

const testStr = ref<string>(""); //ⓣ🅗ｉ⒮ 𝖎𝓼 𝕒 𝙩🄴🆂𝔱 - ǝsɹǝʌǝɹ
const param_enabled = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "global.enable",
});
const param_banUserNames = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "automod.ban_usernames",
	icon: "user",
});
const param_ruleLabel = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_ruleRegex = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_ruleSync = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_ruleEmergency = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_ruleOnlyFirst = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const keywordToValid = ref<{ [key: string]: boolean }>({});
const keywordToOpen = ref<{ [key: string]: boolean }>({});
const automodData = ref<TwitchatDataTypes.AutomodParamsData>(null!);

/**
 * Cleaned up test string with special chars replaced
 */
const testClean = computed<string>(() => {
	return UnicodeUtils.instance.normalizeAlphaNum(testStr.value).toLowerCase().trim();
});

/**
 * Check if the current test matches any of the rules
 */
const blockedBy = computed<TwitchatDataTypes.AutomodParamsKeywordFilterData[]>(() => {
	if (testClean.value.length == 0) return [];

	let matchingRules: TwitchatDataTypes.AutomodParamsKeywordFilterData[] = [];
	for (const f of automodData.value.keywordsFilters) {
		if (f.regex.trim().length === 0) continue;
		let reg!: RegExp,
			valid: boolean = true;
		try {
			reg = new RegExp(f.regex.trim(), "gi");
		} catch (error) {
			valid = false;
		}
		if (valid) {
			if (reg.test(testClean.value)) {
				matchingRules.push(f);
			} else if (
				reg.test(UnicodeUtils.instance.normalizeLeet(testStr.value).toLowerCase().trim())
			) {
				matchingRules.push(f);
			}
		}
	}
	return matchingRules;
});

/**
 * Fade content when automod is disabled
 */
const holderStyles = computed<CSSProperties>(() => {
	return {
		opacity: param_enabled.value.value === true ? 1 : 0.5,
		pointerEvents: param_enabled.value.value === true ? "all" : "none",
	};
});

/**
 * Add a rule
 */
function addRule(): void {
	const item: TwitchatDataTypes.AutomodParamsKeywordFilterData = {
		id: Utils.getUUID(),
		label: "",
		regex: "",
		enabled: true,
		serverSync: true,
		emergency: false,
		firstTimeChatters: false,
	};
	automodData.value.keywordsFilters.push(item);
	initRule(item);
}

/**
 * Delete a rule
 */
function deleteRule(rule: TwitchatDataTypes.AutomodParamsKeywordFilterData): void {
	confirm(t("automod.delete_confirm_title"), t("automod.delete_confirm_description"))
		.then(() => {
			for (let i = 0; i < automodData.value.keywordsFilters.length; i++) {
				const f = automodData.value.keywordsFilters[i]!;
				if (f.id == rule.id) {
					automodData.value.keywordsFilters.splice(i, 1);
					i--;
				}
			}
		})
		.catch(() => {});
}

/**
 * Save automod params
 */
function save(): void {
	storeAutomod.setAutomodParams(automodData.value);
}

/**
 * Test if a regex is valid
 */
function onRegexChange(data: TwitchatDataTypes.AutomodParamsKeywordFilterData): void {
	let valid: boolean = true;
	try {
		new RegExp(data.regex, "gi");
	} catch (error) {
		valid = false;
	}
	keywordToValid.value[data.id] = valid;
}

function initRule(data: TwitchatDataTypes.AutomodParamsKeywordFilterData): void {
	keywordToOpen.value[data.id] = data.label.length === 0 || data.regex.length === 0;
	keywordToValid.value[data.id] = true;
	param_ruleLabel.value[data.id] = {
		labelKey: "automod.rule.name",
		type: "string",
		value: "",
		maxLength: 30,
	};
	param_ruleRegex.value[data.id] = {
		labelKey: "automod.rule.keywords",
		type: "string",
		value: "",
		maxLength: 5000,
		longText: true,
	};
	param_ruleSync.value[data.id] = {
		labelKey: "automod.rule.sync",
		type: "boolean",
		value: false,
		icon: "anon",
	};
	param_ruleEmergency.value[data.id] = {
		labelKey: "automod.rule.emergency",
		type: "boolean",
		value: false,
		icon: "emergency",
	};
	param_ruleOnlyFirst.value[data.id] = {
		labelKey: "automod.rule.firstTime",
		type: "boolean",
		value: false,
		icon: "firstTime",
	};
}

onBeforeMount(() => {
	automodData.value = JSON.parse(JSON.stringify(storeAutomod.params));
	param_enabled.value.value = automodData.value.enabled;
	param_banUserNames.value.value = automodData.value.banUserNames;
	automodData.value.keywordsFilters.forEach((v) => {
		initRule(v);
	});
});

watch(
	() => automodData.value,
	() => save(),
	{ deep: true },
);

defineExpose<IParameterContent>({
	onNavigateBack: () => {
		return false;
	},
});
</script>

<style scoped lang="less">
.paramsautomod {
	.disclaimers {
		.infos {
			line-height: 1.3em;
			p {
				min-height: 1em;
			}
		}
	}

	.options {
		.perms {
			width: 100%;
		}
		.icon {
			width: 1em;
			height: 1em;
			margin-right: 0.5em;
		}
	}

	.fadeHolder {
		transition: opacity 0.2s;

		section {
			&.testForm {
				display: flex;
				flex-direction: column;
				width: fit-content;
				width: 300px;

				input {
					z-index: 1;
				}

				*:not(:first-child) {
					margin-top: 0.25em;
				}
				.result {
					margin: auto;
					text-align: center;
					margin-top: -0.5em;
					padding: 0.25em 0.5em;
					width: calc(100% - 1.5em);
					background-color: var(--color-secondary-fadest);
					border-bottom-left-radius: 0.5em;
					border-bottom-right-radius: 0.5em;
					word-wrap: break-word;
					font-size: 0.9em;
				}

				.pass {
					text-align: center;
				}

				.matchingRules {
					.title {
						font-weight: bold;
					}

					ul {
						li {
							list-style-position: inside;
						}
					}
				}
			}

			.addBt {
				margin: auto;
			}

			.ruleList {
				display: flex;
				flex-direction: row;
				flex-direction: column;
				// flex-wrap: wrap;
				justify-content: center;
				gap: 0.5em;

				.rule {
					width: 100%;
					.ruleContent {
						gap: 0.5em;
						display: flex;
						flex-direction: column;

						.sync {
							width: fit-content;
							margin: auto;
						}
					}
				}
			}
		}
	}
}
</style>
