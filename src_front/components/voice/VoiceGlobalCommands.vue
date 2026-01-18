<template>
	<ToggleBlock class="voiceglobalcommands" :title="$t('voice.global_commands_title')" icon="api" medium :open="openLocal">
		<div class="content">
			<div class="head">{{ $t("voice.global_commands") }}</div>
			
			<ParamItem class="item" v-for="(i,index) in items"
				:key="itemIDs[index]"
				:paramData="i"
				noBackground
				@change="updateCommands()"
			/>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import VoiceAction from '@/utils/voice/VoiceAction';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ToggleBlock from '../ToggleBlock.vue';
import ParamItem from '../params/ParamItem.vue';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
	},
	emits:["update:modelValue", "update:complete"]
})
class VoiceGlobalCommands extends Vue {

	@Prop()
	public modelValue:VoiceAction[] = [];

	public items:TwitchatDataTypes.ParameterData<string>[] = [];
	public itemIDs:string[] = [];
	public openLocal:boolean = false;

	public mounted():void {
		type VAKeys = keyof typeof VoiceAction;
		const actions = Object.keys(VoiceAction);

		//Search for global labels
		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			const isGlobal = VoiceAction[a+"_IS_GLOBAL" as VAKeys] === true;
			if(!isGlobal) continue;

			const id:string = VoiceAction[a as VAKeys] as string;
			let text = "";
			const action = (this.$store.voice.voiceActions as VoiceAction[]).find(v=> v.id == id);
			if(action?.sentences) text = action.sentences;

			this.items.push({
				type:"string",
				value:text,
				labelKey:"voice.commands."+id,
			});
			this.itemIDs.push(id);
		}
		
		this.updateCommands(true);
	}

	public updateCommands(isInit:boolean = false):void {
		const data:VoiceAction[] = [];
		let allDone = true;
		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i]!;
			data.push({
				id:this.itemIDs[i],
				sentences:item.value,
			})

			allDone &&= item.value != "";
		}

		//Do not change open state when editing field otherwise the form
		//would close after writing the first letter of the last field
		if(isInit || !allDone) {
			this.openLocal = !allDone;
		}
	
		this.$emit("update:modelValue", data);
		this.$emit("update:complete", allDone);
	}

}
export default toNative(VoiceGlobalCommands);
</script>

<style scoped lang="less">
.voiceglobalcommands{
	.content {
		gap: .25em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.head {
			margin: .5em 0;

		}
		:deep(label) {
			min-width:100px;
			text-align: right;
		}
	}
}
</style>