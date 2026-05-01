<template>
	<component
		:is="popoutMode !== false ? 'tooltip' : ToggleBlock"
		small
		:title="$t('global.placeholder_selector_title')"
		:open="false"
		:inlinePositioning="false"
		:maxWidth="600"
		:maxHeight="200"
		interactive
		:interactiveDebounce="1000"
		:theme="$store.common.theme"
		:appendTo="tooltipTarget"
		:trigger="popoutMode !== false ? 'click' : 'mouseenter'"
		:class="classes"
	>
		<template #default>
			<button class="tooltipOpener"><Icon name="placeholder" /></button>
		</template>
		<template #content>
			<SearchForm
				class="searchForm"
				v-if="
					search ||
					localPlaceholders.length +
						globalPlaceholders.length +
						globalPlaceholderCategories.length >
						5
				"
				v-model="search"
				:debounceDelay="150"
			/>
			<div
				:class="{
					tooltipContent: true,
					popoutMode: props.popoutMode !== false,
				}"
			>
				<div class="list" v-if="localPlaceholders.length > 0">
					<template v-for="(h, index) in localPlaceholders" :key="h.tag + index">
						<TTButton
							primary
							small
							@click="insert(h)"
							:copy="copyMode !== false ? '{' + h.tag + '}' : undefined"
							v-tooltip="
								copyMode !== false
									? $t('global.copy')
									: $t('global.placeholder_selector_insert')
							"
							>&#123;{{ h.tag }}&#125;</TTButton
						>

						<i18n-t scope="global" :keypath="h.descKey" tag="span">
							<template
								v-for="(value, name) in h.descReplacedValues ?? {}"
								v-slot:[name]
							>
								<mark>{{ value }}</mark>
							</template>
						</i18n-t>
					</template>
				</div>

				<template v-if="globalPlaceholders.length + globalPlaceholderCategories.length > 0">
					<ToggleBlock
						class="misc"
						key="misc"
						small
						v-if="globalPlaceholders.length > 0"
						:open="search.length > 0"
						noBackground
						:title="$t('global.placeholder_selector_categories.misc')"
					>
						<div class="list">
							<template v-for="(h, index) in globalPlaceholders" :key="h.tag + index">
								<TTButton
									primary
									small
									@click="insert(h)"
									:copy="copyMode !== false ? '{' + h.tag + '}' : undefined"
									v-tooltip="
										copyMode !== false
											? $t('global.copy')
											: $t('global.placeholder_selector_insert')
									"
									>&#123;{{ h.tag }}&#125;</TTButton
								>

								<i18n-t scope="global" :keypath="h.descKey" tag="span">
									<template
										v-for="(value, name) in h.descReplacedValues ?? {}"
										v-slot:[name]
									>
										<mark>{{ value }}</mark>
									</template>
								</i18n-t>
							</template>
						</div>
					</ToggleBlock>

					<ToggleBlock
						class="global"
						v-for="c in globalPlaceholderCategories"
						:key="c.key"
						small
						:open="search.length > 0"
						noBackground
						:title="$t('global.placeholder_selector_categories.' + c.key)"
					>
						<div class="list">
							<template v-for="(h, index) in c.entries" :key="h.tag + index">
								<TTButton
									primary
									small
									@click="insert(h)"
									:copy="copyMode !== false ? '{' + h.tag + '}' : undefined"
									v-tooltip="
										copyMode !== false
											? $t('global.copy')
											: $t('global.placeholder_selector_insert')
									"
									>&#123;{{ h.tag }}&#125;</TTButton
								>

								<i18n-t scope="global" :keypath="h.descKey" tag="span">
									<template
										v-for="(value, name) in h.descReplacedValues ?? {}"
										v-slot:[name]
									>
										<mark>{{ value }}</mark>
									</template>
								</i18n-t>
							</template>
						</div>
					</ToggleBlock>
				</template>
			</div>
		</template>
	</component>
</template>

<script setup lang="ts">
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import SearchForm from "./contents/SearchForm.vue";

const { t } = useI18n();
const emit = defineEmits<{ insert: [string]; "update:modelValue": [string] }>();
const props = defineProps<{
	placeholders: TwitchatDataTypes.PlaceholderEntry[];
	target?:
		| (HTMLInputElement | HTMLTextAreaElement)
		| Promise<HTMLInputElement | HTMLTextAreaElement>
		| null;
	copyMode?: boolean;
	popoutMode?: boolean;
	modelValue?: string;
}>();
const search = ref<string>("");
// const model = defineModel<string>();

