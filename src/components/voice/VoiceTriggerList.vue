<template>
	<div class="voicetriggerlist">

		<Button :icon="$image('icons/add.svg')" title="Add action" class="addBt"
			@click="addAction()"
			v-if="getActionIDs().length > 0 && globalCommandsOK"
		/>

		<VoiceGlobalCommands class="action global"
			v-model="globalCommands"
			v-model:complete="globalCommandsOK"
			:open="!globalCommandsOK || actions.length == 0"
		/>
		
		<ToggleBlock v-for="(a,index) in actions"
			v-if="globalCommandsOK"
			medium
			:open="isOpen(a.id)"
			:title="getLabelFromID(a.id)"
			:icons="[getIconFromID(a.id)]"
			:key="a.id"
			:ref="a.id"
			class="action"
		>
			<label :for="'select'+index">Action to execute</label>
			<vue-select :id="'select'+index"
				label="label"
				placeholder="Select an action..."
				v-model="a.id"
				:reduce="reduceSelectData"
				:options="getActionIDs(a)"
				:appendToBody="true"
			></vue-select>

			<label :for="'text'+index">Trigger sentences <i>(1 per line)</i></label>
			<textarea :id="'text'+index" v-model="a.sentences" rows="5" maxlength="1000"></textarea>
			
			<Button @click="deleteAction(a.id)" :icon="$image('icons/cross_white.svg')" highlight title="Delete" class="saveBt" />
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import PublicAPI from '@/utils/PublicAPI';
import StoreProxy from '@/utils/StoreProxy';
import TwitchatEvent from '@/utils/TwitchatEvent';
import VoiceAction from '@/utils/VoiceAction';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleBlock from '../ToggleBlock.vue';
import VoiceGlobalCommands from './VoiceGlobalCommands.vue';

@Options({
	props:{
	},
	components:{
		Button,
		ToggleBlock,
		VoiceGlobalCommands,
	}
})
export default class VoiceTriggerList extends Vue {

	public actions:VoiceAction[] = [];
	public globalCommands:VoiceAction[] = [];
	public openStates:{[id:string]:boolean} = {};
	public globalCommandsOK:boolean = false;
	
	private triggerHandler!:(e:TwitchatEvent)=>void;

	public reduceSelectData(option:{label:string, value:string}){ return option.value; }

	public mounted():void {
		this.actions = JSON.parse(JSON.stringify(StoreProxy.store.state.voiceActions));

		for (let i = 0; i < this.actions.length; i++) {
			const a = this.actions[i];
			if(!a.id) continue;
			//@ts-ignore ignore global commands
			if(VoiceAction[a.id+"_IS_GLOBAL"] === true) {
				this.actions.splice(i, 1);
				i--;
				continue;
			}
			this.openStates[a.id] = false;
		}

		watch(()=>this.actions, ()=>{
			this.saveActions();
		}, {deep:true});

		watch(()=>this.globalCommands, ()=>{
			this.saveActions();
		}, {deep:true});

		this.triggerHandler = (e:TwitchatEvent) => this.onTrigger(e);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_PAUSE, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_UNPAUSE, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_UP, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GREET_FEED_READ, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ_ALL, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GREET_FEED_READ_ALL, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.VIEWERS_COUNT_TOGGLE, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CREATE_POLL, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CREATE_PREDICTION, this.triggerHandler);
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_PAUSE, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_UNPAUSE, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SCROLL_UP, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_READ, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GREET_FEED_READ, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_READ_ALL, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GREET_FEED_READ_ALL, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.VIEWERS_COUNT_TOGGLE, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CREATE_POLL, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CREATE_PREDICTION, this.triggerHandler);
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

	public getActionIDs(action?:VoiceAction):{label:string, value:string}[] {
		let availableActions = Object.keys(VoiceAction);
		availableActions = availableActions.filter(v=> v.indexOf("_DESCRIPTION") == -1);
		availableActions = availableActions.filter(v=> v.indexOf("_ICON") == -1);
		availableActions = availableActions.filter(v=> v.indexOf("_IS_GLOBAL") == -1);

		//Remove actions that are already in use
		for (let i = 0; i < this.actions.length; i++) {
			const a = this.actions[i];
			//If it's a new action that has no selection done yet
			if(!a.id || a == action) continue;

			const index = availableActions.indexOf(a.id);
			if(index > -1) availableActions.splice(index, 1);
		}

		//Remove global commands (erase, prev, next, submit)
		for (let i = 0; i < availableActions.length; i++) {
			//@ts-ignore
			const isGlobal = VoiceAction[availableActions[i]+"_IS_GLOBAL"] === true;
			if(isGlobal) {
				availableActions.splice(i, 1);
				i--;
			}
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
		if(!id===null) return "ACTION ID NOT FOUND : "+id;
		//@ts-ignore
		let label = VoiceAction[id+"_DESCRIPTION"];
		if(!label) label = "...select action..."
		return label;
	}

	public getIconFromID(id:string|undefined):string {
		if(!id===null) return "ACTION ID NOT FOUND : "+id;
		//@ts-ignore
		return VoiceAction[id+"_ICON"];
	}
	
	/**
	 * When a voice action is triggerd, highlight it
	 * 
	 * @param e 
	 */
	public onTrigger(e:TwitchatEvent):void {
		const el = this.$refs[e.type] as Vue[] | undefined;
		if(el && el.length > 0 && el[0].$el != null) {
			const div = (el[0].$el as HTMLDivElement).getElementsByClassName("header")[0];
			console.log(div);
			gsap.fromTo(div,
				{paddingTop:"1em", paddingBottom:"1em", filter:"brightness(3)"},
				{paddingTop:".25em", paddingBottom:".25em", filter:"brightness(1)", duration:1}
			);
		}
	}

	private saveActions():void {
		let list:VoiceAction[] = [];
		list = list.concat(this.actions);
		list = list.concat(this.globalCommands);
		StoreProxy.store.dispatch("setVoiceActions", list);
	}

}
</script>

<style scoped lang="less">
.voicetriggerlist{
	
	.addBt {
		margin:auto;
		margin-bottom: 1em;
		display: block;
	}

	.action {
		border: 1px solid @mainColor_normal;
		border-radius: .5em;

		&:not(:first-of-type) {
			margin-top: .5em;
		}

		&.global {
			border: 1px solid darken(@mainColor_normal, 20%);
			:deep(.header) {
				background-color: darken(@mainColor_normal, 20%);
			}
		}
		
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