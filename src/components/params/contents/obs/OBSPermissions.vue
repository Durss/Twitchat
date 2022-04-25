<template>
	<div class="obspermissions">
		<p class="info">Users allowed to use the chat commands</p>
		<ParamItem :paramData="obsAllowed_mods" class="row" @change="onPermissionChange()"/>
		<ParamItem :paramData="obsAllowed_vips" class="row" @change="onPermissionChange()"/>
		<ParamItem :paramData="obsAllowed_subs" class="row" @change="onPermissionChange()"/>
		<ParamItem :paramData="obsAllowed_all" class="row" @change="onPermissionChange()"/>
		<ParamItem :paramData="obsAllowed_usernames" class="row" @change="onPermissionChange()"/>
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
	
	public obsAllowed_mods:ParameterData = { type:"toggle", value:true, label:"Moderators", icon:"mod_purple.svg" };
	public obsAllowed_vips:ParameterData = { type:"toggle", value:false, label:"VIPs", icon:"vip_purple.svg" };
	public obsAllowed_subs:ParameterData = { type:"toggle", value:false, label:"Subscribers", icon:"sub_purple.svg" };
	public obsAllowed_all:ParameterData = { type:"toggle", value:false, label:"Everyone", icon:"user_purple.svg" };
	public obsAllowed_usernames:ParameterData = { type:"text", longText:true, value:"", label:"Specific users", placeholder:"user1, user2, user3, ..." };

	public mounted():void {
		this.obsAllowed_mods.value		= this.mods;
		this.obsAllowed_vips.value		= this.vips;
		this.obsAllowed_subs.value		= this.subs;
		this.obsAllowed_all.value		= this.all;
		this.obsAllowed_usernames.value	= this.users;
	}

	public onPermissionChange():void {
		this.$emit("update", {
			mods:this.mods,
			vips:this.vips,
			subs:this.subs,
			all:this.all,
			users:this.users,
		});
	}

}
</script>

<style scoped lang="less">
.obspermissions{
	width: 300px;
	margin: auto;
	
	&:not(:first-child) {
		margin-top: 2px;
	}
}
</style>