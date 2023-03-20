<!--
	Not using @submit="timeoutUser()" on <form> node because for some reason it doesn't work
	When hitting enter key on field, form isn't submited.
	ContextMenu component may be catching event or something, dunno...
-->
<template>
	<form :class="classes" @click="onClick()">
		<div class="field" @keyup.enter="timeoutUser()"><input type="text" v-model="duration">s</div>
		<button @click="timeoutUser()" class="submit" type="submit"><img src="@/assets/icons/checkmark_white.svg" alt="check"></button>
	</form>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
export default class ContextMenuTimeoutDuration extends Vue {

	@Prop
	public user!:TwitchatDataTypes.TwitchatUser;

	@Prop
	public channelId!:string;

	public duration:number = 600;
	public classes:string[] = [];
	public disabled:boolean = false;

	public mounted():void {
		this.disabled = !TwitchUtils.hasScopes([TwitchScopes.EDIT_BANNED]);

		this.classes = ["contextmenutimeoutduration"]
		if(this.disabled) this.classes.push("disabled");
	}

	/**
	 * Timeouts the user for a custom duration
	 */
	public timeoutUser():void {
		TwitchUtils.banUser(this.user, this.channelId, this.duration);
	}

	/**
	 * Called when component is clicked.
	 * Request forpermission if necessaru
	 */
	public onClick():void {
		TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED]);
	}

}
</script>

<style scoped lang="less">
.contextmenutimeoutduration{
	display: flex;
	flex-direction: row;
	color: @mainColor_light;
	text-align: center;
	padding: 0 .25em;

	&.disabled {
		.field, .submit {
			pointer-events: none;
		}
		opacity: .5;
		cursor: no-drop;
	}

	.field {
		display: flex;
		flex-direction: row;
		align-items: center;
		border-top-left-radius: @border_radius;
		border-bottom-left-radius: @border_radius;
		border-right: 1px solid @mainColor_normal;
		font-size: 1em;
		padding: .25em .5em;
		box-sizing: border-box;
		font-family: var(--font-inter);
		color: @mainColor_light;
		background-color: rgba(0, 0, 0, .6);
		border-color: @mainColor_dark_extralight;
		margin: 0;
		padding: 0 .5em 0 0;
	
		&::placeholder {
			font-style: italic;
			color: fade(@mainColor_light, 50%);
		}
		input {
			color: @mainColor_light;
			width: 60px;
			text-align: right;
			background-color: transparent;
			border: none;
			padding-right: 3px;
		}
	}
	.submit {
		background-color: @mainColor_dark;
		border-top-right-radius: @border_radius;
		border-bottom-right-radius: @border_radius;
		padding: .25em;
		img {
			height: .8em;
		}
	}
}
</style>