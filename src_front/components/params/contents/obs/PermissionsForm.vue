<template>
	<div class="obspermissions">
		<ParamItem :paramData="param_broadcaster" class="row" v-model="modelValue.broadcaster" @change="$emit('update:modelValue', modelValue)"/>
		<ParamItem :paramData="param_mods" class="row" v-model="modelValue.mods" @change="$emit('update:modelValue', modelValue)"/>
		<ParamItem :paramData="param_vips" class="row" v-model="modelValue.vips" @change="$emit('update:modelValue', modelValue)"/>
		<ParamItem :paramData="param_subs" class="row" v-model="modelValue.subs" @change="$emit('update:modelValue', modelValue)"/>
		<ParamItem :paramData="param_followers" class="row" v-model="modelValue.follower" @change="$emit('update:modelValue', modelValue)"/>
		<ParamItem :paramData="param_all" class="row" v-model="modelValue.all" @change="$emit('update:modelValue', modelValue)"/>
		<ParamItem :paramData="param_users" class="row" v-model="modelValue.users" @change="$emit('update:modelValue', modelValue)"/>
		<div v-if="noSelection" class="noSelection" v-t="'global.permissions.nobody'"></div>
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
	
	public param_broadcaster:TwitchatDataTypes.ParameterData	= { type:"toggle", value:true, label:"", icon:"broadcaster_purple.svg" };
	public param_mods:TwitchatDataTypes.ParameterData			= { type:"toggle", value:true, label:"", icon:"mod_purple.svg" };
	public param_vips:TwitchatDataTypes.ParameterData			= { type:"toggle", value:false, label:"", icon:"vip_purple.svg" };
	public param_subs:TwitchatDataTypes.ParameterData			= { type:"toggle", value:false, label:"", icon:"sub_purple.svg" };
	public param_followers:TwitchatDataTypes.ParameterData		= { type:"toggle", value:false, label:"", icon:"follow_purple.svg" };
	public param_followers_ms:TwitchatDataTypes.ParameterData	= { type:"number", value:0, label:"", icon:"timer_purple.svg" };
	public param_all:TwitchatDataTypes.ParameterData			= { type:"toggle", value:false, label:"", icon:"user_purple.svg" };
	public param_users:TwitchatDataTypes.ParameterData			= { type:"text", value:"", label:"", longText:true, placeholder:"user1, user2, user3, ..." };

	public get noSelection():boolean {
		return this.modelValue.mods === false
		&& this.modelValue.vips === false
		&& this.modelValue.subs === false
		&& this.modelValue.all === false
		&& this.modelValue.follower === false
		&& this.modelValue.broadcaster === false
		&& this.modelValue.users === "";
	}

	public mounted():void {
		this.param_broadcaster.label	= this.$t("global.permissions.broadcaster");
		this.param_mods.label			= this.$t("global.permissions.mods");
		this.param_vips.label			= this.$t("global.permissions.vips");
		this.param_subs.label			= this.$t("global.permissions.subs");
		this.param_followers.label		= this.$t("global.permissions.follow");
		this.param_followers_ms.label	= this.$t("global.permissions.follow_duration");
		this.param_all.label			= this.$t("global.permissions.all");
		this.param_followers.children	= [this.param_followers_ms];
		this.param_followers_ms.value	= (this.modelValue.follower_duration_ms ?? 0) / (24 * 60 * 60 * 1000);

		watch(()=>this.param_followers_ms.value, ()=> {
			this.modelValue.follower_duration_ms = (this.param_followers_ms.value as number) * 24 * 60 * 60 * 1000;
		}) 

		//As this data has been added afterwards, it's missing from the existing data.
		//I force it to "true" if not defined as I think it makes the more sense.
		this.param_followers.value = this.modelValue.follower !== false;

		watch(()=>this.param_all.value, ()=>{
			if(this.param_all.value === true) {
				this.modelValue.mods = true;
				this.modelValue.vips = true;
				this.modelValue.subs = true;
				this.modelValue.follower = true;
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
	
	.row {
		:deep(input[type="number"]) {
			flex-basis: 80px;
		}
	}
}
</style>