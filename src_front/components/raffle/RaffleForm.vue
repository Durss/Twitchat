<template>
	<div :class="classes">
		<div class="head" v-if="triggerMode === false">
			<CloseButton :aria-label="$t('global.close')" @click="close()" />
			
			<h1 class="title">{{ $t("raffle.form_title") }}</h1>

			<div class="description">{{ $t("raffle.description") }}</div>
			
			<TabMenu v-model="mode"
				:values="['chat','sub','manual']"
				:labels="[$t('raffle.chat.title'), $t('raffle.subs.title'), $t('raffle.list.title')]"
				:icons="['commands', 'sub', 'list']" />
			
			<ToggleBlock v-if="triggerMode === false && mode!='manual'" :icons="['info']" small :title="$t('raffle.legal.title')" :open="false" class="legal">
				<p v-for="l in $tm('raffle.legal.contents')">{{l}}</p>
			</ToggleBlock>
		</div>

		<div class="content">
			<VoiceGlobalCommandsHelper v-if="voiceControl !== false" class="voiceHelper" />

			<form class="form" v-if="mode=='chat'" @submit.prevent="submitForm()">
				<div class="info">{{ $t("raffle.chat.description") }}</div>
				<div class="row">
					<ParamItem class="duration" :paramData="command" :autofocus="true" @change="onValueChange()" />
				</div>
				<div class="row">
					<ParamItem :paramData="reward" :autofocus="true" @change="onValueChange()" v-if="reward_value.listValues!.length > 1" />
					<div class="tips">
						<img src="@/assets/icons/info.svg">
	
						<i18n-t scope="global" tag="span" keypath="raffle.chat.triggers">
							<template #LINK>
								<a @click="openParam('triggers')">{{ $t("raffle.chat.triggers_link") }}</a>
							</template>
							<template #ACTION>
								<strong>{{ $t("triggers.actions.common.action_raffle_enter") }}</strong>
							</template>
						</i18n-t>
					</div>
				</div>
				<ParamItem class="row shrink" :paramData="enterDuration" @change="onValueChange()" />
				<ParamItem class="row" :paramData="maxUsersToggle" @change="onValueChange()" />
				<ParamItem class="row" :paramData="ponderateVotes" @change="onValueChange()" />

				<Button type="submit" 
					:aria-label="$t('raffle.chat.startBt_aria')"
					icon="ticket">{{ $t('global.start') }}</Button>
			</form>
				
			<form class="form" v-else-if="mode=='sub' && canListSubs" @submit.prevent="submitForm()">
				<div class="info">{{ $t("raffle.subs.description") }}</div>
				<div class="row">
					<ParamItem class="item" :paramData="subs_includeGifters" @change="onValueChange()" />
				</div>
				<div class="row">
					<ParamItem class="item" :paramData="subs_excludeGifted" @change="onValueChange()" />
				</div>
				<div class="row winner" v-if="winner" ref="winnerHolder">
					<div class="head">Winner</div>
					<div class="user">🎉 {{winner}} 🎉</div>
				</div>
				<div class="row winner" v-if="winnerTmp">
					<div class="user">{{winnerTmp}}</div>
				</div>
				<div class="row" v-if="triggerMode === false">
					<Button type="submit"
					:aria-label="$t('raffle.subs.startBt_aria')"
					icon="sub"
					:loading="pickingEntry">
						<i18n-t scope="global" keypath="raffle.subs.startBt">
							<template #COUNT>
								<i class="small">({{ subsFiltered.length }} subs)</i>
							</template>
						</i18n-t>
					</Button>
				</div>
			</form>
				
			<form class="form scope" v-else-if="mode=='sub' && !canListSubs" @submit.prevent="submitForm()">
				<img src="@/assets/icons/lock_fit.svg">
				<p class="label">{{ $t("params.scope_missing") }}</p>
				<Button small highlight
					class="grantBt"
					icon="unlock"
					@click="requestSubPermission()">{{ $t('global.grant_scope') }}</Button>
			</form>

			<form class="form" v-else-if="mode=='manual'" @submit.prevent="submitForm()">
				<div class="info">{{ $t("raffle.list.description") }}</div>

				<div class="row">
					<ParamItem class="item" :paramData="customEntries" @change="onValueChange()" />
					<i>{{ $t("raffle.list.instructions") }}</i>
				</div>

				<div class="row" v-if="triggerMode === false">
					<Button type="submit"
					:aria-label="$t('raffle.list.startBt_aria')"
					icon="list">
						<i18n-t scope="global" keypath="raffle.list.startBt">
							<template #COUNT>
								<i class="small">({{ customEntriesCount }})</i>
							</template>
						</i18n-t>	
					</Button>
				</div>
			</form>

			<ToggleBlock class="configs" v-if="mode=='chat' || triggerMode === false" :title="$t('global.configs')" :open="false" small>
				<ParamItem class="row"
				:paramData="showCountdownOverlay"
				v-if="mode=='chat'" @change="onValueChange()">
					<i18n-t scope="global" tag="div" class="details"
					v-if="showCountdownOverlay.value === true && mode=='chat'"
					keypath="raffle.configs.timer_overlay_add">
						<template #LINK>
							<a @click="openParam('overlays')">{{ $t("raffle.configs.timer_overlay_add_link") }}</a>
						</template>
					</i18n-t>
				</ParamItem>

				<PostOnChatParam class="row" botMessageKey="raffleStart"
					v-if="mode=='chat' && triggerMode === false"
					:placeholders="startPlaceholders"
					titleKey="raffle.configs.postOnChat_start"
				/>
				<PostOnChatParam class="row" botMessageKey="raffle"
					v-if="triggerMode === false"
					:placeholders="winnerPlaceholders"
					titleKey="raffle.configs.postOnChat_winner"
				/>
				<PostOnChatParam class="row" botMessageKey="raffleJoin"
					v-if="mode=='chat' && triggerMode === false"
					:placeholders="joinPlaceholders"
					titleKey="raffle.configs.postOnChat_join"
				/>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import type { TriggerActionRaffleData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import TabMenu from '../TabMenu.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import FormVoiceControllHelper from '../voice/FormVoiceControllHelper';
import VoiceGlobalCommandsHelper from '../voice/VoiceGlobalCommandsHelper.vue';

@Component({
	components:{
		Button,
		TabMenu,
		ParamItem,
		ToggleBlock,
		CloseButton,
		PostOnChatParam,
		VoiceGlobalCommandsHelper,
	},
	emits:["close"]
})
export default class RaffleForm extends AbstractSidePanel {
	
	@Prop({
			type: Boolean,
			default: false
		})
	public voiceControl!:boolean;
	@Prop({
			type: Boolean,
			default: false
		})
	public triggerMode!:boolean;
	//This is used by the trigger action form.
	@Prop({
			type: Object,
			default:{},
		})
	public action!:TriggerActionRaffleData;

	public pickingEntry = false;
	public winner:string|null = null;
	public winnerTmp:string|null = null;

	public mode:"chat"|"sub"|"manual" = "chat";
		
	public command:TwitchatDataTypes.ParameterData<boolean>					= {value:true, type:"boolean", labelKey:"raffle.params.command_join"};
	public command_value:TwitchatDataTypes.ParameterData<string>			= {value:"", type:"string", labelKey:"raffle.params.command", placeholderKey:"raffle.params.command_placeholder"};
	public reward:TwitchatDataTypes.ParameterData<boolean>					= {value:false, type:"boolean", labelKey:"raffle.params.reward_join"};
	public reward_value:TwitchatDataTypes.ParameterData<string>				= {value:"", type:"list", listValues:[], labelKey:"raffle.params.reward", placeholderKey:"raffle.params.command_placeholder"};
	public enterDuration:TwitchatDataTypes.ParameterData<number>			= {value:10, type:"number", min:1, max:1440, labelKey:"raffle.params.duration"};
	public maxUsersToggle:TwitchatDataTypes.ParameterData<boolean>			= {value:false, type:"boolean", labelKey:"raffle.params.limit_users"};
	public maxEntries:TwitchatDataTypes.ParameterData<number>				= {value:10, type:"number", min:0, max:1000000, labelKey:"raffle.params.max_users"};
	public ponderateVotes:TwitchatDataTypes.ParameterData<boolean>			= {value:false, type:"boolean", labelKey:"raffle.params.ponderate"};
	public ponderateVotes_vip:TwitchatDataTypes.ParameterData<number>		= {value:0, type:"number", min:0, max:100, icon:"vip.svg", labelKey:"raffle.params.ponderate_VIP"};
	public ponderateVotes_sub:TwitchatDataTypes.ParameterData<number>		= {value:0, type:"number", min:0, max:100, icon:"sub.svg", labelKey:"raffle.params.ponderate_sub"};
	public ponderateVotes_subgift:TwitchatDataTypes.ParameterData<number>	= {value:0, type:"number", min:0, max:100, icon:"gift.svg", labelKey:"raffle.params.ponderate_subgifter"};
	public ponderateVotes_follower:TwitchatDataTypes.ParameterData<number>	= {value:0, type:"number", min:0, max:100, icon:"follow.svg", labelKey:"raffle.params.ponderate_follower"};
	public subs_includeGifters:TwitchatDataTypes.ParameterData<boolean>		= {value:true, type:"boolean", icon:"gift.svg", labelKey:"raffle.params.ponderate_include_gifter"};
	public subs_excludeGifted:TwitchatDataTypes.ParameterData<boolean>		= {value:true, type:"boolean", icon:"sub.svg", labelKey:"raffle.params.ponderate_exclude_gifted"};
	public showCountdownOverlay:TwitchatDataTypes.ParameterData<boolean>	= {value:false, type:"boolean", icon:"countdown.svg", labelKey:"raffle.configs.countdown"};
	public customEntries:TwitchatDataTypes.ParameterData<string>			= {value:"", type:"string", longText:true, maxLength:1000000, placeholderKey:"raffle.params.list_placeholder"};

	public winnerPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	public joinPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	
	private subs:TwitchDataTypes.Subscriber[] = [];
	private voiceController!:FormVoiceControllHelper;

	public get hasRewards():boolean { return TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS]) && this.reward_value.listValues!.length > -1; }
	public get isAffiliate():boolean { return this.$store("auth").twitch.user.is_affiliate || this.$store("auth").twitch.user.is_partner; }

	/**
	 * Gets subs filtered by the current filters
	 */
	public get subsFiltered():TwitchDataTypes.Subscriber[] {
		return this.subs.filter(v => {
			if(this.subs_includeGifters.value == true && this.subs.find(v2=> v2.gifter_id == v.user_id)) return true;
			if(this.subs_excludeGifted.value == true && v.is_gift) return false;
			if(v.user_id == StoreProxy.auth.twitch.user.id) return false;
			return true;
		})
	}

	public get classes():string[] {
		const res = ["raffleform"];
		if(this.triggerMode === false) res.push("sidePanel");
		return res;
	}

	public get customEntriesCount():number {
		const splitter = this.customEntries.value.split(/\r|\n/).length > 1? "\r|\n" : ",";
		const list = this.customEntries.value.split(new RegExp(splitter, ""))
					.filter((v)=>v.length > 0)
		return list.length;
	}

	public get finalData():TwitchatDataTypes.RaffleData {
		let cmd = "";
		if(this.command.value === true) {
			cmd = this.command_value.value? this.command_value.value : this.$t("raffle.params.command_placeholder");
		}

		return  {
			mode:this.mode,
			command:cmd,
			reward_id:this.reward_value.value,
			duration_s:this.enterDuration.value * 60,
			maxEntries:this.maxUsersToggle.value ? this.maxEntries.value : 0,
			created_at:Date.now(),
			entries:[],
			followRatio: this.ponderateVotes_follower.value,
			vipRatio: this.ponderateVotes_vip.value,
			subRatio: this.ponderateVotes_sub.value,
			subgiftRatio: this.ponderateVotes_subgift.value,
			subMode_includeGifters: this.subs_includeGifters.value,
			subMode_excludeGifted: this.subs_excludeGifted.value,
			showCountdownOverlay: this.showCountdownOverlay.value,
			customEntries: this.customEntries.value,
		}
	}

	public get startPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		return [{tag:"CMD", descKey:"raffle.configs.message_cmd_placeholder", example:this.finalData.command}];
	}

	public get canListSubs():boolean { return TwitchUtils.hasScopes([TwitchScopes.LIST_SUBSCRIBERS]); }

	public beforeMount(): void {
		this.winnerPlaceholders		= [{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store("auth").twitch.user.displayName}];
		this.joinPlaceholders		= [{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store("auth").twitch.user.displayName}];
		this.command.children		= [this.command_value];
		this.reward.children		= [this.reward_value];

		this.reward_value.listValues = [{value:undefined, labelKey:"global.select_placeholder"}]

		if(this.isAffiliate) {
			TwitchUtils.getRewards().then(list => {
				list.sort((a,b)=> {
					if(a.title > b.title) return 1;
					if(a.title < b.title) return -1;
					return 0
				}).forEach(v=> {
					this.reward_value.listValues!.push({value:v.id, label:v.title});
				});
			});
		}

		if(this.triggerMode && this.action.raffleData) {
			this.mode = this.action.raffleData.mode;
			this.command.value = this.action.raffleData.command != undefined;
			this.enterDuration.value = this.action.raffleData.duration_s/60;
			this.maxEntries.value = this.action.raffleData.maxEntries ?? 0;
			this.maxUsersToggle.value = this.maxEntries.value > 0;
			this.ponderateVotes_follower.value = this.action.raffleData.followRatio ?? 0;
			this.ponderateVotes_vip.value = this.action.raffleData.vipRatio ?? 0;
			this.ponderateVotes_sub.value = this.action.raffleData.subRatio ?? 0;
			this.ponderateVotes_subgift.value = this.action.raffleData.subgiftRatio ?? 0;
			this.subs_includeGifters.value = this.action.raffleData.subMode_includeGifters ?? false;
			this.subs_excludeGifted.value = this.action.raffleData.subMode_excludeGifted ?? false;
			this.showCountdownOverlay.value = this.action.raffleData.showCountdownOverlay;
			this.customEntries.value = this.action.raffleData.customEntries;
		}else{
			this.showCountdownOverlay.value = DataStore.get(DataStore.RAFFLE_OVERLAY_COUNTDOWN) === "true";
		}

		this.maxUsersToggle.children = [this.maxEntries];
		this.ponderateVotes.children = [this.ponderateVotes_vip, this.ponderateVotes_follower, this.ponderateVotes_sub, this.ponderateVotes_subgift];
	}

	public async mounted():Promise<void> {

		if(!this.triggerMode) {
			this.open();
		}

		watch(()=>this.voiceControl, ()=>{
			if(this.voiceControl && !this.voiceController) {
				this.voiceController = new FormVoiceControllHelper(this.$el, this.close, this.submitForm);
			}
		});

		watch(()=>this.showCountdownOverlay.value, ()=>{
			if(this.triggerMode) return;
			
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
	 * Create a chat raffle
	 */
	public async submitForm():Promise<void> {
		const payload:TwitchatDataTypes.RaffleData = this.finalData;
		if(this.mode == "sub") {
			let subs = Utils.shuffle(await TwitchUtils.getSubsList());
			let interval = setInterval(()=> {
				this.winnerTmp = Utils.pickRand(subs).user_name;
			}, 70)
			this.winner = null;
			this.pickingEntry = true;
			await Utils.promisedTimeout(2000);
			payload.resultCallback = ()=> {
				clearInterval(interval);

				if(payload.winners
				&& payload.winners.length > 0) {
					this.winnerTmp = null;
					this.winner = payload.winners[payload.winners.length-1].label;
				}
			}
		}

		this.$store("raffle").startRaffle(payload);
		if(this.mode == "chat") {
			this.close();
		}else{
			this.pickingEntry = true;
			await Utils.promisedTimeout(500);
			this.pickingEntry = false;
		}
	}
	
	public openParam(page:TwitchatDataTypes.ParameterPagesStringType):void {
		if(this.triggerMode) {
			this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS);
		}else{
			this.$store("params").openParamsPage(page);
		}
	}

	public onValueChange():void {
		if(this.action) {
			this.action.raffleData = this.finalData;
		}
	}

	public requestSubPermission():void {
		this.$store("auth").requestTwitchScopes([TwitchScopes.LIST_SUBSCRIBERS]);
	}
	
}
</script>

<style scoped lang="less">
.raffleform{

	.content {
		.voiceHelper {
			margin: auto;
		}

		.form {

			.small {
				font-size: .8em;
			}

			.winner {
				font-weight: bold;
				gap: 0;
					color: var(--mainColor_light);
				background-color: var(--color-secondary);
				.head {
					font-size: 1.25em;
					padding: .25em;
					text-align: center;
				}
				.user {
					padding: .5em;
					text-align: center;
				}
			}

			&.scope {
				display: block;
				border-radius: .25em;
				margin: .25em auto;
				background-color: var(--mainColor_light);
				border: 1px solid var(--mainColor_alert);
				padding: .25em .5em;
				// margin-left: calc(@iconSize + 10px);
				text-align: center;
				p {
					font-size: .8em;
				}
				img {
					height: .8em;
					margin-right: .25em;
					vertical-align: middle;
				}
				a{
					color: var(--mainColor_alert);
				}
				.grantBt {
					margin: .5em auto;
					display: block;
				}
			}
		}
	}
}
</style>