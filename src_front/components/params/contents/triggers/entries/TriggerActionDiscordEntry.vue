<template>
	<div class="triggeractiondiscordentry triggerActionForm">
		<ParamItem :paramData="param_message" v-model="action.discordAction.message"/>
		<ParamItem :paramData="param_channel" v-model="action.discordAction.channelId"/>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import type { ITriggerPlaceholder, TriggerActionDiscordData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		ParamItem,
	},
	emits:[],
})

class TriggerActionDiscordEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionDiscordData;

	@Prop
	declare triggerData:TriggerData;
	
	public param_message:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"whispers", maxLength:2000, labelKey:"triggers.actions.discord.param_message" };
	public param_channel:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", icon:"discord", labelKey:"triggers.actions.discord.param_channel" };

	public beforeMount():void {
		if(!this.action.discordAction) {
			this.action.discordAction = {
				action:"message",
				channelId:"",
				message:"",
			}
		}
		this.param_channel.listValues = this.$store.discord.channelList.map(v=> {
			return {value:v.id, label:v.name };
		})
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.param_message.placeholderList = list;
	}

}
export default toNative(TriggerActionDiscordEntry);
</script>

<style scoped lang="less">
.triggeractiondiscordentry{
	.loader {
		height: 1.5em;
	}
}
</style>