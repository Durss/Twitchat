<template>
	<div class="triggeractionwsentry triggerActionForm">
		<div class="card-item info warn" v-if="!websocketConnected">
			<img src="@/assets/icons/info.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.http_ws.need_to_connect">
				<template #LINK>
					<a @click="$store.params.openParamsPage(contentConnexions)">{{ $t("triggers.actions.http_ws.need_to_connect_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<div class="card-item tags">
			<p class="title" v-if="parameters.length > 0">{{ $t("triggers.actions.http_ws.select_param") }}</p>
			
			<div class="params">
				<ParamItem class="toggleAll" noBackground :paramData="param_toggleAll" @change="toggleAll()" v-if="parameters.length > 3" />
				
				<div class="card-item">
					<label for="ws_action_topic" class="taginfo">
						<div class="tag"><mark>TOPIC</mark></div>
						<span>{{ $t("triggers.actions.http_ws.topic_description") }}</span>
					</label>
					<input id="ws_action_topic" type="text" v-model="action.topic"
					:placeholder="$t('triggers.actions.http_ws.topic_placeholder')" maxlength="255">
				</div>

				<div class="card-item" v-for="p in parameters" :key="p.placeholder.tag" @click="p.enabled = !p.enabled; onToggleParam()">
					<div class="taginfo">
						<div class="tag"><mark>{{ p.placeholder.tag }}</mark></div>
						<span>{{ $t(p.placeholder.descKey) }}</span>
					</div>
					<ToggleButton v-model="p.enabled" @change="onToggleParam()" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleButton from '@/components/ToggleButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { ITriggerPlaceholder, TriggerActionWSData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import WebsocketTrigger from '@/utils/WebsocketTrigger';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		ParamItem,
		ToggleButton,
	},
	emits:["update"]
})
 class TriggerActionWSEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionWSData;

	@Prop
	declare triggerData:TriggerData;

	public parameters:{placeholder:ITriggerPlaceholder<any>, enabled:boolean}[] = [];
	public param_toggleAll:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"chat.filters.select_all" };

	public get websocketConnected():boolean { return WebsocketTrigger.instance.connected; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNEXIONS; } 

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
		console.log("VALUE", this.param_toggleAll.value)
		this.parameters.forEach(v=> v.enabled = this.param_toggleAll.value);
		this.onToggleParam();
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.parameters = list.map(v=> {
			return  {
				placeholder:v,
				enabled:!this.action.params || this.action.params.includes(v.tag),
			}
		});
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
			&:hover {
				background-color: var(--color-light-fade);
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
			}
			input {
				font-size: 1rem;
			}
		}
		.toggleAll {
			justify-self: flex-end;
			align-self: flex-end;
			margin-bottom: 2px;
			// margin-right: 2.25em;
			width: fit-content;
			margin-right: .5em;
			margin-bottom: .5em;
		}
	}
}
</style>