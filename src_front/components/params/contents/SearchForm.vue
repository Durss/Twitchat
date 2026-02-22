<template>
	<div class="triggersearchform">
		<div class="search">
			<Icon name="loader" class="searchIcon" v-if="searchDebouncing" />
			<Icon name="search" class="searchIcon" v-else />
			<input type="text" :placeholder="$t('global.search_placeholder')"
				v-model="search" v-autofocus="!props.noAutoFocus"
				@keydown.esc="e => onKeyUp(e)" />
			<Icon name="cross" class="clearSearch" v-if="search" @click="search = ''" />
		</div>
		<slot v-if="hasSearch || searchDebouncing" />
	</div>
</template>
<script setup lang="ts">
import Icon from '@/components/Icon.vue';
import { ref, watch, onBeforeUnmount } from 'vue';

const emit = defineEmits<{
	(e: 'update:modelValue', value: string): void;
}>();

const props = defineProps<{
	modelValue?: string;
	debounceDelay?: number;
	noAutoFocus?: boolean;
}>();

const search = ref("");
const debouncedSearch = ref("");
const searchDebouncing = ref(false);
const hasSearch = ref(false);
let debounceTimeout = -1;

function onKeyUp(e: KeyboardEvent) {
	if (e.key === "Escape" && search.value) {
		search.value = "";
		e.preventDefault();
		e.stopPropagation();
	}
}

watch(search, () => {
	clearTimeout(debounceTimeout);
	if (search.value.trim().length === 0) {
		searchDebouncing.value = false;
		debouncedSearch.value = "";
		hasSearch.value = false;
		emit('update:modelValue', "");
		return;
	}
	const delay = props.debounceDelay ?? 300;
	searchDebouncing.value = delay > 0;
	debounceTimeout = window.setTimeout(() => {
		searchDebouncing.value = false;
		debouncedSearch.value = search.value;
		hasSearch.value = true;
		emit('update:modelValue', search.value);
	}, delay);
});

onBeforeUnmount(() => {
	clearTimeout(debounceTimeout);
});
</script>
<style scoped lang="less">
.triggersearchform {
	display: flex;
	flex-direction: column;

	.search {
		display: flex;
		align-items: center;
		position: relative;
		.searchIcon {
			position: absolute;
			left: .5em;
			height: 1em;
			opacity: .5;
		}
		input {
			width: 100%;
			border-radius: var(--border-radius);
			padding: .25em;
			padding-left: 2em;
			padding-right: 2em;
		}
		.clearSearch {
			position: absolute;
			right: .5em;
			height: 1em;
			cursor: pointer;
			opacity: .5;
			&:hover {
				opacity: 1;
			}
		}
	}
}
</style>