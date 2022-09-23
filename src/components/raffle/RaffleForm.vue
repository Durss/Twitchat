<template>
	<div :class="classes">
		<div class="dimmer" ref="dimmer" @click="close()" v-if="triggerMode === false"></div>
		<div class="holder" ref="holder">
			<div class="head" v-if="triggerMode === false">
				<span class="title">Create Raffle</span>
				<Button aria-label="Close raffle form" :icon="$image('icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<VoiceGlobalCommandsHelper v-if="voiceControl" class="voiceHelper" />
				
				<div class="description" v-if="triggerMode === false">
					<ToggleBlock :icons="['infos']" small title="Legal concerns" :open="false" class="legal">
						<div>Depending on your country's legislation, making your viewers win something while using the "sub" ponderation option or randomly picking a winner amongst your subs might be illegal.</div>
						<div>You may want to check this out before doing a giveaway.</div>
					</ToggleBlock>
				</div>
				
				<div class="tabs">
					<Button title="Chat" bounce :selected="mode=='chat'" @click="mode='chat'" :icon="$image('icons/commands.svg')" />
					<Button title="Subs" bounce :selected="mode=='sub'" @click="mode='sub'" :icon="$image('icons/sub.svg')" />
					<Button title="List" bounce :selected="mode=='manual'" @click="mode='manual'" :icon="$image('icons/list.svg')" />
				</div>

				<form @submit.prevent="submitForm()" class="form" v-if="mode=='chat'">
					<div class="info">
						<p>Randomly pick someone amongst users that sent a chat command</p>
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="command" :autofocus="true" @change="onValueChange()" />
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="enterDuration" @change="onValueChange()" />
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="maxUsersToggle" @change="onValueChange()" />
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="ponderateVotes" @change="onValueChange()" />
					</div>

					<div class="row" v-if="triggerMode === false">
						<Button aria-label="Start raffle" type="submit" title="Start" :icon="$image('icons/ticket.svg')" />
					</div>
				</form>
					
				<form @submit.prevent="submitForm()" class="form" v-else-if="mode=='sub'">
					<div class="info">
						<p>Randomly pick someone amongst all your current subscribers</p>
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="subs_includeGifters" @change="onValueChange()" />
					</div>
					<div class="row">
						<ParamItem class="item" :paramData="subs_excludeGifted" @change="onValueChange()" />
					</div>
					<div class="row winner" v-if="winner" ref="winnerHolder">
						<div class="head">Winner</div>
						<div class="user">🎉 {{winner.user_name}} 🎉</div>
					</div>
					<div class="row winner" v-if="winnerTmp">
						<div class="user">{{winnerTmp.user_name}}</div>
					</div>
					<div class="row" v-if="triggerMode === false">
						<Button type="submit"
							aria-label="pick a sub"
							:title="'Pick a sub <i>('+subsFiltered.length+')</i>'"
							:icon="$image('icons/sub.svg')"
							:loading="pickingEntry"
						/>
					</div>
				</form>

				<form @submit.prevent="submitForm()" class="form" v-else-if="mode=='manual'">
					<div class="info">
						<p>Set a custom list of entries and randomly pick one</p>
					</div>

					<div class="row">
						<ParamItem class="item" :paramData="customEntries" @change="onValueChange()" />
					</div>

					<div class="row" v-if="triggerMode === false">
						<Button aria-label="Pick an item" type="submit" :title="'Pick an item ('+finalData.customEntries.length+')'" :icon="$image('icons/list.svg')" />
					</div>
				</form>

				<ToggleBlock title="Configs" class="configs" :open="false" small v-if="mode=='chat' || triggerMode === false">
					<ParamItem class="chatParam" :paramData="showCountdownOverlay" v-if="mode=='chat'" />
					<div class="details" v-if="showCountdownOverlay.value === true && mode=='chat'">
						<a @click="openParam('overlays')">Configure a timer overlay</a>
						on your OBS to display the remaining time on your stream
					</div>
	
					<PostOnChatParam class="chatParam" botMessageKey="raffleStart"
						v-if="mode=='chat' && triggerMode === false"
						:placeholders="startPlaceholders"
						title="Announce raffle start on chat"
					/>
					<PostOnChatParam class="chatParam" botMessageKey="raffle"
						v-if="triggerMode === false"
						:placeholders="winnerPlaceholders"
						title="Post raffle winner on chat"
					/>
					<PostOnChatParam class="chatParam" botMessageKey="raffleJoin"
						v-if="mode=='chat' && triggerMode === false"
						:placeholders="joinPlaceholders"
						title="Confirm when joining the raffle"
					/>
				</ToggleBlock>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import type { RaffleData } from '@/utils/CommonDataTypes';
