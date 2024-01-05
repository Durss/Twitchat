<template>
	<div class="triggeractionextensionentry triggerActionForm">

		<div class="noExtension" v-if="extensions.length == 0">
			<p>{{ $t("extensions.no_extension") }}</p>
			<TTButton icon="newtab" href="https://dashboard.twitch.tv/extensions" target="_blank" type="link" primary>{{ $t("extensions.no_extension_browse") }}</TTButton>
		</div>
		
		<template v-else>
			<ParamItem :paramData="param_id" v-model="action.extension.id" @change="buildSlotList()" />
			<ParamItem :paramData="param_enable" v-model="action.extension.enable">
				<ParamItem class="child" :paramData="param_slot" noBackground />
			</ParamItem>
		</template>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import RewardListEditForm from '@/components/chatform/RewardListEditForm.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { TriggerActionExtensionData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import TTButton from '@/components/TTButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		RewardListEditForm,
	},
	emits:[],
})
export default class TriggerActionExtensionEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionExtensionData;
	
	@Prop
	public extensions!:TwitchDataTypes.Extension[];
	
	@Prop
	declare triggerData:TriggerData;

	public param_id:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"triggers.actions.extension.param_id", icon:"extension"};
	public param_enable:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"triggers.actions.extension.param_enable", icon:"disable"};
	public param_slot:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"triggers.actions.extension.param_slot"};
	
	public beforeMount():void {
		if(!this.action.extension) {
			this.action.extension = {
				id:"",
				enable:false,
			}
		}

		this.param_id.listValues = this.extensions.map(v=> {
			return {value:v.id, label:v.name };
		});

		this.param_enable.listValues = [
			{value:true, labelKey:"global.enabled"},
			{value:false, labelKey:"global.disabled"},
		];

		this.buildSlotList();
	}

	public buildSlotList():void {
		const extension = this.extensions.find(v=>v.id == this.param_id.value);
		if(extension) {
			this.param_slot.value = "";
			this.param_slot.listValues = extension.type.map(v=> {
				return {value:v, labelKey:"extensions.type_"+v };
			})
		}
	}
}
</script>

<style scoped lang="less">
.triggeractionextensionentry{

	.noExtension {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	
}
</style>