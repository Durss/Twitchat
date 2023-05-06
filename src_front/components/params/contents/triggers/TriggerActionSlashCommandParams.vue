<template>
	<div class="triggeractionslashcommandparams">
		<ParamItem noBackground :paramData="param_command" v-model="triggerData.chatCommand" />
		<ParamItem noBackground :paramData="param_addToContextMenu" v-model="triggerData.addToContextMenu" />
		
		<TriggerActionCommandArgumentParams :triggerData="triggerData" />
	</div>
</template>

<script lang="ts">
import type { TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import TriggerActionCommandArgumentParams from './TriggerActionCommandArgumentParams.vue';

@Component({
	components:{
		ParamItem,
		TriggerActionCommandArgumentParams,
	},
	emits:[],
})
export default class TriggerActionSlashCommandParams extends Vue {

	@Prop
	public triggerData!:TriggerData;
	public param_command:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"commands.svg", labelKey:"triggers.slash_cmd.param_cmd", placeholderKey:"triggers.slash_cmd.param_cmd_placeholder" };
	public param_addToContextMenu:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"rightClick.svg", labelKey:"triggers.slash_cmd.param_ctx_menu" };
}
</script>

<style scoped lang="less">
.triggeractionslashcommandparams{
	display: flex;
	flex-direction: column;
	gap: .5em;

}
</style>