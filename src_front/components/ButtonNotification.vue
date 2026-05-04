<template>
	<div
		class="buttonnotification"
		:class="{ disabled }"
		@click="onClick($event)"
		v-newflag="newflag"
	>
		<span v-if="iconEmoji" class="icon emoji">{{ iconEmoji }}</span>
		<img v-else-if="icon && icon.startsWith('http')" :src="icon" alt="" class="icon image" />
		<Icon v-else :name="icon" class="icon" v-if="icon" />
		<span class="label" v-if="!isEmptySlot(slots.default)"><slot /></span>
		<span v-if="count > 0" class="count">{{ count }}</span>
	</div>
</template>

<script setup lang="ts">
import { gsap } from "gsap";
import { getCurrentInstance, useSlots } from "vue";
import Icon from "./Icon.vue";
import { useEmptySlot } from "@/composables/useEmptySlot";

const props = withDefaults(
	defineProps<{
		icon?: string;
		iconEmoji?: string;
		count?: number;
		disabled?: boolean;
		newflag?: { date: number; id: string };
	}>(),
	{
		count: 0,
		disabled: false,
	},
);

const instance = getCurrentInstance();
const slots = useSlots();
const { isEmptySlot } = useEmptySlot();

function onClick(event: MouseEvent): void {
	const el = instance?.proxy?.$el;
	if (el) {
		gsap.fromTo(
			el,
			{ scaleX: 0.7 },
			{ duration: 1.4, scale: 1, clearProps: "scaleX", ease: "elastic.out(2)" },
		);
		gsap.fromTo(
			el,
			{ scaleY: 0.7 },
			{ duration: 1.2, scale: 1, clearProps: "all", ease: "elastic.out(2)", delay: 0.05 },
		);
	}
}
</script>

<style scoped lang="less">
.buttonnotification {
	min-width: 2em;
	min-height: 2em;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--border-radius);
	position: relative;
	padding: 0.2em;

	&::before {
		//Offset "new flag" so it's closer to the icon
		top: 0.25em;
		left: 0.25em;
	}

	&.disabled {
		cursor: not-allowed;
		opacity: 0.5;
		// pointer-events: none;
	}

	.icon {
		position: relative;
		height: 1em;
		width: 1em;
		object-fit: contain;
		&:before {
			//Offset "new flag" for better readability
			margin-left: -5px;
			width: 7px;
			height: 7px;
		}

		&.emoji {
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 1.25em;
		}
		&.image {
			height: 1.25em;
			width: 1.25em;
		}
	}

	&:hover {
		background-color: var(--background-color-fader);
	}

	.count {
		position: absolute;
		pointer-events: none;
		top: 0;
		right: 0;
		transform: translate(20%, -60%);
		border-radius: 1em;
		font-size: 12px;
		padding: 0.25em 0.5em;
		font-family: var(--font-roboto);
		color: var(--color-light);
		background-color: var(--color-secondary);
	}

	.label {
		margin-left: 2px;
	}
	&:has(.icon + .label) {
		.label {
			font-size: 0.8em;
			font-weight: b;
		}
	}
}
@media only screen and (max-width: 600px) {
	.buttonnotification {
		width: 1.5em;
		height: 1.5em;
	}
}
</style>
