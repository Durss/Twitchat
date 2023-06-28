<template>
	<div class="triggeractionttsentry triggerActionForm" v-if="!$store('tts').params.enabled">
		<div class="info warn">
			<img src="@/assets/icons/info.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.tts.header">
				<template #LINK>
					<a @click="$store('params').openParamsPage(contentTTS)">{{ $t("triggers.actions.tts.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div v-else class="triggeractionttsentry">
		<ParamItem class="file" :paramData="message_conf" ref="textContent" v-model="action.text" />
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry.vue';
import type { ITriggerPlaceholder, TriggerActionChatData, TriggerData } from '@/types/TriggerActionDataTypes';

@Component({
	components:{
		ParamItem,
	},
	emits:["update"]
})
export default class TriggerActionTTSEntry extends AbstractTriggerActionEntry {
	
	@Prop
	declare action:TriggerActionChatData;
	
	@Prop
	declare triggerData:TriggerData;

	public message_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"whispers", maxLength:500, labelKey:"triggers.actions.tts.param_message" };
	
	public get contentTTS():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TTS; }

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder[]):void {
		this.message_conf.placeholderList = list;
	}

}
</script>

<style scoped lang="less">
.triggeractionttsentry{
}
</style>