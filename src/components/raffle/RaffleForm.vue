<template>
	<div class="raffleform">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Create Raffle</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<div class="description">
					<p>This feature allows you to randomly pick a user on your audience.</p>
					<p>Set a <strong>command</strong> your viewers will have to enter, a max duration to enter or a max number of users and start the raffle.</p>
				</div>
				<form @submit.prevent="onSubmit()">
					<div class="row">
						<ParamItem class="item" :paramData="command" />
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="enterDuration" />
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="maxUsersToggle" />
					</div>
					<div class="row">
						<ParamItem class="item child" :paramData="maxUsers" v-if="maxUsersToggle.value" />
					</div>
					<div class="row">
						<Button type="submit" title="Start" />
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store, { ParameterData, RaffleData } from '@/store';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
	}
})
export default class RaffleForm extends Vue {

	public command:ParameterData = {type:"list", value:"", label:"Command", placeholder:"!raffle"};
	public enterDuration:ParameterData = {label:"Raffle duration (minutes)", value:10, type:"number", min:1, max:30};
	public maxUsers:ParameterData = {label:"Max users count", value:0, type:"number", min:0, max:999999999};
	public maxUsersToggle:ParameterData = {label:"Limit users count", value:false, type:"toggle"};

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

	public onSubmit():void {
		const cmd = this.command.value? this.command.value as string : "!raffle";
		const payload:RaffleData = {
			command:cmd,
			duration:this.enterDuration.value as number,
			maxUsers:this.maxUsersToggle.value ? this.maxUsers.value as number : 0,
			created_at:new Date().getTime(),
			users:[],
		};
		store.dispatch("startRaffle", payload);
		this.close();
	}
	
}
</script>

<style scoped lang="less">
.raffleform{
	
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
			margin-bottom: 20px;
		}

		form {
			display: flex;
			flex-direction: column;
			.row {
				display: flex;
				flex-direction: column;
				margin-top: 10px;
				.item {

					&.child {
						margin-left: auto;
						margin-right: 0;
						margin-top: 10px;
						width: calc(100% - 20px);
						:deep(label)::before {
							content: "⤷";
							display: inline-block;
							margin-right: 5px;
						}
					}
				}

				:deep(.list) {
					flex-direction: row;
					label {
						flex-grow: 1;
					}
				}
				:deep(input) {
					width: 150px;
					text-align: center;
				}
			}
		}
	}
}
</style>