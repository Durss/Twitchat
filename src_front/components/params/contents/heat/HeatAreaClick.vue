<template>
	<ToggleBlock class="heatareaclick" :title="$t('heat.zone_interaction')" :open="true" :icons="['polygon']">
		<div class="content">
			<i18n-t scope="global" tag="div" keypath="heat.areas.description">
				<template #TRIGGER_LINK>
					<a @click="openTriggers()">{{ $t("heat.areas.trigger_link") }}</a>
				</template>
			</i18n-t>

			<div class="areaList">
				<HeatAreaPreview class="item" v-for="area in screens" :area="area" :key="area.id"></HeatAreaPreview>
				<Button class="item" icon="add" @click="addArea()"></Button>
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Component, Vue } from 'vue-facing-decorator';
import HeatAreaPreview from './HeatAreaPreview.vue';
import type { HeatScreen } from '@/types/HeatDataTypes';
import Utils from '@/utils/Utils';

@Component({
	components:{
		Button,
		ToggleBlock,
		HeatAreaPreview,
	},
	emits:[],
})
export default class HeatAreaClick extends Vue {

	public screens:HeatScreen[] = [];

	public async beforeMount():Promise<void> {
		const scenes = await OBSWebsocket.instance.getScenes();
	}

	public openTriggers():void {
		this.$store("params").currentPage = TwitchatDataTypes.ParameterPages.TRIGGERS;
	}

	public addArea():void {
		this.screens.push({
			id: Utils.getUUID(),
			zones: [],
		})
	}

}
</script>

<style scoped lang="less">
.heatareaclick{
	width: 100%;

	.content {
		gap: .5em;
		display: flex;
		flex-direction: column;

		.areaList {
			gap: 5px;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			
			.item {
				width: 30%;
				min-width: 100px;
				aspect-ratio: 16/9;
			}
		}
	}
	
}
</style>