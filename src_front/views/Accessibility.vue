<template>
	<div class="accessibility">
		<div aria-live="polite" role="alert" class="ariaPolite">{{$store.accessibility.ariaPolite}}</div>
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{}
})
class Accessibility extends Vue {

}
export default toNative(Accessibility);
</script>

<style scoped lang="less">
.accessibility{
	.ariaPolite {
		position: absolute;
		top: 0;
		left: 0;
		transform: translate(0, -10000px);
		z-index: 100;
	}
}
</style>