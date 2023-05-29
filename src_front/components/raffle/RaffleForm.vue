<template>
	<div :class="classes">
		<div class="head" v-if="triggerMode === false">
			<CloseButton :aria-label="$t('global.close')" @click="close()" />
			
			<h1 class="title"><Icon name="ticket" class="icon" />{{ $t("raffle.form_title") }}</h1>

			<div class="description">{{ $t("raffle.description") }}</div>
		</div>

		<TabMenu class="menu" v-model="mode"
			:values="['chat','sub','manual']"
			:labels="[$t('raffle.chat.title'), $t('raffle.subs.title'), $t('raffle.list.title')]"
			:icons="['commands', 'sub', 'list']" />
			
		<div class="content">
			<ToggleBlock class="legal tips" v-if="triggerMode === false && mode!='manual'" :icons="['info']" small :title="$t('raffle.legal.title')" :open="false">
				<p v-for="l in $tm('raffle.legal.contents')">{{l}}</p>
			</ToggleBlock>

			<VoiceGlobalCommandsHelper v-if="voiceControl !== false" class="voiceHelper" />

			<form class="form" v-if="mode=='chat'" @submit.prevent="submitForm()">
				<div class="info">{{ $t("raffle.chat.description") }}</div>
				<ParamItem class="duration" :paramData="command" :autofocus="true" @change="onValueChange()" />
				<div class="card-item">
					<ParamItem noBackground :paramData="reward" :autofocus="true" @change="onValueChange()" v-if="reward_value.listValues!.length > 1" />
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
				<ParamItem class="card-item" :paramData="enterDuration" @change="onValueChange()" />
				<ParamItem class="card-item" :paramData="multipleJoin" @change="onValueChange()" />
				<ParamItem class="card-item" :paramData="maxUsersToggle" @change="onValueChange()" />
				<ParamItem class="card-item" :paramData="ponderateVotes" @change="onValueChange()" />

				<Button type="submit" 
					v-if="triggerMode === false"
					:aria-label="$t('raffle.chat.startBt_aria')"
					icon="ticket">{{ $t('global.start') }}</Button>
			</form>
				
			<form class="form" v-else-if="mode=='sub' && canListSubs" @submit.prevent="submitForm()">
				<div class="info">{{ $t("raffle.subs.description") }}</div>
				<ParamItem class="item" :paramData="subs_includeGifters" @change="onValueChange()" />
				<ParamItem class="item" :paramData="subs_excludeGifted" @change="onValueChange()" />
				<div class="card-item winner" v-if="winner" ref="winnerHolder">
					<div class="head">Winner</div>
					<div class="user">🎉 {{winner}} 🎉</div>
				</div>
				<div class="card-item winner" v-if="winnerTmp">
					<div class="user">{{winnerTmp}}</div>
				</div>
				<Button type="submit"
				:aria-label="$t('raffle.subs.startBt_aria')"
				icon="sub"
				v-if="triggerMode === false"
				:loading="pickingEntry">
					<i18n-t scope="global" keypath="raffle.subs.startBt">
						<template #COUNT>
							<i class="small">({{ subsFiltered.length }} subs)</i>
						</template>
					</i18n-t>
				</Button>
			</form>
				
			<form class="card-item secondary form scope" v-else-if="mode=='sub' && !canListSubs" @submit.prevent="submitForm()">
				<img src="@/assets/icons/lock_fit.svg">
				<p class="label">{{ $t("params.scope_missing") }}</p>
				<Button alert small
					class="grantBt"
					icon="unlock"
					@click="requestSubPermission()">{{ $t('global.grant_scope') }}</Button>
			</form>

			<form class="form" v-else-if="mode=='manual'" @submit.prevent="submitForm()">
				<div class="info">{{ $t("raffle.list.description") }}</div>

				<div class="card-item">
					<ParamItem noBackground class="item" :paramData="customEntries" @change="onValueChange()" />
					<span class="instructions">{{ $t("raffle.list.instructions") }}</span>
				</div>

				<Button type="submit"
				v-if="triggerMode === false"
				:aria-label="$t('raffle.list.startBt_aria')"
				:disabled="customEntriesCount == 0"
				icon="list">
					<i18n-t scope="global" keypath="raffle.list.startBt">
						<template #COUNT>
							<i class="small">({{ customEntriesCount }})</i>
						</template>
					</i18n-t>	
				</Button>
			</form>

			<ToggleBlock class="configs" v-if="mode=='chat' && triggerMode === false" :title="$t('global.configs')" :open="false" small>
				<ParamItem class="card-item"
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

				<PostOnChatParam class="card-item" botMessageKey="raffleStart"
					v-if="mode=='chat' && triggerMode === false"
					:placeholders="startPlaceholders"
					titleKey="raffle.configs.postOnChat_start"
				/>
				<PostOnChatParam class="card-item" botMessageKey="raffle"
					v-if="triggerMode === false"
					:placeholders="winnerPlaceholders"
					titleKey="raffle.configs.postOnChat_winner"
				/>
				<PostOnChatParam class="card-item" botMessageKey="raffleJoin"
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
import { TriggerEventPlaceholders, type TriggerActionRaffleData, type TriggerData } from '@/types/TriggerActionDataTypes';
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
	
	@Prop({type: Boolean, default: false})
	public voiceControl!:boolean;

	@Prop({type: Boolean, default: false})
	public triggerMode!:boolean;

	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionRaffleData;

	@Prop
	public triggerData!:TriggerData;

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
	public multipleJoin:TwitchatDataTypes.ParameterData<boolean>			= {value:false, type:"boolean", labelKey:"raffle.params.multiple_join"};
	public ponderateVotes:TwitchatDataTypes.ParameterData<boolean>			= {value:false, type:"boolean", labelKey:"raffle.params.ponderate"};
	public ponderateVotes_vip:TwitchatDataTypes.ParameterData<number>		= {value:0, type:"number", min:0, max:100, icon:"vip", labelKey:"raffle.params.ponderate_VIP"};
	public ponderateVotes_sub:TwitchatDataTypes.ParameterData<number>		= {value:0, type:"number", min:0, max:100, icon:"sub", labelKey:"raffle.params.ponderate_sub"};
	public ponderateVotes_subT2:TwitchatDataTypes.ParameterData<number>		= {value:0, type:"number", min:0, max:100, icon:"sub", labelKey:"raffle.params.ponderate_subT2", twitch_scopes:[TwitchScopes.CHECK_SUBSCRIBER_STATE]};
	public ponderateVotes_subT3:TwitchatDataTypes.ParameterData<number>		= {value:0, type:"number", min:0, max:100, icon:"sub", labelKey:"raffle.params.ponderate_subT3", twitch_scopes:[TwitchScopes.CHECK_SUBSCRIBER_STATE]};
	public ponderateVotes_subgift:TwitchatDataTypes.ParameterData<number>	= {value:0, type:"number", min:0, max:100, icon:"gift", labelKey:"raffle.params.ponderate_subgifter"};
	public ponderateVotes_follower:TwitchatDataTypes.ParameterData<number>	= {value:0, type:"number", min:0, max:100, icon:"follow", labelKey:"raffle.params.ponderate_follower", twitch_scopes:[TwitchScopes.LIST_FOLLOWERS]};
	public subs_includeGifters:TwitchatDataTypes.ParameterData<boolean>		= {value:true, type:"boolean", icon:"gift", labelKey:"raffle.params.ponderate_include_gifter"};
	public subs_excludeGifted:TwitchatDataTypes.ParameterData<boolean>		= {value:true, type:"boolean", icon:"sub", labelKey:"raffle.params.ponderate_exclude_gifted"};
	public showCountdownOverlay:TwitchatDataTypes.ParameterData<boolean>	= {value:false, type:"boolean", icon:"countdown", labelKey:"raffle.configs.countdown"};
	public customEntries:TwitchatDataTypes.ParameterData<string>			= {value:"", type:"string", longText:true, maxLength:10000, placeholderKey:"raffle.params.list_placeholder"};

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
		const res = ["raffleform", "sidePanel"];
		if(this.triggerMode !== false) res.push("embedMode");
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
			multipleJoin:this.multipleJoin.value,
			created_at:Date.now(),
			entries:[],
			followRatio: this.ponderateVotes_follower.value,
			vipRatio: this.ponderateVotes_vip.value,
			subRatio: this.ponderateVotes_sub.value,
			subT2Ratio: this.ponderateVotes_subT2.value,
			subT3Ratio: this.ponderateVotes_subT3.value,
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

		if(this.triggerMode !== false) {
			if(this.action.raffleData) {
				this.mode = this.action.raffleData.mode;
				this.command.value = this.action.raffleData.command != undefined;
				this.enterDuration.value = this.action.raffleData.duration_s/60;
				this.maxEntries.value = this.action.raffleData.maxEntries ?? 0;
				this.maxUsersToggle.value = this.maxEntries.value > 0;
				this.multipleJoin.value = this.action.raffleData.multipleJoin === true;
				this.ponderateVotes_follower.value = this.action.raffleData.followRatio ?? 0;
				this.ponderateVotes_vip.value = this.action.raffleData.vipRatio ?? 0;
				this.ponderateVotes_sub.value = this.action.raffleData.subRatio ?? 0;
				this.ponderateVotes_subT2.value = this.action.raffleData.subT2Ratio ?? 0;
				this.ponderateVotes_subT3.value = this.action.raffleData.subT3Ratio ?? 0;
				this.ponderateVotes_subgift.value = this.action.raffleData.subgiftRatio ?? 0;
				this.subs_includeGifters.value = this.action.raffleData.subMode_includeGifters ?? false;
				this.subs_excludeGifted.value = this.action.raffleData.subMode_excludeGifted ?? false;
				this.showCountdownOverlay.value = this.action.raffleData.showCountdownOverlay;
				this.customEntries.value = this.action.raffleData.customEntries;
			}

			this.customEntries.placeholderList = TriggerEventPlaceholders(this.triggerData.type);
		}else{
			this.showCountdownOverlay.value = DataStore.get(DataStore.RAFFLE_OVERLAY_COUNTDOWN) === "true";
		}

		this.maxUsersToggle.children = [this.maxEntries];
		this.ponderateVotes.children = [
											this.ponderateVotes_vip,
											this.ponderateVotes_follower,
											this.ponderateVotes_sub,
											this.ponderateVotes_subT2,
											this.ponderateVotes_subT3,
											this.ponderateVotes_subgift
										];
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

	.legal {
		margin: 0 auto;
		width: 100%;
		max-width: 600px;
	}

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
				color: var(--color-light);
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
					color: var(--color-alert);
				}
				.grantBt {
					margin: auto;
				}
			}

			.instructions {
				display: block;
				font-size: .9em;
				font-style: italic;
				text-align: center;
			}
		}
	}
}
</style>