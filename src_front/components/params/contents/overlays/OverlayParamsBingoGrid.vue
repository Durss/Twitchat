<template>
	<div class="overlayparamsbingogrid overlayParamsSection">

		<div class="header">{{ $t("overlay.bingo_grid.head") }}</div>

		<!-- <a href="https://www.youtube.com/watch?v=0S9SgAi8IOI" target="_blank" class="youtubeTutorialBt">
			<Icon name="youtube" theme="light" />
			<span>{{ $t('overlay.youtube_demo_tt') }}</span>
			<Icon name="newtab" theme="light" />
		</a> -->

		<BingoGridForm embedMode></BingoGridForm>
	</div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';
import OverlayInstaller from './OverlayInstaller.vue';
import BingoGridForm from '@/components/bingo_grid/BingoGridForm.vue';

@Component({
	components:{
		BingoGridForm,
		OverlayInstaller,
	},
	emits:[],
})
class OverlayParamsBingoGrid extends Vue {

}
export default toNative(OverlayParamsBingoGrid);
</script>

<style scoped lang="less">
.overlayparamsbingogrid{

}
</style>
