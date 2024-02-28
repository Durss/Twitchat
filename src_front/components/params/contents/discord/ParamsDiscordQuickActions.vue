<template>
	<div class="paramsdiscordquickactions">
		<TTButton primary icon="add" @click="$store.discord.addQuickAction()">{{ $t("discord.quick_actions_addBt") }}</TTButton>
		<ToggleBlock medium :title="a.data.name || ' '" v-for="a in quickActions" :key="a.data.id" :open="false">
			<div class="entry">
				<ParamItem class="param" @change="$emit('change')" :paramData='a.name' v-model="a.data.name"></ParamItem>
				<ParamItem class="param" @change="$emit('change')" :paramData='a.message' v-model="a.data.message"></ParamItem>
				<ParamItem class="param" @change="$emit('change')" :paramData='a.channel' v-model="a.data.channelId"></ParamItem>
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

	public get quickActions():{data:TwitchatDataTypes.DiscordQuickActionData, name:TwitchatDataTypes.ParameterData<string>, message:TwitchatDataTypes.ParameterData<string>, channel:TwitchatDataTypes.ParameterData<string>}[] {
		return this.$store.discord.quickActions.map(a => {
			return reactive({
				data:a,
				name: {type:"string", value:"", labelKey:"discord.quick_actions_name", maxLength:20},
				message: {type:"string", value:"", labelKey:"discord.quick_actions_message", placeholderList:this.placeholders, longText:true, maxLength:2000},
				channel: {type:"list", value:"", listValues:this.discordChans, labelKey:"discord.quick_actions_channel"},
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