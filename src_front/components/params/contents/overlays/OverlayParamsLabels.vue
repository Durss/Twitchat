<template>
	<div class="overlayparamslabels overlayParamsSection">

		<div class="header">{{ $t("overlay.labels.head") }}</div>

		<TTButton class="addBt"
		v-if="$store.auth.isPremium || $store.bingoGrid.gridList.length < $config.MAX_BINGO_GRIDS"
		@click="addLabel()" icon="add">{{ $t("bingo_grid.form.add_bt") }}</TTButton>

	</div>
</template>

<script lang="ts">
import { TTButton } from '@/components/TTButton.vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
	},
	emits:[],
})
class OverlayParamsLabels extends Vue {

	public addLabel():void {
		
	}

}
export default toNative(OverlayParamsLabels);
</script>

<style scoped lang="less">
.overlayparamslabels{
	
}
</style>