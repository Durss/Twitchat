<template>
	<div class="triggerActionchatcommandparams">
		<ParamItem noBackground
			@change="onUpdateCommand()"
			v-model="param_cmd.value"
			:paramData="param_cmd"
			:autofocus="true"
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
						@change="onUpdateCommand()"
						v-model="triggerData.chatCommandAliases"
						:paramData="param_cmdAliases"
						:error="cmdAliasConflict"
						:errorMessage="$t('triggers.actions.chat.conflict')" />

					<ParamItem secondary noBackground class="cooldown" :paramData="param_globalCD" v-model="triggerData.cooldown!.global">
						<template #composite>
							<TTButton class="resetBt"
								icon="refresh"
								v-tooltip="$t('triggers.actions.chat.reset_cooldown_tt')"
								@click="resetCooldowns(true)"
								transparent light></TTButton>
						</template>
					</ParamItem>
					<ParamItem secondary noBackground class="cooldown" :paramData="param_userCD" v-model="triggerData.cooldown!.user">
						<template #composite>
							<TTButton class="resetBt"
								icon="refresh"
								v-tooltip="$t('triggers.actions.chat.reset_cooldown_tt')"
								@click="resetCooldowns(false)"
								transparent light></TTButton>
						</template>
					</ParamItem>
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
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import Utils from '@/utils/Utils';

@Component({
	components:{
		TTButton,
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
	public param_cmd:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"chatCommand", placeholder:"!command", labelKey:"triggers.actions.chat.param_cmd", maxLength:100 };
	public param_cmdAliases:TwitchatDataTypes.ParameterData<string, string> = { type:"editablelist", value:"", icon:"commands", placeholder:"!alias", labelKey:"triggers.actions.chat.param_cmd_alias", tooltipKey:"triggers.actions.chat.param_cmd_alias_tt", max:10, maxLength:100 };
	public param_globalCD:TwitchatDataTypes.ParameterData<number> = { type:"number", value:0, icon:"timeout", min:0, max:60*60*12, labelKey:"triggers.actions.chat.param_globalCD" };
	public param_userCD:TwitchatDataTypes.ParameterData<number> = { type:"number", value:0, icon:"timeout", min:0, max:60*60*12, labelKey:"triggers.actions.chat.param_userCD" };
	public param_alertCD:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:true, icon:"whispers", labelKey:"triggers.actions.chat.param_alertCD" };

	public beforeMount():void {
		if(!this.triggerData.permissions) {
			this.triggerData.permissions = Utils.getDefaultPermissions()
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

		this.param_cmd.value = this.triggerData.chatCommand || "";
	}

	public onUpdateCommand():void {
		this.cmdNameConflict = false;
		this.cmdAliasConflict = false;
		this.slashCmdAlert = this.param_cmd.value.trim().charAt(0) == "/";

		this.triggerData.chatCommand =
		this.param_cmd.value = this.param_cmd.value.trim().replace(/\s+/g, '');

		//Make sure no other chat command has the same name
		const triggers = this.$store.triggers.triggerList;
		let aliases:string[] = [];
		if(this.triggerData.chatCommandAliases) {
			for (let i = 0; i < this.triggerData.chatCommandAliases.length; i++) {
				this.triggerData.chatCommandAliases[i] = this.triggerData.chatCommandAliases[i]!.trim().replace(/\s+/g, '').toLowerCase();
			}
			aliases = this.triggerData.chatCommandAliases.concat().filter(v=>v.length > 0);
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
		for (const trigger of triggers) {
			if(trigger.type == TriggerTypes.CHAT_COMMAND
			&& trigger.id != this.triggerData.id) {
				//Create an array with main command and aliases concatenated
				let cmdList = trigger.chatCommandAliases?.concat() ?? [];
				if(trigger.chatCommand) cmdList.push(trigger.chatCommand!);
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

	public resetCooldowns(global:boolean):void {
		if(global) {
			TriggerActionHandler.instance.resetGlobalCooldown(this.triggerData.id);
		}else{
			TriggerActionHandler.instance.resetUsersCooldown(this.triggerData.id);
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

	.resetBt {
		flex-grow: 0;
		flex-shrink: 0;
	}
}
</style>
