<template>
	<div class="obspermissions">
		<ParamItem :paramData="param_mods" class="row" @change="$emit('update:mods', param_mods.value); $emit('update')"/>
		<ParamItem :paramData="param_vips" class="row" @change="$emit('update:vips', param_vips.value); $emit('update')"/>
		<ParamItem :paramData="param_subs" class="row" @change="$emit('update:subs', param_subs.value); $emit('update')"/>
		<ParamItem :paramData="param_all" class="row" @change="$emit('update:all', param_all.value); $emit('update')"/>
		<ParamItem :paramData="param_users" class="row" @change="$emit('update:users', param_users.value); $emit('update')"/>
	</div>
</template>

<script lang="ts">
import { ParameterData } from '@/store';
import { watch } from '@vue/runtime-core';
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
	emits:["update","update:mods","update:vips","update:subs","update:all","update:users"],
})
export default class OBSPermissions extends Vue {

	public mods!:boolean;
	public vips!:boolean;
	public subs!:boolean;
	public all!:boolean;
	public users!:string;
	
	public param_mods:ParameterData		= { type:"toggle", value:true, label:"Moderators", icon:"mod_purple.svg" };
	public param_vips:ParameterData		= { type:"toggle", value:false, label:"VIPs", icon:"vip_purple.svg" };
	public param_subs:ParameterData		= { type:"toggle", value:false, label:"Subscribers", icon:"sub_purple.svg" };
	public param_all:ParameterData		= { type:"toggle", value:false, label:"Everyone", icon:"user_purple.svg" };
	public param_users:ParameterData	= { type:"text", value:"", label:"Specific users", longText:true, placeholder:"user1, user2, user3, ..." };

	public mounted():void {
		this.param_mods.value	= this.mods;
		this.param_vips.value	= this.vips;
		this.param_subs.value	= this.subs;
		this.param_all.value	= this.all;
		this.param_users.value	= this.users;

		watch(()=>this.param_all.value, ()=> {
			if(this.param_all.value) {
				this.param_mods.value = true;
				this.param_vips.value = true;
				this.param_subs.value = true;
			}
		})
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