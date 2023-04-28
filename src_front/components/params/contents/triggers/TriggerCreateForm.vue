<template>
	<div class="triggercreateform">

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


				
		<!-- Main menu -->
		<div class="list" v-if="!selectedTriggerType">
			<ToggleBlock class="category"
			v-for="c in eventCategories"
			:key="c.category.labelKey"
			:title="$t(c.category.labelKey)"
			:open="false"
			:icons="[c.category.icon+'']">
				<i18n-t scope="global" tag="div" class="require"
				v-if="!musicServiceAvailable && isMusicCategory(c.category)"
				keypath="triggers.music.require">
					<template #URL>
						<a @click="openOverlays()">{{ $t("triggers.music.require_url") }}</a>
					</template>
				</i18n-t>

				<i18n-t scope="global" tag="div" class="require"
				v-if="!obsConnected && isOBSCategory(c.category)"
				keypath="triggers.obs.require">
					<template #URL>
						<a @click="openOBS()">{{ $t("triggers.obs.require_url") }}</a>
					</template>
				</i18n-t>

				<i18n-t scope="global" tag="div" class="require"
				v-if="isCountersCategory(c.category)"
				keypath="triggers.count.require">
					<template #URL>
						<a @click="openCounters()">{{ $t("triggers.count.require_url") }}</a>
					</template>
				</i18n-t>

				<div v-for="e in c.events" :key="e.value" :class="e.beta? 'item beta' : 'item'">
					<TTButton class="triggerBt" small
						:disabled="disabledEntry(e)"
						v-tooltip="disabledEntry(e)? $t('triggers.noChannelPoints_tt') : ''"
						@click.capture="disabledEntry(e)? requestScope(e) : selectTriggerType(e)">
						<template #icon>
							<img :src="getIcon(e)">
						</template>
						{{ $t(e.labelKey!) }}
					</TTButton>
				</div>
			</ToggleBlock>
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
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerEventTypeCategories, TriggerTypesDefinitionList, TriggerTypes, type TriggerActionTypes, type TriggerData, type TriggerEventTypeCategoryID, type TriggerTypeDefinition } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Config from '@/utils/Config';
import type { OBSInputItem, OBSSceneItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerActionList from './TriggerActionList.vue';
import type { TriggerEventTypeCategory } from '@/types/TriggerActionDataTypes';

@Component({
	components:{
		TTButton:Button,//Special rename avoids conflict with <component is="button"> that would instanciate it instead of the native HTML element
		ToggleBlock,
		TriggerActionList,
	},
	emits:["selectTrigger", "updateHeader"],
})
export default class TriggerCreateForm extends Vue {

	@Prop({default:[]})
	public obsScenes!:OBSSceneItem[];
	@Prop({default:[]})
	public obsSources!:OBSSourceItem[];
	@Prop({default:[]})
	public obsInputs!:OBSInputItem[];
	@Prop({default:[]})
	public rewards!:TwitchDataTypes.Reward[];
	
	public showLoading = false;
	public needRewards = false;
	public needObsConnect = false;
	public selectedTriggerType:TriggerTypeDefinition|null = null;
	public selectedSubtriggerEntry:TriggerEntry|null = null;

	public triggerTypeList:TriggerEntry[] = [];
	public subtriggerList:TriggerEntry[] = [];
	public actionList:TriggerActionTypes[] = [];
	public temporaryTrigger:TriggerData|null = null;
	public eventCategories:{category:TriggerEventTypeCategory, events:TriggerTypeDefinition[]}[] = [];

	public get musicServiceAvailable():boolean { return Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED; }

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }

	public get hasChannelPoints():boolean { return this.$store("auth").twitch.user.is_affiliate || this.$store("auth").twitch.user.is_partner; }

	/**
	 * Gets a trigger's icon
	 */
	public getIcon(e:TriggerTypeDefinition):string {
		if(!e.icon) return "";
		if(e.icon.indexOf("/") > -1) return e.icon as string;
		return this.$image("icons/"+e.icon+".svg");
	}

	public isMusicCategory(category:TriggerEventTypeCategory):boolean {
		return category.id == TriggerEventTypeCategories.MUSIC.id;
	}

	public isOBSCategory(category:TriggerEventTypeCategory):boolean {
		return category.id == TriggerEventTypeCategories.OBS.id;
	}

	public isCountersCategory(category:TriggerEventTypeCategory):boolean {
		return category.id == TriggerEventTypeCategories.COUNTER.id;
	}

	public beforeMount():void {
		const triggers = TriggerTypesDefinitionList().concat();
		this.triggerTypeList = triggers.map( v=> {
			return {
				label:this.$t(v.labelKey),
				value:v.value,
				trigger:v,
				icon:this.$image('icons/'+v.icon+'.svg'),
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
		
		let currCat = this.triggerTypeList[0].trigger!.category;
		let catEvents:TriggerTypeDefinition[] = [];
		for (let i = 0; i < this.triggerTypeList.length; i++) {
			const ev = this.triggerTypeList[i];
			if(!ev.trigger) continue;
			if(ev.trigger.category != currCat || i === this.triggerTypeList.length-1) {
				if(i === this.triggerTypeList.length-1) catEvents.push(ev.trigger);
				this.eventCategories.push({
					category:catEvents[0].category,
					events:catEvents,
				});
				catEvents = [ev.trigger];
			}else{
				catEvents.push(ev.trigger);
			}
			currCat = ev.trigger.category
		}

		let prevCategrory:TriggerEventTypeCategoryID|null = null;
		for (let i = 0; i < this.triggerTypeList.length; i++) {
			const t = this.triggerTypeList[i];
			if(t.trigger!.category.id != prevCategrory) {
				this.triggerTypeList.splice(i, 0, {
					label: this.$t(t.trigger!.category.labelKey),
					value:"",
					icon: this.$image('icons/'+t.trigger!.category.icon+'.svg'),
					isCategory: true,
				});
				prevCategrory = t.trigger!.category.id;
			}
		}

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
	 * Get if a trigger entry should be disabled
	 */
	public disabledEntry(e:TriggerTypeDefinition):boolean {
		if(e.disabled === true) return true;
		
		if(e.value == TriggerTypes.REWARD_REDEEM && (!this.hasChannelPoints || !TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS]))) return true;
		if(e.value == TriggerTypes.POLL_RESULT && (!this.hasChannelPoints || !TwitchUtils.hasScopes([TwitchScopes.MANAGE_POLLS]))) return true;
		if(e.value == TriggerTypes.PREDICTION_RESULT && (!this.hasChannelPoints || !TwitchUtils.hasScopes([TwitchScopes.MANAGE_PREDICTIONS]))) return true;
		if(e.value == TriggerTypes.SHIELD_MODE_ON && !TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE])) return true;
		if(e.value == TriggerTypes.SHIELD_MODE_OFF && !TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE])) return true;
		if(e.value == TriggerTypes.TIMEOUT && !TwitchUtils.hasScopes([TwitchScopes.READ_MODS_AND_BANNED])) return true;
		if(e.value == TriggerTypes.BAN && !TwitchUtils.hasScopes([TwitchScopes.READ_MODS_AND_BANNED])) return true;
		if(e.value == TriggerTypes.UNBAN && !TwitchUtils.hasScopes([TwitchScopes.READ_MODS_AND_BANNED])) return true;
		if(e.value == TriggerTypes.VIP && !TwitchUtils.hasScopes([TwitchScopes.EDIT_VIPS])) return true;
		if(e.value == TriggerTypes.UNVIP && !TwitchUtils.hasScopes([TwitchScopes.EDIT_VIPS])) return true;
		if(e.value == TriggerTypes.MOD && !TwitchUtils.hasScopes([TwitchScopes.EDIT_MODS])) return true;
		if(e.value == TriggerTypes.UNMOD && !TwitchUtils.hasScopes([TwitchScopes.EDIT_MODS])) return true;
		if(e.value == TriggerTypes.STREAM_INFO_UPDATE && !TwitchUtils.hasScopes([TwitchScopes.SET_STREAM_INFOS])) return true;

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
		if(e.value == TriggerTypes.TIMEOUT && !TwitchUtils.requestScopes([TwitchScopes.READ_MODS_AND_BANNED])) return;
		if(e.value == TriggerTypes.BAN && !TwitchUtils.requestScopes([TwitchScopes.READ_MODS_AND_BANNED])) return;
		if(e.value == TriggerTypes.UNBAN && !TwitchUtils.requestScopes([TwitchScopes.READ_MODS_AND_BANNED])) return;
		if(e.value == TriggerTypes.VIP && !TwitchUtils.requestScopes([TwitchScopes.EDIT_VIPS])) return;
		if(e.value == TriggerTypes.UNVIP && !TwitchUtils.requestScopes([TwitchScopes.EDIT_VIPS])) return;
		if(e.value == TriggerTypes.MOD && !TwitchUtils.requestScopes([TwitchScopes.EDIT_MODS])) return;
		if(e.value == TriggerTypes.UNMOD && !TwitchUtils.requestScopes([TwitchScopes.EDIT_MODS])) return;
		if(e.value == TriggerTypes.STREAM_INFO_UPDATE && !TwitchUtils.requestScopes([TwitchScopes.SET_STREAM_INFOS])) return;

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
						isCategory:false,
						value:v.id,
						background:v.background_color,
						labelSmall:v.cost > 0? v.cost+"pts" : "",
						icon:v.image?.url_2x ?? ""
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
						value:v.sceneName,
						icon:"",
						isCategory:false,
					};
				});
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
				let list:TriggerEntry[] = this.obsSources.map(v=> {return {label:v.sourceName, value:v.sourceName, isCategory:false, icon:""}});
				//Get all OBS inputs
				list = list.concat( this.obsInputs.map(v=> {return {label:v.inputName, value:v.inputName, isCategory:false, icon:""}}) );

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
						value:v.inputName,
						icon:"",
						isCategory:false,
					};
				});
				this.subtriggerList = list;
				this.$emit("updateHeader", "triggers.header_select_obs_input");
			}
		}else
		
		if(e.value == TriggerTypes.COUNTER_ADD
		|| e.value == TriggerTypes.COUNTER_DEL
		|| e.value == TriggerTypes.COUNTER_LOOPED
		|| e.value == TriggerTypes.COUNTER_MAXED
		|| e.value == TriggerTypes.COUNTER_MINED) {
			this.listCounters();
			this.$emit("updateHeader", "triggers.header_select_counter");
		}

		if(e.value) {
			this.temporaryTrigger = {
				actions:this.temporaryTrigger? this.temporaryTrigger.actions : [],
				enabled:true,
				id:Utils.getUUID(),
				type:e.value,
			};

			if(this.subtriggerList.length == 0) {
				this.$store("triggers").addTrigger(this.temporaryTrigger)
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

			case TriggerTypes.COUNTER_ADD:
			case TriggerTypes.COUNTER_DEL:
			case TriggerTypes.COUNTER_LOOPED:
			case TriggerTypes.COUNTER_MAXED:
			case TriggerTypes.COUNTER_MINED: this.temporaryTrigger.counterId = entry.value; break;
		}

		this.$store("triggers").addTrigger(this.temporaryTrigger);
		this.$emit("selectTrigger", this.temporaryTrigger);
	}
	
	/**
	 * Open overlay parameters
	 */
	public openOverlays():void {
		this.$store('params').openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS);
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
	 * Requests access to rewards
	 */
	public requestRewardsScope():void {
		this.$store("auth").requestTwitchScopes([TwitchScopes.LIST_REWARDS]);
	}

	/**
	 * Lists Counters
	 */
	public async listCounters():Promise<void> {
		const list = this.$store("counters").counterList.sort((a,b)=> {
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
	subValues?:TriggerEntry[];
	background?:string;
	trigger?:TriggerTypeDefinition;
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

	&>.require {
		text-align: center;
		margin-top: .5em;
		background-color: var(--mainColor_warn);
		padding: .5em;
		border-radius: .5em;
		color: var(--mainColor_dark);

		a {
			color: var(--mainColor_alert);
			font-weight: bold;
		}
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: .5em;

		.category{
			width: 100%;
			.require {
				font-size: .8em;
				text-align: center;
				margin-bottom: 1em;
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
						color:var(--mainColor_light);
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
					background-color: var(--mainColor_normal);
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
		gap: 2px;

		.subEventBt {
			box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
			color: var(--color-light);
			background-color: var(--color-primary);
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
			}
			.small {
				font-size: .7em;
				font-style: italic;
			}

			&:is(div) {
				color: var(--color-alert);
				background-color: var(--mainColor_normal);
				&:not(:first-of-type) {
					margin-top: 1em;
				}
			}
			&:not(div):hover {
				background-color: var(--color-primary-light);
			}
		}

	}
}
</style>