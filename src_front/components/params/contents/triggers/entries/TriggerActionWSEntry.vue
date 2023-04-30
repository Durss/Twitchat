<template>
	<div class="triggeractionwsentry triggerActionForm">
		<div class="card-item info warn" v-if="!websocketConnected">
			<img src="@/assets/icons/info.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.http_ws.need_to_connect">
				<template #LINK>
					<a @click="$store('params').openParamsPage(contentConnexions)">{{ $t("triggers.actions.http_ws.need_to_connect_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<div class="card-item tags">
			<p class="title" v-if="parameters.length > 0">{{ $t("triggers.actions.http_ws.select_param") }}</p>
			
			<div class="params">
				<template v-for="p in parameters" :key="p.tag" >
					<div class="rowItem tag" @click="p.enabled = !p.enabled; onToggleParam()"><mark>{{ p.placeholder.tag }}</mark></div>
					<span class="rowItem" @click="p.enabled = !p.enabled; onToggleParam()">{{ $t(p.placeholder.descKey) }}</span>
					<ToggleButton class="rowItem" v-model="p.enabled" @change="onToggleParam()" />
				</template>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleButton from '@/components/ToggleButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import { TriggerEventPlaceholders, type ITriggerPlaceholder, type TriggerActionWSData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import WebsocketTrigger from '@/utils/WebsocketTrigger';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ParamItem,
		ToggleButton,
	},
	emits:["update"]
})
export default class TriggerActionWSEntry extends Vue {

	@Prop
	public action!:TriggerActionWSData;
	@Prop
	public triggerData!:TriggerData;

	public parameters:{placeholder:ITriggerPlaceholder, enabled:boolean}[] = [];
	public param_topic:TwitchatDataTypes.ParameterData<string> = { label:"<mark>topic</mark>", type:"string", value:"", placeholderKey:"triggers.actions.http_ws.topic_placeholder", maxLength:255 };

	public get websocketConnected():boolean { return WebsocketTrigger.instance.connected; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNEXIONS; } 

	public beforeMount():void {
		this.parameters = TriggerEventPlaceholders(this.triggerData.type).map(v=> {
			return  {
				placeholder:v,
				enabled:!this.action.params || this.action.params.includes(v.tag),
			}
		});

		this.onToggleParam();
	}

	public onToggleParam():void {
		const params:string[] = this.parameters.filter(v=>v.enabled).map(v=> v.placeholder.tag);
		this.action.params = params;
	}

}
</script>

<style scoped lang="less">
.triggeractionwsentry{

	.tags {
		.title {
			margin-bottom: .5em;
		}
	}

	.params {
		display: grid;
		grid-template-columns: 1fr 1fr 40px;
		align-items: center;
		gap: .5em;
		font-size: .8em;
		position: relative;
		overflow: hidden;
		z-index: 0;
		.tag {
			text-align: right;
		}
		.rowItem {
			position: relative;
			cursor: pointer;
			&:nth-child(3n+1) {
				max-width: 20vw;
			}
			&:hover::before {
				content: "";
				position: absolute;
				top: 50%;
				left: -1000px;
				width: 2000px;
				height: calc(100% + 4px);
				background-color: var(--color-primary);
				transform: translateY(-50%);
				z-index: -1;
			}
		}
	}
}
</style>