import TwitchUtils from '@/utils/TwitchUtils';
import UserSession from '@/utils/UserSession';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import ToggleBlock from '../ToggleBlock.vue';
import FormVoiceControllHelper from '../voice/FormVoiceControllHelper';
import VoiceGlobalCommandsHelper from '../voice/VoiceGlobalCommandsHelper.vue';

@Options({
	props:{
		action: {
			type: Object,
			default:{},
		},
		voiceControl: {
			type: Boolean,
			default: false
		},
		triggerMode: {
			type: Boolean,
			default: false
		}
	},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PostOnChatParam,
		VoiceGlobalCommandsHelper,
	}
})
export default class RaffleForm extends Vue {

	public voiceControl!:boolean;
	public triggerMode!:boolean;
	//This is used by the trigger action form.
	public action!:TwitchatDataTypes.TriggerActionRaffleData;

	public pickingEntry = false;
	public winner:TwitchDataTypes.Subscriber|null = null;
	public winnerTmp:TwitchDataTypes.Subscriber|null = null;

	public mode:"chat"|"sub"|"manual" = "chat";

	public command:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Command", placeholder:"!raffle"};
	public enterDuration:TwitchatDataTypes.ParameterData = {label:"Raffle duration (minutes)", value:10, type:"number", min:1, max:30};
	public maxUsersToggle:TwitchatDataTypes.ParameterData = {label:"Limit users count", value:false, type:"toggle"};
	public maxEntries:TwitchatDataTypes.ParameterData = {label:"Max users count", value:10, type:"number", min:0, max:1000000};
	public ponderateVotes:TwitchatDataTypes.ParameterData = {label:"Ponderate votes (additional points given for every matching criteria)", value:false, type:"toggle"};
	public ponderateVotes_vip:TwitchatDataTypes.ParameterData = {label:"VIP", value:0, type:"number", min:0, max:100, icon:"vip_purple.svg"};
	public ponderateVotes_sub:TwitchatDataTypes.ParameterData = {label:"Subscriber", value:0, type:"number", min:0, max:100, icon:"sub_purple.svg"};
	public ponderateVotes_subgift:TwitchatDataTypes.ParameterData = {label:"Sub gifter", value:0, type:"number", min:0, max:100, icon:"gift_purple.svg"};
	public ponderateVotes_follower:TwitchatDataTypes.ParameterData = {label:"Follower", value:0, type:"number", min:0, max:100, icon:"follow_purple.svg"};
	public subs_includeGifters:TwitchatDataTypes.ParameterData = {label:"Include sub gifters (user not sub but that subgifted someone else)", value:true, type:"toggle", icon:"gift_purple.svg"};
	public subs_excludeGifted:TwitchatDataTypes.ParameterData = {label:"Excluded sub gifted users (user that only got subgifted)", value:true, type:"toggle", icon:"sub_purple.svg"};
	public showCountdownOverlay:TwitchatDataTypes.ParameterData = {label:"Show overlay countdown", value:false, type:"toggle", icon:"countdown_purple.svg"};
	public customEntries:TwitchatDataTypes.ParameterData = {label:"(Seperate entries with a coma or a line break)", value:"", type:"text", placeholder:"entry 1, entry 2, entry 3, ...", longText:true};

	public startPlaceholders:TwitchatDataTypes.PlaceholderEntry[] = [{tag:"CMD", desc:"Command users have to send"}];
	public winnerPlaceholders:TwitchatDataTypes.PlaceholderEntry[] = [{tag:"USER", desc:"User name"}];
	public joinPlaceholders:TwitchatDataTypes.PlaceholderEntry[] = [{tag:"USER", desc:"User name"}];
	
	private subs:TwitchDataTypes.Subscriber[] = [];
	private voiceController!:FormVoiceControllHelper;

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

	public get classes():string[] {
		const res = ["raffleform"];
		if(this.triggerMode !== false) res.push("triggerMode");
		return res;
	}

