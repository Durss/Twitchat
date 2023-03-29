<template>
	<div class="triggeractionslashcommandparams">
		<ParamItem :paramData="param_command" v-model="triggerData.chatCommand" />
	</div>
</template>

<script lang="ts">
import type { TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		ParamItem,
	},
	emits:[],
})
export default class TriggerActionSlashCommandParams extends Vue {

	@Prop
	public triggerData!:TriggerData;
	
	public param_command:TwitchatDataTypes.ParameterData = { type:"string", value:"", icon:"commands_purple.svg", labelKey:"triggers.actions.slash_cmd.param_cmd", placeholderKey:"triggers.actions.slash_cmd.param_cmd_placeholder" };

}
</script>

<style scoped lang="less">
.triggeractionslashcommandparams{
	display: flex;
	flex-direction: column;
	gap: .5em;
	
}
</style>