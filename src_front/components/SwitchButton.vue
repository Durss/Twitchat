<template>
	<div :class="classes">
		<span class="label" @click.capture.stop="setState(values[0])"><Icon v-if="icons[0]" :name='icons[0]' />{{ labels[0] }}</span>

		<div class="toggleHolder">
			<div class="dash"></div>
			<ToggleButton class="toggle"
				v-model="selected"
				noCheckmark
				:big="big"
				:small="small"
				:secondary="secondary"
				:alert="alert" @change="setState(selected? values[1] : values[0])" />
			<div class="dash"></div>
		</div>

		<span class="label" @click.capture.stop="setState(values[1])">{{ labels[1] }}<Icon v-if="icons[1]" :name='icons[1]' /></span>
	</div>
</template>

<script setup lang="ts" generic="T">
import { watch, ref, computed, onBeforeMount } from 'vue';
import Icon from './Icon.vue';
import ToggleButton from './ToggleButton.vue';

interface Props {
	labels?: string[];
	icons?: string[];
	values?: [T, T];
	big?: boolean;
	small?: boolean;
	secondary?: boolean;
	alert?: boolean;
	modelValue?: T;
}

const props = withDefaults(defineProps<Props>(), {
	labels: () => ["", ""],
	icons: () => ["", ""],
	values: () => [true as T, false as T],
	big: false,
	small: false,
	secondary: false,
	alert: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: T];
	'change': [];
}>();

const localValue = ref<T>();
const selected = ref(false);

const classes = computed(() => {
	let res = ["switchbutton"];
	if(props.big !== false) res.push("big");
	if(props.small !== false) res.push("small");
	if(props.secondary !== false) res.push("secondary");
	if(props.alert !== false) res.push("alert");
	if(localValue.value == props.values[1]) res.push("selected");
	return res;
});

function setState(value: T): void {
	localValue.value = value;
	selected.value = value === props.values[1];
	emit("update:modelValue", value);
	emit('change');
}

onBeforeMount(() => {
	if(props.modelValue != props.values[0] && props.modelValue !== props.values[1]) {
		setState(props.values[0]);
	}else{
		localValue.value = props.modelValue ?? props.values[0];
		selected.value = localValue.value === props.values[1];
	}
	watch(() => props.modelValue, () => {
		localValue.value = props.modelValue ?? props.values[0];
		selected.value = localValue.value === props.values[1];
	});
});
</script>

<style scoped lang="less">
.switchbutton{
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	color: var(--color-text);
	gap: .5em;

	.toggleHolder {
		display: flex;
		flex-direction: row;
		align-items: center;
		.dash {
			.bevel();
			display: block;
			width: .5em;
			height: .2em;
			border-radius: 1em;
			background: var(--color-dark);
			&:first-of-type {
				background: var(--color-primary);
			}
		}
		.toggle {
			background-color: var(--color-primary-fadest) !important;
			&:hover {
				background-color: var(--color-primary-fader) !important;
			}
			:deep(.circle) {
				background-color: var(--color-primary-light);
			}
		}
	}
	
	.label {
		font-size: 1em;
		transition: all .25s;
		opacity: .6;
		font-weight: bold;
		text-shadow: var(--text-shadow-contrast);
		cursor: pointer;
		&:first-of-type{
			opacity: 1;
			text-align: right;
		}
		.icon {
			height: 1em;
			vertical-align: middle;
			margin-right: .5em;
		}
		&:nth-of-type(2) > .icon {
			margin-right: 0;
			margin-left: .5em;
		}
	}

	&.selected {
		.label {
			opacity: 1;
			&:first-of-type {
				opacity: .6;
			}
		}
		.toggleHolder>.dash {
			background: var(--color-primary);
			&:first-of-type {
				background: var(--color-dark);
			}
		}
	}
	
	
	&.big {
		font-size: 1.2em;
	}
	
	&.small {
		font-size: .8em;
	}

	&.secondary {
		color: var(--color-secondary);
		.toggle {
			background-color: var(--color-secondary-fadest) !important;
			&:hover {
				background-color: var(--color-secondary-fader) !important;
			}
			:deep(.circle) {
				background-color: var(--color-secondary-light);
			}
		}
		.toggleHolder>.dash {
			background: var(--color-dark);
			&:first-of-type {
				background: var(--color-secondary);
			}
		}
		&.selected>.toggleHolder>.dash {
			background: var(--color-secondary);
			&:first-of-type {
				background: var(--color-dark);
			}
		}
	}

	&.alert {
		color: var(--color-alert);
		.toggle {
			background-color: var(--color-alert-fadest) !important;
			&:hover {
				background-color: var(--color-alert-fader) !important;
			}
			:deep(.circle) {
				background-color: var(--color-alert-light);
			}
		}
		.toggleHolder>.dash {
			background: var(--color-dark);
			&:first-of-type {
				background: var(--color-alert);
			}
		}
		&.selected>.toggleHolder>.dash {
			background: var(--color-alert);
			&:first-of-type {
				background: var(--color-dark);
			}
		}
	}
	
}
</style>