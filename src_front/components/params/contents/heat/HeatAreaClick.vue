<template>
	<ToggleBlock class="heatareaclick" :title="$t('heat.zone_interaction')" :open="false" :icons="['polygon']">
		<div class="content">
			TODO
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleBlock
	},
	emits:[],
})
export default class HeatAreaClick extends Vue {

}
</script>

<style scoped lang="less">
.heatareaclick{
	width: 100%;

	.content {
		gap: .5em;
		display: flex;
		flex-direction: column;

		text-align: center;
		font-style: italic;
	}
	
}
</style>