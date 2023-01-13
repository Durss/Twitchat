<template>
	<div class="triggeractionchatentry">
		<div class="item info">
			<img src="@/assets/icons/info_purple.svg" alt="info" class="icon">
			<i18n-t scope="global" tag="span" keypath="triggers.actions.chat.tip">
				<template #TITLE>
					<strong>{{ $t("triggers.actions.chat.tip_title") }}</strong>
				</template>
			</i18n-t>
			<i18n-t scope="global" tag="div" keypath="triggers.actions.chat.tip_example">
				<template #TITLE>
					<strong>{{ $t("triggers.actions.chat.tip_example_title") }}</strong>
				</template>
				<template #CMD>
					<mark>/followers 30</mark>
				</template>
			</i18n-t>
			<ToggleBlock class="commands" :title="$t('triggers.actions.chat.commands_list')" small :open="false">
				<div class="cmd" v-for="c in $store('chat').commands.filter(v=>v.chatUsable)"
					@click="insertCommand(c)"
					v-html="c.cmd.replace(/(\/\S+)/gi, '<mark>$1</mark>').replace(/(?:\{([^}]+)\}?)/gi, ' [$1]')"></div>
			</ToggleBlock>
		</div>
		<div class="item">
			<ParamItem :paramData="message_conf" ref="textContent" v-model="action.text" :error="cmdNameConflict" />
			<div v-if="cmdNameConflict" class="cmdNameConflict" v-t="'triggers.actions.chat.loop'"></div>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerActionHelpers, TriggerTypes, type TriggerActionChatData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../../ParamItem.vue';

@Options({
	props:{
		action:Object,
		event:Object,
		triggerKey:String,
	},
	components:{
		ParamItem,
		ToggleBlock,
	},
	emits:["update"]
})
export default class TriggerActionChatEntry extends Vue {

	public action!:TriggerActionChatData;
	public event!:TriggerEventTypes;
	public triggerKey!:string;
	
	public message_conf:TwitchatDataTypes.ParameterData = { label:"", type:"text", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	
	public get cmdNameConflict():boolean {
		if(this.event.value != TriggerTypes.CHAT_COMMAND) return false;
		const chunks = this.triggerKey?.split("_");
		chunks.shift();
		const triggerKey = chunks.join("_") ?? "";
		return (this.message_conf.value as string)
			.trim()
			.split(" ")[0]
			.toLowerCase() === triggerKey.toLowerCase()
	}

	public insertCommand(cmd:TwitchatDataTypes.CommandData):void {
		this.message_conf.value = cmd.cmd.replace(/(?:\{([^}]+)\}?)/gi, '$1') + ""+this.message_conf.value
	}

	public beforeMount():void {
		this.message_conf.label = this.$t("triggers.actions.chat.param_message");
		this.message_conf.placeholderList = TriggerActionHelpers(this.event.value);
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
		margin-top: 1em;
		:deep(.content){
			display: grid;
			row-gap: .25em;
			column-gap: .25em;
			background-color: transparent;
			grid-template-columns: repeat(auto-fill, minmax(max(calc(50%-.5em), 200px), 1fr));
		}
		.cmd {
			font-size: 1.1em;
			line-height: 1.75em;
			background-color: fade(@mainColor_normal, 10%);
			padding: .1em;
			border-radius: .5em;
			cursor: pointer;
			&:hover {
				background-color: fade(@mainColor_normal, 15%);
			}
		}
	}
}
</style>