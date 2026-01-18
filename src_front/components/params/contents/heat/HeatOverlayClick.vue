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
			>
				<ParamItem :paramData="param_cooldown[code]" @change="onUpdateValue" />
				<ParamItem :paramData="param_allowAnon[code]" @change="onUpdateValue" class="marginTop" />
			</PostOnChatParam>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import { TriggerEventPlaceholders, TriggerTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import PostOnChatParam from '../../PostOnChatParam.vue';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
		PostOnChatParam,
	},
	emits:[],
})
class HeatOverlayClick extends Vue {
	
	public overlayTypes:OverlayKey[] = ["spotify", "ulule"];
	public botMessageKeys:TwitchatDataTypes.BotMessageField[] = ["heatSpotify", "heatUlule"];
	public placeholders:Partial<{[key in OverlayKey]:TwitchatDataTypes.PlaceholderEntry[]}> = {};
	public param_cooldown:Partial<{[key in OverlayKey]:TwitchatDataTypes.ParameterData<number>}> = {};
	public param_allowAnon:Partial<{[key in OverlayKey]:TwitchatDataTypes.ParameterData<boolean>}> = {};

	public mounted():void {
		this.placeholders["spotify"] = TriggerEventPlaceholders(TriggerTypes.MUSIC_START);

		this.placeholders["ulule"] = [
			{tag:"ULULE_CAMPAIGN_NAME", descKey:"triggers.placeholders.ulule_campaign_name", example:this.$t("triggers.placeholders.ulule_campaign_name_example")},
			{tag:"ULULE_CAMPAIGN_URL", descKey:"triggers.placeholders.ulule_campaign_url", example:"https://www.ulule.com"},
		];

		this.param_cooldown
		for (let i = 0; i < this.overlayTypes.length; i++) {
			const code = this.overlayTypes[i]!;
			const botMessageKey = this.botMessageKeys[i]!;
			this.param_cooldown[code] = {type:"number", value:this.$store.chat.botMessages[botMessageKey].cooldown || 10, min:0, max:3600, labelKey:"heat.param_cooldown", icon:"timer"};
			this.param_allowAnon[code] = {type:"boolean", value:this.$store.chat.botMessages[botMessageKey].allowAnon === true, labelKey:"heat.param_anon", icon:"anon", tooltipKey:"heat.anonymous"};
		}
	}

	public onUpdateValue():void {
		this.$store.chat.botMessages.heatUlule.cooldown = this.param_cooldown.ulule?.value;
		this.$store.chat.botMessages.heatUlule.allowAnon = this.param_allowAnon.ulule?.value;
		this.$store.chat.botMessages.heatSpotify.cooldown = this.param_cooldown.spotify?.value;
		this.$store.chat.botMessages.heatSpotify.allowAnon = this.param_allowAnon.spotify?.value;
		DataStore.set(DataStore.BOT_MESSAGES, this.$store.chat.botMessages);
	}

}

type OverlayKey = "spotify" | "ulule";
export default toNative(HeatOverlayClick);
</script>

<style scoped lang="less">
.heatoverlayclick{
	width: 100%;

	.content {
		gap: .5em;
		display: flex;
		flex-direction: column;
	}

	.marginTop {
		margin-top: .25em;
	}
}
</style>