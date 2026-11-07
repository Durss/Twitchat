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

<script setup lang="ts">
import BingoGridForm from "@/components/bingo_grid/BingoGridForm.vue";
</script>

<style scoped lang="less">
.overlayparamsbingogrid {
}
</style>
