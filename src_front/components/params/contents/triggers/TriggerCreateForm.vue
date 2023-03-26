<template>
	<div class="triggercreateform" v-if="!showForm">
		<Button :title="$t('triggers.add_triggerBt')" :icon="$image('icons/add.svg')" class="createBt" @click="openForm()" />
	</div>

	<div class="triggercreateform" v-else>
		<!-- Main event type -->
		<vue-select v-model="selectedTriggerEntry"
		:options="triggerTypeList"
		:appendToBody="true"
		:calculate-position="$placeDropdown"
		:placeholder="$t('triggers.add_trigger_select_event')"
		:selectable="(option:TriggerEntry) => !option.isCategory"
		>
			<template v-slot:option="option">
				<div :class="option.isCategory? 'category' : 'subItem'">
					<img class="listIcon" v-if="option.icon" :src="option.icon">
					<span class="label">{{ option.label }}</span>
				</div>
			</template>
		</vue-select>

		<!-- Sub event type (rewards, counters, OBS sources and scenes,...) -->
		<vue-select v-if="subtriggerList.length > 0" v-model="selectedSubtriggerEntry"
		:options="subtriggerList"
		:appendToBody="true"
		:calculate-position="$placeDropdown"
		>
			<template v-slot:option="option">
				<img class="listIcon" v-if="option.icon" :src="option.icon" :style="!option.background? {} : {backgroundColor:option.background, filter:'none'}">
				<span class="label">{{ option.label }}</span>
				<span class="labelSmall" v-if="option.labelSmall" >{{ option.labelSmall }}</span>
			</template>
		</vue-select>

		<img src="@/assets/loader/loader.svg" v-if="showLoading" class="loader">

		<i18n-t scope="global" tag="div" class="require"
		v-if="needObsConnect"
		keypath="triggers.obs.require">
			<template #URL>
				<a @click="openOBS()">{{ $t("triggers.obs.require_url") }}</a>
			</template>
		</i18n-t>

		<i18n-t scope="global" tag="div" class="require"
		v-if="needRewards"
		keypath="triggers.rewards.require">
			<template #URL>
				<a @click="requestRewardsScope()">{{ $t("triggers.rewards.require_url") }}</a>
			</template>
		</i18n-t>

	<!--
		public actions!:TriggerActionTypes[];
		public action!:TriggerActionTypes;
		public triggerData!:TriggerData;
		public event!:TriggerEventTypes;
		public obsSources!:OBSSourceItem[];
		public triggerKey!:string;
		public totalItems!:number;
