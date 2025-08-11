<template>
	<div class="triggeractionstreamerbotentry triggerActionForm">
		<div class="card-item info warn" v-if="!$store.streamerbot.connected">
			<Icon name="info" alt="info" theme="light" />
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.streamerbot.need_to_connect">
				<template #LINK>
					<a @click="openConnectForm()">{{ $t("triggers.actions.streamerbot.need_to_connect_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<ParamItem :paramData="param_action" v-model="action.streamerbotData!.actionId" />

		<div class="headerList">
			<div class="header head" v-if="action.streamerbotData!.params && action.streamerbotData!.params.length > 0">
				<div>%{{ $t("global.key") }}%</div>
				<div>{{ $t("global.value") }}</div>
			</div>

			<div class="parameter" v-for="(param, index) in action.streamerbotData!.params">
				<ParamItem :paramData="param_keys[index]" v-model="param.key" noBackground placeholdersAsPopout />
				<ParamItem :paramData="param_values[index]" v-model="param.value" noBackground placeholdersAsPopout />
				<TTButton class="deleteBt" icon="trash" @click="deleteParam(index)" alert />
			</div>

			<TTButton class="center" icon="add" v-if="(action.streamerbotData!.params?.length || 0) < 40" @click="addParam()">{{ $t("triggers.actions.streamerbot.add_arg_bt") }}</TTButton>
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import PlaceholderSelector from '@/components/params/PlaceholderSelector.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import TTButton from '@/components/TTButton.vue';
import type { TriggerActionStreamerbotData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		Icon,
		TTButton,
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
	public param_keys:TwitchatDataTypes.ParameterData<string>[] = [];
	public param_values:TwitchatDataTypes.ParameterData<string>[] = [];

	public beforeMount():void {
		if(!this.action.streamerbotData) {
			this.action.streamerbotData = {
				actionId:"",
				params:[],
			};
		}
		if(!this.action.streamerbotData.params) {
			this.action.streamerbotData.params = [];
		}
		this.buildActionList();
		this.buildParams();

		watch(()=>this.$store.streamerbot.actionList, () => this.buildActionList());
	}

	public openConnectForm():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.STREAMERBOT);
	}

	/**
	 * Add a custom param
	 */
	public addParam():void {
		this.action.streamerbotData!.params!.push({
			key:"",
			value:"",
		});
		this.buildParams();
	}

	/**
	 * Called when "delete header" button is clicked
	 */
	public deleteParam(index:number):void {
		this.action.streamerbotData!.params!.splice(index, 1);
	}

	/**
	 * Builds param data items
	 */
	private buildParams():void {
		this.action.streamerbotData!.params!.forEach((value, index) => {
			if(this.param_keys.length > index) return;
			this.param_keys.push({type:"string", maxLength:50, value:"", placeholderList:this.placeholderList});
			this.param_values.push({type:"string", maxLength:10000, value:"", placeholderList:this.placeholderList});
		})
	}

	private buildActionList():void {
		const list:TwitchatDataTypes.ParameterDataListValue<string>[]
		= this.$store.streamerbot.actionList.map(action =>{
			return {
				value:action.id,
				label:action.name,
			}
		}).sort((a, b) => a.label.localeCompare(b.label));
		list.unshift({
			value:"",
			labelKey:"global.select_placeholder"
		})
		if(list.findIndex(v=> v.value == this.action.streamerbotData!.actionId) == -1) {
			this.action.streamerbotData!.actionId = "";
		}
		this.param_action.listValues = list;
	}

}
export default toNative(TriggerActionStreamerbotEntry);
</script>

<style scoped lang="less">
.triggeractionstreamerbotentry{
	.center {
		align-self: center;
	}

	.headerList {
		gap: .5em;
		display: flex;
		flex-direction: column;
		.header {
			gap: .5em;
			display: flex;
			flex-direction: row;
			flex: 1;
			&.head {
				gap: 0;
				justify-content: space-around;
				div {
					background-color: var(--grayout);
					padding: .25em;
					text-align: center;
					font-weight: bold;
					&:first-child{
						margin-right: 1px;
						border-top-left-radius: var(--border-radius);
						border-bottom-left-radius: var(--border-radius);
					}
					&:not(:first-child){
						border-top-right-radius: var(--border-radius);
						border-bottom-right-radius: var(--border-radius);
						flex-basis: calc(50% + 1.6em);
					}
				}
			}
			*:not(.button) {
				width: 50%;
				flex-grow: 1;
				// width: 100%;
				// min-width: unset;
				// max-width: unset;
			}
			.deleteBt {
				flex-shrink: 0;
			}
		}
		.parameter {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			flex: 1;
		}
		.addBt {
			align-self: center;
		}
	}

}
</style>
