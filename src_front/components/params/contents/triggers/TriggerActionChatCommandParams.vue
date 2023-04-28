<template>
	<div class="triggerActionchatcommandparams">
		<ParamItem noBackground :paramData="param_cmd" v-model="triggerData.chatCommand" @change="onUpdateCommand()"
		:error="cmdNameConflict" :errorMessage="cmdNameConflict? $t('triggers.actions.chat.conflict') : ''" />
			
		<ToggleBlock class="grow permissions" :open="false" :title="$t('triggers.actions.chat.allowed_users')" :icons="['user']" medium primary>
			<PermissionsForm v-model="triggerData.permissions" />
		</ToggleBlock>
		
		<ToggleBlock class="grow" :icons="['params']" :open="false" title="Paramètres avancés" primary medium>
			<ParamItem noBackground class="aliases" :paramData="param_cmdAliases" v-model="triggerData.chatCommandAliases" @change="onUpdateCommand()"
			:error="cmdAliasConflict" :errorMessage="cmdAliasConflict? $t('triggers.actions.chat.conflict') : ''" />
	
			<ParamItem noBackground class="cooldown" :paramData="param_globalCD" v-model="triggerData.cooldown!.global" />
			<ParamItem noBackground class="cooldown" :paramData="param_userCD" v-model="triggerData.cooldown!.user" />
			<ParamItem noBackground class="cooldown" :paramData="param_alertCD" v-model="triggerData.cooldown!.alert" />
			
			<TriggerActionCommandArgumentParams :triggerData="triggerData" />
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerTypes, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import PermissionsForm from '../../../PermissionsForm.vue';
import ParamItem from '../../ParamItem.vue';
import TriggerActionCommandArgumentParams from './TriggerActionCommandArgumentParams.vue';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
		TriggerActionCommandArgumentParams,
	}
})
export default class TriggerActionChatCommandParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public cmdNameConflict = false;
	public cmdAliasConflict = false;
	public param_cmd:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"commands.svg", placeholder:"!command", labelKey:"triggers.actions.chat.param_cmd" };
	public param_cmdAliases:TwitchatDataTypes.ParameterData<string, string> = { type:"editablelist", value:"", icon:"commands.svg", placeholder:"!alias", labelKey:"triggers.actions.chat.param_cmd_alias", tooltipKey:"triggers.actions.chat.param_cmd_alias_tt", maxLength:10 };
	public param_globalCD:TwitchatDataTypes.ParameterData<number> = { type:"number", value:0, icon:"timeout.svg", min:0, max:60*60*12, labelKey:"triggers.actions.chat.param_globalCD" };
	public param_userCD:TwitchatDataTypes.ParameterData<number> = { type:"number", value:0, icon:"timeout.svg", min:0, max:60*60*12, labelKey:"triggers.actions.chat.param_userCD" };
	public param_alertCD:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:true, icon:"whispers.svg", labelKey:"triggers.actions.chat.param_alertCD" };

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
	}

	public onUpdateCommand():void {
		this.cmdNameConflict = false;
		this.cmdAliasConflict = false;

		//Make sure no other chat command has the same name
		const triggers = this.$store("triggers").triggerList;
		const aliases = this.triggerData.chatCommandAliases?.concat().map(v=>v.toLowerCase()).filter(v=>v.length > 0) ?? []
		const mainCmd = this.triggerData.chatCommand?.toLowerCase() || "";
		
		//Check if aliases contain the main command
		if(mainCmd && aliases.indexOf(mainCmd) > -1) {
			this.cmdAliasConflict = true;
			return;
		}
		
		//Check if any other trigger contain the same command
		let cmdListLocal = aliases.concat();
		if(mainCmd) cmdListLocal.push(mainCmd);
		for (let i = 0; i < triggers.length; i++) {
			if(triggers[i].type == TriggerTypes.CHAT_COMMAND
			&& triggers[i].id != this.triggerData.id) {
				//Create an array with main command and aliases concatenated
				let cmdList = triggers[i].chatCommandAliases?.concat() ?? [];
				if(triggers[i].chatCommand) cmdList.push(triggers[i].chatCommand!);
				cmdList.map(v=>v.toLowerCase());

				//Check if trigger contains the main command of the current trigger
				if(cmdList.findIndex(v=> v === mainCmd) > -1) {
					this.cmdNameConflict = true;
				}
				
				//Check if trigger contains an alias of the current trigger
				for (let j = 0; j < aliases.length; j++) {
					const alias = aliases[j];
					if(alias && cmdList.findIndex(v=> v === alias) > -1) {
						this.cmdAliasConflict = true;
					}
				}
			}
		}
	}

}
</script>

<style scoped lang="less">
.triggerActionchatcommandparams{

	display: flex;
	flex-direction: column;
	gap: .5em;

	.cooldown {
		:deep(input) {
			flex-basis: 100px;
		}
	}

	.aliases {
		:deep(.content) {
			.holder {
				flex-direction: row;
				.listField {
					flex-basis: 300px;
				}
			}
		}
	}

	.permissions {
		margin: auto;
	}

	.grow {
		width: 100%;
	}
}
</style>