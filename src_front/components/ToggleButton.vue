<template>
	<div :class="classes" data-noselect>
		<Icon name="checkmark" class="checkmark" />
		<div class="circle">
			<svg
				v-if="props.loading === true"
				class="loader"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 37.21 37.21"
			>
				<path
					style="fill: rgba(0, 0, 0, 0.4)"
					d="M18.6,0C8.33,0,0,8.33,0,18.6s8.33,18.6,18.6,18.6,18.6-8.33,18.6-18.6S28.88,0,18.6,0ZM18.6,31.57c-7.16,0-12.97-5.81-12.97-12.97s5.81-12.97,12.97-12.97,12.97,5.81,12.97,12.97-5.81,12.97-12.97,12.97Z"
				/>
				<path
					style="fill: #fff"
					d="M18.6,0c-4.09,0-4.09,5.64,0,5.64,7.16,0,12.97,5.81,12.97,12.97,0,3.69,5.64,3.69,5.64,0C37.21,8.33,28.88,0,18.6,0Z"
				/>
			</svg>
		</div>
		<Icon name="cross" class="cross" />
		<input
			:id="inputId"
			type="checkbox"
			v-model="localValue"
			class="input"
			@change="onChange()"
			:disabled="props.disabled !== false || props.loading !== false"
		/>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import { computed, ref, watch } from "vue";

const props = withDefaults(
	defineProps<{
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
	}>(),
	{
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
	},
);

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	change: [value: boolean];
}>();

const localValue = ref(false);

const classes = computed(() => {
	let res = ["togglebutton"];
	if (props.big !== false) res.push("big");
	if (props.small !== false) res.push("small");
	if (props.secondary !== false) res.push("secondary");
	if (props.alert !== false) res.push("alert");
	if (props.premium !== false) res.push("premium");
	if (props.noCheckmark !== false) res.push("noCheckmark");
	if (props.loading !== false) res.push("loading");
	if (props.disabled !== false || props.loading !== false) res.push("disabled");
	if (
		(props.inverseState === false && localValue.value) ||
		(props.inverseState !== false && !localValue.value)
	)
		res.push("selected");
	return res;
});

function onChange(): void {
	if (props.disabled || props.loading) return;
	emit("update:modelValue", localValue.value);
	emit("change", localValue.value);
}

watch(
	() => props.modelValue,
	() => {
		localValue.value = props.modelValue;
	},
	{ immediate: true },
);
</script>

<style scoped lang="less">
.togglebutton {
	@size: 1.25em;
	width: @size * 2;
	min-width: @size * 2;
	height: @size;
	border-radius: @size;
	position: relative;
	transition: background-color 0.35s;
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
		transition:
			left 0.35s,
			background-color 0.35s;
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		left: 2px;
		background-color: var(--color-light);
		width: calc(@size - 4px);
		height: calc(@size - 4px);
		border-radius: 50%;
		color: var(--color-dark);
	}

	.checkmark {
		position: absolute;
		margin-left: 0.35em;
		left: -50%;
		top: 50%;
		transform: translateY(-50%);
		height: 0.7em;
		width: fit-content;
		display: block;
		opacity: 0;
		transition:
			opacity 0.5s,
			left 0.5s;
	}

	.cross {
		position: absolute;
		margin-right: 0.35em;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		height: 0.7em;
		width: fit-content;
		display: block;
		opacity: 1;
		transition:
			opacity 0.5s,
			right 0.5s;
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
		.checkmark,
		.cross {
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

	&.disabled {
		opacity: 0.5;
		cursor: not-allowed;
		* > {
			pointer-events: none;
		}
	}

	&.loading {
		opacity: 1;
		cursor: wait;
	}

	&.big {
		font-size: 1.2em;
	}

	&.small {
		font-size: 0.8em;
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

	&.loading {
		background-color: var(--background-color-fade);
		.circle {
			background-color: transparent;
		}
	}
	.loader {
		color: var(--color-light);
		width: 100%;
		height: 100%;
		animation: loader-animation 0.6s infinite linear;
	}
	@keyframes loader-animation {
		to {
			transform: rotate(360deg);
		}
	}
}
</style>
