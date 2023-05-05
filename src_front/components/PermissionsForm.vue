<template>
	<div class="permissionsform">
		<ParamItem noBackground :paramData="param_broadcaster" class="row" v-model="modelValue.broadcaster" @change="$emit('update:modelValue', modelValue)" />
		<ParamItem noBackground :paramData="param_mods" class="row" v-model="modelValue.mods" @change="$emit('update:modelValue', modelValue)" />
		<ParamItem noBackground :paramData="param_vips" class="row" v-model="modelValue.vips" @change="$emit('update:modelValue', modelValue)" />
		<ParamItem noBackground :paramData="param_subs" class="row" v-model="modelValue.subs" @change="$emit('update:modelValue', modelValue)" />
		<ParamItem noBackground :paramData="param_followers" class="row" v-model="modelValue.follower" @change="$emit('update:modelValue', modelValue)" />
		<ParamItem noBackground :paramData="param_all" class="row" v-model="modelValue.all" @change="$emit('update:modelValue', modelValue)" />
		<ParamItem noBackground :paramData="param_allowed" class="row allow" v-model="modelValue.usersAllowed" @change="$emit('update:modelValue', modelValue)" />
		<ParamItem noBackground :paramData="param_refused" class="row refuse" v-model="modelValue.usersRefused" @change="$emit('update:modelValue', modelValue)" />
		
		<div v-if="noSelection" class="card-item alert">{{ $t("global.permissions.nobody") }}</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from './params/ParamItem.vue';

@Component({
	components:{
		ParamItem
	},
	emits:["update:modelValue"],
})
export default class PermissionsForm extends Vue {
	@Prop
	public modelValue!:TwitchatDataTypes.PermissionsData;
	
	public param_broadcaster:TwitchatDataTypes.ParameterData<boolean>		= { type:"boolean", labelKey:"global.permissions.broadcaster", value:true, icon:"broadcaster.svg" };
	public param_mods:TwitchatDataTypes.ParameterData<boolean>				= { type:"boolean", labelKey:"global.permissions.mods", value:true, icon:"mod.svg" };
	public param_vips:TwitchatDataTypes.ParameterData<boolean>				= { type:"boolean", labelKey:"global.permissions.vips", value:false, icon:"vip.svg" };
	public param_subs:TwitchatDataTypes.ParameterData<boolean>				= { type:"boolean", labelKey:"global.permissions.subs", value:false, icon:"sub.svg" };
	public param_followers_ms:TwitchatDataTypes.ParameterData<number>		= { type:"number", labelKey:"global.permissions.follow_duration", value:0, min:0, max:50000, icon:"timer.svg" };
	public param_all:TwitchatDataTypes.ParameterData<boolean>				= { type:"boolean", labelKey:"global.permissions.all", value:false, icon:"user.svg" };
	public param_allowed:TwitchatDataTypes.ParameterData<string, string>	= { type:"editablelist", labelKey:"global.permissions.users_allowed", placeholderKey:"global.permissions.users_placeholder", value:"", icon:"checkmark.svg" };
	public param_refused:TwitchatDataTypes.ParameterData<string, string>	= { type:"editablelist", labelKey:"global.permissions.users_refused", placeholderKey:"global.permissions.users_placeholder", value:"", icon:"cross.svg" };
	public param_followers:TwitchatDataTypes.ParameterData<boolean, unknown, number> = { type:"boolean", labelKey:"global.permissions.follow", value:false, icon:"follow.svg", twitch_scopes:[TwitchScopes.LIST_FOLLOWERS] };

	public get noSelection():boolean {
		return this.modelValue.mods === false
		&& this.modelValue.vips === false
		&& this.modelValue.subs === false
		&& this.modelValue.all === false
		&& this.modelValue.follower === false
		&& this.modelValue.broadcaster === false
		&& this.modelValue.usersAllowed.length === 0;
	}

	public beforeMount():void {
		if(this.modelValue.follower === undefined) this.modelValue.follower = false;
		this.param_followers.children	= [this.param_followers_ms];
		this.param_followers_ms.value	= (this.modelValue.follower_duration_ms ?? 0) / (24 * 60 * 60 * 1000);

		watch(()=>this.param_followers_ms.value, ()=> {
			this.modelValue.follower_duration_ms = this.param_followers_ms.value * 24 * 60 * 60 * 1000;
			this.$emit('update:modelValue', this.modelValue);
		}) 

		//As this data has been added afterwards, it's missing from the existing data.
		//I force it to "true" if not defined as I think it makes the more sense.
		this.param_followers.value = this.modelValue.follower !== false;

		watch(()=>this.param_all.value, ()=>{
			// if(this.param_all.value === true) {
			// 	this.modelValue.mods = true;
			// 	this.modelValue.vips = true;
			// 	this.modelValue.subs = true;
			// 	this.modelValue.follower = true;
			// }
		});
	}

}
</script>

<style scoped lang="less">
.permissionsform{
	margin: auto;
	max-width: 450px;
	display: flex;
	flex-direction: column;
	gap: .25em;
	
	&>:not(:first-child) {
		margin-top: .25em;
	}
	
	.row {
		:deep(input[type="number"]) {
			flex-basis: 80px;
		}
	}

	.allow, .refuse {
		:deep(.icon) {
			width: 1.25em;
    		height: 1.25em;
			margin-right: .5em;
			padding: .25em;
			border-radius: 50%;
			bottom: -.25em;
			position: relative;
			background-color: var(--color-primary);
		}
	}
	.refuse {
		:deep(.icon) {
			background-color: var(--color-alert);
		}
	}

	select {
		width: 100%;
		text-align: center;
	}
}
</style>