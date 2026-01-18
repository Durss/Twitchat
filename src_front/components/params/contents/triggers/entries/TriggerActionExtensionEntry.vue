<template>
	<div class="triggeractionextensionentry triggerActionForm">

		<div class="noExtension" v-if="extensions.length == 0">
			<p>{{ $t("extensions.no_extension") }}</p>
			<TTButton icon="newtab" href="https://dashboard.twitch.tv/extensions" target="_blank" type="link" primary>{{ $t("extensions.no_extension_browse") }}</TTButton>
		</div>
		
		<template v-else>
			<ParamItem :paramData="param_id" v-model="action.extension.id" @change="buildSlotList()" />
			<ParamItem :paramData="param_enable" v-model="action.extension.enable">
				<ParamItem class="child" :paramData="param_slot" noBackground @change="onChangeSlot()" />
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
import {toNative,  Component, Prop } from 'vue-facing-decorator';
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
class TriggerActionExtensionEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionExtensionData;
	
	@Prop
	public extensions!:TwitchDataTypes.Extension[];
	
	@Prop
	declare triggerData:TriggerData;

	public param_id:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"triggers.actions.extension.param_id", icon:"extension"};
	public param_enable:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"triggers.actions.extension.param_enable", icon:"disable"};
	public param_slot:ISlotItem<string> = {type:"list", value:"", labelKey:"triggers.actions.extension.param_slot", slotIndex:"1", slotType:"component"};
	
	public beforeMount():void {
		if(!this.action.extension) {
			this.action.extension = {
				id:"",
				enable:false,
				slotIndex:"",
				slotType:"component",
			}
		}

		this.param_id.listValues = this.extensions.map(v=> {
			return {value:v.id, label:v.name };
		});

		this.param_enable.listValues = [
			{value:true, labelKey:"global.enable"},
			{value:false, labelKey:"global.disable"},
		];
	}
	
	public mounted():void {
		this.buildSlotList();
	}

	public buildSlotList():void {
		const extension = this.extensions.find(v=>v.id == this.param_id.value);
		if(extension) {
			this.param_slot.value = "";
			const list:ISlotItem<any>[] = [];
			const slotList = this.$store.extension.availableSlots;
			for (const key in slotList) {
				const slotType = key as keyof typeof slotList;
				if(!extension.type.includes(slotType)) continue;
				const count = slotList[slotType];
				for (let i = 0; i < count; i++) {
					const suffix = (count > 1)? " "+(i+1) : "";
					list.push(<ISlotItem<any>>{value:slotType+"_"+(i+1), label:this.$t("extensions.type_"+slotType)+suffix, slotIndex:(i+1).toString(), slotType });
				}
			}
			this.param_slot.listValues = list;
			this.param_slot.value = list[0]!.value;
			this.onChangeSlot();
		}else{
			this.param_slot.listValues = [];
		}
	}

	public onChangeSlot():void {
		const v = this.param_slot.selectedListValue as ISlotItem<string>;
		if(!v) return;
		this.action.extension.slotIndex = v.slotIndex;
		this.action.extension.slotType = v.slotType;
	}
}

interface ISlotItem<T> extends TwitchatDataTypes.ParameterData<T> {
	slotIndex:TriggerActionExtensionData["extension"]["slotIndex"];
	slotType:TriggerActionExtensionData["extension"]["slotType"];
}
export default toNative(TriggerActionExtensionEntry);
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