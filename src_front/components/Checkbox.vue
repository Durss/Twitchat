<template>
	<div :class="classes">
		<div class="checkmark">
			<Icon v-if="checked" class="icon" name="checkmark"/>
		</div>
		<span class="label" v-if="slots.default"><slot></slot></span>
		<input type="checkbox" class="checkboxInput" ref="checkbox" v-model="checked" @change="onChange()" />
	</div>
</template>

<script setup lang="ts" generic="T">
import { watch, ref, computed, onMounted, useSlots } from 'vue';
import Icon from './Icon.vue';

const props = withDefaults(defineProps<{
	modelValue?: T;
	values?: [T, T];
	secondary?: boolean;
	primary?: boolean;
	alert?: boolean;
}>(), {
	values: () => [true as T, false as T],
	secondary: false,
	primary: false,
	alert: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: T];
	'change': [value: T];
}>();

const slots = useSlots();

const checked = ref(false);

const classes = computed(() => {
	const res: string[] = ["checkbox"];
	if(props.primary !== false) res.push("primary")
	if(props.secondary !== false) res.push("secondary")
	if(props.alert !== false) res.push("alert")
	if(!slots.default) res.push("noLabel")
	return res;
});

function onChange(): void {
	emit("update:modelValue", checked.value ? props.values[0] : props.values[1]);
	emit("change", checked.value ? props.values[0] : props.values[1]);
}

onMounted(() => {
	checked.value = props.modelValue === props.values[0];
	watch(() => props.modelValue, () => {
		checked.value = props.modelValue === props.values[0];
	});
});
</script>

<style scoped lang="less">
.checkbox{
	cursor: pointer;
	display: flex;
	flex-direction: row;
	align-items: center;
	position: relative;
	color:var(--color-text);

	&.noLabel {
		height: 1em;
		.checkmark {
			height: 100%;
		}
	}

	.checkmark {
		border: 1px solid currentColor;
		border-radius: .25em;
		padding: 0;
		aspect-ratio: 1;
		height: 1em;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		.icon {
			width: 80%;
			margin: 0;
			padding: 0;
			color: currentColor;
		}
	}

	.label {
		flex-grow: 1;
		margin-left: .35em;
		justify-self: flex-start;
		text-align: left;
		// width: max-content;
	}

	&:hover {
		.checkmark {
			background-color: var(--background-color-fader)
		}
	}

	.checkboxInput {
		pointer-events: all;
		opacity: .0001;
		position: absolute;
		padding: 0;
		margin: 0;
		@gap: 2px;
		width: calc(100% + @gap * 2);
		height: calc(100% + @gap * 2);
		left: -@gap;
		top: -@gap;
		z-index: 1000;
		cursor: pointer;
	}
	&.primary{
		color:var(--color-primary);

		&:hover {
			color:var(--color-primary-light);
			.checkmark {
				background-color: var(--color-primary-fadest)
			}
		}
	}

	&.secondary{
		color:var(--color-secondary);

		&:hover {
			color:var(--color-secondary-light);
			.checkmark {
				background-color: var(--color-secondary-fadest)
			}
		}
	}
	&.alert{
		color:var(--color-alert);

		&:hover {
			color:var(--color-alert-light);
			.checkmark {
				background-color: var(--color-alert-fadest)
			}
		}
	}
}
</style>
