<template>
	<ToggleBlock
	medium
	class="TriggerActionchatcommandparams"
	:open="true"
	title="Parameters"
	:icons="['params']">

		<p class="title">Set a chat command that will trigger the actions</p>
		<ParamItem class="row" :paramData="param_cmd" @focusout="onUpdateCommand()" :error="cmdNameConflict" />
		<div v-if="cmdNameConflict" class="cmdNameConflict">A command with this name already exists</div>

		<ToggleBlock :open="false" class="row" small title="Users allowed to use this command">
			<PermissionsForm v-model="actionData.permissions" />
		</ToggleBlock>

		<ToggleBlock :open="false" class="row" small title="Cooldowns">
			<ParamItem class="cooldown" :paramData="param_globalCD" v-model="actionData.cooldown.global" />
			<ParamItem class="cooldown" :paramData="param_userCD" v-model="actionData.cooldown.user" />
		</ToggleBlock>

		<!-- <Button type="button"
			title="Delete"
			class="saveBt"
			v-if="isChange"
			@click="save()"
			:icon="require('@/assets/icons/save.svg')"
			:disabled="param_cmd.value === ''"
		/> -->
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import store, { ParameterData, TriggerActionChatCommandData } from '@/store';
import { TriggerTypes } from '@/utils/TriggerActionHandler';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';
import PermissionsForm from '../obs/PermissionsForm.vue';

@Options({
	props:{
		actionData:Object,
	},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class TriggerActionChatCommandParams extends Vue {

	public actionData!:TriggerActionChatCommandData;

	public cmdNameConflict:boolean = false;
	public param_cmd:ParameterData = { type:"text", value:"", label:"Command", icon:"commands_purple.svg", placeholder:"!command" };
	public param_globalCD:ParameterData = { type:"number", value:0, label:"Global cooldown (sec)", icon:"timeout_purple.svg", min:0, max:60*60*12 };
	public param_userCD:ParameterData = { type:"number", value:0, label:"User cooldown (sec)", icon:"timeout_purple.svg", min:0, max:60*60*12 };

	private originalCmd!:string;

	public beforeMount():void {
		if(!this.actionData.permissions) {
			this.actionData.permissions = {
				mods:true,
				vips:true,
				subs:true,
				all:true,
				users:"",
			}
		}
		if(!this.actionData.cooldown) {
			this.actionData.cooldown = {
				global:0,
				user:0,
			}
		}
		this.populate();
		watch(()=> this.actionData, ()=> { this.populate(); }, { deep:true });
	}

	public populate():void {
		this.param_cmd.value = 
		this.originalCmd = this.actionData.chatCommand;
	}

	public onUpdateCommand():void {
		this.cmdNameConflict = false;
		//If command name has been changed
		if(this.originalCmd != this.param_cmd.value) {
			//Make sure no other chat command has the same name
			const triggers = store.state.triggers;
			for (const k in triggers) {
				//Is a chat command?
				if(k.indexOf(TriggerTypes.CHAT_COMMAND+"_") === 0) {
					const t = triggers[k] as TriggerActionChatCommandData;
					if(t.chatCommand == this.param_cmd.value) {
						this.cmdNameConflict = true;
						return;
					}
				}
			}
			this.actionData.prevKey = TriggerTypes.CHAT_COMMAND+"_"+this.actionData.chatCommand;
		}
		//This triggers a save event that will clean the previous key
		//based on the "prevKey" property value
		this.actionData.chatCommand = this.param_cmd.value as string;
	}

}
</script>

<style scoped lang="less">
.TriggerActionchatcommandparams{
	.title {
		text-align: center;
	}

	.cmdNameConflict {
		background-color: @mainColor_alert;
		color: @mainColor_light;
		text-align: center;
		margin:auto;
		display: block;
		width: 300px;
		padding: .25em;
		border-bottom-left-radius: .5em;
		border-bottom-right-radius: .5em;
	}

	.row{
		margin:auto;
		max-width: 300px;
		&:not(:first-child) {
			margin-top: .5em;
		}

		.cooldown {
			:deep(input) {
				width: 75px;
				flex-grow: unset;
				min-width: unset;
			}
		}
	}

	.saveBt {
		display: block;
		margin: auto;
		margin-top: .5em;
	}
}
</style>