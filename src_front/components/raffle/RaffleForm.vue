<template>
	<div :class="classes">
		<div class="holder" ref="holder">
			<div class="head" v-if="triggerMode === false">
				<span class="title">{{ $t("raffle.form_title") }}</span>
				<Button :aria-label="$t('raffle.closeBt_aria')" :icon="$image('icons/cross.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<VoiceGlobalCommandsHelper v-if="voiceControl" class="voiceHelper" />
				
				<div class="description" v-if="triggerMode === false">
					<ToggleBlock :icons="['infos_red']" small :title="$t('raffle.legal.title')" :open="false" class="legal">
						<p v-for="l in $tm('raffle.legal.contents')">{{l}}</p>
					</ToggleBlock>
				</div>
				
				<div class="tabs">
					<Button :title="$t('raffle.chat.title')" bounce :selected="mode=='chat'" @click="mode='chat'" :icon="$image('icons/commands.svg')" />
					<Button :title="$t('raffle.subs.title')" bounce :selected="mode=='sub'" @click="mode='sub'" :icon="$image('icons/sub.svg')" />
					<Button :title="$t('raffle.list.title')" bounce :selected="mode=='manual'" @click="mode='manual'" :icon="$image('icons/list.svg')" />
				</div>

				<form @submit.prevent="submitForm()" class="form" v-if="mode=='chat'">
					<div class="info">{{ $t("raffle.chat.description") }}</div>
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
						<Button type="submit" 
						:aria-label="$t('raffle.chat.startBt_aria')"
						:title="$t('global.start')"
						:icon="$image('icons/ticket.svg')" />
					</div>
				</form>
					
				<form @submit.prevent="submitForm()" class="form" v-else-if="mode=='sub'">
					<div class="info">{{ $t("raffle.subs.description") }}</div>
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
							:aria-label="$t('raffle.subs.startBt_aria')"
							:title="$t('raffle.subs.startBt', {COUNT:subsFiltered.length})"
							:icon="$image('icons/sub.svg')"
							:loading="pickingEntry"
						/>
					</div>
				</form>

				<form @submit.prevent="submitForm()" class="form" v-else-if="mode=='manual'">
					<div class="info">{{ $t("raffle.list.description") }}</div>

					<div class="row">
						<ParamItem class="item" :paramData="customEntries" @change="onValueChange()" />
						<i>{{ $t("raffle.list.instructions") }}</i>
					</div>

					<div class="row" v-if="triggerMode === false">
						<Button type="submit"
						:aria-label="$t('raffle.list.startBt_aria')"
						:title="$t('raffle.list.startBt', {COUNT:customEntriesCount})"
						:icon="$image('icons/list.svg')" />
					</div>
				</form>

				<ToggleBlock :title="$t('global.configs')" class="configs" :open="false" small v-if="mode=='chat' || triggerMode === false">
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
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import type { TriggerActionRaffleData } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
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
	public action!:TriggerActionRaffleData;

	public pickingEntry = false;
	public winner:TwitchDataTypes.Subscriber|null = null;
	public winnerTmp:TwitchDataTypes.Subscriber|null = null;

	public mode:"chat"|"sub"|"manual" = "chat";

	public command:TwitchatDataTypes.ParameterData					= {value:"", type:"text"};
	public enterDuration:TwitchatDataTypes.ParameterData			= {value:10, type:"number", min:1, max:1440};
	public maxUsersToggle:TwitchatDataTypes.ParameterData			= {value:false, type:"toggle"};
	public maxEntries:TwitchatDataTypes.ParameterData				= {value:10, type:"number", min:0, max:1000000};
	public ponderateVotes:TwitchatDataTypes.ParameterData			= {value:false, type:"toggle"};
	public ponderateVotes_vip:TwitchatDataTypes.ParameterData		= {value:0, type:"number", min:0, max:100, icon:"vip_purple.svg"};
	public ponderateVotes_sub:TwitchatDataTypes.ParameterData		= {value:0, type:"number", min:0, max:100, icon:"sub_purple.svg"};
	public ponderateVotes_subgift:TwitchatDataTypes.ParameterData	= {value:0, type:"number", min:0, max:100, icon:"gift_purple.svg"};
	public ponderateVotes_follower:TwitchatDataTypes.ParameterData	= {value:0, type:"number", min:0, max:100, icon:"follow_purple.svg"};
	public subs_includeGifters:TwitchatDataTypes.ParameterData		= {value:true, type:"toggle", icon:"gift_purple.svg"};
	public subs_excludeGifted:TwitchatDataTypes.ParameterData		= {value:true, type:"toggle", icon:"sub_purple.svg"};
	public showCountdownOverlay:TwitchatDataTypes.ParameterData		= {value:false, type:"toggle", icon:"countdown_purple.svg"};
	public customEntries:TwitchatDataTypes.ParameterData			= {value:"", type:"text", longText:true, maxLength:1000000};

	public winnerPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	public joinPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	
	private subs:TwitchDataTypes.Subscriber[] = [];
	private voiceController!:FormVoiceControllHelper;

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
		if(this.triggerMode !== false) res.push("triggerMode");
		return res;
	}

	public get customEntriesCount():number {
		const splitter = (this.customEntries.value as string).split(/\r|\n/).length > 1? "\r|\n" : ",";
		const list = (this.customEntries.value as string).split(new RegExp(splitter, ""));
		return list.length;
	}

	public get finalData():TwitchatDataTypes.RaffleData {
		const cmd = this.command.value? this.command.value as string : this.$t("raffle.params.command_placeholder");

		return  {
			mode:this.mode,
			command:cmd,
			duration_s:this.enterDuration.value as number * 60,
			maxEntries:this.maxUsersToggle.value ? this.maxEntries.value as number : 0,
			created_at:Date.now(),
			entries:[],
			followRatio: this.ponderateVotes_follower.value as number,
			vipRatio: this.ponderateVotes_vip.value as number,
			subRatio: this.ponderateVotes_sub.value as number,
			subgiftRatio: this.ponderateVotes_subgift.value as number,
			subMode_includeGifters: this.subs_includeGifters.value as boolean,
			subMode_excludeGifted: this.subs_excludeGifted.value as boolean,
			showCountdownOverlay: this.showCountdownOverlay.value as boolean,
			customEntries: this.customEntries.value as string,
		}
	}

	public get startPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		return [{tag:"CMD", descKey:"raffle.configs.message_cmd_placeholder", example:this.finalData.command}];
	}

	public beforeMount(): void {
		
		this.command.labelKey					= "raffle.params.command";
		this.command.placeholder				= this.$t("raffle.params.command_placeholder");
		this.enterDuration.labelKey				= "raffle.params.duration";
		this.maxUsersToggle.labelKey			= "raffle.params.limit_users";
		this.maxEntries.labelKey				= "raffle.params.max_users";
		this.ponderateVotes.labelKey			= "raffle.params.ponderate";
		this.ponderateVotes_vip.labelKey		= "raffle.params.ponderate_VIP";
		this.ponderateVotes_sub.labelKey		= "raffle.params.ponderate_sub";
		this.ponderateVotes_subgift.labelKey	= "raffle.params.ponderate_subgifter";
		this.ponderateVotes_follower.labelKey	= "raffle.params.ponderate_follower";
		this.subs_includeGifters.labelKey		= "raffle.params.ponderate_include_gifter";
		this.subs_excludeGifted.labelKey		= "raffle.params.ponderate_exclude_gifted";
		this.customEntries.placeholder			= this.$t("raffle.params.list_placeholder");
		this.showCountdownOverlay.labelKey		= "raffle.configs.countdown";
		
		this.winnerPlaceholders		= [{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store("auth").twitch.user.displayName}];
		this.joinPlaceholders		= [{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store("auth").twitch.user.displayName}];

		if(this.triggerMode && this.action.raffleData) {
			this.mode = this.action.raffleData.mode;
			this.command.value = this.action.raffleData.command
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
			gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
			gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
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
	 * Close the form
	 */
	public async close():Promise<void> {
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	/**
	 * Create a chat raffle
	 */
	public async submitForm():Promise<void> {
		const payload:TwitchatDataTypes.RaffleData = this.finalData;
		this.$store("raffle").startRaffle(payload);
		if(this.mode == "chat") {
			this.close();
		}else{
			this.pickingEntry = true;
			await Utils.promisedTimeout(500);
			this.pickingEntry = false;
		}
	}
	
	public openParam(page:TwitchatDataTypes.ParamsContentStringType):void {
		if(this.triggerMode) {
			this.$emit("setContent", TwitchatDataTypes.ParamsCategories.OVERLAYS);
		}else{
			this.$store("main").tempStoreValue = "CONTENT:"+page;
			this.$store("main").setShowParams(true);
		}
	}

	public onValueChange():void {
		if(this.action) {
			this.action.raffleData = this.finalData;
		}
		this.joinPlaceholders[0].example = this.command.value as string;
	}
	
}
</script>

<style scoped lang="less">
.raffleform{

	&:not(.triggerMode) {
		.modal();
	}

	.content {

		.tabs {
			.tabMenu();
		}

		.voiceHelper {
			margin: auto;
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
				color: @mainColor_alert;
				:deep(.header),
				:deep(.content) {
					background-color: fade(@mainColor_alert, 10%);
				}
			}
		}

		.info {
			text-align: center;
			opacity: .8;
		}
		.row {
			display: flex;
			flex-direction: column;
			background-color: fade(@mainColor_normal_extralight, 30%);
			padding: .5em;
			border-radius: .5em;
			&:not(:first-child) {
				margin-top: .5em;
			}
		}

		.form {
			display: flex;
			flex-direction: column;
			&>.row {
				:deep(.list) {
					flex-direction: row;
					label {
						flex-grow: 1;
					}
				}
				:deep(input) {
					flex-basis: 100px;
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

				i {
					font-size: .8em;
				}
			}
		}

		.details {
			font-size: .8em;
		}

		.configs {
			margin: 1em 0;
			font-size: 1em;
			:deep(.header) {
				font-size: .8em;
			}
		}

	}
}
</style>