const classes = computed(() => {
	const res: string[] = ["placeholderselector"];
	if (props.popoutMode !== false) res.push("popoutMode");
	return res;
});

const tooltipTarget = computed(() => {
	return document.body;
});

const localPlaceholders = computed(() => {
	const searchClean = search.value.toLowerCase().trim();
	return props.placeholders.filter(
		(v) =>
			v.globalTag !== true &&
			v.private !== true &&
			(!searchClean ||
				v.tag.toLowerCase().indexOf(searchClean) > -1 ||
				t(v.descKey).toLowerCase().indexOf(searchClean) > -1),
	);
});

const globalPlaceholders = computed(() => {
	const searchClean = search.value.toLowerCase().trim();
	const list = props.placeholders
		.filter(
			(v) =>
				v.globalTag === true &&
				!v.category &&
				v.private !== true &&
				(!searchClean ||
					v.tag.toLowerCase().indexOf(searchClean) > -1 ||
					t(v.descKey).toLowerCase().indexOf(searchClean) > -1),
		)
		.sort((a, b) => a.tag.length - b.tag.length);

	return list;
});

const globalPlaceholderCategories = computed<
	{
		key: string;
		entries: TwitchatDataTypes.PlaceholderEntry[];
	}[]
>(() => {
	const searchClean = search.value.toLowerCase().trim();
	const list = props.placeholders
		.filter(
			(v) =>
				v.globalTag === true &&
				v.category &&
				v.private !== true &&
				(!searchClean ||
					v.tag.toLowerCase().indexOf(searchClean) > -1 ||
					t(v.descKey).toLowerCase().indexOf(searchClean) > -1),
		)
		.sort((a, b) => {
			if ((a.category || "") < (b.category || "")) return -1;
			if ((a.category || "") > (b.category || "")) return 1;
			return 0;
		});

	if (list.length === 0) return [];

	const categories: { key: string; entries: TwitchatDataTypes.PlaceholderEntry[] }[] = [];
	let currentCategory: { key: string; entries: TwitchatDataTypes.PlaceholderEntry[] } = {
		key: list[0]!.category!,
		entries: [list[0]!],
	};
	for (let i = 1; i < list.length; i++) {
		const el = list[i]!;
		if (el.category != currentCategory.key) {
			categories.push(currentCategory);
			currentCategory = { key: el.category!, entries: [] };
		}
		currentCategory.entries.push(el);
	}
	categories.push(currentCategory);

	return categories;
});

/**
 * Add a token on the text
 */
async function insert(h: TwitchatDataTypes.PlaceholderEntry): Promise<void> {
	if (props.target) {
		const target = await Promise.resolve(props.target);
		if (target) {
			const tag = "{" + h.tag + "}";
			let carretPos = target.selectionStart || 0;
			// Append tag to text
			const text =
				target.value.substring(0, carretPos) + tag + target.value.substring(carretPos);
			emit("update:modelValue", text);
		}
	} else {
		// Append tag to text
		emit("update:modelValue", props.modelValue + "{" + h.tag + "}");
		emit("insert", "{" + h.tag + "}");
	}
}
</script>

<style lang="less" scoped>
.tooltipContent {
	gap: 0.25em;
	display: flex;
	flex-direction: column;

	&.popoutMode {
		width: 450px;
		max-width: 100vw;
		max-height: min(100vh, 300px);
		overflow-y: auto;
	}

	.list {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: stretch;
		column-gap: 1px;
		row-gap: 0.25em;
		font-size: 0.8em;
		color: var(--color-text);
		& > * {
			background-color: var(--color-light-fadest);
			border-radius: 0.5em;
			padding: 0.25em 0.5em;
			&:nth-child(odd) {
				max-width: 30vw;
				word-break: break-all;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
			&:nth-child(even) {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
		}
		.button {
			:deep(.label) {
				text-align: right !important;
			}
		}
		span {
			white-space: pre-line;
			line-height: 1.25em;
		}
	}
}

.placeholderselector {
	&.popoutMode {
		border-top-right-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		background-color: var(--color-secondary);
		overflow: hidden;
		display: flex;
		.tooltipOpener {
			color: var(--color-light);
			display: block;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 0.25em 0.1em;
		}
	}
	.tooltipOpener {
		display: none;
		.icon {
			height: 1em;
		}
	}
}

.searchForm {
	margin-bottom: 0.5em;
}
</style>
