<template>
	<ToggleBlock class="overlayparamstts" :title="$t('overlay.tts.title')" :icons="['tts']">
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleBlock,
	},
	emits:[],
})
export default class OverlayParamsTTS extends Vue {

}
</script>

<style scoped lang="less">
.overlayparamstts{
	
}
</style>