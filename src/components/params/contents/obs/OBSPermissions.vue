<template>
	<div class="obspermissions">
		<ParamItem :paramData="param_mods" class="row" @change="onPermissionChange()"/>
		<ParamItem :paramData="param_vips" class="row" @change="onPermissionChange()"/>
		<ParamItem :paramData="param_subs" class="row" @change="onPermissionChange()"/>
		<ParamItem :paramData="param_all" class="row" @change="onPermissionChange()"/>
		<ParamItem :paramData="param_usernames" class="row" @change="onPermissionChange()"/>
	</div>
</template>

<script lang="ts">
import { ParameterData } from '@/store';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';

@Options({
	props:{
		mods:{
			type:Boolean,
			default:false,
		},
		vips:{
			type:Boolean,
			default:false,
		},
		subs:{
			type:Boolean,
			default:false,
		},
		all:{
			type:Boolean,
			default:false,
		},
		users:String,
	},
	components:{
		ParamItem
	},
	emits:["update"]
})
export default class OBSPermissions extends Vue {

	public mods!:boolean;
	public vips!:boolean;
	public subs!:boolean;
	public all!:boolean;
	public users!:string;
	
	public param_mods:ParameterData = { type:"toggle", value:true, label:"Moderators", icon:"mod_purple.svg" };
	public param_vips:ParameterData = { type:"toggle", value:false, label:"VIPs", icon:"vip_purple.svg" };
	public param_subs:ParameterData = { type:"toggle", value:false, label:"Subscribers", icon:"sub_purple.svg" };
	public param_all:ParameterData = { type:"toggle", value:false, label:"Everyone", icon:"user_purple.svg" };
	public param_usernames:ParameterData = { type:"text", longText:true, value:"", label:"Specific users", placeholder:"user1, user2, user3, ..." };

	public mounted():void {
		this.param_mods.value		= this.mods;
		this.param_vips.value		= this.vips;
		this.param_subs.value		= this.subs;
		this.param_all.value		= this.all;
		this.param_usernames.value	= this.users;
	}

	public onPermissionChange():void {
		this.$emit("update", {
			mods:this.param_mods.value,
			vips:this.param_vips.value,
			subs:this.param_subs.value,
			all:this.param_all.value,
			users:this.param_usernames.value,
		});
	}

}
</script>

<style scoped lang="less">
.obspermissions{
	margin: auto;
	
	&>:not(:first-child) {
		margin-top: .25em;
	}
}
</style>