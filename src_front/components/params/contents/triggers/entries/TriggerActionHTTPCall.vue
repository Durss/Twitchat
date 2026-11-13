<template>
	<div class="triggeractionhttpcall triggerActionForm">
		<ParamItem
			:paramData="param_url"
			v-model="props.action.url"
			:error="securityError"
			:errorMessage="t('triggers.actions.http_ws.protocol_error')"
		/>

		<ParamItem class="row item" :paramData="param_method" v-model="props.action.method">
			<ParamItem
				class="row child item"
				:paramData="param_sendAsBody"
				v-model="props.action.sendAsBody"
				v-if="props.action.method == 'POST' || props.action.method == 'PATCH'"
				noBackground
			/>
			<ParamItem
				class="row child item"
				:paramData="param_custom_body"
				v-model="props.action.customBody"
				v-if="props.action.method == 'POST' || props.action.method == 'PATCH'"
				noBackground
			/>
		</ParamItem>

		<ParamItem
			class="row item"
			:paramData="param_customHeaders"
			v-model="props.action.customHeaders"
		>
			<div class="headerList">
				<div
					class="header head"
					v-if="props.action.headers && props.action.headers.length > 0"
				>
					<div>Key</div>
					<div>Value</div>
				</div>
				<div v-for="(a, index) in props.action.headers" class="header">
					<input type="text" v-model="props.action.headers![index]!.key" />
					<ParamItem
						:paramData="getParamHeaderValue(index)"
						placeholdersAsPopout
						v-model="props.action.headers![index]!.value"
						noBackground
					/>
					<TTButton class="deleteBt" icon="trash" @click="delHeader(index)" alert />
				</div>
				<TTButton
					class="addBt"
					icon="add"
					v-if="(props.action.headers || []).length < 20"
					@click="addHeader()"
					>{{ t("triggers.actions.http_ws.add_headerBt") }}</TTButton
				>
			</div>
		</ParamItem>

		<ToggleBlock
			class="tags"
			v-if="parameters.length > 0"
			:title="t('triggers.actions.http_ws.select_param')"
			:open="false"
			medium
		>
			<div class="searchContainer" v-if="parameters.length > 8">
				<input
					class="searchField"
					type="text"
					v-model="searchText"
					autocomplete="off"
					:placeholder="t('global.search_placeholder')"
					@keydown.capture="onSearchKeydown"
				/>
				<TTButton
					class="clearButton"
					transparent
					icon="cross"
					@click="searchText = ''"
					v-if="searchText.length > 0"
				></TTButton>
			</div>

			<div class="params">
				<ParamItem
					class="toggleAll"
					noBackground
					:paramData="param_toggleAll"
					v-model="param_toggleAll.value"
					@click="toggleAll()"
					v-if="parameters.length > 3"
				/>

				<div
					class="card-item"
					v-for="p in filteredParameters"
					:key="p.placeholder.tag"
					@click="
						p.enabled = !p.enabled;
						onToggleParam();
					"
				>
					<div class="taginfo">
						<div class="tag">
							<mark>{{ p.placeholder.tag }}</mark>
						</div>
						<span>{{
							t(p.placeholder.descKey, p.placeholder.descReplacedValues || {})
						}}</span>
					</div>
					<ToggleButton v-model="p.enabled" @change="onToggleParam()" />
				</div>
			</div>
		</ToggleBlock>

		<ParamItem :paramData="param_outputPlaceholder" v-model="props.action.outputPlaceholder" />

		<i18n-t
			scope="global"
			class="card-item info"
			tag="div"
			keypath="triggers.actions.common.custom_placeholder_example"
			v-if="props.action.outputPlaceholder && props.action.outputPlaceholder.length > 0"
		>
			<template #PLACEHOLDER>
				<mark v-click2Select>{{ "{" + props.action.outputPlaceholder + "}" }}</mark>
			</template>
		</i18n-t>

		<ParamItem :paramData="param_stopOnError" v-model="props.action.stopOnError" />
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import type {
	ITriggerPlaceholder,
	TriggerActionHTTPCallData,
	TriggerActionHTTPCallDataAction,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	action: TriggerActionHTTPCallData;
	triggerData: TriggerData;
}>();

const { t } = useI18n();

const securityError = ref(false);
const searchText = ref("");
const parameters = ref<{ placeholder: ITriggerPlaceholder<any>; enabled: boolean }[]>([]);
const param_url = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	placeholder: "https://...",
	labelKey: "triggers.actions.http_ws.url",
});
const param_method = ref<
	TwitchatDataTypes.ParameterData<
		TriggerActionHTTPCallDataAction,
		TriggerActionHTTPCallDataAction
	>
>({ type: "list", value: "GET", listValues: [], labelKey: "triggers.actions.http_ws.method" });
const param_outputPlaceholder = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "placeholder",
	value: "",
	labelKey: "triggers.actions.http_ws.output_placeholder",
	maxLength: 30,
});
const param_custom_body = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	labelKey: "triggers.actions.http_ws.custom_body",
	placeholderKey: "triggers.actions.http_ws.custom_body_placeholder",
	maxLength: 5000,
});
const param_toggleAll = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "chat.filters.select_all",
});
const param_sendAsBody = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "triggers.actions.http_ws.send_as_body",
});
const param_customHeaders = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "triggers.actions.http_ws.custom_headers",
});
const param_stopOnError = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "stop",
	labelKey: "triggers.actions.http_ws.stop_on_error",
	tooltipKey: "triggers.actions.http_ws.stop_on_error_tt",
});
const param_headerValues = ref<TwitchatDataTypes.ParameterData<string>[]>([]);

