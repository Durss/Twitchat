<template>
	<div :class="classes" data-noselect>
		<Icon name="checkmark" class="checkmark" />
		<div class="circle">
			<Icon v-if="loading === true" name="loader" class="loading" />
		</div>
		<Icon name="cross" class="cross" />
		<input :id="inputId" type="checkbox" v-model="localValue" class="input" @change="onChange()" :disabled="disabled !== false">
	</div>
</template>

<script setup lang="ts">
import { watch, ref, computed, onBeforeMount } from 'vue';
import Icon from "@/components/Icon.vue"

const props = withDefaults(defineProps<{
	inputId?: string;
	big?: boolean;
	small?: boolean;
	secondary?: boolean;
	alert?: boolean;
	premium?: boolean;
	modelValue?: boolean;
	noCheckmark?: boolean;
	loading?: boolean;
	inverseState?: boolean;
	disabled?: boolean;
}>(), {
	inputId: "",
	big: false,
	small: false,
	secondary: false,
	alert: false,
	premium: false,
	modelValue: false,
	noCheckmark: false,
	loading: false,
	inverseState: false,
	disabled: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
	'change': [value: boolean];
}>();

const localValue = ref(false);

const classes = computed(() => {
	let res = ["togglebutton"];
	if(props.big !== false) res.push("big");
	if(props.small !== false) res.push("small");
	if(props.secondary !== false) res.push("secondary");
	if(props.alert !== false) res.push("alert");
	if(props.premium !== false) res.push("premium");
	if(props.noCheckmark !== false) res.push("noCheckmark");
	if(props.disabled !== false) res.push("disabled");
	if((props.inverseState === false && localValue.value) || (props.inverseState !== false && !localValue.value)) res.push("selected");
	return res;
});

function onChange(): void {
	if(props.disabled) return;
	emit('update:modelValue', localValue.value);
	emit('change', localValue.value);
}

onBeforeMount(() => {
	localValue.value = props.modelValue;
	watch(() => props.modelValue, () => {
		localValue.value = props.modelValue;
	})
});
</script>

<style scoped lang="less">
.togglebutton{
	@size: 1.25em;
	width: @size * 2;
	min-width: @size * 2;
	height: @size;
	border-radius: @size;
	position: relative;
	transition: background-color .35s;
	background-color: var(--background-color-fader);
	.bevel();
	overflow: hidden;

	&:not(.disabled) {
		cursor: pointer;
		.input {
			cursor: pointer;
		}
	}

	.circle {
		transition: left .35s, background-color .35s;
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		left: 2px;
		background-color: var(--color-primary);
		background-color: var(--color-light);
		width: calc(@size - 4px);
		height: calc(@size - 4px);
		border-radius: 50%;
		color: var(--color-dark);
	}

	.checkmark {
		position: absolute;
		margin-left: .35em;
		left: -50%;
		top: 50%;
		transform: translateY(-50%);
		height: .7em;
		width: fit-content;
		display: block;
		opacity: 0;
		transition: opacity .5s, left .5s;
	}

	.cross {
		position: absolute;
		margin-right: .35em;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		height: .7em;
		width: fit-content;
		display: block;
		opacity: 1;
		transition: opacity .5s, right .5s;
	}

	.input {
		position: absolute;
		max-height: @size;
		top: 0;
		left: 0;
		margin: 0;
		width: 100%;
		height: 100%;
		opacity: 0.001;
		z-index: 1;
	}

	&:not(.disabled):hover {
		background-color: var(--background-color-fade);
	}

	&.noCheckmark {
		.checkmark, .cross {
			display: none;
		}
	}

	&.selected {
		opacity: 1;
		background: var(--color-primary-light);
		.circle {
			left: calc(@size * 2 - @size + 1px);
			background-color: var(--color-light);
		}
		.checkmark {
			opacity: 1;
			left: 0;
		}
		.cross {
			opacity: 0;
			right: -50%;
		}

		&:not(.disabled):hover {
			background-color: var(--color-primary-extralight);
		}

		&.secondary:not(.disabled):hover {
			background-color: var(--color-secondary-extralight);
		}

		&.alert:not(.disabled):hover {
			background-color: var(--color-alert-extralight);
		}

		&.premium:not(.disabled):hover {
			background-color: var(--color-premium-extralight);
		}
	}


	&.big {
		font-size: 1.2em;
	}

	&.small {
		font-size: .8em;
	}


	&.secondary {
		.circle {
			background-color: var(--color-secondary);
		}
		&.selected {
			background: var(--color-secondary);
			.circle {
				background-color: var(--color-light);
			}
		}
	}

	&.alert {
		.circle {
			background-color: var(--color-alert);
		}
		&.selected {
			background: var(--color-alert);
			.circle {
				background-color: var(--color-light);
			}
		}
	}

	&.premium {
		.circle {
			background-color: var(--color-premium);
		}
		&.selected {
			background: var(--color-premium);
			.circle {
				background-color: var(--color-light);
			}
		}
	}
}
</style>