	public get finalData():RaffleData {
		const cmd = this.command.value? this.command.value as string : "!raffle";

		return  {
			mode:this.mode,
			command:cmd,
			duration:this.enterDuration.value as number,
			maxEntries:this.maxUsersToggle.value ? this.maxEntries.value as number : 0,
			created_at:new Date().getTime(),
			entries:[],
			followRatio: this.ponderateVotes_follower.value as number,
			vipRatio: this.ponderateVotes_vip.value as number,
			subRatio: this.ponderateVotes_sub.value as number,
			subgitRatio: this.ponderateVotes_subgift.value as number,
			subMode_includeGifters: this.subs_includeGifters.value as boolean,
			subMode_excludeGifted: this.subs_excludeGifted.value as boolean,
			showCountdownOverlay: this.showCountdownOverlay.value as boolean,
			customEntries: this.customEntries.value as string,
		}
	}

	public async mounted():Promise<void> {
		watch(()=>this.voiceControl, ()=>{
			if(this.voiceControl && !this.voiceController) {
				this.voiceController = new FormVoiceControllHelper(this.$el, this.close, this.submitForm);
			}
		});

		if(this.triggerMode && this.action.raffleData) {
			this.mode = this.action.raffleData.mode;
			this.command.value = this.action.raffleData.command
			this.enterDuration.value = this.action.raffleData.duration;
			this.maxEntries.value = this.action.raffleData.maxEntries
			this.maxUsersToggle.value = this.maxEntries.value > 0;
			this.ponderateVotes_follower.value = this.action.raffleData.followRatio;
			this.ponderateVotes_vip.value = this.action.raffleData.vipRatio;
			this.ponderateVotes_sub.value = this.action.raffleData.subRatio;
			this.ponderateVotes_subgift.value = this.action.raffleData.subgitRatio;
			this.subs_includeGifters.value = this.action.raffleData.subMode_includeGifters;
			this.subs_excludeGifted.value = this.action.raffleData.subMode_excludeGifted;
			this.showCountdownOverlay.value = this.action.raffleData.showCountdownOverlay;
			this.customEntries.value = this.action.raffleData.customEntries;
		}
		
		this.showCountdownOverlay.value = DataStore.get(DataStore.RAFFLE_OVERLAY_COUNTDOWN) === "true";
		this.maxUsersToggle.children = [this.maxEntries];
		this.ponderateVotes.children = [this.ponderateVotes_vip, this.ponderateVotes_follower, this.ponderateVotes_sub, this.ponderateVotes_subgift];

		if(!this.triggerMode) {
			gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
			gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
			gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
		}
		
		watch(()=>this.showCountdownOverlay.value, ()=>{
			DataStore.set(DataStore.RAFFLE_OVERLAY_COUNTDOWN, this.showCountdownOverlay.value)
		})
		
		watch(()=>this.mode, ()=> this.onValueChange());

		this.pickingEntry = true;
		this.subs = await TwitchUtils.getSubsList();
		this.pickingEntry = false;
		// this.onValueChange();
	}

	public beforeUnmount():void {
		if(this.voiceController) this.voiceController.dispose();
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
	public async submitForm():Promise<void> {
		const payload:RaffleData = this.finalData;
		StoreProxy.raffle.startRaffle(payload);
		if(this.mode == "chat") {
			this.close();
		}else{
			this.pickingEntry = true;
			await Utils.promisedTimeout(500);
			this.pickingEntry = false;
		}
	}
	
	public openParam(page:TwitchatDataTypes.ParamsContentStringType):void {
		StoreProxy.main.tempStoreValue = "CONTENT:"+page;
		StoreProxy.main.setShowParams(true);
	}

	public onValueChange():void {
		if(this.action) {
			this.action.raffleData = this.finalData;
		}
	}
	
}
</script>

<style scoped lang="less">
.raffleform{

	&:not(.triggerMode) {
		.modal();
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.content {

		.voiceHelper {
			margin: auto;
		}

		.tabs {
			display: flex;
			flex-direction: row;
			justify-content: center;
			margin-bottom: 1em;

			.button {
				background-color: @mainColor_normal;
				border-radius: 0;
				&:not(.selected) {
					background-color: fade(@mainColor_normal, 50%);
				}

				&:not(:last-child) {
					margin-right: 1px;
				}

				&:first-child {
					border-top-left-radius: .5em;
					border-bottom-left-radius: .5em;
					transform-origin: right center;
				}

				&:last-child {
					border-top-right-radius: .5em;
					border-bottom-right-radius: .5em;
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