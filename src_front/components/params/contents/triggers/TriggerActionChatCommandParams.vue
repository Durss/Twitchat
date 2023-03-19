<template>
	<ToggleBlock
	medium
	class="TriggerActionchatcommandparams"
	:open="true"
	:title="$t('triggers.actions.chat.params_title')"
	:icons="['params']">

		<ParamItem class="row" :paramData="param_cmd" @focusout="onUpdateCommand()" :error="cmdNameConflict" />
		<div v-if="cmdNameConflict" class="cmdNameConflict">{{ $t("triggers.actions.chat.conflict") }}</div>

		<ToggleBlock :open="false" class="row" small :title="$t('triggers.actions.chat.allowed_users')">
			<PermissionsForm v-model="triggerData.permissions" />
		</ToggleBlock>

		<ToggleBlock :open="false" class="row" small title="Cooldowns" v-if="triggerData.cooldown">
			<ParamItem class="cooldown" :paramData="param_globalCD" v-model="triggerData.cooldown.global" />
			<ParamItem class="cooldown" :paramData="param_userCD" v-model="triggerData.cooldown.user" />
			<ParamItem class="cooldown" :paramData="param_alertCD" v-model="triggerData.cooldown.alert" />
		</ToggleBlock>

	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TriggerTypes, type TriggerData } from '@/types/TriggerActionDataTypes';
import { watch } from '@vue/runtime-core';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import PermissionsForm from '../../../PermissionsForm.vue';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class TriggerActionChatCommandParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public cmdNameConflict = false;
	public param_cmd:TwitchatDataTypes.ParameterData = { type:"string", value:"", icon:"commands_purple.svg", placeholder:"!command" };
	public param_globalCD:TwitchatDataTypes.ParameterData = { type:"number", value:0, icon:"timeout_purple.svg", min:0, max:60*60*12 };
	public param_userCD:TwitchatDataTypes.ParameterData = { type:"number", value:0, icon:"timeout_purple.svg", min:0, max:60*60*12 };
	public param_alertCD:TwitchatDataTypes.ParameterData = { type:"boolean", value:true, icon:"whispers_purple.svg" };

	private originalCmd!:string;

	public beforeMount():void {
		if(!this.triggerData.permissions) {
			this.triggerData.permissions = {
				broadcaster:true,
				mods:true,
				vips:true,
				subs:true,
				all:true,
				follower:true,
				follower_duration_ms:0,
				usersAllowed:[],
				usersRefused:[],
			}
		}
		if(!this.triggerData.cooldown) {
			this.triggerData.cooldown = {
				global:0,
				user:0,
				alert:true,
			}
		}
		
		this.param_cmd.labelKey		= "triggers.actions.chat.param_cmd";
		this.param_globalCD.labelKey= "triggers.actions.chat.param_globalCD";
		this.param_userCD.labelKey	= "triggers.actions.chat.param_userCD";
		this.param_alertCD.labelKey	= "triggers.actions.chat.param_alertCD";

		this.populate();
		watch(()=> this.triggerData, ()=> { this.populate(); }, { deep:true });
	}

	public populate():void {
		this.param_cmd.value = 
		this.originalCmd = this.triggerData.name as string;
	}

	public onUpdateCommand():void {
		this.cmdNameConflict = false;
		//If command name has been changed
		if(this.originalCmd != this.param_cmd.value) {
			//Make sure no other chat command has the same name
			const triggers = this.$store("triggers").triggers;
			for (const k in triggers) {
				//Is a chat command?
				if(k.indexOf(TriggerTypes.CHAT_COMMAND+"_") === 0) {
					const t = triggers[k] as TriggerData;
					if(t.name?.toLowerCase() == (this.param_cmd.value as string).toLowerCase()) {
						this.cmdNameConflict = true;
						return;
					}
				}
			}
			this.triggerData.prevKey = TriggerTypes.CHAT_COMMAND+"_"+this.triggerData.name;
		}
		//This triggers a save event that will clean the previous key
		//based on the "prevKey" property value
		this.triggerData.name = this.param_cmd.value as string;
	}

}
</script>

<style scoped lang="less">
.TriggerActionchatcommandparams{

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
			&:not(:first-child) {
				margin-top: .5em;
			}
			:deep(input) {
				width: 75px;
				flex-grow: unset;
				min-width: unset;
			}
		}
	}
}
</style>