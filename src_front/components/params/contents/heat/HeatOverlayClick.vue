<template>
	<ToggleBlock class="heatoverlayclick" :title="$t('heat.overlay_interaction')" :open="false" :icons="['overlay']">
		<div class="content">
			<PostOnChatParam class="card-item"
				v-for="code, index in overlayTypes"
				:key="code"
				:icon="code"
				:botMessageKey="botMessageKeys[index]" noBackground
				:titleKey="'heat.overlay_'+code+'.description'"
				:placeholders="placeholders[code]"
			/>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerEventPlaceholders, TriggerTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
import PostOnChatParam from '../../PostOnChatParam.vue';

@Component({
	components:{
		ToggleBlock,
		PostOnChatParam,
	},
	emits:[],
})
export default class HeatOverlayClick extends Vue {
	
	public overlayTypes:string[] = ["spotify", "ulule"];
	public botMessageKeys:string[] = ["heatSpotify", "heatUlule"];
	public placeholders:{[key:string]:TwitchatDataTypes.PlaceholderEntry[]} = {};

	public mounted():void {
		this.placeholders["spotify"] = TriggerEventPlaceholders(TriggerTypes.MUSIC_START);

		this.placeholders["ulule"] = [
			{tag:"ULULE_CAMPAIGN_NAME", descKey:"triggers.placeholders.ulule_campaign_name", example:this.$t("triggers.placeholders.ulule_campaign_name_example")},
			{tag:"ULULE_CAMPAIGN_URL", descKey:"triggers.placeholders.ulule_campaign_url", example:"https://www.ulule.com"},
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