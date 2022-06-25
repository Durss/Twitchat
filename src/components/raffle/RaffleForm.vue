<template>
	<div class="raffleform">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Create Raffle</span>
				<Button aria-label="Close raffle form" :icon="$image('icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<div class="description">
					<ToggleBlock :icons="['infos']" small title="Legal concerns" :open="false" class="legal">
						<div>Depending on your country's legislation, making your viewers win something while using the "sub" ponderation option or randomly picking a winner amongst your subs might be illegal.</div>
						<div>You may want to check this out before doing a giveaway.</div>
					</ToggleBlock>
				</div>
				
				<div class="tabs">
					<Button title="Chat" bounce :selected="!subMode" @click="subMode = false" :icon="$image('icons/commands.svg')" />
					<Button title="Subs" bounce :selected="subMode" @click="subMode = true" :icon="$image('icons/sub.svg')" />
				</div>

				<form @submit.prevent="onSubmit()" class="form" v-if="!subMode">
					<div class="info">
						<p>Randomly pick someone amongst users that sent a chat command</p>
					</div>
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
						<Button aria-label="Start raffle" type="submit" title="Start" :icon="$image('icons/ticket.svg')" />
					</div>
				</form>
					
				<div class="form" v-if="subMode">
					<div class="info">
						<p>Randomly pick someone amongst all your current subscribers</p>
					</div>
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
						<Button type="submit"
						:title="'Pick a sub <i>('+subsFiltered.length+')</i>'"
						:icon="$image('icons/sub.svg')"
						:loading="loadingSubs"
						@click="pickSub()" />
					</div>
				</div>

				<ToggleBlock title="Configs" class="configs" :open="false" small>
					<ParamItem class="chatParam" :paramData="showCountdownOverlay" v-if="!subMode" />
					<div class="details" v-if="showCountdownOverlay.value === true && !subMode">
						<a @click="openParam('overlays')">Configure a timer overlay</a>
						on your OBS to display the remaining time on your stream
					</div>
	
					<PostOnChatParam class="chatParam" botMessageKey="raffleStart"
						v-if="!subMode"
						:placeholders="startPlaceholders"
						title="Announce raffle start on chat"
					/>
					<PostOnChatParam class="chatParam" botMessageKey="raffle"
						:placeholders="winnerPlaceholders"
						title="Post raffle winner on chat"
					/>
					<PostOnChatParam class="chatParam" botMessageKey="raffleJoin"
						v-if="!subMode"
						:placeholders="joinPlaceholders"
						title="Confirm when joining the raffle"
					/>
				</ToggleBlock>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import type { ParameterData, ParamsContenType, PlaceholderEntry, WheelItem } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import type { JsonObject } from "type-fest";
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import ToggleBlock from '../ToggleBlock.vue';
import type { RaffleData } from '@/utils/CommonDataTypes';
import UserSession from '@/utils/UserSession';
import Store from '@/store/Store';
import { watch } from 'vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PostOnChatParam,
	}
})
export default class RaffleForm extends Vue {

	public loadingSubs = false;
	public winner:TwitchDataTypes.Subscriber|null = null;
	public winnerTmp:TwitchDataTypes.Subscriber|null = null;

	public subMode = false;

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
	public showCountdownOverlay:ParameterData = {label:"Show overlay countdown", value:false, type:"toggle", icon:"countdown_purple.svg"};

	public startPlaceholders:PlaceholderEntry[] = [{tag:"CMD", desc:"Command users have to send"}];
	public winnerPlaceholders:PlaceholderEntry[] = [{tag:"USER", desc:"User name"}];
	public joinPlaceholders:PlaceholderEntry[] = [{tag:"USER", desc:"User name"}];
	
	private subs:TwitchDataTypes.Subscriber[] = [];
	private wheelOverlayPresenceHandler!:()=>void;
	public wheelOverlayExists = false;

	/**
	 * Gets subs filtered by the current filters
	 */
	public get subsFiltered():TwitchDataTypes.Subscriber[] {
		return this.subs.filter(v => {
			if(this.subs_includeGifters.value == true && this.subs.find(v2=> v2.gifter_id == v.user_id)) return true;
			if(this.subs_excludeGifted.value == true && v.is_gift) return false;
			if(v.user_id == UserSession.instance.authToken.user_id) return false;
			return true;
		})
	}

