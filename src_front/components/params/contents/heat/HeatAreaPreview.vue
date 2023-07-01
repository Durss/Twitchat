<template>
	<div class="heatareapreview">
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
export default class HeatAreaPreview extends Vue {

}
</script>

<style scoped lang="less">
.heatareapreview{
	border-radius: var(--border-radius);
	border: 1px dashed var(--color-light);
	background-color: var(--color-light-fadest);
}
</style>