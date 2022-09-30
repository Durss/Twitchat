<template>
	<div class="triggeractionchatentry">
		<ParamItem class="item" :paramData="message_conf" ref="textContent" v-model="action.text" :error="cmdNameConflict" />
		<div v-if="cmdNameConflict" class="cmdNameConflict">The message starts with the actual command name, this will lead to infinite message loop!</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TriggerActionHelpers } from '@/types/TriggerActionDataTypes';
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
	},
	emits:["update"]
})
export default class TriggerActionChatEntry extends Vue {

	public action!:TwitchatDataTypes.TriggerActionChatData;
	public event!:TwitchatDataTypes.TriggerEventTypes;
	public triggerKey!:string;
	
	public message_conf:TwitchatDataTypes.ParameterData = { label:"Message to send on your chat", type:"text", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	
	public get cmdNameConflict():boolean {
		return (this.message_conf.value as string)
			.trim()
			.split(" ")[0]
			.toLowerCase() === this.triggerKey?.split("_")[1]?.toLowerCase()
	}

	public beforeMount():void {
		this.message_conf.placeholderList = TriggerActionHelpers(this.event.value);
	}

}
</script>

<style scoped lang="less">
.triggeractionchatentry{
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
}
</style>