<template>
	<div class="voicetriggerlist">

		<VoiceGlobalCommands class="action global"
			v-model="globalCommands"
			v-model:complete="globalCommandsOK"
			:open="actions.length === 0"
		/>

		<Button icon="add" class="addBt"
			@click="addAction()"
			v-if="getActionIDs().length > 0 && globalCommandsOK">{{ $t('voice.addBt') }}</Button>

		<div class="card-item alert error" v-else>{{ $t("voice.fill_global") }}</div>

		<draggable 
		v-if="actions"
		v-model="actions" 
		group="actions" 
		item-key="id"
		ghost-class="ghost"
		direction="vertical"
		handle=".action>.header>img"
		class="actionList"
		:animation="250"
		:dragoverBubble="true">
			<template #item="{element, index}">
				<ToggleBlock
					v-if="globalCommandsOK"
					medium
					:open="isOpen(element.id)"
					:title="getLabelFromID(element.id)"
					:icons="element.id? ['orderable',getIconFromID(element.id)] : ['orderable']"
					:ref="element.id"
					class="action"
				>
					<template #right_actions>
						<Button alert
							icon="trash"
							class="deleteAction"
							@click="deleteAction(element.id)"
						/>
					</template>

					<div class="content">
						<label :for="'select'+index" v-t="'voice.select_action'"></label>
						
						<vue-select :id="'select'+index"
							:placeholder="$t('voice.select_action_placeholder')"
							v-model="element.id"
							:reduce="reduceSelectData"
							:options="getActionIDs(element)"
							:appendToBody="true"
							:calculate-position="$placeDropdown"
						>
							<template v-slot:option="option">
								<img class="listIcon" style="{background-color: red;}" :src="$image('icons/dark/'+option.icon+'.svg')" v-if="option.icon" />
								<span>{{ option.label }}</span>
							</template>
						</vue-select>
	
						<div class="form">
							<label v-if="element.id" :for="'text'+index"><span>{{ $t("voice.sentences") }}</span> <i>{{ $t("voice.sentences_count") }}</i></label>
							<textarea v-if="element.id" :id="'text'+index" v-model="element.sentences" rows="5" maxlength="1000"></textarea>
						</div>
					</div>
					
				</ToggleBlock>
			</template>
		</draggable>
	</div>
</template>

<script lang="ts">
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import VoiceAction from '@/utils/voice/VoiceAction';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import Button from '../Button.vue';
import ToggleBlock from '../ToggleBlock.vue';
import VoiceGlobalCommands from './VoiceGlobalCommands.vue';

@Component({
	components:{
		Button,
		draggable,
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
		type VAKeys = keyof typeof VoiceAction;
		this.actions = [];
		this.actions = JSON.parse(JSON.stringify(this.$store("voice").voiceActions));

		for (let i = 0; i < this.actions.length; i++) {
			const a = this.actions[i];
			if(!a.id) continue;
			//ignore global commands
			if(VoiceAction[a.id+"_IS_GLOBAL" as VAKeys] === true) {
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
		PublicAPI.instance.addEventListener(TwitchatEvent.POLL_CREATE, this.triggerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.PREDICTION_CREATE, this.triggerHandler);
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
		PublicAPI.instance.removeEventListener(TwitchatEvent.POLL_CREATE, this.triggerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.PREDICTION_CREATE, this.triggerHandler);
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
		type VAKeys = keyof typeof VoiceAction;
		let availableActions = Object.keys(VoiceAction);
		availableActions = availableActions.filter(v=> v.indexOf("_ICON") == -1);
		availableActions = availableActions.filter(v=> v.indexOf("_IS_GLOBAL") == -1);
		availableActions = availableActions.filter(v=> v.indexOf("_IS_PRIVATE") == -1);

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
			const isGlobal = VoiceAction[availableActions[i]+"_IS_GLOBAL" as VAKeys] === true;
			const isPrivate = VoiceAction[availableActions[i]+"_IS_PRIVATE" as VAKeys] === true;
			if(isGlobal || isPrivate) {
				availableActions.splice(i, 1);
				i--;
			}
		}

		return availableActions.map(v=> {
			const icon = VoiceAction[v+"_ICON" as VAKeys] as string;
			return {
				label:this.$t("voice.commands."+v),
				value:v,
				icon,
			}
		});
	}

	public getLabelFromID(id:string|undefined):string {
		type VAKeys = keyof typeof VoiceAction;
		if(!id===null) return "ACTION ID NOT FOUND : "+id;
		let label = this.$t("voice.select_action_placeholder");
		if(id) {
			label = this.$t("voice.commands."+id);
		}
		return label;
	}

	public getIconFromID(id:string|undefined):string {
		if(!id===null) return "ACTION ID NOT FOUND : "+id;
		type VAKeys = keyof typeof VoiceAction;
		return VoiceAction[id+"_ICON" as VAKeys] as string;
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
		this.$store("voice").setVoiceActions(list);
	}

}
</script>

<style scoped lang="less">
.voicetriggerlist{
	//.listIcon style is on index.less.
	//Couldn't make it work from the template even in a unscoped tag
	
	gap: .5em;
	display: flex;
	flex-direction: column;

	.addBt {
		margin:auto;
	}

	.global {
		width: 100%;
	}

	.error {
		text-align: center;
	}

	.actionList {
		gap: .5em;
		display: flex;
		flex-direction: column;
		.action {
			align-self: stretch;
			.deleteAction {
				border-radius: 0;
				margin: -.5em;
				align-self: stretch;
			}
			.content {
				gap: .5em;
				display: flex;
				flex-direction: column;
				.form {
					gap: .5em;
					display: flex;
					flex-direction: column;
				}
			}
		}
	}
}
</style>