	public async mounted():Promise<void> {
		this.showCountdownOverlay.value = Store.get("raffle_showCountdownOverlay") === "true";
		this.maxUsersToggle.children = [this.maxUsers];
		this.ponderateVotes.children = [this.ponderateVotes_vip, this.ponderateVotes_follower, this.ponderateVotes_sub, this.ponderateVotes_subgift];
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
		
		watch(()=>this.showCountdownOverlay.value, ()=>{
			Store.set("raffle_showCountdownOverlay", this.showCountdownOverlay.value)
		})

		this.loadingSubs = true;
		this.subs = await TwitchUtils.getSubsList();
		this.loadingSubs = false;
		this.wheelOverlayPresenceHandler = ()=> {
			this.wheelOverlayExists = true;
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, this.wheelOverlayPresenceHandler);
		PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, this.wheelOverlayPresenceHandler);
	}

	/**
	 * Close the form
	 */
	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	/**
	 * Create a chat raffle
	 */
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
		if(this.showCountdownOverlay.value) {
			store.dispatch("startCountdown", payload.duration * 1000 * 60);
		}
		store.dispatch("startRaffle", payload);
		this.close();
	}

	/**
	 * Picks a random user amongst our subs
	 */
	public async pickSub():Promise<void> {
		this.winner = null;
		let increment = {value:0};
		let prevRounded = increment.value;
		if(PublicAPI.instance.localConnexionAvailable) {
			this.loadingSubs = true;
			//Ask if the wheel overlay exists
			PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
			await Utils.promisedTimeout(500);//Give the overlay some time to answer
		}
		if(this.wheelOverlayExists){
			//A wheel overlay exists, ask it to animate
			const list:WheelItem[] = this.subsFiltered.map(v=>{return{
										id:v.user_id,
										label:v.user_name,
										data:v
									}});
			const data:{items:WheelItem[], winner:WheelItem} = {
				items: list,
				winner: Utils.pickRand(list),
			}
			PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_START, (data as unknown) as JsonObject);
			this.loadingSubs = false;
			
		}else{
			//No wheel overlay exist, create a pick animation here
			gsap.to(increment, {value:100, ease:"sine.out", duration:5, onUpdate:()=> {
				let rounded = Math.round(increment.value);
				if(rounded != prevRounded) {
					prevRounded = rounded;
					this.winnerTmp = Utils.pickRand(this.subsFiltered);
				}
			}, onComplete:()=>{
				//Animation complete
				this.winner = this.winnerTmp;
				this.winnerTmp = null;
				//Wait for result holder to be mounted
				this.$nextTick().then(()=> {
					//Animate result holder
					gsap.fromTo(this.$refs.winnerHolder as HTMLDivElement,
								{scaleX:1.25, scaleY:2},
								{duration:1, scale:1, ease:"elastic.out(1, 0.5)"});
					
					if(this.winner) {
						const winner:WheelItem = {
							id:this.winner.user_id,
							label:this.winner.user_name,
							data:this.winner,
						}
						store.dispatch("onRaffleComplete", {winner:winner});
					}
				})
			}})
		}
	}
	public openParam(page:ParamsContenType):void {
		store.state.tempStoreValue = "CONTENT:"+page;
		store.dispatch("showParams", true);
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
		.tabs {
			display: flex;
			flex-direction: row;
			justify-content: center;
			margin-bottom: 1em;

			.button {
				background-color: @mainColor_normal;
				&:not(.selected) {
					background-color: fade(@mainColor_normal, 50%);
				}

				&:not(:last-child) {
					margin-right: 1px;
				}

				&:first-child {
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
					transform-origin: right center;
				}

				&:last-child {
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
					transform-origin: left center;
				}
			}
		}

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

		.info {
			text-align: center;
			opacity: .8;
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

		.details {
			font-size: .8em;
			margin-left: 2em;
		}

		.configs {
			margin: 1em 0;
		}

		.chatParam {
			margin-top: .5em;
		}
	}
}
</style>