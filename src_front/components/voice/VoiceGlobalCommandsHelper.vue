<template>
	<div class="voiceglobalcommandshelper">
		<Icon name="voice" alt="voice control enabled" class="icon" />
		
		<div class="list">
			<template v-for="a in actions" :key="a.action.id">
				<span class="label">{{a.label}}:</span>
				<span>{{a.action.sentences}}</span>
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import VoiceAction from '@/utils/voice/VoiceAction';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{}
})
class VoiceGlobalCommandsHelper extends Vue {

	@Prop({
			type: Boolean,
			default: false
		})
	public confirmMode!:boolean;

	public actions:{label:string, action:VoiceAction}[] = [];

	public mounted():void {
		// const actions = this.$store.voice.voiceActions;
		type VAKeys = keyof typeof VoiceAction;
		const actions = Object.keys(VoiceAction);

		//Search for global labels
		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			const isGlobal = Object.prototype.hasOwnProperty.call(VoiceAction, a+"_IS_GLOBAL") === true;
			if(!isGlobal) continue;//Ignore non global commands
			
			const id:string = VoiceAction[a as VAKeys] as string;
			const action = (this.$store.voice.voiceActions as VoiceAction[]).find(v=> v.id == id);
			if(action) {
				if(this.confirmMode === false
				|| (this.confirmMode && (id == VoiceAction.SUBMIT || id == VoiceAction.CANCEL))) {
					this.actions.push({
						action,
						label:this.$t("voice.commands."+id),
					});
				}
			}
		}
	}
		

}
export default toNative(VoiceGlobalCommandsHelper);
</script>

<style scoped lang="less">
.voiceglobalcommandshelper{
	display: flex;
	flex-direction: column;
	.icon {
		height: 2em;
		margin: 0 0 .5em 0;
	}
	.list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		font-size: .8em;
		column-gap: .5em;
		.label {
			text-align: right;
			font-weight: bold;
		}
	}
	
}
</style>