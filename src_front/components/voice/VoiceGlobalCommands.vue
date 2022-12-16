<template>
	<ToggleBlock class="voiceglobalcommands" title="Global commands" icon="api" small :open="openLocal">
		<div class="head">
			You'll use these to navigate through forms
		</div>
		<ParamItem v-for="(i,index) in items"
			:key="itemsID[index]"
			:paramData="i"
			@change="updateCommands()"
		/>
	</ToggleBlock>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import VoiceAction from '@/utils/voice/VoiceAction';
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
	emits:["update:modelValue", "update:complete"]
})
export default class VoiceGlobalCommands extends Vue {

	public open!:boolean;

	public items:TwitchatDataTypes.ParameterData[] = [];
	public itemsID:string[] = [];
	public openLocal:boolean = false;

	public beforeMount():void {
		this.openLocal = this.open;
	}

	public mounted():void {
		// const actions = this.$store("voice").voiceActions;
		type VAKeys = keyof typeof VoiceAction;
		const actions = Object.keys(VoiceAction);

		//Search for global labels
		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			const isGlobal = VoiceAction[a+"_IS_GLOBAL" as VAKeys] === true;
			if(!isGlobal) continue;

			const id:string = VoiceAction[a as VAKeys] as string;
			let text = "";
			const action = (this.$store("voice").voiceActions as VoiceAction[]).find(v=> v.id == id);
			if(action?.sentences) text = action.sentences;

			this.items.push({
				type:"text",
				value:text,
				label:VoiceAction[id+"_DESCRIPTION" as VAKeys] as string,
			});
			this.itemsID.push(id);
		}
		this.updateCommands(true);
	}

	public updateCommands(isInit:boolean = false):void {
		const data:VoiceAction[] = [];
		let allDone = true;
		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i];
			data.push({
				id:this.itemsID[i],
				sentences:item.value as string,
			})

			allDone &&= item.value != "";
		}
		this.$emit("update:modelValue", data);
		this.$emit("update:complete", allDone);
		if(!isInit && allDone){
			this.openLocal = false;
		}
	}

}
</script>

<style scoped lang="less">
.voiceglobalcommands{
	:deep(.content) {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.head {
		margin-bottom: 1em;
	}
	:deep(label) {
		width:130px;
	}
}
</style>