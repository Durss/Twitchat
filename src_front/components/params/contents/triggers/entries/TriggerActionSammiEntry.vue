<template>
	<div class="triggeractionwsentry triggerActionForm">
		<div class="card-item info warn" v-if="!$store.sammi.connected">
			<Icon name="info" alt="info" theme="light" />
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.sammi.need_to_connect">
				<template #LINK>
					<a @click="openConnectForm()">{{ $t("triggers.actions.sammi.need_to_connect_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<ParamItem :paramData="param_buttonId" v-model="action.sammiData!.buttonId" />
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import PlaceholderSelector from '@/components/params/PlaceholderSelector.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import type { TriggerActionSammiData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
		ParamItem,
		ToggleButton,
		PlaceholderSelector,
	},
	emits:["update"]
})
class TriggerActionSammiEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionSammiData;

	@Prop
	declare triggerData:TriggerData;

	public param_buttonId:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", labelKey:"triggers.actions.sammi.param_buttonId", maxLength:40 };

	public beforeMount():void {
		if(!this.action.sammiData) {
			this.action.sammiData = {
				buttonId:"",
			};
		}
	}

	public openConnectForm():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.SAMMI);
	}


}
export default toNative(TriggerActionSammiEntry);
</script>

<style scoped lang="less">
.triggeractionsammientry{

}
</style>
