<template>
	<ToggleBlock class="voiceglobalcommands" title="Global commands" icon="api" medium :open="open">
		<div class="head">
			These voice commands are used to navigate through the interface
			for some specific actions like poll or prediction creation.
		</div>
		<ParamItem v-for="(i,index) in items"
			:key="itemsID[index]"
			:paramData="i"
			@change="updateCommands()"
		/>
	</ToggleBlock>
</template>

<script lang="ts">
import type { ParameterData } from '@/types/TwitchatDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import VoiceAction from '@/utils/VoiceAction';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../params/ParamItem.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Options({
	props:{
		open:{
			type:Boolean,
			default:false,
		},
	},
	components:{
		ParamItem,
		ToggleBlock,
	},
	emits:["update:modelValue"]
})
export default class VoiceGlobalCommands extends Vue {

	public open!:boolean;

	public items:ParameterData[] = [];
	public itemsID:string[] = [];
	

	public mounted():void {
		// const actions = StoreProxy.store.state.voiceActions;
		const actions = Object.keys(VoiceAction);

		//Search for global labels
		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			//@ts-ignore
			const isGlobal = VoiceAction[a+"_IS_GLOBAL"] === true;
			if(!isGlobal) continue;

			//@ts-ignore
			const id:string = VoiceAction[a];
			let text = "";
			const action = (StoreProxy.store.state.voiceActions as VoiceAction[]).find(v=> v.id == id);
			if(action?.sentences) text = action.sentences;

			this.items.push({
				type:"text",
				value:text,
				//@ts-ignore
				label:VoiceAction[id+"_DESCRIPTION"],
			});
			this.itemsID.push(id);
		}
	}

	public updateCommands():void {
		const data:VoiceAction[] = [];
		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i];
			data.push({
				id:this.itemsID[i],
				sentences:item.value as string,
			})
			
		}
		this.$emit("update:modelValue", data);
	}

}
</script>

<style scoped lang="less">
.voiceglobalcommands{
	.head {
		margin-bottom: 1em;
	}
	:deep(label) {
		width:130px;
	}
}
</style>