<template>
	<div class="triggeractionstreamerbotentry triggerActionForm">
		<div class="card-item info warn" v-if="!$store.streamerbot.connected">
			<img src="@/assets/icons/info.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.streamerbot.need_to_connect">
				<template #LINK>
					<a @click="openConnectForm()">{{ $t("triggers.actions.streamerbot.need_to_connect_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<ParamItem :paramData="param_action" v-model="action.streamerbotData!.actionId" />
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import PlaceholderSelector from '@/components/params/PlaceholderSelector.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import type { TriggerActionStreamerbotData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		ParamItem,
		ToggleButton,
		PlaceholderSelector,
	},
	emits:["update"]
})
class TriggerActionStreamerbotEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionStreamerbotData;

	@Prop
	declare triggerData:TriggerData;

	public param_action:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"triggers.actions.streamerbot.param_action" };

	public beforeMount():void {
		const list:TwitchatDataTypes.ParameterDataListValue<string>[] = this.$store.streamerbot.actionList.map(action =>{
			return {
				value:action.id,
				label:action.name,
			}
		});
		list.unshift({
			value:"",
			labelKey:"global.select_placeholder"
		})
		this.param_action.listValues = list;
		if(!this.action.streamerbotData) {
			this.action.streamerbotData = {
				actionId:"",
			};
		}
	}

	public openConnectForm():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.STREAMERBOT);
	}


}
export default toNative(TriggerActionStreamerbotEntry);
</script>

<style scoped lang="less">
.triggeractionstreamerbotentry{
}
</style>