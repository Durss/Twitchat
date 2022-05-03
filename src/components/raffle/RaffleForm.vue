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
					<p>Set a <strong>command</strong> your viewers will have to enter, a max duration to enter the raffle or a max number of users allowed, and start the raffle.</p>
					<ToggleBlock icon="infos" small title="Legal concerns" :open="false" class="legal">
						<div>Depending on your country's legislation, making your viewers win something while using the "sub" ponderation option or randomly picking a winner amongst your subs might me illegal.</div>
						<div>You may want to check this out before doing a giveaway.</div>
					</ToggleBlock>
				</div>

				<form @submit.prevent="onSubmit()" class="form">
					<div class="row">
						<ParamItem class="item" :paramData="command" :autofocus="true" />
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="enterDuration" />
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="maxUsersToggle" />
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="ponderateVotes" />
					</div>

					<div class="row">
						<Button type="submit" title="Start" :icon="require('@/assets/icons/ticket.svg')" />
					</div>
				</form>
					
				<Splitter title="OR" class="splitter" />

				<div class="description">
					<p>Randomly pick someone amongst all your current subscribers</p>
				</div>
				<div class="form">
					<div class="row">
						<ParamItem class="item" :paramData="subs_includeGifters" />
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="subs_excludeGifted" />
					</div>
					<div class="row winner" v-if="winner" ref="winnerHolder">
						<div class="head">Winner</div>
						<div class="user">🎉 {{winner.user_name}} 🎉</div>
					</div>
					<div class="row winner" v-if="winnerTmp">
						<div class="user">{{winnerTmp.user_name}}</div>
					</div>
					<div class="row">
						<Button type="submit" :title="'Pick a sub <i>('+subsFiltered.length+')</i>'" :icon="require('@/assets/icons/sub.svg')" @click="pickSub()" :loading="loadingSubs" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store, { ParameterData, RaffleData } from '@/store';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import Splitter from '../Splitter.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		Splitter,
		ParamItem,
		ToggleBlock,
	}
})
export default class RaffleForm extends Vue {

	public loadingSubs:boolean = false;
	public winner:TwitchTypes.Subscriber|null = null;
	public winnerTmp:TwitchTypes.Subscriber|null = null;

	public command:ParameterData = {type:"text", value:"", label:"Command", placeholder:"!raffle"};
	public enterDuration:ParameterData = {label:"Raffle duration (minutes)", value:10, type:"number", min:1, max:30};
	public maxUsersToggle:ParameterData = {label:"Limit users count", value:false, type:"toggle"};
	public maxUsers:ParameterData = {label:"Max users count", value:10, type:"number", min:0, max:1000000};
	public ponderateVotes:ParameterData = {label:"Ponderate votes (additional points given for every matching criteria)", value:false, type:"toggle"};
	public ponderateVotes_vip:ParameterData = {label:"VIP", value:0, type:"number", min:0, max:100, icon:"vip_purple.svg"};
	public ponderateVotes_sub:ParameterData = {label:"Subscriber", value:0, type:"number", min:0, max:100, icon:"sub_purple.svg"};
	public ponderateVotes_subgift:ParameterData = {label:"Sub gifter", value:0, type:"number", min:0, max:100, icon:"gift_purple.svg"};
	public ponderateVotes_follower:ParameterData = {label:"Follower", value:0, type:"number", min:0, max:100, icon:"follow_purple.svg"};
	public subs_includeGifters:ParameterData = {label:"Include sub gifters (user not sub but that subgifted someone else)", value:true, type:"toggle", icon:"gift_purple.svg"};
	public subs_excludeGifted:ParameterData = {label:"Excluded sub gifted users (user that only got subgifted)", value:true, type:"toggle", icon:"sub_purple.svg"};
	
	private subs:TwitchTypes.Subscriber[] = [];

	public get subsFiltered():TwitchTypes.Subscriber[] {
		return this.subs.filter(v => {
			if(this.subs_includeGifters.value == true && this.subs.find(v2=> v2.gifter_id == v.user_id)) return true;
			if(this.subs_excludeGifted.value == true && v.is_gift) return false;
			if(v.user_id == store.state.user.user_id) return false;
			return true;
		})
	}

	public async mounted():Promise<void> {
		this.maxUsersToggle.children = [this.maxUsers];
		this.ponderateVotes.children = [this.ponderateVotes_vip, this.ponderateVotes_follower, this.ponderateVotes_sub, this.ponderateVotes_subgift];
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
		
		this.loadingSubs = true;
		this.subs = await TwitchUtils.getSubsList();
		this.loadingSubs = false;
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
			followRatio: this.ponderateVotes_follower.value as number,
			vipRatio: this.ponderateVotes_vip.value as number,
			subRatio: this.ponderateVotes_sub.value as number,
			subgitRatio: this.ponderateVotes_subgift.value as number,
			winners: [],
		};
		store.dispatch("startRaffle", payload);
		this.close();
	}

	public async pickSub():Promise<void> {
		this.winner = null;
		let increment = {value:0};
		let prevRounded = increment.value;
		gsap.to(increment, {value:100, ease:"sine.out", duration:5, onUpdate:()=> {
			let rounded = Math.round(increment.value);
			if(rounded != prevRounded) {
				prevRounded = rounded;
				this.winnerTmp = Utils.pickRand(this.subsFiltered);
			}
		}, onComplete:()=>{
			this.winner = this.winnerTmp;
			this.winnerTmp = null;
			this.$nextTick().then(()=> {
				gsap.fromTo(this.$refs.winnerHolder as HTMLDivElement,
							{scaleX:1.25, scaleY:2},
							{duration:1, scale:1, ease:"elastic.out(1, 0.5)"});
			})
		}})
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
			margin-bottom: 1em;
			.button {
				margin-top: .5em;
			}
			.legal {
				text-align: justify;
				color: @mainColor_warn;
				:deep(.header),
				:deep(.content) {
					background-color: fade(@mainColor_warn, 10%);
				}
			}
		}

		.form {
			display: flex;
			flex-direction: column;
			.row {
				display: flex;
				flex-direction: column;
				&:not(:first-child) {
					margin-top: .5em;
				}

				:deep(.list) {
					flex-direction: row;
					label {
						flex-grow: 1;
					}
				}
				:deep(input) {
					width: 100px;
					text-align: center;
				}

				.button {
					:deep(.label) {
						display: flex;
						flex-direction: row;
						align-items: center;
						i {
							font-size: .7em;
							margin-left: .5em;
						}
					}
				}

				&.winner {
					margin-top: .5em;
					border-radius: 10px;
					font-weight: bold;
					overflow: hidden;
					.head {
						font-size: 1.25em;
						padding: .25em;
						text-align: center;
						color: @mainColor_light;
						background-color: @mainColor_warn;
					}
					.user {
						padding: .5em;
						text-align: center;
						color: @mainColor_warn;
						background-color: @mainColor_warn_extralight;
					}
				}
			}
		}

		.splitter {
			margin: 1em 0;
		}
	}
}
</style>