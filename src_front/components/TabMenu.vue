<template>
	<div class="tabmenu">
		<div v-for="item, index in items"
		:class="value == item.value? 'tabItem tabSelected' : 'tabItem'">
			<TTButton class="tabButton" @click="setValue(item.value)"
				autoHideLabel
				v-tooltip="item.tooltip"
				:icon="item.icon"
				:big="big"
				:small="small"
				:primary="themes && themes.length > index && themes[index] == 'primary' || primary"
				:secondary="themes && themes.length > index && themes[index] == 'secondary' || secondary"
				:alert="themes && themes.length > index && themes[index] == 'alert' || alert"
				:premium="themes && themes.length > index && themes[index] == 'premium' || premium"
				:selected="value == item.value">{{ item.label }}</TTButton>
			
			<Transition name="slide">
				<div class="selectionChip" v-if="value == item.value"></div>
			</Transition>
		</div>
	</div>
</template>

<script setup lang="ts" generic="T">
import { ref, computed, onMounted } from 'vue';
import TTButton from './TTButton.vue';

const props = withDefaults(defineProps<{
	big?: boolean;
	small?: boolean;
	secondary?: boolean;
	primary?: boolean;
	alert?: boolean;
	premium?: boolean;
	values?: T[];
	labels?: string[];
	icons?: string[];
	tooltips?: string[];
	themes?: string[];
	modelValue?: T;
}>(), {
	big: false,
	small: false,
	secondary: false,
	primary: false,
	alert: false,
	premium: false,
	values: () => [],
	labels: () => [],
	icons: () => [],
	tooltips: () => [],
	themes: () => [],
});

const emit = defineEmits<{
	'update:modelValue': [value: T | undefined];
	'change': [value: T | undefined];
}>();

const value = ref<T | undefined>();

const items = computed(() => {
	let res: {value: T | undefined, label?: string, icon?: string, tooltip?: string}[] = [];
	let maxLength = Math.max(props.labels.length, props.icons.length, props.values.length);
	for (let i = 0; i < maxLength; i++) {
		let label: string | undefined = undefined;
		let icon: string | undefined = undefined;
		let tooltip: string | undefined = undefined;
		let itemValue: T | undefined = undefined;
		if(i < props.labels.length) label = props.labels[i];
		if(i < props.icons.length) icon = props.icons[i];
		if(i < props.values.length) itemValue = props.values[i];
		if(i < props.tooltips.length) tooltip = props.tooltips[i];
		res.push({value: itemValue, label, icon, tooltip})
	}
	return res;
});

function setValue(newValue: T | undefined): void {
	value.value = newValue;
	emit("update:modelValue", newValue);
	emit("change", newValue);
}

onMounted(() => {
	value.value = props.modelValue;
	if(value.value === undefined) value.value = props.values[0];
	if(props.modelValue != value.value) {
		emit("update:modelValue", value.value);
		emit("change", value.value);
	}
});
</script>

<style scoped lang="less">
.tabmenu{
	display: flex;
	flex-direction: row;
	row-gap: 5px;
	overflow: hidden;

	.tabItem {
		flex-grow: 1;
		position: relative;
		display: flex;
		flex-direction: column;
		.tabButton {
			width: 100%;
			z-index: 1;
		}
		&:first-child {
			.tabButton {
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
		}

		&:not(:last-child) {
			.tabButton {
				border-right: 1px solid var(--color-light);
			}
		}

		&:not(:first-child):not(:last-child) {
			.tabButton {
				border-radius: 0;
			}
		}

		&:last-child {
			.tabButton {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
		}
		.selectionChip {
			position: absolute;
			background-color: var(--color-secondary-light);
			display: block;
			height: 3px;
			width: calc(100% - 1.5em);
			align-self: center;
			z-index: 0;
			transition: height .25s;
			border-bottom-right-radius: 20px;
			border-bottom-left-radius: 20px;
			max-width: calc(100% - .5em);
			transform: translateY(100%);
			bottom: 0;
		}


		.slide-enter-from,
		.slide-leave-to {
			height:0;
		}
	}
}

</style>