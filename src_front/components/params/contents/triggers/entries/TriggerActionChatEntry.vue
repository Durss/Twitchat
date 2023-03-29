<template>
	<div class="triggeractionchatentry">
		<div class="item">
			<ParamItem :paramData="message_conf" v-model="action.text" :error="cmdNameConflict" />
			<ToggleBlock class="commands" :title="$t('triggers.actions.chat.commands_list')" small :open="false">
				<div class="cmd" v-for="c in sortedCommands"
					:data-tooltip="$t('global.placeholder_selector_insert')"
					@click="insertCommand(c)"
					v-html="c.cmd.replace(/(\/\S+)/gi, '<mark>$1</mark>').replace(/(?:\{([^}]+)\}?)/gi, ' [$1]')"></div>
			</ToggleBlock>
			<div v-if="cmdNameConflict" class="cmdNameConflict">{{ $t("triggers.actions.chat.loop") }}</div>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerEventPlaceholders, TriggerTypes, type TriggerActionChatData, type TriggerData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
	},
	emits:["update"]
})
export default class TriggerActionChatEntry extends Vue {

	@Prop
	public action!:TriggerActionChatData;
	@Prop
	public triggerData!:TriggerData;
	
	public message_conf:TwitchatDataTypes.ParameterData = { type:"string", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	
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
		let res = this.$store('chat').commands.filter(v=>v.twitchCmd);
		res.sort((a, b)=> {
			if(a.cmd > b.cmd) return 1;
			if(a.cmd < b.cmd) return -1;
			return 0;
		})
		return res;
	}

	public insertCommand(cmd:TwitchatDataTypes.CommandData):void {
		this.message_conf.value = cmd.cmd.replace(/(?:\{([^}]+)\}?)/gi, '$1') + ""+this.message_conf.value
	}

	public beforeMount():void {
		this.message_conf.labelKey = "triggers.actions.chat.param_message";
		this.message_conf.placeholderList = TriggerEventPlaceholders(this.triggerData.type);
	}

}
</script>

<style scoped lang="less">
.triggeractionchatentry{
	.triggerActionForm();
	.cmdNameConflict {
		background-color: @mainColor_alert;
		color: @mainColor_light;
		text-align: center;
		margin:auto;
		display: block;
		padding: .25em;
		border-bottom-left-radius: .5em;
		border-bottom-right-radius: .5em;
	}

	.info {
		line-height: 1.25em;
	}

	.commands {
		padding-left: 2em;
		:deep(.content){
			display: grid;
			row-gap: 4px;
			column-gap: 4px;
			background-color: transparent;
			grid-template-columns: repeat(auto-fill, minmax(max(calc(50%-.5em), 200px), 1fr));
		}
		.cmd {
			font-size: 1.1em;
			line-height: 1.5em;
			background-color: fade(@mainColor_normal, 10%);
			padding: .1em;
			border-radius: .5em;
			cursor: pointer;
			&:hover {
				background-color: fade(@mainColor_normal, 15%);
			}
		}
	}
	:deep(input) {
		flex-grow: 1;
	}
}
</style>