-->
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { TriggerEvents, TriggerEventTypeCategories, TriggerTypes, type TriggerActionTypes, type TriggerData, type TriggerEventTypeCategoryValue, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import type { OBSSceneItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerActionList from './TriggerActionList.vue';

@Component({
	components:{
		Button,
		TriggerActionList,
	},
	emits:["openForm", "closeForm", "createTrigger"],
})
export default class TriggerCreateForm extends Vue {

	@Prop({default:[]})
	public obsScenes!:OBSSceneItem[];
	@Prop({default:[]})
	public obsSources!:OBSSourceItem[];
	@Prop({default:[]})
	public rewards!:TwitchDataTypes.Reward[];
	
	public showForm = false;
	public showLoading = false;
	public needRewards = false;
	public needObsConnect = false;
	public selectedTriggerEntry:TriggerEntry|null = null;
	public selectedSubtriggerEntry:TriggerEntry|null = null;
	public triggerTypeList:TriggerEntry[] = [];
	public subtriggerList:TriggerEntry[] = [];
	public actionList:TriggerActionTypes[] = [];
	public temporaryTrigger:TriggerData|null = null;

	public get isChatCmd():boolean { return this.selectedTriggerEntry?.value === TriggerTypes.CHAT_COMMAND; }

	public get isSchedule():boolean { return this.selectedTriggerEntry?.value === TriggerTypes.SCHEDULE; }

	public get showDescription():boolean { return !this.showLoading && this.selectedTriggerEntry != null && (this.subtriggerList.length == 0 || (this.subtriggerList.length > 0 && this.selectedSubtriggerEntry != null)); }

	public get showOBSResync():boolean { return this.actionList.findIndex(v => v.type == "obs") > -1; }

	/**
	 * Returns if the trigger can be tested.
	 * A trigger can be tested if it has enough information.
	 */
	public get canTestAction():boolean {
		let canTest = false;
		for (let i = 0; i < this.actionList.length; i++) {
			const a = this.actionList[i];
			if(a.type === null) {
				//No action type defined
				continue;
			}else
			if(a.type == "obs") {
				//If it's an OBS action, it needs at least a souce to be defined
				if(!(a.sourceName?.length > 0)) continue;
			}else
			if(a.type == "chat"){
				//If it's a chat action, it needs at least the message to be defined
				if(!(a.text?.length > 0)) continue;
			}
			canTest = true;
			break;
		}
		//Check if a JSON example is available
		const entry = TriggerEvents().find(v=>v.value == this.selectedTriggerEntry?.value);
		const hasJSON = entry ? entry.testMessageType != undefined : false;
		return canTest && hasJSON;
	}

	public beforeMount():void {
		const triggers = TriggerEvents().concat();
		this.triggerTypeList = triggers.map( v=> {
			return {
				label:this.$t(v.labelKey),
				value:v.value,
				trigger:v,
				icon:this.$image('icons/'+v.icon+'_purple.svg'),
				isCategory:false,
			}
		});
		if(!this.$store("auth").twitch.user.is_affiliate && !this.$store("auth").twitch.user.is_partner) {
			this.triggerTypeList = this.triggerTypeList.filter(v=> {
				return v.value != TriggerTypes.REWARD_REDEEM
				&& v.value != TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS
				&& v.value != TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE
			})
		}

		const catToLabel:{[key:number]:string} = {};
		catToLabel[ TriggerEventTypeCategories.GLOBAL ]		= "triggers.categories.global";
		catToLabel[ TriggerEventTypeCategories.USER ]		= "triggers.categories.user";
		catToLabel[ TriggerEventTypeCategories.SUBITS ]		= "triggers.categories.subits";
		catToLabel[ TriggerEventTypeCategories.MOD ]		= "triggers.categories.mod";
		catToLabel[ TriggerEventTypeCategories.TWITCHAT ]	= "triggers.categories.twitchat";
		catToLabel[ TriggerEventTypeCategories.HYPETRAIN ]	= "triggers.categories.hypetrain";
		catToLabel[ TriggerEventTypeCategories.GAMES ]		= "triggers.categories.games";
		catToLabel[ TriggerEventTypeCategories.MUSIC ]		= "triggers.categories.music";
		catToLabel[ TriggerEventTypeCategories.TIMER ]		= "triggers.categories.timer";
		catToLabel[ TriggerEventTypeCategories.OBS ]		= "triggers.categories.obs";
		catToLabel[ TriggerEventTypeCategories.MISC ]		= "triggers.categories.misc";
		catToLabel[ TriggerEventTypeCategories.COUNTER]		= "triggers.categories.count";
		
		const catToIcon:{[key:number]:string} = {};
		catToIcon[ TriggerEventTypeCategories.GLOBAL ]		= "whispers";
		catToIcon[ TriggerEventTypeCategories.USER ]		= "user";
		catToIcon[ TriggerEventTypeCategories.SUBITS ]		= "coin";
		catToIcon[ TriggerEventTypeCategories.MOD ]			= "mod";
		catToIcon[ TriggerEventTypeCategories.TWITCHAT ]	= "twitchat";
		catToIcon[ TriggerEventTypeCategories.HYPETRAIN ]	= "train";
		catToIcon[ TriggerEventTypeCategories.GAMES ]		= "ticket";
		catToIcon[ TriggerEventTypeCategories.MUSIC ]		= "music";
		catToIcon[ TriggerEventTypeCategories.TIMER ]		= "timer";
		catToIcon[ TriggerEventTypeCategories.OBS ]			= "obs";
		catToIcon[ TriggerEventTypeCategories.MISC ]		= "broadcast";
		catToIcon[ TriggerEventTypeCategories.COUNTER ]		= "count";
		let prevCatgerory:TriggerEventTypeCategoryValue|null = null;
		for (let i = 0; i < this.triggerTypeList.length; i++) {
			const t = this.triggerTypeList[i];
			if(t.trigger!.category != prevCatgerory) {
				this.triggerTypeList.splice(i, 0, {
					label: this.$t(catToLabel[t.trigger!.category]),
					value:"",
					icon: this.$image('icons/'+catToIcon[t.trigger!.category]+'_purple.svg'),
					isCategory: true,
				});
				prevCatgerory = t.trigger!.category;
			}
		}

		//Watch for main trigger type selection
		watch(()=>this.selectedTriggerEntry, async() => {
			this.subtriggerList	= [];
			this.selectedSubtriggerEntry = null;
			if(this.selectedTriggerEntry?.value == TriggerTypes.REWARD_REDEEM) {
				if(!TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
					this.needRewards = true;
					return;
				}else{
					this.needRewards = false;
					//build list from rewards
					const list = this.rewards.map((v):TriggerEntry => {
						return {
							label:v.title,
							isCategory:false,
							value:v.id,
							background:v.background_color,
							labelSmall:v.cost > 0? v.cost+"pts" : "",
							icon:v.image?.url_2x ?? ""
						};
					});
					this.subtriggerList = list;
				}
			}else
			if(this.selectedTriggerEntry?.value == TriggerTypes.OBS_SCENE) {
				if(!OBSWebsocket.instance.connected) {
					this.needObsConnect = true;
					return;
				}else{
					this.needObsConnect = false;
					//build list from obs scenes
					const list = this.obsScenes.map((v):TriggerEntry => {
						return {
							label:v.sceneName,
							value:v.sceneName,
							icon:"",
							isCategory:false,
						};
					});
					this.subtriggerList = list;
				}
			}else
			if(this.selectedTriggerEntry?.value == TriggerTypes.OBS_SOURCE_OFF
			|| this.selectedTriggerEntry?.value == TriggerTypes.OBS_SOURCE_ON) {
				if(!OBSWebsocket.instance.connected) {
					this.needObsConnect = true;
					return;
				}else{
					this.needObsConnect = false;
					//build list from obs sourcess
					const list = this.obsSources.map((v):TriggerEntry => {
						return {
							label:v.sourceName,
							value:v.sourceName,
							icon:"",
							isCategory:false,
						};
					});
					this.subtriggerList = list;
				}
			}else
			if(this.selectedTriggerEntry?.value == TriggerTypes.COUNTER_ADD
			|| this.selectedTriggerEntry?.value == TriggerTypes.COUNTER_DEL
			|| this.selectedTriggerEntry?.value == TriggerTypes.COUNTER_LOOPED
			|| this.selectedTriggerEntry?.value == TriggerTypes.COUNTER_MAXED
			|| this.selectedTriggerEntry?.value == TriggerTypes.COUNTER_MINED) {
				this.listCounters();
			}

			if(this.selectedTriggerEntry && this.selectedTriggerEntry.trigger) {
				this.temporaryTrigger = {
					actions:this.temporaryTrigger? this.temporaryTrigger.actions : [],
					enabled:true,
					id:Utils.getUUID(),
					type:this.selectedTriggerEntry.trigger.value,
				};

				if(this.subtriggerList.length == 0) {
					this.$emit("createTrigger", this.temporaryTrigger);
				}else{
					this.$emit("createTrigger", null);
				}
			}else{
				this.$emit("createTrigger", null);
			}
		});
		
		//Watch for sub trigger type selection (rewards, obs scenes/sources, counters, ...)
		watch(()=>this.selectedSubtriggerEntry, async() => {
			if(!this.selectedSubtriggerEntry) return;
			
			if(this.selectedTriggerEntry?.value == TriggerTypes.REWARD_REDEEM) {
				this.temporaryTrigger!.rewardId = this.selectedSubtriggerEntry.value;
				this.$emit("createTrigger", this.temporaryTrigger);
			}else
			if(this.selectedTriggerEntry?.value == TriggerTypes.OBS_SCENE) {
				this.temporaryTrigger!.obsScene = this.selectedSubtriggerEntry.value;
				this.$emit("createTrigger", this.temporaryTrigger);
			}else
			if(this.selectedTriggerEntry?.value == TriggerTypes.OBS_SOURCE_OFF
			|| this.selectedTriggerEntry?.value == TriggerTypes.OBS_SOURCE_ON) {
				this.temporaryTrigger!.obsSource = this.selectedSubtriggerEntry.value;
				this.$emit("createTrigger", this.temporaryTrigger);
			}else
			if(this.selectedTriggerEntry?.value == TriggerTypes.COUNTER_ADD
			|| this.selectedTriggerEntry?.value == TriggerTypes.COUNTER_DEL
			|| this.selectedTriggerEntry?.value == TriggerTypes.COUNTER_LOOPED
			|| this.selectedTriggerEntry?.value == TriggerTypes.COUNTER_MAXED
			|| this.selectedTriggerEntry?.value == TriggerTypes.COUNTER_MINED) {
				this.temporaryTrigger!.counterID = this.selectedSubtriggerEntry.value;
				this.$emit("createTrigger", this.temporaryTrigger);
			}
		});
	}

	/**
	 * Open OBS parameters
	 */
	public openOBS():void {
		this.$store('params').openParamsPage(TwitchatDataTypes.ParameterPages.OBS);
	}

	/**
	 * Open counters parameters
	 */
	public openCounters():void {
		this.$store('params').openParamsPage(TwitchatDataTypes.ParameterPages.COUNTERS);
	}

	/**
	 * Open trigger creation form and tel the parent so it
	 * hides the triggers list
	 */
	public openForm():void {
		this.showForm = true;
		this.$emit('openForm');
	}

	/**
	 * Requests access to rewards
	 */
	public requestRewardsScope():void {
		this.$store("auth").requestTwitchScopes([TwitchScopes.LIST_REWARDS]);
	}

	/**
	 * Lists Counters
	 */
	public async listCounters():Promise<void> {
		const list = this.$store("counters").data.sort((a,b)=> {
			if(a.name < b.name) return -1;
			if(a.name > b.name) return 1;
			return 0;
		}).map((v):TriggerEntry => {
			return {
				label:v.name,
				value:v.id,
				icon:"",
				isCategory:false,
			};
		});
		this.subtriggerList = list;
	}
}

interface TriggerEntry{
	label:string;
	labelSmall?:string;
	value:string;
	background?:string;
	trigger?:TriggerEventTypes;
	isCategory:boolean;
	icon:string;
}
</script>

<style scoped lang="less">
.triggercreateform{

	.createBt {
		margin: auto;
		display: block;
	}

	.loader {
		height: 2em;
		margin: auto;
		display: block;
	}

	.require {
		text-align: center;
		margin-top: .5em;
		background-color: @mainColor_warn;
		padding: .5em;
		border-radius: .5em;
		color: @mainColor_dark;

		a {
			color: @mainColor_alert;
			font-weight: bold;
		}
	}

	.ctas {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		margin-top: .5em;
		flex-wrap: wrap;
		.cta:not(:last-child) {
			margin-right: 1em;
		}
	}
}
</style>