<template>
	<div class="triggeractionchatentry triggerActionForm">
		<ParamItem :paramData="param_message" v-model="action.text"
		forceChildDisplay
		:error="cmdNameConflict"
		:errorMessage="$t('triggers.actions.chat.loop')">
			<ToggleBlock class="commands" :title="$t('triggers.actions.chat.commands_list')" small :open="false">
				<div class="cmd" v-for="c in sortedCommands"
					v-tooltip="$t('global.placeholder_selector_insert')"
					@click="insertCommand(c)"
					v-html="c.cmd.replace(/(\/\S+)/gi, '<mark>$1</mark>').replace(/(?:\{([^}]+)\}?)/gi, ' [$1]')"></div>
			</ToggleBlock>
		</ParamItem>
		
		<ParamItem v-if="canReply" :paramData="param_reply" v-model="action.sendAsReply"></ParamItem>
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerTypes, type ITriggerPlaceholder, type TriggerActionChatData, type TriggerData, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
	},
	emits:["update"]
})
class TriggerActionChatEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionChatData;

	@Prop
	declare triggerData:TriggerData;
	
	public param_message:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"whispers", maxLength:500, labelKey:"triggers.actions.chat.param_message" };
	public param_reply:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"reply", labelKey:"triggers.actions.chat.param_reply" };
	
	public get cmdNameConflict():boolean {
		if(!this.action.text) return false;
		const cmds = this.triggerData.chatCommandAliases?.concat() ?? [];
		if(this.triggerData.chatCommand) cmds.push(this.triggerData.chatCommand);
		const cmd = this.action.text.split(" ")[0].toLowerCase();
		for (let i = 0; i < cmds.length; i++) {
			if(cmds[i] == cmd) return true;
		}
		return false;
	}

	public get sortedCommands():TwitchatDataTypes.CommandData[] {
		let res = this.$store.chat.commands.filter(v=>v.twitchCmd);
		res.sort((a, b)=> {
			if(a.cmd > b.cmd) return 1;
			if(a.cmd < b.cmd) return -1;
			return 0;
		})
		return res;
	}

	public get canReply():boolean {
		return ([TriggerTypes.CHAT_COMMAND,
				TriggerTypes.ANY_MESSAGE,
				TriggerTypes.FIRST_TODAY,
				TriggerTypes.FIRST_ALL_TIME,
				TriggerTypes.CHEER] as TriggerTypesValue[]).includes(this.triggerData.type);
	}

	public insertCommand(cmd:TwitchatDataTypes.CommandData):void {
		this.param_message.value = cmd.cmd.replace(/(?:\{([^}]+)\}?)/gi, '$1') + ""+this.param_message.value
	}

	public beforeMount():void {
		if(!this.action.text) this.action.text = "";
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.param_message.placeholderList = list;
	}

}
export default toNative(TriggerActionChatEntry);
</script>

<style scoped lang="less">
.triggeractionchatentry{
	.info {
		line-height: 1.25em;
	}

	.commands {
		margin-left: 1.5em;
		:deep(.content){
			display: grid;
			grid-gap: 4px;
			background-color: transparent;
			grid-template-columns: repeat(auto-fill, minmax(max(calc(50% - .5em), 200px), 1fr));
		}
		.cmd {
			font-size: .8em;
			line-height: 1.5em;
			background-color: var(--background-color-fadest);
			padding: .1em;
			border-radius: .5em;
			cursor: pointer;
			&:hover {
				background-color: var(--color-dark-fadest);
			}
		}
	}
}
</style>