<template>
	<div class="triggeractionttsentry" v-if="!$store('tts').params.enabled">
		<div class="row info warn">
			<img src="@/assets/icons/infos.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.tts.header">
				<template #LINK>
					<a @click="$emit('setContent', contentTTS)" v-t="'triggers.actions.tts.header_link'"></a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div v-else class="triggeractionttsentry">
		<ParamItem class="row item file" :paramData="message_conf" ref="textContent" v-model="action.text" />
	</div>
</template>

<script lang="ts">
import { TriggerActionHelpers, type TriggerActionChatData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../../ParamItem.vue';

@Options({
	props:{
		action:Object,
		event:Object,
	},
	components:{
		ParamItem,
	},
	emits:["update"]
})
export default class TriggerActionTTSEntry extends Vue {
	
	public action!:TriggerActionChatData;
	public event!:TriggerEventTypes;

	public message_conf:TwitchatDataTypes.ParameterData = { label:"", type:"text", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	
	public get contentTTS():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.TTS; }

	public beforeMount():void {
		this.message_conf.label = this.$t("triggers.actions.tts.param_message");
		this.message_conf.placeholderList = TriggerActionHelpers(this.event.value);
	}

}
</script>

<style scoped lang="less">
.triggeractionttsentry{
	.triggerActionForm();
}
</style>