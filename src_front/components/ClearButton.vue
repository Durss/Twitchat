<template>
	<button :class="classes" type="button" :aria-label="ariaLabel">
		<Icon class="icon" :name="icon" :theme="theme" />
	</button>
</template>

<script lang="ts" setup>
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		theme?: string;
		small?: boolean;
		icon?: string;
	}>(),
	{
		theme: "",
		small: false,
		icon: "cross",
	},
);
const { t } = useI18n();
const classes = ref<string[]>([]);

//Accessible name from the icon, still can be overridden
const ariaLabel = computed(() => {
	if (props.icon == "cross") return t("global.close");
	if (props.icon == "back") return t("global.back");
	return undefined;
});

onBeforeMount(() => {
	classes.value.push("clearbutton");
	if (props.small !== false) {
		classes.value.push("small");
	}
});
</script>

<style scoped lang="less">
.clearbutton {
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
		transition: transform 0.15s;
	}
	&:hover {
		.icon {
			transform: scale(1.2);
		}
	}
	&.small {
		padding: 0.5em;
	}
}
</style>
