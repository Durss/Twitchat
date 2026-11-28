<template>
	<div class="changelogstreamprefix card-item" inert>
		<span class="prefix card-item dark">[DROP]</span>
		<span class="placeholder">{{ t("stream.title_placeholder") }}</span>
		<span class="suffix card-item dark">!socials</span>
	</div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<style scoped lang="less">
.changelogstreamprefix {
	font-size: 1.35em;
	display: flex;
	align-items: center;
	& > * {
		padding: 0.25em 0.5em;
		display: inline-block;
	}

	.prefix {
		margin-right: 0.5em;
		padding-bottom: 0.4em;
	}

	.suffix {
		margin-left: 0.8em;
		padding-bottom: 0.4em;
	}

	.placeholder {
		font-style: italic;
		opacity: 0.5;
		padding: 0.25em 0;
		text-align: center;
		margin-top: -0.3em;
	}
}
</style>
