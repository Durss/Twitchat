<template>
	<div class="chatpollform">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Chat Suggestions</span>
				<Button aria-label="Close chat poll form" :icon="$image('icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<div class="description">
					<p>Get suggestions from your audience.</p>
					<p class="example">Ex: <span>{{example}} <strong>user's suggestion</strong></span></p>
				</div>
				<form  @submit.prevent="submitChatPoll()">
					<div class="row">
						<ParamItem :paramData="command" autofocus />
					</div>

					<div class="row">
						<ParamItem :paramData="duration" />
					</div>

					<div class="row">
						<ParamItem :paramData="multiAnswers" />
					</div>

					<!-- <ToggleBlock small title="Permissions" :open="false" class="row permissions">
						<PermissionsForm v-model="permissions" />
					</ToggleBlock> -->

					<div class="row">
						<Button title="Submit" type="submit" />
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { ChatPollData, ParameterData } from '@/types/TwitchatDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import PermissionsForm from '../params/contents/obs/PermissionsForm.vue';
import ParamItem from '../params/ParamItem.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class ChatPollForm extends Vue {
	
	public command:ParameterData = {type:"text", value:"!sugg", label:"Command", placeholder:"!sugg", maxLength:31};
	public duration:ParameterData = {label:"Poll duration (minutes)", value:2, type:"number", min:1, max:30};
	public multiAnswers:ParameterData = {label:"Users can submit multiple entries", value:false, type:"toggle"};
	public permissions = {
		mods:true,
		vips:true,
		subs:true,
		all:true,
		users:"",
	}

	public get example():string {
		if(this.command.value) return this.command.value as string;
		return "!sugg";
	}

	public async mounted():Promise<void> {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public submitChatPoll():void {
		const data:ChatPollData = {
			startTime:Date.now(),
			command:(this.command.value as string).trim(),
			duration:this.duration.value as number,
			allowMultipleAnswers:this.multiAnswers.value as boolean,
			choices:[],
			winners:[],
		}
		StoreProxy.store.dispatch("setChatPoll", data);
		this.close();
	}
}
</script>

<style scoped lang="less">
.chatpollform{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	.modal();

	.content {
		.description {
			text-align: center;
			font-size: .8em;
			margin-bottom: 1em;
			.example {
				margin-top: .5em;
				font-style: italic;
				span {
					border: 1px dashed @mainColor_normal;
					background-color: fade(@mainColor_normal, 15%);
					padding: 2px;
					border-radius: .5em;
				}
			}
		}
		form {
			display: flex;
			flex-direction: column;
			.row {
				margin-top: 10px;
				display: flex;
				flex-direction: column;
				&.permissions {
					margin: auto;
					// max-width: 500px;
				}
				.error {
					margin-top: 5px;
					color: @mainColor_light;
					padding: 5px 10px;
					border-radius: 5px;
					text-align: center;
					background-color: @mainColor_alert;
				}
				:deep(input) {
					width: 100px;
					max-width: 100px;
					text-align: center;
				}
			}
		}
	}
}
</style>