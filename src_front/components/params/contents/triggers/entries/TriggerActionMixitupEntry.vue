<template>
	<div class="triggeractionmixitupentry triggerActionForm">
		<div class="card-item info warn" v-if="!$store.mixitup.connected">
			<Icon name="info" alt="info" theme="light" />
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.mixitup.need_to_connect">
				<template #LINK>
					<a @click="openConnectForm()">{{ $t("triggers.actions.mixitup.need_to_connect_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<ParamItem :paramData="param_commandId" v-model="action.mixitupData!.commandId" />


		<div class="headerList">
			<div class="header head" v-if="action.mixitupData!.params && action.mixitupData!.params.length > 0">
				<div>{{ $t("global.key") }}</div>
				<div>{{ $t("global.value") }}</div>
			</div>

			<div class="header" v-for="(param, index) in action.mixitupData!.params">
				<div v-click2Select class="key">$argdelimited{{index+1}}text</div>
				<ParamItem :paramData="param_values[index]" v-model="param.value" noBackground placeholdersAsPopout />
				<TTButton class="deleteBt" icon="trash" @click="deleteParam(index)" alert />
			</div>

			<TTButton class="center" icon="add" v-if="(action.mixitupData!.params?.length || 0) < 40" @click="addParam()">{{ $t("triggers.actions.mixitup.add_arg_bt") }}</TTButton>
		</div>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import PlaceholderSelector from '@/components/params/PlaceholderSelector.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import type { TriggerActionMixitupData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import { watch } from 'vue';
import TTButton from '@/components/TTButton.vue';
import Icon from '@/components/Icon.vue';

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
class TriggerActionMixitupEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionMixitupData;

	@Prop
	declare triggerData:TriggerData;

	public param_commandId:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"triggers.actions.mixitup.param_commandId" };
	public param_values:TwitchatDataTypes.ParameterData<string>[] = [];

	public beforeMount():void {
		if(!this.action.mixitupData) {
			this.action.mixitupData = {
				commandId:"",
				params:[],
			};
		}
		if(!this.action.mixitupData.params) {
			this.action.mixitupData.params = [];
		}
		this.buildCommandList();
		this.buildParams();

		watch(()=>this.$store.mixitup.commandList, () => this.buildCommandList());
	}

	public openConnectForm():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.MIXITUP);
	}

	/**
	 * Add a custom param
	 */
	public addParam():void {
		this.action.mixitupData!.params!.push({
			value:"",
		});
		this.buildParams();
	}

	/**
	 * Called when "delete header" button is clicked
	 */
	public deleteParam(index:number):void {
		this.action.mixitupData!.params!.splice(index, 1);
	}

	/**
	 * Builds param data items
	 */
	private buildParams():void {
		this.action.mixitupData!.params!.forEach((value, index) => {
			if(this.param_values.length > index) return;
			this.param_values.push({type:"string", maxLength:10000, value:"", placeholderList:this.placeholderList});
		})
	}

	private buildCommandList():void {
		const list:TwitchatDataTypes.ParameterDataListValue<string>[]
		= this.$store.mixitup.commandList.map(action =>{
			return {
				value:action.ID,
				label:action.Name,
			}
		}).sort((a, b) => a.label.localeCompare(b.label));
		list.unshift({
			value:"",
			labelKey:"global.select_placeholder"
		})
		if(list.findIndex(v=> v.value == this.action.mixitupData!.commandId) == -1) {
			this.action.mixitupData!.commandId = "";
		}
		this.param_commandId.listValues = list;
	}


}
export default toNative(TriggerActionMixitupEntry);
</script>

<style scoped lang="less">
.triggeractionmixitupentry{

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
				width: 100%;
				div {
					background-color: var(--grayout);
					padding: .25em;
					text-align: center;
					font-weight: bold;
					&:first-child{
						margin-right: 1px;
						border-top-left-radius: var(--border-radius);
						border-bottom-left-radius: var(--border-radius);
						flex-shrink: 2;
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
			.key {
				text-align: center;
				align-self: center;
				font-weight: bold;
				max-width: 50%;
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}
		.addBt {
			align-self: center;
		}
	}

}
</style>
