<template>
	<div class="triggerActionchatcommandparams">
		<ParamItem noBackground :paramData="param_cmd" v-model="triggerData.chatCommand"
			@change="onUpdateCommand()"
			:error="cmdNameConflict || slashCmdAlert"
			:errorMessage="$t(slashCmdAlert? 'triggers.actions.chat.use_slash_cmd' : 'triggers.actions.chat.conflict')" />
		
		<div class="moreOptions">
			<ToggleBlock class="block permissions" :open="false"
			:title="$t('triggers.actions.chat.allowed_users')" :icons="['user']" medium primary>
				<PermissionsForm v-model="triggerData.permissions" />
			</ToggleBlock>
			
			<ToggleBlock class="block" secondary :icons="['params']" :open="false"
			:title="$t('triggers.actions.chat.advanced_params')" primary medium>
				<div class="advancedParams">
					<ParamItem secondary noBackground class="aliases"
						:paramData="param_cmdAliases"
						v-model="triggerData.chatCommandAliases"
						@change="onUpdateCommand()"
						:error="cmdAliasConflict"
						:errorMessage="$t('triggers.actions.chat.conflict')" />
			
					<ParamItem secondary noBackground class="cooldown" :paramData="param_globalCD" v-model="triggerData.cooldown!.global" />
					<ParamItem secondary noBackground class="cooldown" :paramData="param_userCD" v-model="triggerData.cooldown!.user" />
					<ParamItem secondary noBackground class="cooldown" :paramData="param_alertCD" v-model="triggerData.cooldown!.alert" />
					
					<TriggerActionCommandArgumentParams :triggerData="triggerData" />
				</div>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerTypes, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import PermissionsForm from '../../../PermissionsForm.vue';
import ParamItem from '../../ParamItem.vue';
import TriggerActionCommandArgumentParams from './TriggerActionCommandArgumentParams.vue';

@Component({
	components:{
		Button: TTButton,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
		TriggerActionCommandArgumentParams,
	}
})
 class TriggerActionChatCommandParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public slashCmdAlert = false;
	public cmdNameConflict = false;
	public cmdAliasConflict = false;
	public param_cmd:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"chatCommand", placeholder:"!command", labelKey:"triggers.actions.chat.param_cmd" };
	public param_cmdAliases:TwitchatDataTypes.ParameterData<string, string> = { type:"editablelist", value:"", icon:"commands", placeholder:"!alias", labelKey:"triggers.actions.chat.param_cmd_alias", tooltipKey:"triggers.actions.chat.param_cmd_alias_tt", maxLength:10 };
	public param_globalCD:TwitchatDataTypes.ParameterData<number> = { type:"number", value:0, icon:"timeout", min:0, max:60*60*12, labelKey:"triggers.actions.chat.param_globalCD" };
	public param_userCD:TwitchatDataTypes.ParameterData<number> = { type:"number", value:0, icon:"timeout", min:0, max:60*60*12, labelKey:"triggers.actions.chat.param_userCD" };
	public param_alertCD:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:true, icon:"whispers", labelKey:"triggers.actions.chat.param_alertCD" };

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
		if(!this.triggerData.chatCommandAliases || typeof this.triggerData.chatCommandAliases == "string") {
			this.triggerData.chatCommandAliases = [];
		}
	}

	public onUpdateCommand():void {
		this.cmdNameConflict = false;
		this.cmdAliasConflict = false;
		this.slashCmdAlert = this.param_cmd.value.trim().charAt(0) == "/";

		//Make sure no other chat command has the same name
		const triggers = this.$store.triggers.triggerList;
		let aliases:string[] = [];
		if(this.triggerData.chatCommandAliases) {
			this.triggerData.chatCommandAliases.concat().map(v=>v.toLowerCase()).filter(v=>v.length > 0);
		}
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
export default toNative(TriggerActionChatCommandParams);
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
	.moreOptions {
		gap: .5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;

		.block {
			&:not(.closed) {
				width: 100%;
			}
		}
	}
	.advancedParams {
		gap: .5em;
		display: flex;
		flex-direction: column;
	}
}
</style>