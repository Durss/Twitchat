<template>
	<div class="triggercreateform">
		<Icon class="loader" name="loader" v-if="showLoading" />

		<i18n-t scope="global" tag="div" class="card-item alert require"
		v-if="needObsConnect"
		keypath="triggers.obs.require">
			<template #URL>
				<a @click="openOBS()">{{ $t("triggers.obs.require_url") }}</a>
			</template>
		</i18n-t>

		<i18n-t scope="global" tag="div" class="card-item alert require"
		v-if="needRewards"
		keypath="triggers.rewards.require">
			<template #URL>
				<a @click="requestRewardsScope()">{{ $t("triggers.rewards.require_url") }}</a>
			</template>
		</i18n-t>

		<div class="card-item searchForm" v-else-if="subtriggerList.length == 0">
			<input v-model="search" @input="onSearch()" :placeholder="$t('global.search_placeholder')" v-autofocus>
		</div>

		<div class="card-item noResult" v-if="search && eventCategories.length === 0">{{ $t("global.no_result") }}</div>

		<!-- Main menu -->
		<div :class="search? 'list search' : 'list'" v-if="!selectedTriggerType">
			<div class="category"
			v-for="c in eventCategories"
			:key="c.category.labelKey"
			v-newflag="c.newDate? {date:c.newDate, id:'triggerCategory_'+c.category.id+'_'+c.newDate} : undefined">
				<div class="head">
					<Icon :name="icon" v-for="icon in c.category.icons" />
					<span class="label">{{ $t(c.category.labelKey) }}</span>
				</div>

				<i18n-t scope="global" tag="div" class="card-item alert require"
				v-if="!musicServiceAvailable && isMusicCategory(c.category) && !search"
				keypath="triggers.music.require">
					<template #URL>
						<a @click="openConnexions()">{{ $t("triggers.music.require_url") }}</a>
					</template>
				</i18n-t>

				<i18n-t scope="global" tag="div" class="card-item alert require"
				v-if="!obsConnected && isOBSCategory(c.category) && !search"
				keypath="triggers.obs.require">
					<template #URL>
						<a @click="openOBS()">{{ $t("triggers.obs.require_url") }}</a>
					</template>
				</i18n-t>

				<i18n-t scope="global" tag="div" class="card-item alert require"
				v-if="!hasCounterOrValue && isCountersAndValueCategory(c.category) && !search"
				keypath="triggers.count.require">
					<template #URL_COUNTERS>
						<a @click="openCounters()">{{ $t("triggers.count.require_counters") }}</a>
					</template>
					<template #URL_VALUES>
						<a @click="openValues()">{{ $t("triggers.count.require_values") }}</a>
					</template>
				</i18n-t>

				<div v-for="e in c.events" :key="e.value" :class="getTriggerClasses(e)"
				v-newflag="e.newDate? {date:e.newDate, id:'triggerEvent_'+e.value+'_'+e.newDate} : undefined">
					<TTButton class="triggerBt"
						:icon="e.icon"
						:premium="e.premium === true"
						:disabled="disabledEntry(e)"
						v-tooltip="disabledEntry(e)? $t(e.disabledReasonLabelKey ?? 'triggers.noChannelPoints_tt') : ''"
						@click.capture="disabledEntry(e)? requestScope(e) : selectTriggerType(e)">
						{{ $t(e.labelKey!) }}
					</TTButton>
				</div>
			</div>
		</div>

		<!-- Sub menu (rewards, counters, obs sources and scenes,... ) -->
		<div class="sublist">
			<template v-for="item in subtriggerList">
				<component :is="item.subValues? 'div' : 'button'" :class="item.icon? 'subEventBt hasIcon' : 'subEventBt'"
				@click="selectSubType(item)">
					<img class="icon" v-if="item.icon" :src="item.icon" :style="!item.background? {} : {backgroundColor:item.background, filter:'none'}">
					<span class="label">{{ item.label }}</span>
					<span class="small" v-if="item.labelSmall" >{{ item.labelSmall }}</span>
				</component>
				<template v-if="item.subValues">
					<button v-for="subItem in item.subValues" :class="item.icon? 'subEventBt subSubEventBt hasIcon' : 'subEventBt subSubEventBt'"
					@click="selectSubType(subItem, item)">
						<img class="icon" v-if="subItem.icon" :src="subItem.icon" :style="!subItem.background? {} : {backgroundColor:subItem.background, filter:'none'}">
						<span class="label">{{ subItem.label }}</span>
						<span class="small" v-if="subItem.labelSmall" >{{ subItem.labelSmall }}</span>
					</button>
				</template>
			</template>
		</div>

	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TriggerEventTypeCategory } from '@/types/TriggerActionDataTypes';
