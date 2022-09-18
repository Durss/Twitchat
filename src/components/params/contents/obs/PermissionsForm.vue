<template>
	<div class="obspermissions">
		<ParamItem :paramData="param_broadcaster" class="row" v-model="modelValue.broadcaster" @change="$emit('update:modelValue', modelValue)"/>
		<ParamItem :paramData="param_mods" class="row" v-model="modelValue.mods" @change="$emit('update:modelValue', modelValue)"/>
		<ParamItem :paramData="param_vips" class="row" v-model="modelValue.vips" @change="$emit('update:modelValue', modelValue)"/>
		<ParamItem :paramData="param_subs" class="row" v-model="modelValue.subs" @change="$emit('update:modelValue', modelValue)"/>
		<ParamItem :paramData="param_all" class="row" v-model="modelValue.all" @change="$emit('update:modelValue', modelValue)"/>
		<ParamItem :paramData="param_users" class="row" v-model="modelValue.users" @change="$emit('update:modelValue', modelValue)"/>
		<div v-if="noSelection" class="noSelection">Nobody is allowed by the current selection</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';

@Options({
	props:{
		modelValue:Object
	},
	components:{
		ParamItem
	},
	emits:["update:modelValue"],
})
export default class OBSPermissions extends Vue {

	public modelValue!:TwitchatDataTypes.PermissionsData;
	
	public param_broadcaster:TwitchatDataTypes.ParameterData	= { type:"toggle", value:true, label:"Broadcaster", icon:"broadcaster_purple.svg" };
	public param_mods:TwitchatDataTypes.ParameterData			= { type:"toggle", value:true, label:"Moderators", icon:"mod_purple.svg" };
	public param_vips:TwitchatDataTypes.ParameterData			= { type:"toggle", value:false, label:"VIPs", icon:"vip_purple.svg" };
	public param_subs:TwitchatDataTypes.ParameterData			= { type:"toggle", value:false, label:"Subscribers", icon:"sub_purple.svg" };
	public param_all:TwitchatDataTypes.ParameterData			= { type:"toggle", value:false, label:"Everyone", icon:"user_purple.svg" };
	public param_users:TwitchatDataTypes.ParameterData		= { type:"text", value:"", label:"Specific users", longText:true, placeholder:"user1, user2, user3, ..." };

	public get noSelection():boolean {
		return this.modelValue.mods === false
		&& this.modelValue.vips === false
		&& this.modelValue.subs === false
		&& this.modelValue.all === false
		&& this.modelValue.broadcaster === false
		&& this.modelValue.users === "";
	}

	public mounted():void {
		watch(()=>this.param_all.value, ()=>{
			if(this.param_all.value === true) {
				this.modelValue.mods = true;
				this.modelValue.vips = true;
				this.modelValue.subs = true;
			}
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

	.noSelection {
		padding: .25em;
		border-radius: .25em;
		color: @mainColor_light;
		background-color: fade(@mainColor_alert, 100%);
	}
}
</style>