<template>
	<div class="triggeractionplayabilityentry triggerActionForm">
		<div class="card-item info warn" v-if="!$store.playability.connected">
			<img src="@/assets/icons/info.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.playability.need_to_connect">
				<template #LINK>
					<a @click="openConnectForm()">{{ $t("triggers.actions.playability.need_to_connect_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<div class="actionList" v-else>

			<div class="action" v-for="(param, index) in action.playabilityData!.outputs">
				<ParamItem :paramData="param_outputs[index]" v-model="param.code" noBackground @change="buildValueFields(index)" />
				<div class="value">
					<div v-if="param.type == 'axis'" class="hints">
						<div>{{ $t("playability.hints_axis_1") }}</div>
						<div>{{ $t("playability.hints_axis_2") }}</div>
					</div>
					<div v-else-if="param.type == 'trigger'" class="hints">
						<div>{{ $t("playability.hints_trigger_1") }}</div>
						<div>{{ $t("playability.hints_trigger_2") }}</div>
					</div>
					<ParamItem :paramData="param_values[index]" v-model="param.value" noBackground :key="param_values[index].storage!" />
				</div>
				<TTButton class="deleteBt" icon="trash" @click="deleteOutput(index)" alert />
			</div>

			<TTButton class="center" icon="add" v-if="(action.playabilityData!.outputs?.length || 0) < 40" @click="addOutput()">{{ $t("triggers.actions.playability.add_output_bt") }}</TTButton>
		</div>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import PlaceholderSelector from '@/components/params/PlaceholderSelector.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import type { TriggerActionPlayabilityData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import TTButton from '@/components/TTButton.vue';
import Utils from '@/utils/Utils';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleButton,
		PlaceholderSelector,
	},
	emits:["update"]
})
class TriggerActionPlayabilityEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionPlayabilityData;

	@Prop
	declare triggerData:TriggerData;

	public param_outputs:TwitchatDataTypes.ParameterData<string, string, unknown, NonNullable<typeof this.action.playabilityData>["outputs"][0], NonNullable<typeof this.action.playabilityData>["outputs"][0]>[] = [];
	public param_values:(TwitchatDataTypes.ParameterData<number> | TwitchatDataTypes.ParameterData<boolean>)[] = [];

	private availableOutputs:NonNullable<(typeof this.param_outputs)[number]["listValues"]> = [];

	public beforeMount():void {
		if(!this.$store.playability.connected) return;
		if(!this.action.playabilityData) {
			this.action.playabilityData = {
				outputs:[],
			};
		}
		this.availableOutputs = this.$store.playability.mappingList.map((m) => {
			return {
				value:m.output.code,
				label:m.output.code,
				storage:m.output,
			}
		});

		this.buildOutputFields();
		this.buildValueFields();
	}

	public openConnectForm():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.PLAYABILITY);
	}

	public addOutput():void {
		if(this.availableOutputs.length > 0) {
			this.action.playabilityData!.outputs.push({
				code:this.availableOutputs[0].storage!.code,
				type:this.availableOutputs[0].storage!.type,
				value:this.availableOutputs[0].storage!.value,
			});
			this.buildOutputFields();
			this.buildValueFields(this.action.playabilityData!.outputs.length - 1);
		}
	}

	public deleteOutput(index:number):void {
		this.action.playabilityData!.outputs.splice(index, 1);
	}

	public buildOutputFields():void {
		for (let index = 0; index < this.action.playabilityData!.outputs.length; index++) {
			if(index < this.param_outputs.length) continue;
			this.param_outputs[index] = {
				value:this.availableOutputs[0].storage!.type,
				type:"list",
				listValues: this.availableOutputs,
				storage:this.availableOutputs[0].storage!,
			};
		}
	}

	public buildValueFields(resetValueIndex?:number):void {
		for (let index = 0; index < this.action.playabilityData!.outputs.length; index++) {
			const output = this.action.playabilityData!.outputs[index];
			const outputType = output.type = this.availableOutputs.find(v=>v.storage?.code === output.code)?.storage?.type || "mouseButton";

			if(["keyboard", "mouseButton", "button"].includes(outputType)) {
				if(index == resetValueIndex) {
					this.action.playabilityData!.outputs[index].value = true;
				}
				this.param_values[index] = {
					value:true,
					type:"list",
					listValues: [
						{labelKey:"triggers.actions.playability.output_press", value:true},
						{labelKey:"triggers.actions.playability.output_release", value:false},
						{labelKey:"triggers.actions.playability.output_press_release", value:"press_release"},
					],
				};
			}else

			if(["axis"].includes(outputType)) {
				if(index == resetValueIndex) {
					this.action.playabilityData!.outputs[index].value = 0;
				}
				this.param_values[index] = {
					value:0,
					type:"slider",
					min:-1,
					max:1,
					step:0.1,
					storage:Utils.getUUID(),//Used to force unmount/mount of the component
				};
			}else

			if(["trigger"].includes(outputType)) {
				if(index == resetValueIndex) {
					this.action.playabilityData!.outputs[index].value = 1;
				}
				this.param_values[index] = {
					value:1,
					type:"slider",
					min:0,
					max:1,
					step:0.1,
					storage:Utils.getUUID(),//Used to force unmount/mount of the component
				};
			}else{

				if(index == resetValueIndex) {
					this.action.playabilityData!.outputs[index].value = 1;
				}
				this.param_values[index] = {
					value:1,
					type:"slider",
					min:0,
					max:1,
					step:0.01,
					storage:Utils.getUUID(),//Used to force unmount/mount of the component
				};
			}
		}
	}

}
export default toNative(TriggerActionPlayabilityEntry);
</script>

<style scoped lang="less">
.triggeractionplayabilityentry{
	.actionList {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.action {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			align-self: stretch;
			justify-content: stretch;
			.paramitem, .value  {
				flex: 1;

				.hints {
					display: flex;
					flex-direction: rows;
					justify-content: space-between;
					font-size: .8em;
				}
			}
		}
	}
}
</style>
