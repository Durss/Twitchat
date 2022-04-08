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
import store, { ParameterData } from '@/store';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';

@Options({
	props:{},
	components:{
		ParamItem
	}
})
export default class OBSPermissions extends Vue {
	
	public obsAllowed_mods:ParameterData = { type:"toggle", value:true, label:"Moderators", icon:"mod_purple.svg" };
	public obsAllowed_vips:ParameterData = { type:"toggle", value:false, label:"VIPs", icon:"vip_purple.svg" };
	public obsAllowed_subs:ParameterData = { type:"toggle", value:false, label:"Subscribers", icon:"sub_purple.svg" };
	public obsAllowed_all:ParameterData = { type:"toggle", value:false, label:"Everyone", icon:"user_purple.svg" };
	public obsAllowed_usernames:ParameterData = { type:"text", longText:true, value:"", label:"Specific users", placeholder:"user1, user2, user3, ..." };

	public mounted():void {
		const storedPermissions = store.state.obsPermissions;
		if(storedPermissions) {
			this.obsAllowed_mods.value = storedPermissions.mods;
			this.obsAllowed_vips.value = storedPermissions.vips;
			this.obsAllowed_subs.value = storedPermissions.subs;
			this.obsAllowed_all.value = storedPermissions.all;
			this.obsAllowed_usernames.value = storedPermissions.users;
		}
	}

	public onPermissionChange():void {
		const params = {
			mods:this.obsAllowed_mods.value,
			vips:this.obsAllowed_vips.value,
			subs:this.obsAllowed_subs.value,
			all:this.obsAllowed_all.value,
			users:this.obsAllowed_usernames.value,
		}
		store.dispatch("setOBSPermissions", params);
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