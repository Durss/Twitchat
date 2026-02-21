<template>
	<ToggleBlock class="HeatScreenList" :title="$t('heat.zone_interaction')" :open="true" :icons="['polygon']">
		<div class="content">
			<i18n-t class="infos" scope="global" tag="div" keypath="heat.areas.description" v-if="!currentScreen">
				<template #TRIGGER_LINK>
					<a @click="openTriggers()">{{ $t("heat.areas.trigger_link") }}</a>
				</template>
			</i18n-t>

			<draggable class="areaList" v-if="!currentScreen"
			v-model="$store.heat.screenList"
			group="actions"
			item-key="id"
			ghost-class="ghost"
			direction="vertical"
			draggable=".item"
			:animation="250">
				<template #item="{element, index}:{element:HeatScreen, index:number}">
					<HeatScreenPreview class="item" :screen="element" :key="index"
						@update="editScreen(element, true)"
						@click="editScreen(element)"
						@delete="deleteScreen"
						@duplicate="duplicateScreen"
						:canDuplicate="canCreateScreens" />
				</template>
				<template #footer>
					<TTButton class="item" icon="add" @click="createScreen()" v-if="canCreateScreens"></TTButton>
				
					<PremiumLimitMessage v-else
						label="heat.nonpremium_limit"
						premiumLabel="heat.premium_limit"
						:max="$config.MAX_CUSTOM_HEAT_SCREENS"
						:maxPremium="$config.MAX_CUSTOM_HEAT_SCREENS_PREMIUM" />
				</template>
			</draggable>

			<HeatScreenEditor v-else :screen="currentScreen" @update="editScreen(currentScreen!, true)" @close="currentScreen = null" />
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Config from '@/utils/Config';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { HeatScreen } from '@/types/HeatDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import HeatScreenEditor from './areas/HeatScreenEditor.vue';
import HeatScreenPreview from './areas/HeatScreenPreview.vue';
import draggable from 'vuedraggable';
import PremiumLimitMessage from '../../PremiumLimitMessage.vue';

@Component({
	components:{
		TTButton,
		draggable,
		ToggleBlock,
		HeatScreenEditor,
		HeatScreenPreview,
		PremiumLimitMessage,
	},
	emits:[],
})
class HeatScreenList extends Vue {

	public currentScreen:HeatScreen|null = null;

	public get maxScreens():number { return this.$store.auth.isPremium? Config.instance.MAX_CUSTOM_HEAT_SCREENS_PREMIUM : Config.instance.MAX_CUSTOM_HEAT_SCREENS }
	public get canCreateScreens():boolean { return this.$store.heat.screenList.length < this.maxScreens; }

	public async beforeMount():Promise<void> {
	}

	public openTriggers():void {
		this.$store.params.currentPage = TwitchatDataTypes.ParameterPages.TRIGGERS;
	}

	/**
	 * Called when clicking "+" (new screen) button
	 */
	public createScreen():void {
		const id = this.$store.heat.createScreen();
		this.currentScreen = this.$store.heat.screenList.find(v=>v.id == id) || null;
	}

	/**
	 * Called when clicking edit button
	 */
	public editScreen(screen:HeatScreen, saveOnly = false):void {
		if(!saveOnly) {
			this.currentScreen = screen;
		}
		this.$store.heat.updateScreen(screen);
	}

	/**
	 * Called when clicking duplicate button
	 */
	public duplicateScreen(id:string):void {
		this.$store.heat.duplicateScreen(id);
	}

	/**
	 * Called when clicking premium button
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Called when clicking delete button
	 */
	public deleteScreen(id:string):void {
		this.$confirm(this.$t("heat.areas.delete_confirm.title"), this.$t("heat.areas.delete_confirm.description")).then(()=>{
			this.$store.heat.deleteScreen(id);
		}).catch(error=>{/*ignore*/});
	}

}
export default toNative(HeatScreenList);
</script>

<style scoped lang="less">
.HeatScreenList{
	width: 100%;

	.content {
		gap: .5em;
		display: flex;
		flex-direction: column;

		.infos {
			text-align: center;
		}

		.areaList {
			gap: 5px;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;

			.item:not(.premiumBt) {
				width: 30%;
				min-width: 100px;
				aspect-ratio: 16/9;

				&.premiumBt {
					:deep(.icon) {
						height: 2em;
						width: 2em;
						max-width: 2em;
					}
				}
			}
		}
	}

}
</style>
