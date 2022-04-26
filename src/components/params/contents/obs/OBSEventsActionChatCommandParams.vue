<template>
	<ToggleBlock
	medium
	class="obseventsactionchatcommandparams"
	:open="true"
	title="Parameters"
	icon="params">

		<p class="title">Set a chat command that will trigger the actions</p>
		<ParamItem class="row" :paramData="param_cmd" />

		<ToggleBlock :open="false" class="row" small title="Users allowed to use this command">
			<OBSPermissions
				v-model:mods="chatCmdParams.mods"
				v-model:vips="chatCmdParams.vips"
				v-model:subs="chatCmdParams.subs"
				v-model:all="chatCmdParams.all"
				v-model:users="chatCmdParams.users"
			/>
		</ToggleBlock>

		<ToggleBlock :open="false" class="row" small title="Limit usage">
			<ParamItem class="cooldown" :paramData="param_globalCD" />
			<ParamItem class="cooldown" :paramData="param_userCD" />
		</ToggleBlock>

		<Button type="submit"
			title="Save"
			class="saveBt"
			v-if="isChange"
			@click="save()"
			:icon="require('@/assets/icons/save.svg')"
			:disabled="param_cmd.value === ''"
		/>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { OBSEventActionDataCategory, ParameterData } from '@/store';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';
import { OBSChatCmdParameters } from './OBSEventsAction.vue';
import OBSPermissions from './OBSPermissions.vue';

@Options({
	props:{
		actionData:Object,
	},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		OBSPermissions,
	},
	emits:['update'],
})
export default class OBSEventsActionChatCommandParams extends Vue {

	public actionData!:OBSEventActionDataCategory;

	public param_cmd:ParameterData = { type:"text", value:"", label:"Command", icon:"commands_purple.svg", placeholder:"!command" };
	public param_globalCD:ParameterData = { type:"number", value:0, label:"Global cooldown (sec)", icon:"timeout_purple.svg", min:0, max:60*60*12 };
	public param_userCD:ParameterData = { type:"number", value:0, label:"User cooldown (sec)", icon:"timeout_purple.svg", min:0, max:60*60*12 };

	public chatCmdParams:OBSChatCmdParameters = {
		cmd:"",
		vips:false,
		subs:false,
		mods:true,
		all:false,
		users:"",
		userCooldown:0,
		globalCooldown:0,
	};

	/**
	 * Check if somehting has changed on the form
	 */
	public get isChange():boolean {
		return this.actionData.permissions?.mods != this.chatCmdParams.mods
		|| this.actionData.permissions?.vips != this.chatCmdParams.vips
		|| this.actionData.permissions?.subs != this.chatCmdParams.subs
		|| this.actionData.permissions?.all != this.chatCmdParams.all
		|| this.actionData.permissions?.users != this.chatCmdParams.users
		|| this.actionData.cooldown?.user != this.param_userCD.value
		|| this.actionData.cooldown?.global != this.param_globalCD.value
		|| this.actionData.chatCommand != this.param_cmd.value;
	}

	public mounted():void {
		this.populate();
		watch(()=> this.actionData, ()=> { this.populate(); }, { deep:true });
	}

	public populate():void {
		this.chatCmdParams.mods = this.actionData.permissions?.mods;
		this.chatCmdParams.vips = this.actionData.permissions?.vips;
		this.chatCmdParams.subs = this.actionData.permissions?.subs;
		this.chatCmdParams.all = this.actionData.permissions?.all;
		this.chatCmdParams.users = this.actionData.permissions?.users;
		this.param_userCD.value = this.actionData.cooldown?.user;
		this.param_globalCD.value = this.actionData.cooldown?.global;
		this.param_cmd.value = this.actionData.chatCommand;
	}

	public save():void {
		this.chatCmdParams.cmd = this.param_cmd.value as string;
		this.chatCmdParams.userCooldown = this.param_userCD.value as number;
		this.chatCmdParams.globalCooldown = this.param_globalCD.value as number;
		this.$emit("update", this.chatCmdParams);
	}

}
</script>

<style scoped lang="less">
.obseventsactionchatcommandparams{
	.title {
		text-align: center;
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