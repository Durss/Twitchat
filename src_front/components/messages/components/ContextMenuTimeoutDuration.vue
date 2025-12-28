<!--
	Not using @submit="timeoutUser()" on <form> node because for some reason it doesn't work
	When hitting enter key on field, form isn't submited.
	ContextMenu component may be catching event or something, dunno...
-->
<template>
	<form :class="classes" @click="onClick()" @submit.prevent="">
		<div class="field" @keyup.enter.capture="timeoutUser"><input type="text" v-model="duration">s</div>
		<button @click="timeoutUser" class="submit" type="submit"><span class="icon" v-html="CheckmarkIcon" /></button>
	</form>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import ContextMenu from "@imengyu/vue3-context-menu";
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import CheckmarkIcon from '@/assets/icons/checkmark.svg?raw';

@Component({
	components:{
	},
	emits:[],
})
class ContextMenuTimeoutDuration extends Vue {

	@Prop
	public user!:TwitchatDataTypes.TwitchatUser;

	@Prop
	public channelId!:string;

	public duration:number = 600;
	public classes:string[] = [];
	public disabled:boolean = false;

	public get CheckmarkIcon():string {
		return CheckmarkIcon;
	}

	public mounted():void {
		this.disabled = !TwitchUtils.hasScopes([TwitchScopes.EDIT_BANNED]);

		this.classes = ["contextmenutimeoutduration"]
		if(this.disabled) this.classes.push("disabled");
	}

	/**
	 * Timeouts the user for a custom duration
	 */
	public timeoutUser(event:Event):void {
		event.stopPropagation();
		event.preventDefault();
		TwitchUtils.banUser(this.user, this.channelId, this.duration);
		ContextMenu.closeContextMenu();
	}

	/**
	 * Called when component is clicked.
	 * Request forpermission if necessaru
	 */
	public onClick():void {
		TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED]);
	}

}
export default toNative(ContextMenuTimeoutDuration);
</script>

<style scoped lang="less">
.contextmenutimeoutduration{
	display: flex;
	flex-direction: row;
	color: var(--color-light);
	text-align: center;
	padding: 0 .25em;

	&.disabled {
		.field, .submit {
			pointer-events: none;
		}
		opacity: .5;
		cursor: not-allowed;
	}

	.field {
		display: flex;
		flex-direction: row;
		align-items: center;
		border-top-left-radius: var(--border-radius);
		border-bottom-left-radius: var(--border-radius);
		font-size: 1em;
		padding: .25em .5em;
		box-sizing: border-box;
		font-family: var(--font-inter);
		background-color: rgba(0, 0, 0, .6);
		margin: 0;
		padding: 0 .5em 0 0;

		&::placeholder {
			font-style: italic;
		}
		input {
			color: var(--color-light);
			width: 60px;
			text-align: right;
			background-color: transparent;
			border: none;
			padding-right: 3px;
		}
	}
	.submit {
		background-color: var(--color-primary);
		border-top-right-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		padding: .25em;
		color: var(--color-text);
		.icon {
			height: .8em;
			display: inline-block;
			:deep(svg) {
				width: auto;
				height: 100%;
				max-width: 100%;
				max-height: 100%;
				object-fit: cover;
				display: block;
				* {
					fill: currentColor !important;
				}
			}
		}
	}
}
</style>
