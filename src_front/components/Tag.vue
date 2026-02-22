<template>
	<div class="tag" :class="{ active: props.active == true }">
		<slot />
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	active?:boolean,
}>();
</script>

<style scoped lang="less">
.tag{
	font-size: .7em;
	padding: .15em .55em;
	border-radius: 1em;
	background-color: var(--background-color-fader);
	color: var(--color-light);
	opacity: .7;
	transition: opacity .2s, background-color .2s;
	text-transform: uppercase;
	letter-spacing: .04em;
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