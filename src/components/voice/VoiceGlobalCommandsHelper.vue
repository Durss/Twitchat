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
import StoreProxy from '@/utils/StoreProxy';
import VoiceAction from '@/utils/VoiceAction';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class VoiceGlobalCommandsHelper extends Vue {

	public actions:{label:string, action:VoiceAction}[] = [];

	public mounted():void {
		// const actions = StoreProxy.store.state.voiceActions;
		const actions = Object.keys(VoiceAction);

		//Search for global labels
		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			//@ts-ignore
			const isGlobal = VoiceAction[a+"_IS_GLOBAL"] === true;
			if(!isGlobal) continue;//Ignore non global commands

			//@ts-ignore
			const id:string = VoiceAction[a];
			const action = (StoreProxy.store.state.voiceActions as VoiceAction[]).find(v=> v.id == id);
			if(action) {
				this.actions.push({
					action,
					//@ts-ignore
					label:VoiceAction[id+"_DESCRIPTION"],
				});
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