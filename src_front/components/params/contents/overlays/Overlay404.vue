<template>
	<div class="overlay404">
		<div class="title">{{ t("global.404.title") }}</div>
		<div class="description">{{ t("global.404.description") }}</div>
	</div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<style scoped lang="less">
.overlay404 {
	text-align: center;
	.title {
		font-size: 4em;
		font-weight: bold;
	}

	.description {
	}
}
</style>
