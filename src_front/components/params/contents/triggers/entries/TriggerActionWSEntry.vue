<template>
	<div class="triggeractionwsentry triggerActionForm">
		<div class="card-item info warn" v-if="!websocketConnected">
			<Icon name="info" alt="info" theme="light" />
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.http_ws.need_to_connect">
				<template #LINK>
					<a @click="openConnectForm()">{{ $t("triggers.actions.http_ws.need_to_connect_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<ParamItem :paramData="param_payload" v-model="action.payload" />

		<div class="card-item tags">
			<div class="head">
				<p class="title" v-if="parameters.length > 0">{{ $t("triggers.actions.http_ws.select_param_ws") }}</p>
				<ParamItem class="toggleAll" noBackground :paramData="param_toggleAll" v-model="param_toggleAll.value" @change="toggleAll()" v-if="parameters.length > 3" />
			</div>
			<div class="params">
				<div class="card-item" v-for="p in parameters" :key="p.placeholder.tag" @click="p.enabled = !p.enabled; onToggleParam()">
					<div class="taginfo">
						<div class="tag"><mark>{{ p.placeholder.tag }}</mark></div>
						<span>{{ $t(p.placeholder.descKey, p.placeholder.descReplacedValues || {}) }}</span>
					</div>
					<ToggleButton v-model="p.enabled" @change="onToggleParam()" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleButton from '@/components/ToggleButton.vue';
import type { ITriggerPlaceholder, TriggerActionWSData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import WebsocketTrigger from '@/utils/WebsocketTrigger';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import PlaceholderSelector from '@/components/params/PlaceholderSelector.vue';
import ParamItem from '@/components/params/ParamItem.vue';
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
class TriggerActionWSEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionWSData;

	@Prop
	declare triggerData:TriggerData;

	public placeholderList:ITriggerPlaceholder<any>[] = [];
	public parameters:{placeholder:ITriggerPlaceholder<any>, enabled:boolean}[] = [];
	public param_toggleAll:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"chat.filters.select_all" };
	public param_payload:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, maxLength:10000, labelKey:"triggers.actions.http_ws.payload_description" };

	public get websocketConnected():boolean { return WebsocketTrigger.instance.connected; }

	public beforeMount():void {

		this.onToggleParam();
	}

	public onToggleParam():void {
		const params:string[] = this.parameters.filter(v=>v.enabled).map(v=> v.placeholder.tag);
		this.action.params = params;
	}

	/**
	 * Called when clicking "all" toggle
	 */
	public toggleAll():void {
		this.parameters.forEach(v=> v.enabled = this.param_toggleAll.value);
		this.onToggleParam();
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.placeholderList = list;
		this.parameters = list.map(v=> {
			return  {
				placeholder:v,
				enabled:!this.action.params || this.action.params.includes(v.tag),
			}
		});
		this.param_payload.placeholderList = list;
	}

	public openConnectForm():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.WEBSOCKET);
	}

}
export default toNative(TriggerActionWSEntry);
</script>

<style scoped lang="less">
.triggeractionwsentry{

	.tags {
		.title {
			margin-bottom: .5em;
		}
	}

	.params {
		gap: 2px;
		display: flex;
		flex-direction: column;
		font-size: .8em;
		.card-item {
			display: flex;
			flex-direction: row;
			align-items: center;
			cursor: pointer;
			transition: background-color .2s;
			&:hover {
				background-color: var(--color-light-fader);
			}
			.taginfo {
				gap: .5em;
				flex-grow: 1;
				display: flex;
				flex-direction: column;
				cursor: pointer;

				.tag {
					word-break: break-all;
				}
				span {
					font-style: italic;
				}
			}
			input {
				font-size: 1rem;
			}
		}
	}

	.head {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		.toggleAll {
			justify-self: flex-end;
			align-self: flex-end;
			margin-bottom: 2px;
			// margin-right: 2.25em;
			width: fit-content;
			margin-right: .5em;
			margin-bottom: .5em;
			font-size: .8em;
		}
	}


	.card-item.column {
		flex-direction: column;
		align-items: stretch;
	}
}
</style>
