<template>
	<div class="voiceglobalcommandshelper">
		<img src="@/assets/icons/voice_purple.svg" alt="voice control enabled" class="icon">
		
		<div class="list">
			<div v-for="a in actions" :key="a.action.id" class="row">
				<span class="label">{{a.label}}:</span>
				<span>{{a.action.sentences}}</span>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import VoiceAction from '@/utils/VoiceAction';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		confirmMode: {
			type: Boolean,
			default: false
		}
	},
	components:{}
})
export default class VoiceGlobalCommandsHelper extends Vue {

	public confirmMode!:boolean;

	public actions:{label:string, action:VoiceAction}[] = [];

	public mounted():void {
		// const actions = StoreProxy.voice.voiceActions;
		type VAKeys = keyof typeof VoiceAction;
		const actions = Object.keys(VoiceAction);

		//Search for global labels
		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			const isGlobal = Object.prototype.hasOwnProperty.call(VoiceAction, a+"_IS_GLOBAL") === true;
			if(!isGlobal) continue;//Ignore non global commands
			
			const id:string = VoiceAction[a as VAKeys] as string;
			const action = (StoreProxy.voice.voiceActions as VoiceAction[]).find(v=> v.id == id);
			if(action) {
				if(this.confirmMode === false
				|| (this.confirmMode && (id == VoiceAction.SUBMIT || id == VoiceAction.CANCEL))) {
					this.actions.push({
						action,
						label:VoiceAction[id+"_DESCRIPTION" as VAKeys] as string,
					});
				}
			}
		}
	}
		

}
</script>

<style scoped lang="less">
.voiceglobalcommandshelper{
	display: flex;
	flex-direction: column;
	.icon {
		height: 2em;
		margin:.5em 0;
	}
	.list {
		display: table;
		font-size: .8em;
		.row {
			display: table-row;
			span {
				display: table-cell;
				&.label {
					font-weight: bold;
					text-align: right;
					padding-right: 5px;
				}
			}
		}
	}
	
}
</style>