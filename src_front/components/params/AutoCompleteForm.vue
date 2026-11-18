<template>
	<div :class="classes">
		<div class="formHolder">
			<label :for="key">{{ props.title }}</label>
			<div class="inputHolder">
				<Icon name="loader" class="loader" v-if="loading" />
				<input
					:id="key"
					type="text"
					@keyup="onSearchChange()"
					@focus="onFocus()"
					v-model="search"
					:placeholder="t('global.search_placeholder')"
				/>
			</div>
		</div>

		<div class="items autocomplete" v-if="items?.length > 0">
			<span
				v-for="(item, index) in items"
				:key="'autocomplete_' + index"
				@click.capture="selectItem(item, index)"
			>
				<slot :item="item" :index="index" />
			</span>
		</div>

		<div class="items selected" v-if="props.modelValue?.length > 0">
			<span
				v-for="(item, index) in props.modelValue"
				:key="'selected_' + index"
				@click.capture="removeItem(index)"
			>
				<slot :item="item" :index="index" />
			</span>
		</div>
	</div>
</template>

<script setup lang="ts" generic="T = unknown">
import { ref, computed, watch, type Ref } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		title?: string;
		idKey?: string;
		delay?: number;
		maxItems?: number;
		modelValue?: T[];
		maxAutocompleteItems?: number;
	}>(),
	{
		title: "",
		idKey: "",
		delay: 250,
		maxItems: 10,
		modelValue: () => [],
		maxAutocompleteItems: 20,
	},
);

const emit = defineEmits<{
	search: [search: string, callback: (data: T[]) => void];
	"update:modelValue": [list: T[]];
}>();

defineSlots<{
	default(props: { item: T; index: number }): unknown;
}>();

const { t } = useI18n();

const loading = ref(false);
const key = ref(Math.random().toString());
const search = ref("");
const searchTimeout = ref(-1);
const items = ref<T[]>([]) as Ref<T[]>;

let prevItems: T[] = [];

const classes = computed(() => {
	const res = ["autocompleteform"];
	if (loading.value) res.push("loading");
	return res;
});

watch(
	() => props.modelValue,
	() => {
		if (props.modelValue.length == props.maxItems) {
			search.value = "";
		}
	},
);

function onSearchChange(): void {
	loading.value = true;
	clearTimeout(searchTimeout.value);

	if (search.value.length < 2) {
		searchResult([]);
		return;
	}

	searchTimeout.value = window.setTimeout(() => {
		emit("search", search.value, searchResult);
	}, props.delay);
}

function onFocus(): void {
	if (prevItems.length > 0) {
		items.value = prevItems;
	}
}

function selectItem(item: T, index: number): void {
	let list = props.modelValue.slice();
	if (list.length == props.maxItems) list = list.splice(0, props.maxItems - 1);
	list.push(item);
	emit("update:modelValue", list);
	items.value = [];
	prevItems.splice(index, 1);
}

function removeItem(index: number): void {
	const list = props.modelValue.slice();
	list.splice(index, 1);
	emit("update:modelValue", list);
}

function searchResult(data: T[]): void {
	if (props.idKey) {
		data = data.filter((item) => {
			return (
				props.modelValue.findIndex((v: T) => {
					//@ts-ignore
					return v[props.idKey] == item[props.idKey];
				}) == -1
			);
		});
	}
	data = data.slice(0, props.maxAutocompleteItems);
	items.value = data;
	prevItems = data;
	loading.value = false;
}
</script>

<style scoped lang="less">
.autocompleteform {
	.formHolder {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		label {
			flex-grow: 1;
			align-self: center;
		}
		.inputHolder {
			position: relative;
			width: auto;
			flex-basis: 300px;
			.loader {
				height: 1em;
				width: 1em;
				position: absolute;
				left: 5px;
				top: 50%;
				transform: translateY(-50%);
			}

			input {
				width: 100%;
			}
		}
	}

	&.loading {
		.formHolder {
			.inputHolder {
				input {
					padding-left: calc(1em + 10px);
				}
			}
		}
	}

	.items {
		padding: 0.5em;
		max-height: 112px;
		overflow: auto;
		border-radius: 0.5em;
		&:not(.selected) {
			background-color: rgba(0, 0, 0, 0.3);
		}
		&.selected {
			padding-left: 0;
			padding-right: 0;
		}
	}
}
</style>
