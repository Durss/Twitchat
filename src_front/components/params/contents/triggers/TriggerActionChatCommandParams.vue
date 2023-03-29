<template>
	<div class="triggerActionchatcommandparams">
		<ParamItem :paramData="param_cmd" v-model="triggerData.chatCommand" @change="onUpdateCommand()" :error="cmdNameConflict" />
		<div v-if="cmdNameConflict" class="cmdNameConflict">{{ $t("triggers.actions.chat.conflict") }}</div>
		
		<ParamItem class="aliases" :paramData="param_cmdAliases" v-model="triggerData.chatCommandAliases" @change="onUpdateCommand()" :error="cmdAliasConflict" />
		<div v-if="cmdAliasConflict" class="cmdNameConflict">{{ $t("triggers.actions.chat.conflict") }}</div>

		<ParamItem class="cooldown" :paramData="param_globalCD" v-model="triggerData.cooldown!.global" />
		<ParamItem class="cooldown" :paramData="param_userCD" v-model="triggerData.cooldown!.user" />
		<ParamItem class="cooldown" :paramData="param_alertCD" v-model="triggerData.cooldown!.alert" />
			
		<ToggleBlock :open="false" :title="$t('triggers.actions.chat.allowed_users')" :icons="['user']" medium>
			<PermissionsForm v-model="triggerData.permissions" />
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
	public cmdAliasConflict = false;
	public param_cmd:TwitchatDataTypes.ParameterData = { type:"string", value:"", icon:"commands_purple.svg", placeholder:"!command", labelKey:"triggers.actions.chat.param_cmd" };
	public param_cmdAliases:TwitchatDataTypes.ParameterData = { type:"editablelist", value:"", icon:"commands_purple.svg", placeholder:"!alias", labelKey:"triggers.actions.chat.param_cmd_alias", tooltipKey:"triggers.actions.chat.param_cmd_alias_tt" };
	public param_globalCD:TwitchatDataTypes.ParameterData = { type:"number", value:0, icon:"timeout_purple.svg", min:0, max:60*60*12, labelKey:"triggers.actions.chat.param_globalCD" };
	public param_userCD:TwitchatDataTypes.ParameterData = { type:"number", value:0, icon:"timeout_purple.svg", min:0, max:60*60*12, labelKey:"triggers.actions.chat.param_userCD" };
	public param_alertCD:TwitchatDataTypes.ParameterData = { type:"boolean", value:true, icon:"whispers_purple.svg", labelKey:"triggers.actions.chat.param_alertCD" };

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
				
		let cmdListLocal = this.triggerData.chatCommandAliases?.concat() ?? [];
		if(this.triggerData.chatCommand) cmdListLocal.push(this.triggerData.chatCommand!);
		for (let i = 0; i < triggers.length; i++) {
			if(triggers[i].type == TriggerTypes.CHAT_COMMAND
			&& triggers[i].id != this.triggerData.id) {
				let cmdList = triggers[i].chatCommandAliases?.concat() ?? [];
				if(triggers[i].chatCommand) cmdList.push(triggers[i].chatCommand!);

				if(cmdList.findIndex(v=> v.toLowerCase() === this.triggerData.chatCommand?.toLowerCase()) > -1) {
					this.cmdNameConflict = true;
				}

				const aliases = this.triggerData.chatCommandAliases ?? [];
				for (let j = 0; j < aliases.length; j++) {
					const alias = aliases[j];
					if(cmdList.findIndex(v=> v.toLowerCase() === alias.toLowerCase()) > -1) {
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

	.cmdNameConflict {
		background-color: @mainColor_alert;
		color: @mainColor_light;
		text-align: center;
		margin:auto;
		margin-top: -.5em;
		display: block;
		width: 100%;
		padding: .25em;
		margin-bottom: .25em;
		border-bottom-left-radius: .5em;
		border-bottom-right-radius: .5em;
	}

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
}
</style>