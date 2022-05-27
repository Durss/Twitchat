<template>
	<ToggleBlock
	orderable
	deletable
	medium
	:error="isError"
	:errorTitle="errorTitle"
	:open="opened"
	:title="title" :class="classes"
	@delete="$emit('delete')"
	:icon="icon"
	>
		<form @submit.prevent="onSubmit()">
			<div v-if="action.type===''" class="typeSelector">
				<div class="info">Select the action type to execute</div>
				<Button class="button" white @click="selectActionType('chat')" title="Send chat message" :icon="require('@/assets/icons/whispers_purple.svg')"/>
				<Button class="button" white @click="selectActionType('obs')" title="Control OBS" :icon="require('@/assets/icons/obs_purple.svg')"/>
				<Button class="button" white @click="selectActionType('spotify')" title="Control Spotify" :icon="require('@/assets/icons/spotify_purple.svg')"/>
			</div>

			<TriggerActionChatEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='chat'" :action="action" :event="event" />
			<TriggerActionOBSEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='obs'" :action="action" :event="event" :sources="sources" />

			<ParamItem class="item delay" :paramData="delay_conf" v-if="action.type!==''" v-model="action.delay" />

		</form>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { ParameterData, TriggerActionTypes } from '@/store';
import { OBSSourceItem } from '@/utils/OBSWebsocket';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';
import TriggerActionOBSEntry from './entries/TriggerActionOBSEntry.vue';
import TriggerActionChatEntry from './entries/TriggerActionChatEntry.vue';

@Options({
	props:{
		action:Object,
		sources:Object,
		index:Number,
		event:String,
	},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		TriggerActionOBSEntry,
		TriggerActionChatEntry,
	},
	emits:["delete", "update", "setContent"]
})
export default class TriggerActionEntry extends Vue {

	public action!:TriggerActionTypes;
	public sources!:OBSSourceItem[];
	public index!:number;
	public event!:string;

	public opened:boolean = false;
	public isError:boolean = false;
	// public isChange:boolean = false;
	// public canSubmit:boolean = false;
	public delay_conf:ParameterData = { label:"Delay before next step (seconds)", type:"number", value:0, min:0, max:60*10, icon:"timeout_purple.svg" };

	public get errorTitle():string {
		let res = "ERROR - MISSING OBS SOURCE";
		
		if(this.action.type == "obs") {
			res += "<br><span class='subtitle'>";
			res += this.action.sourceName;
			res += "</span>";
		}
		
		return res;
	}

	public get classes():string[] {
		const res = ["TriggerActionEntry"];
		if(this.isError) res.push("error");
		return res;
	}

	/**
	 * Get block's title
	 */
	public get title():string {
		let res = 'Step '+(this.index+1);
		if(this.action.delay > 0) {
			res += " <span class='subtitle'>(⏳"+this.action.delay+"s)</span>";
		}
		return res+this.subtitle;
	}

	/**
	 * Get block's icon
	 */
	public get icon():string {
		if(this.action.type == "obs") {
			return  this.action.show? 'show' : 'hide'
		}
		return "";
	}

	/**
	 * Get block's subtitle
	 */
	public get subtitle():string {
		let res = "";
		const chunks:string[] = [];
		if(this.action.type == "obs") {

			if(this.action.sourceName) {
				let sourceName = this.action.sourceName;
				sourceName = sourceName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
				chunks.push(sourceName);
			}
			if(this.action.filterName) {
				let filterName = this.action.filterName;
				filterName = filterName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
				chunks.push(filterName);
			}
		}
		if(chunks.length > 0) {
			res += "<br><span class='subtitle'>";
			res += chunks.join(" -> ");
			res += "</span>";
		}
		return res;
	}

	public async beforeMount():Promise<void> {
		this.opened = !this.action.type;
	}

	public async mounted():Promise<void> {
	}

	/**
	 * Called when submitting the form
	 */
	public onSubmit():void {
		this.$emit("update");
	}

	public selectActionType(type:'obs'|'chat'|'spotify'):void {
		this.action.type = type
	}

}
</script>

<style scoped lang="less">
.TriggerActionEntry{
	:deep(.header) {
		.subtitle {
			font-size: .7em;
			font-weight: normal;
			vertical-align: middle;
			font-style: italic;
		}
		&>.icon {
			height: 1.5em !important;
			width: unset !important;
			vertical-align: middle;
		}
	}
	&.error {
		.source {
			padding: .25em;
			border-radius: .5em;
			border: 2px dashed @mainColor_alert;
			background-color: fade(@mainColor_alert, 35%);
		}
	}

	.typeSelector {
		display: flex;
		flex-direction: column;
		.info {
			align-self: center;
			font-weight: bold;
			margin-bottom: .5em;
		}
		.button:not(:last-child) {
			margin-bottom: .25em;
		}
	}

	.item:not(:first-of-type) {
		margin-top: .25em;
	}

	.delay, .show {
		:deep(input){
			width: 90px;
			flex-grow: unset;
			min-width: unset;
		}
	}

	.url {
		:deep(input){
			text-align: left;
			width: auto;
			max-width: unset;
		}
	}
	.saveBt {
		display: block;
		margin: auto;
		margin-top: .5em;
	}
}
</style>