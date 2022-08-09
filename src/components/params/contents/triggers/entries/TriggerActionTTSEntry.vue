<template>
	<div class="triggeractionttsentry">
		<ParamItem class="item file" :paramData="message_conf" ref="textContent" v-model="action.text" />
	</div>
</template>

<script lang="ts">
import type { ParameterData, TriggerActionChatData } from '@/types/TwitchatDataTypes';
import { TriggerActionHelpers } from '@/utils/TriggerActionData';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../../ParamItem.vue';

@Options({
	props:{
		action:Object,
		event:String,
	},
	components:{
		ParamItem,
	},
	emits:["update"]
})
export default class TriggerActionTTSEntry extends Vue {
	
	public action!:TriggerActionChatData;
	public event!:string;

	public message_conf:ParameterData = { label:"Message to read with text to speech", type:"text", longText:true, value:"", icon:"whispers_purple.svg" };

	public beforeMount():void {
		this.message_conf.placeholderList = TriggerActionHelpers(this.event);
	}

}
</script>

<style scoped lang="less">
.triggeractionttsentry{
	
}
</style>