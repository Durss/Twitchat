<template>
	<ToggleBlock class="HeatScreenList" :title="$t('heat.zone_interaction')" :open="true" :icons="['polygon']">
		<div class="content">
			<i18n-t scope="global" tag="div" keypath="heat.areas.description">
				<template #TRIGGER_LINK>
					<a @click="openTriggers()">{{ $t("heat.areas.trigger_link") }}</a>
				</template>
			</i18n-t>

			<div class="areaList" v-if="!currentScreen">
				<HeatScreenPreview class="item" v-for="screen in $store('heat').screenList" :screen="screen" :key="screen.id"
				@click="editScreen(screen)"
				@delete="deleteScreen"
				@duplicate="duplicateScreen"></HeatScreenPreview>

				<Button class="item" icon="add" @click="createScreen"></Button>
			</div>

			<HeatScreenEditor v-else :screen="currentScreen" @update="editScreen(currentScreen)" />
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { HeatScreen } from '@/types/HeatDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
import HeatScreenEditor from './areas/HeatScreenEditor.vue';
import HeatScreenPreview from './areas/HeatScreenPreview.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
		HeatScreenEditor,
		HeatScreenPreview,
	},
	emits:[],
})
export default class HeatScreenList extends Vue {

	public currentScreen:HeatScreen|null = null;

	public async beforeMount():Promise<void> {
	}

	public openTriggers():void {
		this.$store("params").currentPage = TwitchatDataTypes.ParameterPages.TRIGGERS;
	}

	/**
	 * Called when clicking "+" (new screen) button
	 */
	public createScreen():void {
		this.$store("heat").createScreen();
	}

	/**
	 * Called when clicking edit button
	 */
	public editScreen(screen:HeatScreen):void {
		this.currentScreen = screen;
		this.$store("heat").updateScreen(screen);
	}

	/**
	 * Called when clicking duplicate button
	 */
	public duplicateScreen(id:string):void {
		this.$store("heat").duplicateScreen(id);
	}

	/**
	 * Called when clicking delete button
	 */
	public deleteScreen(id:string):void {
		this.$confirm(this.$t("heat.areas.delete_confirm.title"), this.$t("heat.areas.delete_confirm.description")).then(()=>{
			this.$store("heat").deleteScreen(id);
		}).catch(error=>{/*ignore*/});
	}

}
</script>

<style scoped lang="less">
.HeatScreenList{
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