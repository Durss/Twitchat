<template>
	<ToggleBlock class="overlayparamstts" :title="$t('overlay.tts.title')" :icons="['tts']">
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleBlock,
	},
	emits:[],
})
 class OverlayParamsTTS extends Vue {

}
export default toNative(OverlayParamsTTS);
</script>

<style scoped lang="less">
.overlayparamstts{
	
}
</style>