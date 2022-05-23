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
	>
	<!-- :icon="show_conf.value? 'show' : 'hide'" -->
		<form @submit.prevent="onSubmit()">
			<TriggerActionOBSEntry :action="action" :sources="sources" :event="event" />

			<ParamItem class="item delay" :paramData="delay_conf" />
			
			<Button type="submit"
				title="Save"
				v-if="isChange"
				class="saveBt"
				:icon="require('@/assets/icons/save.svg')"
				:disabled="!canSubmit"
			/>
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
	},
	emits:["delete", "update"]
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
		return res+this.subtitle;
	}

	/**
	 * Get block's subtitle
	 */
	public get subtitle():string {
		return "TODO"
		// let res = "";
		// const chunks:string[] = [];
		// if(this.source_conf.value) {
		// 	let sourceName = this.source_conf.value as string;
		// 	sourceName = sourceName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		// 	chunks.push(sourceName);
		// }
		// if(this.filter_conf.value) {
		// 	let filterName = this.filter_conf.value as string;
		// 	filterName = filterName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		// 	chunks.push(filterName);
		// }
		// if(chunks.length > 0) {
		// 	res += "<br><span class='subtitle'>";
		// 	res += chunks.join(" -> ");
		// 	res += "</span>";
		// }
		// return res;
	}
	/**
	 * Can submit form ?
	 */
	public get canSubmit():boolean { return true;} //TODO
	
	public get isChange():boolean {
		return this.action.delay != this.delay_conf.value
		//TODO
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
		//TODO
		this.action.delay = this.delay_conf.value as number;
		// this.action.sourceName = this.source_conf.value as string;
		// this.action.filterName = this.filter_conf.value as string;
		// this.action.text = this.text_conf.value as string;
		// this.action.show = this.show_conf.value as boolean;
		// this.action.url = this.url_conf.value as string;
		// this.action.mediaPath = this.media_conf.value as string;
		this.$emit("update");
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

	.helper {
		font-size: .8em;
		padding-left: 2em;
		.list {
			list-style-type: none;
			// padding-left: 1em;
			li {
				padding: .25em;
				cursor: pointer;
				&:hover {
					background-color: fade(@mainColor_normal, 10%);
				}
				&:not(:last-child) {
					border-bottom: 1px solid @mainColor_normal;
				}
				strong {
					display: inline-block;
					min-width: 82px;
					border-right: 1px solid @mainColor_normal;
				}
			}
		}
	}

	.saveBt {
		display: block;
		margin: auto;
		margin-top: .5em;
	}
}
</style>