<template>
	<div class="voicetriggerlist">
		<Button :icon="require('@/assets/icons/add.svg')" title="Add action" class="addBt" @click="addAction()" />
		
		<ToggleBlock :open="isOpen(a.id)" medium :title="getLabelFromID(a.id)" v-for="(a,index) in actions" :key="a.id" class="action">
			<label :for="'select'+index">Action to execute</label>
			<vue-select :id="'select'+index"
				label="label"
				placeholder="Select an action..."
				v-model="a.id"
				:reduce="(option:{label:string, value:string}) => option.value"
				:options="getActionIDs(a)"
				:appendToBody="true"
			></vue-select>

			<label :for="'text'+index">Trigger sentences <i>(1 per line)</i></label>
			<textarea :id="'text'+index" v-model="a.sentences" rows="5"></textarea>
			
			<Button @click="deleteAction(a.id)" :icon="require('@/assets/icons/cross_white.svg')" highlight title="Delete" class="saveBt" />
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import VoiceAction from '@/utils/VoiceAction';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
	}
})
export default class VoiceTriggerList extends Vue {

	public actions:VoiceAction[] = [];
	public openStates:{[id:string]:boolean} = {};

	public mounted():void {
		this.actions = JSON.parse(JSON.stringify(store.state.voiceActions));

		for (let i = 0; i < this.actions.length; i++) {
			const a = this.actions[i];
			if(!a.id) continue;
			this.openStates[a.id] = false;
		}

		watch(()=>this.actions, ()=>{
			store.dispatch("setVoiceActions", this.actions);
		}, {deep:true});
	}

	public addAction():void {
		this.actions.push(new VoiceAction());
	}

	public deleteAction(id:string|undefined):void {
		const index = this.actions.findIndex(v => v.id == id);
		this.actions.splice(index, 1);
	}

	public isOpen(id:string|undefined):boolean {
		if(!id) return true;
		return this.openStates[id];
	}

	public getActionIDs(action:VoiceAction):{label:string, value:string}[] {
		let availableActions = Object.keys(VoiceAction);
		availableActions = availableActions.filter(v=> v.indexOf("_DESCRIPTION") == -1);
		for (let i = 0; i < this.actions.length; i++) {
			const a = this.actions[i];
			if(!a.id || a == action) continue;
			const index = availableActions.indexOf(a.id);
			if(index > -1) availableActions.splice(index, 1);
		}
		
		return availableActions.map(v=> {
			return {
				//@ts-ignore
				label:VoiceAction[v+"_DESCRIPTION"],
				value:v,
			}
		});
	}

	public getLabelFromID(id:string|undefined):string {
		if(!id===null) return "ACTION ID FOUND : "+id;
		//@ts-ignore
		let label = VoiceAction[id+"_DESCRIPTION"];
		if(!label) label = "...select action..."
		return label;
	}
	//

}
</script>

<style scoped lang="less">
.voicetriggerlist{
	
	.addBt {
		margin:auto;
		display: block;
	}

	.action {
		border: 1px solid @mainColor_normal;
		border-radius: .5em;
		margin-top: .5em;
		:deep(.content) {
			display: flex;
			flex-direction: column;
	
			label:not(:first-of-type) {
				margin-top: .5em;
			}
	
			.saveBt {
				margin: auto;
				margin-top: .5em;
			}
		}
	}
}
</style>