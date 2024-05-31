<template>
	<div class="appoverlay">
		<router-view />
	</div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
class AppOverlay extends Vue {

}
export default toNative(AppOverlay);
</script>

<style scoped lang="less">
.appoverlay{
	width: 100vw;
	height: 100vh;
}
</style>
