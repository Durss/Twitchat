<template>
	<div class="triggeractionslashcommandparams">
		<ParamItem noBackground :paramData="param_command" v-model="triggerData.chatCommand"
			@change="onUpdateCommand()"
			:error="cmdNameConflict"
			:errorMessage="$t('triggers.actions.chat.conflict')" />
		<ParamItem noBackground :paramData="param_addToContextMenu" v-model="triggerData.addToContextMenu" />
		
		<TriggerActionCommandArgumentParams :triggerData="triggerData" />
	</div>
</template>

<script lang="ts">
import { TriggerTypes, type TriggerData } from '@/types/TriggerActionDataTypes';
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
	
	public cmdNameConflict = false;
	public param_command:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"commands", labelKey:"triggers.slash_cmd.param_cmd", placeholderKey:"triggers.slash_cmd.param_cmd_placeholder" };
	public param_addToContextMenu:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"rightClick", labelKey:"triggers.slash_cmd.param_ctx_menu" };
		

	public onUpdateCommand():void {
		this.cmdNameConflict = false;

		//Make sure no other chat command has the same name
		const triggers = this.$store.triggers.triggerList;
		const mainCmd = this.triggerData.chatCommand?.toLowerCase() || "";
		
		//Check if any other trigger contain the same command
		for (let i = 0; i < triggers.length; i++) {
			if(triggers[i].type == TriggerTypes.SLASH_COMMAND
			&& triggers[i].id != this.triggerData.id
			&& triggers[i].chatCommand) {
				//Check if there's a command conflict
				if(triggers[i].chatCommand?.toLowerCase() === mainCmd) {
					this.cmdNameConflict = true;
					break;
				}
			}
		}

		//Check if a global slash command exists with the same name
		const globalCmds = this.$store.chat.commands;
		for (let i = 0; i < globalCmds.length; i++) {
			const entry = globalCmds[i];
			if(entry.cmd.split(" ")[0].toLowerCase() === mainCmd) {
				this.cmdNameConflict = true;
				break;
			}
		}
	}
}
</script>

<style scoped lang="less">
.triggeractionslashcommandparams{
	display: flex;
	flex-direction: column;
	gap: .5em;

}
</style>