<template>
	<button :class="classes" type="button">
		<Icon class="icon" :name="icon" :theme="theme"/>
	</button>
</template>

<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue';

const props = withDefaults(defineProps<{
	theme?: string;
	small?: boolean;
	icon?: string;
}>(), {
	theme: "",
	small: false,
	icon: "cross",
});
const classes = ref<string[]>([]);

onBeforeMount(() => {
	classes.value.push("clearbutton");
	if(props.small !== false)  {
		classes.value.push("small");
	}
});
</script>

<style scoped lang="less">
.clearbutton{
	position: absolute;
	top: 0;
	right: 0;
	padding: 1em;
	z-index: 1;
	cursor: pointer;
	// color: var(--color-text);
	color: inherit;
	.icon {
		height: 1em;
		transition: transform .15s;
	}
	&:hover {
		.icon {
			transform: scale(1.2);
		}
	}
	&.small {
		padding: .5em;
	}
}
</style>
