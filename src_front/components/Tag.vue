<template>
	<div class="tag" :class="{ active: props.active == true }">
		<slot />
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	active?: boolean;
}>();
</script>

<style scoped lang="less">
.tag {
	font-size: 0.7em;
	padding: 0.15em 0.55em;
	border-radius: 1em;
	background-color: var(--background-color-fader);
	color: var(--color-light);
	opacity: 0.7;
	transition:
		opacity 0.2s,
		background-color 0.2s;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	font-weight: bold;
	display: flex;
	align-items: center;

	&.active {
		opacity: 1;
		border: 1px solid var(--color-primary-light);
		color: var(--color-primary-light);
		background-color: var(--color-primary-fadest);
	}
}
</style>
