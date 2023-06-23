<template>
	<ToggleBlock class="heatoverlayclick" :title="$t('heat.overlay_interaction')" :open="false" :icons="['overlay']">
		<div class="content">
			<ParamItem class="item"
			:paramData="params_enabled[code]"
			v-for="code in overlayTypes"
			:key="code">
				<div class="content">
	
					<PostOnChatParam class="card-item" botMessageKey="bingo" noToggle noBackground
						:titleKey="'heat.overlay_'+code+'.description'"
						:placeholders="placeholders[code]"
					/>
				</div>
			</ParamItem>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerActionPlaceholders } from '@/types/TriggerActionDataTypes';
import PostOnChatParam from '../../PostOnChatParam.vue';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
		PostOnChatParam,
	},
	emits:[],
})
export default class HeatOverlayClick extends Vue {
	
	public overlayTypes:string[] = ["spotify", "ulule"]

	public params_enabled:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public placeholders:{[key:string]:TwitchatDataTypes.PlaceholderEntry[]} = {};

	public mounted():void {
		for (let i = 0; i < this.overlayTypes.length; i++) {
			const t = this.overlayTypes[i];
			this.params_enabled[t] = {type:"boolean", value:false, labelKey:"heat.overlay_"+t+".title", icon:t};
		}
		
		this.placeholders["spotify"] = TriggerActionPlaceholders("music");

		this.placeholders["ulule"] = [
			{tag:"CAMPAIGN_NAME", descKey:"triggers.placeholders.ulule_campaign_name", example:this.$t("triggers.placeholders.ulule_campaign_name_example")},
			{tag:"CAMPAIGN_URL", descKey:"triggers.placeholders.ulule_campaign_url", example:"https://www.ulule.com"},
		];
	}

}
</script>

<style scoped lang="less">
.heatoverlayclick{
	width: 100%;

	.content {
		gap: .5em;
		display: flex;
		flex-direction: column;
	}
}
</style>