const filteredParameters = computed(() => {
	if (!searchText.value.trim()) return parameters.value;

	const searchTerm = searchText.value.toLowerCase().trim();
	return parameters.value.filter((p) => {
		const tag = p.placeholder.tag.toLowerCase();
		const description = t(
			p.placeholder.descKey,
			p.placeholder.descReplacedValues || {},
		).toLowerCase();
		return tag.includes(searchTerm) || description.includes(searchTerm);
	});
});

const { placeholderList } = useTriggerActionPlaceholders(
	props.action,
	props.triggerData,
	onPlaceholderUpdate,
);

watch(
	() => props.action.url,
	() => {
		const url = props.action.url;
		securityError.value =
			url.indexOf("https://") == -1 &&
			url.indexOf("http://localhost") == -1 &&
			url.indexOf("http://127.0.0.1") == -1;
	},
);

onBeforeMount(() => {
	if (!props.action.outputPlaceholder) props.action.outputPlaceholder = "";
	if (props.action.stopOnError === undefined) props.action.stopOnError = true;
	param_method.value.listValues = (
		["GET", "PUT", "POST", "PATCH", "DELETE"] as TriggerActionHTTPCallDataAction[]
	).map((v) => {
		return { value: v, label: v };
	});

	onToggleParam();
});

function getParamHeaderValue(index: number): TwitchatDataTypes.ParameterData<string> {
	if (param_headerValues.value.length > index) return param_headerValues.value[index]!;
	const param: TwitchatDataTypes.ParameterData<string> = {
		type: "string",
		value: "",
		placeholderList: placeholderList.value,
	};
	param_headerValues.value[index] = param;
	return param;
}

function onToggleParam(): void {
	const params: string[] = parameters.value
		.filter((v) => v.enabled)
		.map((v) => v.placeholder.tag);
	props.action.queryParams = params;

	let allSelected = true;
	// Check if all visible (filtered) parameters are selected
	const visibleParams = filteredParameters.value;
	visibleParams.forEach((v) => (allSelected &&= v.enabled));
	param_toggleAll.value.value = allSelected && visibleParams.length > 0;
}

/**
 * Called when clicking "all" toggle
 */
function toggleAll(): void {
	//Leave it time for the model value to update.
	//Not usign @change because the value is changed on onToggleParam() based
	//on currently enabled parameters which would conflict with this handler
	//if it was using @change.
	window.setTimeout(() => {
		// Only toggle visible (filtered) parameters
		const visibleParams = filteredParameters.value;
		visibleParams.forEach((v) => (v.enabled = param_toggleAll.value.value));
		onToggleParam();
	}, 0);
}

/**
 * Called when a key is pressed in the search field
 */
function onSearchKeydown(event: KeyboardEvent): void {
	if (event.key === "Escape") {
		searchText.value = "";
		event.preventDefault();
		event.stopPropagation();
	}
}

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	parameters.value = list.map((v) => {
		return {
			placeholder: v,
			enabled: !props.action.queryParams || props.action.queryParams.includes(v.tag),
		};
	});

	param_url.value.placeholderList = list;
	param_custom_body.value.placeholderList = list;
}

/**
 * Called when "add header" button is clicked
 */
function addHeader(): void {
	if (!props.action.headers) props.action.headers = [];
	props.action.headers.push({
		key: "",
		value: "",
	});
}

/**
 * Called when "delete header" button is clicked
 */
function delHeader(index: number): void {
	props.action.headers?.splice(index, 1);
}
</script>

<style scoped lang="less">
.triggeractionhttpcall {
	.tags {
		:deep(.title) {
			padding: 0.35em;
			text-align: left;
		}

		.searchContainer {
			position: relative;
			margin-bottom: 0.5em;

			.searchField {
				width: 100%;
				padding: 0.5em;
			}

			.clearButton {
				position: absolute;
				right: 0.5em;
				top: 50%;
				transform: translateY(-50%);
			}
		}
	}

	.params {
		gap: 2px;
		display: flex;
		flex-direction: column;
		font-size: 0.8em;
		max-height: 375px;
		overflow-y: auto;
		.card-item {
			display: flex;
			flex-direction: row;
			align-items: center;
			cursor: pointer;
			flex-shrink: 0;
			&:hover {
				background-color: var(--color-light-fade);
			}
			.taginfo {
				gap: 0.5em;
				flex-grow: 1;
				display: flex;
				flex-direction: column;

				.tag {
					word-break: break-all;
				}
			}
		}
		.toggleAll {
			justify-self: flex-end;
			align-self: flex-end;
			margin-bottom: 2px;
			width: fit-content;
			margin-right: 0.5em;
			margin-bottom: 0.5em;
		}
	}
	.headerList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		margin-top: 0.5em;
		.header {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			flex: 1;
			&.head {
				gap: 0;
				width: calc(100% - 1.6em);
				justify-content: space-around;
				div {
					background-color: var(--grayout);
					padding: 0.25em;
					text-align: center;
					&:first-child {
						margin-right: 1px;
						border-top-left-radius: var(--border-radius);
						border-bottom-left-radius: var(--border-radius);
					}
					&:last-child {
						border-top-right-radius: var(--border-radius);
						border-bottom-right-radius: var(--border-radius);
					}
				}
			}
			*:not(.button) {
				flex-grow: 1;
			}
			.deleteBt {
				flex-shrink: 0;
			}
		}
		.addBt {
			align-self: center;
		}
	}
}
</style>
