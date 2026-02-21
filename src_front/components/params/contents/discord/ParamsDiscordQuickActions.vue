<template>
	<div class="paramsdiscordquickactions">
		<TTButton primary icon="add" @click="$store.discord.addQuickAction()">{{ $t("discord.quick_actions_addBt") }}</TTButton>
		<ToggleBlock medium
		editableTitle
		v-model:title="a.data.name"
		:titleDefault="$t('global.edit')"
		v-for="a in quickActions" :key="a.data.id" :open="false">
			<template #left_actions>
				<TTButton class="deleteBt" icon="trash" alert @click.stop="$store.discord.delQuickAction(a.data)" />
			</template>
			<div class="entry">
				<ParamItem :key="'message_'+a.data.id" class="param" @change="$emit('change')" :paramData='a.message' v-model="a.data.message"></ParamItem>
				<ParamItem :key="'channelId_'+a.data.id" class="param" @change="$emit('change')" :paramData='a.channel' v-model="a.data.channelId"></ParamItem>
			</div>
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerEventPlaceholders, TriggerTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { reactive } from 'vue';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
	},
	emits:["change"],
})
class ParamsDiscordQuickActions extends Vue {

	public pram_name:TwitchatDataTypes.ParameterData<string>[] = [];
	public pram_message:TwitchatDataTypes.ParameterData<string>[] = [];
	public pram_channel:TwitchatDataTypes.ParameterData<string>[] = [];

	public get quickActions():{data:TwitchatDataTypes.DiscordQuickActionData,
	message:TwitchatDataTypes.ParameterData<string>,
	channel:TwitchatDataTypes.ParameterData<string>}[] {
		return (this.$store.discord.quickActions || []).map(a => {
			return reactive({
				data:a,
				message: {type:"string", value:a.message||'', labelKey:"discord.quick_actions_message", placeholderList:this.placeholders, longText:true, maxLength:2000},
				channel: {type:"list", value:a.channelId||'', listValues:this.discordChans, labelKey:"discord.quick_actions_channel"},
			})
		});
	}

	public get discordChans():TwitchatDataTypes.ParameterDataListValue<string>[] {
		return this.$store.discord.channelList.map(v=> {
			return {
				label:v.name,
				value:v.id,
			}
		})
	}

	public get placeholders():TwitchatDataTypes.PlaceholderEntry[] {
		return TriggerEventPlaceholders(TriggerTypes.ANY_MESSAGE);
	}

}
export default toNative(ParamsDiscordQuickActions);
</script>

<style scoped lang="less">
.paramsdiscordquickactions{
	gap: .5em;
	display: flex;
	flex-direction: column;
	align-items: center;
	.deleteBt {
		border-radius: 0;
		margin-left: 0 !important;
		padding-left: .4em;
	}

	.entry {
		gap: .25em;
		display: flex;
		flex-direction: column;
		.param {
			:deep(.holder) {
				flex-direction: column;
				select{
					flex-basis: unset;
				}
				.inputHolder{
					width:100%;
				}
			}
		}
	}
}
</style>