import { ANY_OBS_SCENE, TriggerEventTypeCategories, TriggerTypes, TriggerTypesDefinitionList, type TriggerData, type TriggerTypeDefinition } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { OBSInputItem, OBSSceneItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerActionList from './TriggerActionList.vue';

@Component({
	components:{
		TTButton:TTButton,//Special rename avoids conflict with <component is="button"> that would instanciate it instead of the native HTML element
		ToggleBlock,
		TriggerActionList,
	},
	emits:["selectTrigger", "updateHeader"],
})
class TriggerCreateForm extends Vue {

	@Prop({default:""})
	public folderTarget!:string;
	@Prop({default:[]})
	public obsScenes!:OBSSceneItem[];
	@Prop({default:[]})
	public obsSources!:OBSSourceItem[];
	@Prop({default:[]})
	public obsInputs!:OBSInputItem[];
	@Prop({default:[]})
	public rewards!:TwitchDataTypes.Reward[];

	public search = "";
	public showLoading = false;
	public needRewards = false;
	public needObsConnect = false;
	public selectedTriggerType:TriggerTypeDefinition|null = null;
	public subtriggerList:TriggerEntry[] = [];
	public eventCategories:TriggerCategory[] = [];

	private temporaryTrigger:TriggerData|null = null;

	public get musicServiceAvailable():boolean { return SpotifyHelper.instance.connected; }

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }

	public get hasCounterOrValue():boolean { return this.$store.counters.counterList.length > 0 || this.$store.values.valueList.length > 0; }

	public get isGoxlrMini():boolean { return GoXLRSocket.instance.isGoXLRMini; }

	public get hasChannelPoints():boolean { return this.$store.auth.twitch.user.is_affiliate || this.$store.auth.twitch.user.is_partner; }

	/**
	 * Gets a trigger's icon
	 */
	public getTriggerIcon(e:TriggerTypeDefinition):string {
		if(!e.icon) return "";
		if(e.icon.indexOf("/") > -1) return e.icon as string;
		return this.$asset("icons/"+e.icon+".svg");
	}

	/**
	 * Gets a trigger's classes
	 */
	public getTriggerClasses(e:TriggerTypeDefinition):string[] {
		const res:string[] = ["item"];
		if(e.beta) res.push("beta");
		return res;
	}

	public isMusicCategory(category:TriggerEventTypeCategory):boolean {
		return category.id == TriggerEventTypeCategories.MUSIC.id;
	}

	public isOBSCategory(category:TriggerEventTypeCategory):boolean {
		return category.id == TriggerEventTypeCategories.OBS.id;
	}

	public isCountersAndValueCategory(category:TriggerEventTypeCategory):boolean {
		return category.id == TriggerEventTypeCategories.COUNTER_VALUE.id;
	}

	public beforeMount():void {
		this.populate();

		watch(()=>this.obsSources, ()=> {
			if(this.selectedTriggerType) {
				this.selectTriggerType(this.selectedTriggerType);
			}
		});
		watch(()=>this.rewards, ()=> {
			if(this.selectedTriggerType) {
				this.selectTriggerType(this.selectedTriggerType);
			}
		});
	}

	/**
	 * Populates the form
	 */
	public populate(showPrivate:boolean = false):void {
		this.eventCategories = [];
		const triggers = TriggerTypesDefinitionList().concat();
		const locales = this.$i18n.availableLocales;
		//Create button/display data for all available triggers
		let triggerTypeList:TriggerEntry[] = triggers.filter(v=>(!showPrivate && v.private !== true) || (showPrivate == true && v.private === true))
		.map( v=> {
			return {
				label:this.$t(v.labelKey),
				searchTerms:locales.map(l => this.$t(v.labelKey, l)),
				value:v.value,
				trigger:v,
				icon:this.$asset('icons/'+v.icon+'.svg'),
				isCategory:false,
				newDate:v.newDate,
			}
		})

		if(this.search && !showPrivate) {
			const premiumSearch = this.search.toLowerCase() == "premium"
			const reg = new RegExp(this.search, "i");
			triggerTypeList = triggerTypeList.filter(v=> {
				if(premiumSearch && v.trigger?.premium === true) return true;
				let matches = false;
				v.searchTerms.forEach(v=> {
					matches ||= reg.test(v);
				})
				return matches;
			});
		}
		if(triggerTypeList.length === 0) return;

		//Remove affiliates-only triggers if not affiliate or partner
		if(!this.$store.auth.twitch.user.is_affiliate && !this.$store.auth.twitch.user.is_partner) {
			triggerTypeList = triggerTypeList.filter(v=> {
				return v.value != TriggerTypes.REWARD_REDEEM
				&& v.value != TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS
				&& v.value != TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE
			})
		}

		//Remove GoXLR Full specific triggers if a mini is connected
		if(this.isGoxlrMini) {
			triggerTypeList = triggerTypeList.filter(v=> v.trigger?.goxlrMiniCompatible === true || v.trigger?.goxlrMiniCompatible === undefined);
		}

		//Extract available trigger categories
		let currCat = triggerTypeList[0].trigger!.category;
		let catEvents:TriggerTypeDefinition[] = [];
		for (let i = 0; i < triggerTypeList.length; i++) {
			const ev = triggerTypeList[i];
			if(!ev.trigger) continue;
			if(ev.trigger.category != currCat || i === triggerTypeList.length-1) {
				if(i === triggerTypeList.length-1) catEvents.push(ev.trigger);
				const cat:TriggerCategory = {
					category:catEvents[0].category,
					events:catEvents,
				};
				this.eventCategories.push(cat);
				catEvents = [ev.trigger];
			}else{
				catEvents.push(ev.trigger);
			}
			currCat = ev.trigger.category
		}

		this.eventCategories.forEach(v => {
			let newDate = 0;
			v.events.forEach(w => {
				if(w.newDate) newDate = Math.max(newDate, w.newDate);
			})
			if(newDate > 0) v.newDate = newDate;
		})
	}

	/**
	 * Get if a trigger entry should be disabled
	 */
	public disabledEntry(e:TriggerTypeDefinition):boolean {
		if(e.disabled === true) return true;

		if(e.value == TriggerTypes.REWARD_REDEEM && (!this.hasChannelPoints || !TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS]))) return true;
		if(e.value == TriggerTypes.POLL_RESULT && (!this.hasChannelPoints || !TwitchUtils.hasScopes([TwitchScopes.MANAGE_POLLS]))) return true;
		if(e.value == TriggerTypes.PREDICTION_RESULT && (!this.hasChannelPoints || !TwitchUtils.hasScopes([TwitchScopes.MANAGE_PREDICTIONS]))) return true;
		if(e.value == TriggerTypes.SHIELD_MODE_ON && !TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE])) return true;
		if(e.value == TriggerTypes.SHIELD_MODE_OFF && !TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE])) return true;
		if(e.value == TriggerTypes.TIMEOUT && !TwitchUtils.hasScopes([TwitchScopes.EDIT_BANNED])) return true;
		if(e.value == TriggerTypes.BAN && !TwitchUtils.hasScopes([TwitchScopes.EDIT_BANNED])) return true;
		if(e.value == TriggerTypes.UNBAN && !TwitchUtils.hasScopes([TwitchScopes.EDIT_BANNED])) return true;
		if(e.value == TriggerTypes.VIP && !TwitchUtils.hasScopes([TwitchScopes.EDIT_VIPS])) return true;
		if(e.value == TriggerTypes.UNVIP && !TwitchUtils.hasScopes([TwitchScopes.EDIT_VIPS])) return true;
		if(e.value == TriggerTypes.MOD && !TwitchUtils.hasScopes([TwitchScopes.EDIT_MODS])) return true;
		if(e.value == TriggerTypes.UNMOD && !TwitchUtils.hasScopes([TwitchScopes.EDIT_MODS])) return true;
		if(e.value == TriggerTypes.STREAM_INFO_UPDATE && !TwitchUtils.hasScopes([TwitchScopes.SET_STREAM_INFOS])) return true;
		if(e.value == TriggerTypes.FOLLOWED_STREAM_ONLINE && !TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS])) return true;
		if(e.value == TriggerTypes.FOLLOWED_STREAM_OFFLINE && !TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS])) return true;
		if((e.value == TriggerTypes.AD_APPROACHING
		|| e.value == TriggerTypes.AD_STARTED
		|| e.value == TriggerTypes.AD_COMPLETE) && !TwitchUtils.hasScopes([TwitchScopes.ADS_READ])) return true;

		if(!TwitchUtils.hasScopes([TwitchScopes.READ_HYPE_TRAIN])
		&& (e.value == TriggerTypes.HYPE_TRAIN_CANCELED
		|| e.value == TriggerTypes.HYPE_TRAIN_APPROACHING
		|| e.value == TriggerTypes.HYPE_TRAIN_COOLDOWN
		|| e.value == TriggerTypes.HYPE_TRAIN_END
		|| e.value == TriggerTypes.HYPE_TRAIN_PROGRESS
		|| e.value == TriggerTypes.HYPE_TRAIN_START)) return true;

		return false;
	}

	/**
	 * Request any missing scope if necessary
	 * @param e
	 */
	public requestScope(e:TriggerTypeDefinition):void {
		if(e.value == TriggerTypes.REWARD_REDEEM && this.hasChannelPoints && !TwitchUtils.requestScopes([TwitchScopes.LIST_REWARDS])) return;
		if(e.value == TriggerTypes.POLL_RESULT && this.hasChannelPoints && !TwitchUtils.requestScopes([TwitchScopes.MANAGE_POLLS])) return;
		if(e.value == TriggerTypes.PREDICTION_RESULT && this.hasChannelPoints && !TwitchUtils.requestScopes([TwitchScopes.MANAGE_PREDICTIONS])) return;
		if(e.value == TriggerTypes.SHIELD_MODE_ON && !TwitchUtils.requestScopes([TwitchScopes.SHIELD_MODE])) return;
		if(e.value == TriggerTypes.SHIELD_MODE_OFF && !TwitchUtils.requestScopes([TwitchScopes.SHIELD_MODE])) return;
		if(e.value == TriggerTypes.TIMEOUT && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
		if(e.value == TriggerTypes.BAN && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
		if(e.value == TriggerTypes.UNBAN && !TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
		if(e.value == TriggerTypes.VIP && !TwitchUtils.requestScopes([TwitchScopes.EDIT_VIPS])) return;
		if(e.value == TriggerTypes.UNVIP && !TwitchUtils.requestScopes([TwitchScopes.EDIT_VIPS])) return;
		if(e.value == TriggerTypes.MOD && !TwitchUtils.requestScopes([TwitchScopes.EDIT_MODS])) return;
		if(e.value == TriggerTypes.UNMOD && !TwitchUtils.requestScopes([TwitchScopes.EDIT_MODS])) return;
		if(e.value == TriggerTypes.STREAM_INFO_UPDATE && !TwitchUtils.requestScopes([TwitchScopes.SET_STREAM_INFOS])) return;
		if(e.value == TriggerTypes.FOLLOWED_STREAM_ONLINE && !TwitchUtils.requestScopes([TwitchScopes.LIST_FOLLOWINGS])) return;
		if(e.value == TriggerTypes.FOLLOWED_STREAM_OFFLINE && !TwitchUtils.requestScopes([TwitchScopes.LIST_FOLLOWINGS])) return;
		if((e.value == TriggerTypes.AD_APPROACHING
			|| e.value == TriggerTypes.AD_STARTED
			|| e.value == TriggerTypes.AD_COMPLETE) && !TwitchUtils.requestScopes([TwitchScopes.ADS_READ])) return;

		if((e.value == TriggerTypes.HYPE_TRAIN_CANCELED
			|| e.value == TriggerTypes.HYPE_TRAIN_APPROACHING
			|| e.value == TriggerTypes.HYPE_TRAIN_COOLDOWN
			|| e.value == TriggerTypes.HYPE_TRAIN_END
			|| e.value == TriggerTypes.HYPE_TRAIN_PROGRESS
			|| e.value == TriggerTypes.HYPE_TRAIN_START)
		&& !TwitchUtils.requestScopes([TwitchScopes.READ_HYPE_TRAIN])) return;
	}

	/**
	 * Called when selecting a main event type
	 * @param e
	 */
	public async selectTriggerType(e:TriggerTypeDefinition):Promise<void> {
		this.selectedTriggerType = e;

		this.subtriggerList	= [];
		if(e.value == TriggerTypes.REWARD_REDEEM) {
			if(!TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
				this.needRewards = true;
				return;
			}else{
				this.needRewards = false;
				//build list from rewards
				const list = this.rewards.map((v):TriggerEntry => {
					return {
						label:v.title,
						searchTerms:[v.title],
						isCategory:false,
						value:v.id,
						background:v.background_color,
						labelSmall:v.cost > 0? v.cost+"pts" : "",
						icon:v.image?.url_2x ?? this.$asset("icons/channelPoints.svg"),
					};
				});
				this.subtriggerList = list;
				this.$emit("updateHeader", "triggers.header_select_reward");
			}
		}else

		if(e.value == TriggerTypes.OBS_SCENE) {
			if(!OBSWebsocket.instance.connected) {
				this.needObsConnect = true;
				return;
			}else{
				this.needObsConnect = false;
				//build list from obs scenes
				const list = this.obsScenes.map((v):TriggerEntry => {
					return {
						label:v.sceneName,
						searchTerms:[v.sceneName],
						value:v.sceneName,
						icon:"",
						isCategory:false,
					};
				});
				const defaultName = this.$t("triggers.obs.anyScene");
				list.unshift({
					label:defaultName,
					searchTerms:[defaultName],
					value:ANY_OBS_SCENE,
					icon:"",
					isCategory:false,
				})
				this.subtriggerList = list;
				this.$emit("updateHeader", "triggers.header_select_obs_scene");
			}
		}else

		if(e.value == TriggerTypes.OBS_SOURCE_OFF
		|| e.value == TriggerTypes.OBS_SOURCE_ON) {
			if(!OBSWebsocket.instance.connected) {
				this.needObsConnect = true;
				return;
			}else{
				this.needObsConnect = false;
				//build list from obs sources
				const list = this.obsSources.map((v):TriggerEntry => {
					return {
						label:v.sourceName,
						searchTerms:[v.sourceName],
						value:v.sourceName,
						icon:"",
						isCategory:false,
					};
				});
				this.subtriggerList = list;
				this.$emit("updateHeader", "triggers.header_select_obs_source");
			}
		}else

		if(e.value == TriggerTypes.OBS_FILTER_OFF
		|| e.value == TriggerTypes.OBS_FILTER_ON) {
			if(!OBSWebsocket.instance.connected) {
				this.needObsConnect = true;
				return;
			}else{
				this.needObsConnect = false;
				this.showLoading = true;

				//Get all OBS sources
				let list:TriggerEntry[] = this.obsSources.map(v=> {return {label:v.sourceName, searchTerms:[v.sourceName], value:v.sourceName, isCategory:false, icon:""}});
				//Get all OBS inputs
				list = list.concat( this.obsInputs.map(v=> {return {label:v.inputName, searchTerms:[v.inputName], value:v.inputName, isCategory:false, icon:""}}) );

				//Dedupe entries
				const entriesDone:{[key:string]:boolean} = {};
				list = list.filter(v=> {
					const key = v.value.toLowerCase();
					if(entriesDone[key] === true) return false;
					entriesDone[key] = true;
					return true;
				});

				//Load filters for all items
				for (let i = 0; i < list.length; i++) {
					const item = list[i];
					let filters = await OBSWebsocket.instance.getSourceFilters(item.value);
					if(filters.length === 0) {
						list.splice(i, 1);
						i--;
						continue;
					}
					item.subValues = filters.map(v=> {
										return {
											label:v.filterName,
											searchTerms:[v.filterName],
											value:v.filterName,
											icon:"",
											isCategory:false,
										};
									})

				}

				this.showLoading = false;
				this.subtriggerList = list;
				this.$emit("updateHeader", "triggers.header_select_obs_filter");
			}
		}else

		if(e.value == TriggerTypes.OBS_INPUT_MUTE
		|| e.value == TriggerTypes.OBS_INPUT_UNMUTE
		|| e.value == TriggerTypes.OBS_PLAYBACK_PAUSED
		|| e.value == TriggerTypes.OBS_PLAYBACK_RESTARTED
		|| e.value == TriggerTypes.OBS_PLAYBACK_NEXT
		|| e.value == TriggerTypes.OBS_PLAYBACK_PREVIOUS
		|| e.value == TriggerTypes.OBS_PLAYBACK_STARTED
		|| e.value == TriggerTypes.OBS_PLAYBACK_ENDED) {
			if(!OBSWebsocket.instance.connected) {
				this.needObsConnect = true;
				return;
			}else{
				this.needObsConnect = false;
				let filteredList = this.obsInputs;

				if(e.value != TriggerTypes.OBS_INPUT_MUTE
				&& e.value != TriggerTypes.OBS_INPUT_UNMUTE) {
					//Filter only media sources if on a media playback trigger
					filteredList = filteredList.filter(v=> {
						return v.inputKind === 'ffmpeg_source' || v.inputKind === "image_source" || v.inputKind == "vlc_source"
					})
				}

				//build list from obs sourcess
				const list = filteredList.map((v):TriggerEntry => {
					return {
						label:v.inputName,
						searchTerms:[v.inputName],
						value:v.inputName,
						icon:"",
						isCategory:false,
					};
				});
				this.subtriggerList = list;
				this.$emit("updateHeader", "triggers.header_select_obs_input");
			}
		}else

		if(e.value == TriggerTypes.COUNTER_EDIT
		|| e.value == TriggerTypes.COUNTER_ADD
		|| e.value == TriggerTypes.COUNTER_DEL
		|| e.value == TriggerTypes.COUNTER_LOOPED
		|| e.value == TriggerTypes.COUNTER_MAXED
		|| e.value == TriggerTypes.COUNTER_MINED) {
			this.listCounters();
			this.$emit("updateHeader", "triggers.header_select_counter");
		}

		if(e.value == TriggerTypes.VALUE_UPDATE) {
			this.listValues();
			this.$emit("updateHeader", "triggers.header_select_value");
		}

		if(e.value) {
			this.temporaryTrigger = {
				actions:this.temporaryTrigger? this.temporaryTrigger.actions : [],
				enabled:true,
				id:Utils.getUUID(),
				type:e.value,
				created_at:Date.now(),
			};

			if(this.subtriggerList.length == 0) {
				this.$store.triggers.addTrigger(this.temporaryTrigger, this.folderTarget)
				this.$emit("selectTrigger", this.temporaryTrigger);
			}
		}
	}

	/**
	 * Called when selecting a sub type (reward, counter, obs scene/source, ...)
	 * @param entry
	 */
	public selectSubType(entry:TriggerEntry, parentItem?:TriggerEntry):void {
		if(!this.selectedTriggerType) return;

		this.temporaryTrigger = {
			actions:this.temporaryTrigger? this.temporaryTrigger.actions : [],
			enabled:true,
			id:Utils.getUUID(),
			type:this.selectedTriggerType.value,
			created_at:Date.now(),
		};

		switch(this.selectedTriggerType.value) {
			case TriggerTypes.REWARD_REDEEM: this.temporaryTrigger.rewardId = entry.value; break;

			case TriggerTypes.OBS_SCENE: this.temporaryTrigger.obsScene = entry.value; break;

			case TriggerTypes.OBS_SOURCE_ON:
			case TriggerTypes.OBS_SOURCE_OFF: this.temporaryTrigger.obsSource = entry.value; break;

			case TriggerTypes.OBS_FILTER_ON:
			case TriggerTypes.OBS_FILTER_OFF:
				this.temporaryTrigger.obsSource = parentItem!.value;
				this.temporaryTrigger.obsFilter = entry.value;
				break;

			case TriggerTypes.OBS_PLAYBACK_STARTED:
			case TriggerTypes.OBS_PLAYBACK_ENDED:
			case TriggerTypes.OBS_PLAYBACK_PAUSED:
			case TriggerTypes.OBS_PLAYBACK_RESTARTED:
			case TriggerTypes.OBS_PLAYBACK_NEXT:
			case TriggerTypes.OBS_PLAYBACK_PREVIOUS:
			case TriggerTypes.OBS_INPUT_MUTE:
			case TriggerTypes.OBS_INPUT_UNMUTE: this.temporaryTrigger.obsInput = entry.value; break;

			case TriggerTypes.COUNTER_EDIT:
			case TriggerTypes.COUNTER_ADD:
			case TriggerTypes.COUNTER_DEL:
			case TriggerTypes.COUNTER_LOOPED:
			case TriggerTypes.COUNTER_MAXED:
			case TriggerTypes.COUNTER_MINED: this.temporaryTrigger.counterId = entry.value; break;

			case TriggerTypes.VALUE_UPDATE: this.temporaryTrigger.valueId = entry.value; break;
		}

		this.$store.triggers.addTrigger(this.temporaryTrigger, this.folderTarget);
		this.$emit("selectTrigger", this.temporaryTrigger);
	}

	/**
	 * Open connexions parameters
	 */
	public openConnexions():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.SPOTIFY);
	}

	/**
	 * Open OBS parameters
	 */
	public openOBS():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.OBS);
	}

	/**
	 * Open counters parameters
	 */
	public openCounters():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.COUNTERS);
	}

	/**
	 * Open values parameters
	 */
	public openValues():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.VALUES);
	}

	/**
	 * Requests access to rewards
	 */
	public requestRewardsScope():void {
		this.$store.auth.requestTwitchScopes([TwitchScopes.LIST_REWARDS]);
	}

	/**
	 * Lists Counters
	 */
	public async listCounters():Promise<void> {
		const list = this.$store.counters.counterList.sort((a,b)=> {
			if(a.name < b.name) return -1;
			if(a.name > b.name) return 1;
			return 0;
		}).map((v):TriggerEntry => {
			return {
				label:v.name,
				searchTerms:[v.name],
				value:v.id,
				icon:"",
				isCategory:false,
			};
		});
		this.subtriggerList = list;
	}

	/**
	 * Lists Values
	 */
	public async listValues():Promise<void> {
		const list = this.$store.values.valueList.sort((a,b)=> {
			if(a.name < b.name) return -1;
			if(a.name > b.name) return 1;
			return 0;
		}).map((v):TriggerEntry => {
			return {
				label:v.name,
				searchTerms:[v.name],
				value:v.id,
				icon:"",
				isCategory:false,
			};
		});
		this.subtriggerList = list;
	}

	/**
	 * Called when searching for triggers
	 */
	public onSearch():void {
		this.populate();
		Utils.sha256(this.search).then(hash => {
			if(hash === "09f0654a10e2dc4327e5bb0a2d8c01d703af81422d69b1d1def04bd754b47739") {
				this.populate(true);
			}
		})
	}
}

