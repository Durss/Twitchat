<template>
	<div class="apppublic">
		<router-view />

		<Alert />
	</div>
</template>

<script setup lang="ts">
import Alert from "./views/AlertView.vue";
</script>

<style scoped lang="less">
.apppublic {
	// min-width: 100vw;
	// min-height: 100vh;
	color: var(--color-text);
}
</style>
