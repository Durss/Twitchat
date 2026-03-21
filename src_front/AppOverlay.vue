<template>
	<div class="appoverlay">
		<router-view />
		<Alert />
	</div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from "vue-facing-decorator";
import Alert from "./views/AlertView.vue";

@Component({
	components: {
		Alert,
	},
	emits: [],
})
class AppOverlay extends Vue {}
export default toNative(AppOverlay);
</script>

<style scoped lang="less">
.appoverlay {
	width: 100vw;
	height: 100vh;
}
</style>
