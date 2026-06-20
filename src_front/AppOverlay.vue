<template>
	<div class="appoverlay">
		<router-view />
		<Alert />
	</div>
</template>

<script setup lang="ts">
import Alert from "./views/AlertView.vue";
</script>

<style scoped lang="less">
.appoverlay {
	width: 100vw;
	height: 100vh;
}
</style>
