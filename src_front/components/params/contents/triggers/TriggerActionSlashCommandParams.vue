<template>
	<div class="triggeractionslashcommandparams">
		<ParamItem noBackground
			@change="onUpdateCommand()"
			:paramData="param_command"
			:autofocus="true"
			:error="cmdNameConflict || formatError"
			:errorMessage="cmdNameConflict? $t('triggers.actions.chat.conflict') : formatError? $t('triggers.slash_cmd.format_error') : ''" />
		<ParamItem noBackground :paramData="param_addToContextMenu" v-model="triggerData.addToContextMenu" />
		<ParamItem v-if="$store.discord.discordLinked" noBackground :paramData="param_addToDiscord" v-model="triggerData.addToDiscord">
			<ToggleBlock class="parameter-child" :title="$t('triggers.slash_cmd.grant_discord_rights')" :icons="['lock_fit']" :open="false" small>
				<img src="/discord/command_permissions.gif" class="grantAccessTutorial">
			</ToggleBlock>
		</ParamItem>

		<TriggerActionCommandArgumentParams :triggerData="triggerData" />
	</div>
</template>

<script lang="ts">
import { TriggerTypes, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import TriggerActionCommandArgumentParams from './TriggerActionCommandArgumentParams.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
		TriggerActionCommandArgumentParams,
	},
	emits:[],
})
class TriggerActionSlashCommandParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public formatError = false;
	public cmdNameConflict = false;
	public param_command:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"commands", labelKey:"triggers.slash_cmd.param_cmd", placeholderKey:"triggers.slash_cmd.param_cmd_placeholder" };
	public param_addToContextMenu:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"rightClick", labelKey:"triggers.slash_cmd.param_ctx_menu" };
	public param_addToDiscord:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"discord", labelKey:"triggers.slash_cmd.param_discord" };

	public beforeMount():void {
		if(!this.triggerData.chatCommand) this.triggerData.chatCommand = "";
		this.param_command.value = this.triggerData.chatCommand;
		if(!this.triggerData.addToDiscord) this.triggerData.addToDiscord = false;
		if(!this.triggerData.addToContextMenu) this.triggerData.addToContextMenu = false;
	}

	public onUpdateCommand():void {
		this.cmdNameConflict = false;

		this.triggerData.chatCommand =
		this.param_command.value = this.param_command.value.trim().replace(/\s+/g, '');

		//Make sure no other chat command has the same name
		const triggers = this.$store.triggers.triggerList;
		const mainCmd = this.triggerData.chatCommand?.toLowerCase() || "";


		this.formatError = mainCmd.indexOf("/") != 0;

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
export default toNative(TriggerActionSlashCommandParams);
</script>

<style scoped lang="less">
.triggeractionslashcommandparams {
	display: flex;
	flex-direction: column;
	gap: .5em;

	.grantAccessTutorial {
		width: 100%;
		max-width: 100%;
	}
}
</style>