interface TriggerEntry{
	label:string;
	searchTerms:string[];
	labelSmall?:string;
	value:string;
	subValues?:TriggerEntry[];
	background?:string;
	trigger?:TriggerTypeDefinition;
	isCategory:boolean;
	icon:string;
	newDate?:number;
}

interface TriggerCategory{
	category:TriggerEventTypeCategory;
	events:TriggerTypeDefinition[];
	newDate?:number;
}
export default toNative(TriggerCreateForm);
</script>

<style scoped lang="less">
.triggercreateform{

	.createBt {
		margin: auto;
		display: block;
	}

	.loader {
		height: 2em;
		width: 2em;
		margin: auto;
		display: block;
	}

	.searchForm {
		margin-bottom: 1em;
		input {
			text-align: center;
			width: 100%;
		}
	}

	.noResult {
		margin:auto;
		text-align: center;
		font-style: italic;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 1.5em;
		.category{
			position: relative;
			width: 100%;
			.require {
				font-size: .8em;
				text-align: center;
				margin-bottom: 1em;
			}

			.head {
				font-size: 1.2em;
				margin-bottom: .5em;
				.icon {
					height: 1em;
					margin-right: .5em;
				}
				.label {
					font-weight: bold;
				}
			}
			&.newFlag {
				border: 0;
				border-radius: var(--border-radius);
				padding: .25em;
				background-color: var(--color-secondary-fader);
			}
		}

		.item {
			position: relative;
			.toggle {
				position: absolute;
				right: .5em;
				top: 50%;
				transform: translateY(calc(-50% - 2px));
				z-index: 1;
			}
			&.beta {
				:deep(.button) {
					padding-left: 3em;
					overflow: hidden;

					&::before {
						content: "beta";
						position: absolute;
						left: 0;
						color:var(--color-light);
						background-color: var(--color-secondary);
						height: 100%;
						display: flex;
						align-items: center;
						padding: 0 .35em;
						font-size: .8em;
						font-family: var(--font-nunito);
						text-transform: uppercase;
						z-index: 1;
					}
				}
			}
		}

		.triggerBt {
			width: 100%;
			margin-bottom: 2px;
			box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
			padding: .25em .5em;
			flex-wrap: nowrap;
			:deep(.label) {
				flex-grow: 1;
				display: flex;
				flex-direction: row;
				justify-content: space-between;
			}
			:deep(.icon) {
				z-index: 1;
				height: 1.5em;
				width: 1.5em;
				object-fit: fill;
			}
			:deep(.cost) {
				font-size: .8em;
				font-style: italic;
				margin-right: 3em;
			}

			&.subItem.hasIcon {
				&:before {
					content:"";
					width:2em;
					height:100%;
					left: 0;
					position: absolute;
					background-color: var(--color-light);
				}
				:deep(.label) {
					padding-left: .5em;
				}
			}
		}
	}

	.sublist {
		display: flex;
		flex-direction: column;
		gap: 4px;

		.subEventBt {
			box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
			color: var(--color-light);
			// background-color: var(--color-primary);
			background-color: var(--color-button);
			border-radius: var(--border-radius);
			padding: 0 .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			overflow: hidden;
			min-height: 1.5em;
			transition: color .25s, background-color .25s;
			&.hasIcon {
				padding-left: 0;
			}
			&.subSubEventBt {
				margin: 0 1em;
				justify-content: stretch;
			}
			.icon {
				margin-right: .5em;
				height: 1.5em;
				width: 1.5em;
				max-width: 1.5em;
				padding: .25em;
				object-fit: fill;
			}
			.label {
				flex-grow: 1;
				text-align: left;
				color: var(--color-text);
			}
			.small {
				font-size: .7em;
				font-style: italic;
				color: var(--color-text);
			}

			&:is(div) {
				//Used for OBS filter section names
				//Filters are listed by source item, this represents a source item
				//that has all its filters listed below it
				background-color: var(--color-light-fade);
				&:not(:first-of-type) {
					margin-top: 1em;
				}
				.label {
					font-weight: bold;
				}
			}
			&:not(div):hover {
				// background-color: var(--color-primary-light);
				background-color: var(--color-button-light);
			}
		}

	}
}
</style>
