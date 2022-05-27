<template>
	<div class="triggeractionchatentry">
		<ParamItem class="item file" :paramData="message_conf" ref="textContent" v-model="action.text" />
		<ToggleBlock small class="helper"
			v-if="helpers[event]?.length > 0"
			title="Special placeholders dynamically replaced"
			:open="false"
		>
			<ul class="list">
				<li v-for="(h,index) in helpers[event]" :key="h.tag+event+index" @click="insert(h)" data-tooltip="Insert">
					<strong>&#123;{{h.tag}}&#125;</strong>
					{{h.desc}}
				</li>
			</ul>
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import { ParameterData, TriggerActionChatData } from '@/store';
import { TriggerActionHelpers } from '@/utils/TriggerActionHandler';
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '../../../../ToggleBlock.vue';
import ParamItem from '../../../ParamItem.vue';

@Options({
	props:{
		action:Object,
		event:String,
	},
	components:{
		ParamItem,
		ToggleBlock,
	},
	emits:["update"]
})
export default class TriggerActionChatEntry extends Vue {

	public action!:TriggerActionChatData;
	public event!:string;
	
	public message_conf:ParameterData = { label:"Message to send on your chat", type:"text", longText:true, value:"", icon:"whispers_purple.svg" };
	
	public get helpers():{[key:string]:{tag:string, desc:string}[]} { return TriggerActionHelpers; }

	public mounted():void {
	}

	/**
	 * Add a token on the text
	 */
	public insert(h:{tag:string, desc:string}):void {
		const tag = "{"+h.tag+"}";
		const holder = this.$refs.textContent as ParamItem;
		const input = (holder.$el as HTMLDivElement).getElementsByTagName("textarea")[0];
		let carretPos = input.selectionStart as number | 0;
		if(!carretPos) carretPos = 0;
		//Insert tag
		input.value = input.value.substring(0, carretPos) + tag + input.value.substring(carretPos);
		this.message_conf.value = input.value;
	}

}
</script>

<style scoped lang="less">
.triggeractionchatentry{
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

}
</style>