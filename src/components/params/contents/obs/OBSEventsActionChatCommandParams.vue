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
				@update="onPermissionChange"
				:mods="chatCmdParams.mods"
				:vips="chatCmdParams.vips"
				:subs="chatCmdParams.subs"
				:all="chatCmdParams.all"
				:users="chatCmdParams.users"
			/>
		</ToggleBlock>

		<ToggleBlock :open="false" class="row" small title="Limit usage">
			<ParamItem class="cooldown" :paramData="param_globalCD" />
			<ParamItem class="cooldown" :paramData="param_userCD" />
		</ToggleBlock>

			
		<Button type="submit"
			title="Save"
			class="saveBt"
			:icon="require('@/assets/icons/save.svg')"
			:disabled="param_cmd.value === ''"
		/>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { ParameterData } from '@/store';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';
import OBSPermissions from './OBSPermissions.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		OBSPermissions,
	}
})
export default class OBSEventsActionChatCommandParams extends Vue {

	public isChange:boolean = false;

	public param_cmd:ParameterData = { type:"text", value:"", label:"Command", icon:"commands_purple.svg", placeholder:"!command" };
	public param_globalCD:ParameterData = { type:"number", value:0, label:"Global cooldown (sec)", icon:"timeout_purple.svg", min:0, max:60*60*12 };
	public param_userCD:ParameterData = { type:"number", value:0, label:"User cooldown (sec)", icon:"timeout_purple.svg", min:0, max:60*60*12 };

	public chatCmdParams:{
		vips:boolean,
		subs:boolean,
		mods:boolean,
		all:boolean,
		users:string,
		userCooldown:number,
		globalCooldown:number,
	} = {
		vips:false,
		subs:false,
		mods:true,
		all:false,
		users:"",
		userCooldown:0,
		globalCooldown:0,
	};

	mounted():void {
		
	}

	public onPermissionChange():void {
		this.$emit("update", {
			permissions:this.chatCmdParams,
		});
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