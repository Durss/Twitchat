<template>
	<div class="triggeractiondiscordentry triggerActionForm">
		<ParamItem :paramData="param_message" v-model="action.discordAction.message" forceChildDisplay/>
		<Icon v-if="loading" class="loader" name="loader" />
		<div v-else-if="channelLoadingError" class="card-item alert"></div>
		<ParamItem v-else :paramData="param_channel" v-model="action.discordAction.channelId" forceChildDisplay/>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import type { ITriggerPlaceholder, TriggerActionDiscordData as TriggerActionDiscordData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import ApiHelper from '@/utils/ApiHelper';

@Component({
	components:{
		ParamItem,
	},
	emits:[],
})
export default class TriggerActionDiscordEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionDiscordData;

	@Prop
	declare triggerData:TriggerData;
	
	public loading:boolean = true;
	public channelLoadingError:boolean = true;
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
		this.loadDiscordChannels();
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.param_message.placeholderList = list;
	}

	/**
	 * Loads user's discord channels
	 */
	private async loadDiscordChannels():Promise<void> {
		this.loading = true;
		this.channelLoadingError = false;
		try {
			const result = await ApiHelper.call("discord/channels", "GET");
			if(result.json.success === true) {
				this.param_channel.listValues = result.json.channelList.map(v=> {
					return {value:v.id, label:v.name };
				})
			}
		}catch(error) {
			this.channelLoadingError = true;
		}
		this.loading = false;
	}

}
</script>

<style scoped lang="less">
.triggeractiondiscordentry{
	.loader {
		height: 1.5em;
	}
}
</style>