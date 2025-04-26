<template>
	<div :class="classes">
		<div class="head" v-if="triggerMode === false">
			<ClearButton :aria-label="$t('global.close')" @click="close()" />

			<h1 class="title"><Icon name="ticket" class="icon" />{{ $t("raffle.form_title") }}</h1>

			<div class="description">{{ $t("raffle.description") }}</div>
		</div>

		<TabMenu class="menu" v-model="localData.mode"
			:values="['chat','sub','tips','manual','values']"
			:labels="[$t('raffle.chat.title'), $t('raffle.subs.title'), $t('raffle.tips.title'), $t('raffle.list.title'), $t('raffle.values.title')]"
			:icons="['whispers', 'sub', 'coin', 'list', 'placeholder']" />

		<div class="content">
			<ToggleBlock class="legal tips" v-if="triggerMode === false && localData.mode!='manual' && localData.mode!='values'" :icons="['info']" small :title="$t('raffle.legal.title')" :open="false">
				<p v-for="l in $tm('raffle.legal.contents')">{{l}}</p>
			</ToggleBlock>

			<VoiceGlobalCommandsHelper v-if="voiceControl !== false" class="voiceHelper" />

			<form class="form" v-if="localData.mode=='chat'" @submit.prevent="submitForm()">
				<div class="card-item info">{{ $t("raffle.chat.description") }}</div>

				<ParamItem :paramData="param_command" v-model="param_command.value" :autofocus="true" @change="onValueChange()">
					<ParamItem class="child" noBackground :paramData="param_commandValue" v-model="localData.command" :autofocus="true" />
				</ParamItem>

				<ParamItem :paramData="param_reward" v-model="param_reward.value" @change="onValueChange()" v-if="param_rewardvalue.listValues!.length > 1">
					<ParamItem class="child" noBackground :paramData="param_rewardvalue" v-model="localData.reward_id" />
				</ParamItem>

				<ParamItem :paramData="param_enterDuration" v-model="localData.duration_s" />

				<ToggleBlock class="configs" :icons="['params']" :title="$t('global.advanced_params')" :open="false">
					<ParamItem :paramData="param_autoClose" v-model="localData.autoClose" />
					<ParamItem :paramData="param_multipleJoin" v-model="localData.multipleJoin" />
					<ParamItem :paramData="param_maxUsersToggle" v-model="param_maxUsersToggle.value" @change="onValueChange()">
						<ParamItem class="child" noBackground :paramData="param_maxEntries" v-model="localData.maxEntries" />
					</ParamItem>
					<ParamItem :paramData="param_ponderateVotes" v-model="param_ponderateVotes.value" @change="onValueChange()">
						<ParamItem class="child" noBackground :paramData="param_ponderateVotes_vip" v-model="localData.vipRatio" />
						<ParamItem class="child" noBackground :paramData="param_ponderateVotes_follower" v-model="localData.followRatio" />
						<ParamItem class="child" noBackground :paramData="param_ponderateVotes_sub" v-model="localData.subRatio" />
						<ParamItem class="child" noBackground :paramData="param_ponderateVotes_subT2" v-model="localData.subT2Ratio" />
						<ParamItem class="child" noBackground :paramData="param_ponderateVotes_subT3" v-model="localData.subT3Ratio" />
						<ParamItem class="child" noBackground :paramData="param_ponderateVotes_subgift" v-model="localData.subgiftRatio" />
					</ParamItem>

					<ParamItem
					:paramData="param_showCountdownOverlay"
					v-model="localData.showCountdownOverlay">
						<i18n-t scope="global" tag="div" class="details"
						v-if="localData.showCountdownOverlay === true && localData.mode=='chat'"
						keypath="raffle.configs.timer_overlay_add">
							<template #LINK>
								<a @click="openParam('overlays')">{{ $t("raffle.configs.timer_overlay_add_link") }}</a>
							</template>
						</i18n-t>
					</ParamItem>

					<PostOnChatParam :botMessageKey="triggerMode? '' : 'raffleStart'"
						:placeholders="startPlaceholders"
						v-model:text="localData.messages!.raffleStart!.message"
						v-model:enabled="localData.messages!.raffleStart!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_start"
					/>
					<PostOnChatParam :botMessageKey="triggerMode? '' : 'raffleJoin'"
						:placeholders="joinPlaceholders"
						v-model:text="localData.messages!.raffleJoin!.message"
						v-model:enabled="localData.messages!.raffleJoin!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_join"
					/>
					<PostOnChatParam :botMessageKey="triggerMode? '' : 'raffle'"
						:placeholders="winnerPlaceholders"
						v-model:text="localData.messages!.raffleWinner!.message"
						v-model:enabled="localData.messages!.raffleWinner!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_winner"
					/>
				</ToggleBlock>

				<TTButton type="submit"
					v-if="triggerMode === false"
					:aria-label="$t('raffle.chat.startBt_aria')"
					icon="ticket">{{ $t('global.start') }}</TTButton>

				<div class="card-item triggerInfo" v-if="triggerMode === false">
					<Icon name="info" />

					<i18n-t scope="global" tag="span" keypath="raffle.chat.triggers">
						<template #LINK>
							<a @click="openParam('triggers')">{{ $t("raffle.chat.triggers_link") }}</a>
						</template>
						<template #ACTION>
							<strong>{{ $t("triggers.actions.common.action_raffle_enter") }}</strong>
						</template>
					</i18n-t>
				</div>
			</form>

			<form class="form" v-else-if="localData.mode=='tips' && canListSubs" @submit.prevent="submitForm()">
				<div class="card-item info">{{ $t("raffle.tips.description") }}</div>
				<ParamItem :paramData="param_tip_kofi" v-model="localData.tip_kofi">
					<ParamItem class="child" noBackground :paramData="param_tip_kofi_minAmount" v-model="localData.tip_kofi_minAmount" />
					<ParamItem class="child" noBackground :paramData="param_tip_kofi_ponderate" v-model="localData.tip_kofi_ponderate" />
				</ParamItem>
				<ParamItem :paramData="param_tip_streamlabs" v-model="localData.tip_streamlabs">
					<ParamItem class="child" noBackground :paramData="param_tip_streamlabs_minAmount" v-model="localData.tip_streamlabs_minAmount" />
					<ParamItem class="child" noBackground :paramData="param_tip_streamlabs_ponderate" v-model="localData.tip_streamlabs_ponderate" />
				</ParamItem>
				<ParamItem :paramData="param_tip_streamlabsCharity" v-model="localData.tip_streamlabsCharity">
					<ParamItem class="child" noBackground :paramData="param_tip_streamlabsCharity_minAmount" v-model="localData.tip_streamlabsCharity_minAmount" />
					<ParamItem class="child" noBackground :paramData="param_tip_streamlabsCharity_ponderate" v-model="localData.tip_streamlabsCharity_ponderate" />
				</ParamItem>
				<ParamItem :paramData="param_tip_streamlements" v-model="localData.tip_streamelements">
					<ParamItem class="child" noBackground :paramData="param_tip_streamelements_minAmount" v-model="localData.tip_streamelements_minAmount" />
					<ParamItem class="child" noBackground :paramData="param_tip_streamlements_ponderate" v-model="localData.tip_streamelements_ponderate" />
				</ParamItem>
				<ParamItem :paramData="param_tip_tipeee" v-model="localData.tip_tipeee">
					<ParamItem class="child" noBackground :paramData="param_tip_tipeee_minAmount" v-model="localData.tip_tipeee_minAmount" />
					<ParamItem class="child" noBackground :paramData="param_tip_tipeee_ponderate" v-model="localData.tip_tipeee_ponderate" />
				</ParamItem>
				<ParamItem :paramData="param_tip_tiltify" v-model="localData.tip_tiltify">
					<ParamItem class="child" noBackground :paramData="param_tip_tiltify_minAmount" v-model="localData.tip_tiltify_minAmount" />
					<ParamItem class="child" noBackground :paramData="param_tip_tiltify_ponderate" v-model="localData.tip_tiltify_ponderate" />
				</ParamItem>
				<ParamItem :paramData="param_tip_twitchCharity" v-model="localData.tip_twitchCharity">
					<ParamItem class="child" noBackground :paramData="param_tip_twitchCharity_minAmount" v-model="localData.tip_twitchCharity_minAmount" />
					<ParamItem class="child" noBackground :paramData="param_tip_twitchCharity_ponderate" v-model="localData.tip_twitchCharity_ponderate" />
				</ParamItem>

				<ParamItem :paramData="param_enterDuration" v-model="localData.duration_s" />

				<ToggleBlock class="configs" :icons="['params']" :title="$t('global.advanced_params')" :open="false">
					<ParamItem :paramData="param_multipleJoin"  v-model="localData.multipleJoin" />
					<ParamItem :paramData="param_maxUsersToggle"  v-model="param_maxUsersToggle.value" @change="onValueChange()">
						<ParamItem class="child" noBackground :paramData="param_maxEntries" v-model="localData.maxEntries" />
					</ParamItem>

					<ParamItem
					:paramData="param_showCountdownOverlay"
					v-model="localData.showCountdownOverlay">
						<i18n-t scope="global" tag="div" class="details"
						v-if="localData.showCountdownOverlay === true"
						keypath="raffle.configs.timer_overlay_add">
							<template #LINK>
								<a @click="openParam('overlays')">{{ $t("raffle.configs.timer_overlay_add_link") }}</a>
							</template>
						</i18n-t>
					</ParamItem>

					<PostOnChatParam :botMessageKey="triggerMode? '' : 'raffleTipsStart'"
						:placeholders="startTipsPlaceholders"
						v-model:text="localData.messages!.raffleStart!.message"
						v-model:enabled="localData.messages!.raffleStart!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_start"
					/>
					<PostOnChatParam :botMessageKey="triggerMode? '' : 'raffleTipsJoin'"
						:placeholders="joinTipsPlaceholders"
						v-model:text="localData.messages!.raffleJoin!.message"
						v-model:enabled="localData.messages!.raffleJoin!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_join"
					/>
					<PostOnChatParam :botMessageKey="triggerMode? '' : 'raffleTipsWinner'"
						:placeholders="winnerTipsPlaceholders"
						v-model:text="localData.messages!.raffleWinner!.message"
						v-model:enabled="localData.messages!.raffleWinner!.enabled"
						icon="announcement"
						titleKey="raffle.configs.postOnChat_winner"
					/>
				</ToggleBlock>

				<TTButton type="submit" icon="ticket"
					v-if="triggerMode === false"
					:aria-label="$t('raffle.chat.startBt_aria')"
					:disabled="localData.tip_kofi!==true
							&& localData.tip_streamlabs!==true
							&& localData.tip_streamlabsCharity!==true
							&& localData.tip_streamelements!==true
							&& localData.tip_tipeee!==true
							&& localData.tip_tiltify!==true
							&& localData.tip_twitchCharity!==true">{{ $t('global.start') }}</TTButton>
			</form>

			<form class="form" v-else-if="localData.mode=='sub' && canListSubs" @submit.prevent="submitForm()">
				<div class="card-item info">{{ $t("raffle.subs.description") }}</div>

				<ParamItem :paramData="param_subs_includeGifters" v-model="localData.subMode_includeGifters" />
				<ParamItem :paramData="param_subs_excludeGifted" v-model="localData.subMode_excludeGifted" />
				<div class="card-item winner" v-if="winner" ref="winnerHolder">
					<div class="head">Winner</div>
					<div class="user">🎉 {{winner}} 🎉</div>
				</div>
				<div class="card-item winner" v-if="winnerTmp">
					<div class="user">{{winnerTmp}}</div>
				</div>

				<PostOnChatParam :botMessageKey="triggerMode? '' : 'raffleSubsWinner'"
					:placeholders="winnerSubsPlaceholders"
					v-model:text="localData.messages!.raffleWinner!.message"
					v-model:enabled="localData.messages!.raffleWinner!.enabled"
					icon="announcement"
					titleKey="raffle.configs.postOnChat_winner"
				/>

				<TTButton type="submit"
				:aria-label="$t('raffle.subs.startBt_aria')"
				icon="sub"
				v-if="triggerMode === false"
				:loading="pickingEntry">
					<i18n-t scope="global" keypath="raffle.subs.startBt">
						<template #COUNT>
							<i class="small">({{ subsFiltered.length }} subs)</i>
						</template>
					</i18n-t>
				</TTButton>
			</form>

			<form class="card-item secondary form scope" v-else-if="localData.mode=='sub' && !canListSubs" @submit.prevent="submitForm()">
				<Icon nam="lock_fit" />
				<p class="label">{{ $t("params.scope_missing") }}</p>
				<TTButton alert small
					class="grantBt"
					icon="unlock"
					@click="requestSubPermission()">{{ $t('global.grant_scope') }}</TTButton>
			</form>

			<form class="form" v-else-if="localData.mode=='manual'" @submit.prevent="submitForm()">
				<div class="card-item info">{{ $t("raffle.list.description") }}</div>

				<div class="card-item">
					<ParamItem noBackground :paramData="param_customEntries" v-model="localData.customEntries" />
					<span class="instructions">{{ $t("raffle.list.instructions") }}</span>
				</div>

				<ParamItem :paramData="param_list_remove" v-model="localData.removeWinningEntry" v-if="!triggerMode" />

				<PostOnChatParam :botMessageKey="triggerMode? '' : 'raffleListWinner'"
					:placeholders="winnerListPlaceholders"
					v-model:text="localData.messages!.raffleWinner!.message"
					v-model:enabled="localData.messages!.raffleWinner!.enabled"
					icon="announcement"
					titleKey="raffle.configs.postOnChat_winner"
				/>

				<TTButton type="submit"
				v-if="triggerMode === false"
				:loading="pickingEntry"
				:aria-label="$t('raffle.list.startBt_aria')"
				:disabled="customEntriesCount == 0"
				icon="list">
					<i18n-t scope="global" keypath="raffle.list.startBt">
						<template #COUNT>
							<i class="small">({{ customEntriesCount }})</i>
						</template>
					</i18n-t>
				</TTButton>
			</form>

			<form class="form" v-else-if="localData.mode=='values'" @submit.prevent="submitForm()">
				<i18n-t scope="global" tag="div" class="card-item info" keypath="raffle.values.description">
					<template #VALUE>
						<a @click="openValues()">{{ $t("raffle.values.description_value") }}</a>
					</template>
				</i18n-t>

				<ParamItem :paramData="param_values" v-model="param_values.value"
					@change="onValueChange()" />

				<ParamItem :paramData="param_values_remove" v-model="localData.removeWinningEntry" />

				<ParamItem class="splitterField"
					v-if="param_values.selectedListValue?.value.perUser !== true"
					:paramData="param_values_splitter"
					v-model="localData.value_splitter" />

				<PostOnChatParam :botMessageKey="triggerMode? '' : 'raffleValuesWinner'"
					:placeholders="winnerValuesPlaceholders"
					v-model:text="localData.messages!.raffleWinner!.message"
					v-model:enabled="localData.messages!.raffleWinner!.enabled"
					icon="announcement"
					titleKey="raffle.configs.postOnChat_winner"
				/>


				<TTButton type="submit"
				v-if="triggerMode === false"
				:loading="pickingEntry"
				:aria-label="$t('raffle.list.startBt_aria')"
				:disabled="valueCount == 0"
				icon="list">
					<i18n-t scope="global" keypath="raffle.values.startBt">
						<template #COUNT>
							<i class="small">({{ valueCount }})</i>
						</template>
					</i18n-t>
				</TTButton>
			</form>

			<ParamItem
			v-if="triggerMode"
			:paramData="param_trigger_waitForWinner"
			v-model="localData.triggerWaitForWinner">
				<div class="parameter-child card-item placeholderInfo primary">
					<Icon name="info" />
					<i18n-t scope="global" tag="span" keypath="raffle.params.trigger_waitForWinner_placeholder">
						<template #PLACEHOLDER>
							<mark v-click2Select>{RAFFLE_WINNER_ENTRY}</mark>
						</template>
					</i18n-t>
				</div>
			</ParamItem>
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
import { reactive, watch } from 'vue';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import TabMenu from '../TabMenu.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import FormVoiceControllHelper from '../voice/FormVoiceControllHelper';
import VoiceGlobalCommandsHelper from '../voice/VoiceGlobalCommandsHelper.vue';

@Component({
	components:{
		TTButton,
		TabMenu,
		ParamItem,
		ToggleBlock,
		ClearButton,
		PostOnChatParam,
		VoiceGlobalCommandsHelper,
	},
	emits:["close"]
})
class RaffleForm extends AbstractSidePanel {

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

	public param_command:TwitchatDataTypes.ParameterData<boolean, any, any>				= {value:true, type:"boolean", labelKey:"raffle.params.command_join", icon:"commands"};
	public param_commandValue:TwitchatDataTypes.ParameterData<string>					= {value:"", type:"string", labelKey:"raffle.params.command", placeholderKey:"raffle.params.command_placeholder"};
	public param_reward:TwitchatDataTypes.ParameterData<boolean, any, any>				= {value:false, type:"boolean", labelKey:"raffle.params.reward_join", icon:"channelPoints"};
	public param_rewardvalue:TwitchatDataTypes.ParameterData<string>					= {value:"", type:"list", listValues:[], labelKey:"raffle.params.reward", placeholderKey:"raffle.params.command_placeholder"};
	public param_tip_kofi:TwitchatDataTypes.ParameterData<boolean>						= {value:false, type:"boolean", labelKey:"raffle.params.tip_kofi", icon:"kofi"};
	public param_tip_streamlabs:TwitchatDataTypes.ParameterData<boolean>				= {value:false, type:"boolean", labelKey:"raffle.params.tip_streamlabs", icon:"streamlabs"};
	public param_tip_streamlabsCharity:TwitchatDataTypes.ParameterData<boolean>			= {value:false, type:"boolean", labelKey:"raffle.params.tip_streamlabsCharity", icon:"charity"};
	public param_tip_streamlements:TwitchatDataTypes.ParameterData<boolean>				= {value:false, type:"boolean", labelKey:"raffle.params.tip_streamelements", icon:"streamelements"};
	public param_tip_tipeee:TwitchatDataTypes.ParameterData<boolean>					= {value:false, type:"boolean", labelKey:"raffle.params.tip_tipeee", icon:"tipeee"};
	public param_tip_tiltify:TwitchatDataTypes.ParameterData<boolean>					= {value:false, type:"boolean", labelKey:"raffle.params.tip_tiltify", icon:"tiltify"};
	public param_tip_twitchCharity:TwitchatDataTypes.ParameterData<boolean>				= {value:false, type:"boolean", labelKey:"raffle.params.tip_twitchCharity", icon:"twitch_charity"};
	public param_tip_kofi_minAmount:TwitchatDataTypes.ParameterData<number>				= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_minAmount"};
	public param_tip_streamlabs_minAmount:TwitchatDataTypes.ParameterData<number>		= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_minAmount"};
	public param_tip_streamlabsCharity_minAmount:TwitchatDataTypes.ParameterData<number>= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_minAmount"};
	public param_tip_streamelements_minAmount:TwitchatDataTypes.ParameterData<number>	= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_minAmount"};
	public param_tip_tipeee_minAmount:TwitchatDataTypes.ParameterData<number>			= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_minAmount"};
	public param_tip_tiltify_minAmount:TwitchatDataTypes.ParameterData<number>			= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_minAmount"};
	public param_tip_twitchCharity_minAmount:TwitchatDataTypes.ParameterData<number>	= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_minAmount"};
	public param_tip_kofi_ponderate:TwitchatDataTypes.ParameterData<number>				= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_ponderate"};
	public param_tip_streamlabs_ponderate:TwitchatDataTypes.ParameterData<number>		= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_ponderate"};
	public param_tip_streamlabsCharity_ponderate:TwitchatDataTypes.ParameterData<number>= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_ponderate"};
	public param_tip_streamlements_ponderate:TwitchatDataTypes.ParameterData<number>	= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_ponderate"};
	public param_tip_tipeee_ponderate:TwitchatDataTypes.ParameterData<number>			= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_ponderate"};
	public param_tip_tiltify_ponderate:TwitchatDataTypes.ParameterData<number>			= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_ponderate"};
	public param_tip_twitchCharity_ponderate:TwitchatDataTypes.ParameterData<number>	= {value:1, type:"number", min:0, max:999999, labelKey:"raffle.params.tip_ponderate"};
	public param_enterDuration:TwitchatDataTypes.ParameterData<number>					= {value:600, type:"duration", min:1, max:365*24*60*60, labelKey:"raffle.params.duration", icon:"timer"};
	public param_maxUsersToggle:TwitchatDataTypes.ParameterData<boolean, any, any>		= {value:false, type:"boolean", labelKey:"raffle.params.limit_users", icon:"user"};
	public param_maxEntries:TwitchatDataTypes.ParameterData<number>						= {value:10, type:"number", min:0, max:1000000, labelKey:"raffle.params.max_users", icon:"user"};
	public param_multipleJoin:TwitchatDataTypes.ParameterData<boolean>					= {value:false, type:"boolean", labelKey:"raffle.params.multiple_join", icon:"user"};
	public param_autoClose:TwitchatDataTypes.ParameterData<boolean>						= {value:true, type:"boolean", labelKey:"raffle.params.param_autoClose", icon:"trash"};
	public param_ponderateVotes:TwitchatDataTypes.ParameterData<boolean, any, any>		= {value:false, type:"boolean", labelKey:"raffle.params.ponderate", icon:"balance"};
	public param_ponderateVotes_vip:TwitchatDataTypes.ParameterData<number>				= {value:0, type:"number", min:0, max:100, icon:"vip", labelKey:"raffle.params.ponderate_VIP"};
	public param_ponderateVotes_sub:TwitchatDataTypes.ParameterData<number>				= {value:0, type:"number", min:0, max:100, icon:"sub", labelKey:"raffle.params.ponderate_sub"};
	public param_ponderateVotes_subT2:TwitchatDataTypes.ParameterData<number>			= {value:0, type:"number", min:0, max:100, icon:"sub", labelKey:"raffle.params.ponderate_subT2", twitch_scopes:[TwitchScopes.LIST_SUBSCRIBERS]};
	public param_ponderateVotes_subT3:TwitchatDataTypes.ParameterData<number>			= {value:0, type:"number", min:0, max:100, icon:"sub", labelKey:"raffle.params.ponderate_subT3", twitch_scopes:[TwitchScopes.LIST_SUBSCRIBERS]};
	public param_ponderateVotes_subgift:TwitchatDataTypes.ParameterData<number>			= {value:0, type:"number", min:0, max:100, icon:"gift", labelKey:"raffle.params.ponderate_subgifter"};
	public param_ponderateVotes_follower:TwitchatDataTypes.ParameterData<number>		= {value:0, type:"number", min:0, max:100, icon:"follow", labelKey:"raffle.params.ponderate_follower", twitch_scopes:[TwitchScopes.LIST_FOLLOWERS]};
	public param_subs_includeGifters:TwitchatDataTypes.ParameterData<boolean>			= {value:true, type:"boolean", icon:"gift", labelKey:"raffle.params.ponderate_include_gifter"};
	public param_subs_excludeGifted:TwitchatDataTypes.ParameterData<boolean>			= {value:true, type:"boolean", icon:"sub", labelKey:"raffle.params.ponderate_exclude_gifted"};
	public param_showCountdownOverlay:TwitchatDataTypes.ParameterData<boolean>			= {value:false, type:"boolean", icon:"countdown", labelKey:"raffle.configs.countdown"};
	public param_customEntries:TwitchatDataTypes.ParameterData<string>					= {value:"", type:"string", longText:true, maxLength:10000, placeholderKey:"raffle.params.list_placeholder"};
	public param_values:TwitchatDataTypes.ParameterData<TwitchatDataTypes.ValueData|null, TwitchatDataTypes.ValueData, undefined, TwitchatDataTypes.ValueData>	= {value:null, type:"list", labelKey:"raffle.params.value_placeholder", icon:"placeholder"};
	public param_values_splitter:TwitchatDataTypes.ParameterData<string>				= {value:",", type:"string", maxLength:5, labelKey:"raffle.params.value_splitter", icon:"splitter"};
	public param_values_remove:TwitchatDataTypes.ParameterData<boolean>					= {value:false, type:"boolean", labelKey:"raffle.params.value_remove", icon:"trash"};
	public param_list_remove:TwitchatDataTypes.ParameterData<boolean>					= {value:false, type:"boolean", labelKey:"raffle.params.list_remove", icon:"trash"};
	public param_trigger_waitForWinner:TwitchatDataTypes.ParameterData<boolean>			= {value:false, type:"boolean", labelKey:"raffle.params.trigger_waitForWinner", icon:"countdown"};

	public winnerPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	public winnerTipsPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	public joinPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	public joinTipsPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	public winnerSubsPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	public winnerListPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	public winnerValuesPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];

	public localData:TwitchatDataTypes.RaffleData = {
		mode:"chat",
		command:"!raffle",
		reward_id:undefined,
		duration_s:600,
		maxEntries:0,
		autoClose:true,
		multipleJoin:false,
		created_at:Date.now(),
		entries:[],
		followRatio: 1,
		vipRatio: 1,
		subRatio: 1,
		subT2Ratio: 1,
		subT3Ratio: 1,
		subgiftRatio: 1,
		subMode_includeGifters: false,
		subMode_excludeGifted: false,
		showCountdownOverlay: false,
		customEntries: "",
		value_id: undefined,
		value_splitter: undefined,
		removeWinningEntry: false,
		tip_kofi:false,
		tip_streamlabs:false,
		tip_streamlabsCharity:false,
		tip_streamelements:false,
		tip_tipeee:false,
		tip_tiltify:false,
		tip_twitchCharity:false,
		tip_kofi_minAmount:1,
		tip_streamlabs_minAmount:1,
		tip_streamlabsCharity_minAmount:1,
		tip_streamelements_minAmount:1,
		tip_tipeee_minAmount:1,
		tip_tiltify_minAmount:1,
		tip_twitchCharity_minAmount:1,
		tip_kofi_ponderate:0,
		tip_streamlabs_ponderate:0,
		tip_streamlabsCharity_ponderate:0,
		tip_streamelements_ponderate:0,
		tip_tipeee_ponderate:0,
		tip_tiltify_ponderate:0,
		tip_twitchCharity_ponderate:0,
		messages: {
			raffleStart:{
				enabled:false,
				message:StoreProxy.i18n.tm("params.botMessages.raffleStart"),
			},
			raffleJoin:{
				enabled:false,
				message:StoreProxy.i18n.tm("params.botMessages.raffleJoin"),
			},
			raffleWinner:{
				enabled:false,
				message:StoreProxy.i18n.tm("params.botMessages.raffle"),
			},
		},
	}

	private subs:TwitchDataTypes.Subscriber[] = [];
	private voiceController!:FormVoiceControllHelper;

	public get hasRewards():boolean { return TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS]) && this.param_rewardvalue.listValues!.length > -1; }
	public get isAffiliate():boolean { return this.$store.auth.twitch.user.is_affiliate || this.$store.auth.twitch.user.is_partner; }

	/**
	 * Gets subs filtered by the current filters
	 */
	public get subsFiltered():TwitchDataTypes.Subscriber[] {
		return this.subs.filter(v => {
			if(this.param_subs_includeGifters.value == true && this.subs.find(v2=> v2.gifter_id == v.user_id)) return true;
			if(this.param_subs_excludeGifted.value == true && v.is_gift) return false;
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
		const splitter = this.param_customEntries.value.split(/\r|\n/).length > 1? "\r|\n" : ",";
		const list = this.param_customEntries.value.split(new RegExp(splitter, ""))
					.filter((v)=>v.length > 0)
		return list.length;
	}

	public get valueCount():number {
		if(this.param_values.value) {
			const val = this.param_values.selectedListValue?.value;
			if(!val) return 0;
			if(val.perUser) return Object.keys(val.users || {}).length;
			const splitter = this.localData.value_splitter || new RegExp(val.value.split(/\r|\n/).length > 1? "\r|\n" : ",");
			return val.value.split(splitter)
					.filter((v)=>v.length > 0).length;
		}else{
			return 0;
		}
	}

	public get startPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		const reward = StoreProxy.rewards.rewardList.find(v=>v.id == this.localData.reward_id);
		const rewardName = reward?.title || "My awesome reward";
		return [
			{tag:"CMD", descKey:"raffle.configs.message_cmd_placeholder", example:this.localData.command},
			{tag:"REWARD", descKey:"raffle.configs.message_reward_placeholder", example:rewardName},
		];
	}

	public get startTipsPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		const platforms:string[] = [];
		const minSuffix = this.$t("raffle.tips.minAmount_suffix");
		if(this.localData.tip_kofi){
			let label = "Ko-Fi";
			if((this.localData.tip_kofi_minAmount || 0) > 0) {
				label += " ("+this.localData.tip_kofi_minAmount+"🪙"+minSuffix+")";
			}
			platforms.push(label);
		}
		if(this.localData.tip_streamlabs){
			let label = "Streamlabs";
			if((this.localData.tip_streamlabs_minAmount || 0) > 0) {
				label += " ("+this.localData.tip_streamlabs_minAmount+"🪙"+minSuffix+")";
			}
			platforms.push(label);
		}
		if(this.localData.tip_streamlabsCharity){
			let label = "Streamlabs Charity";
			if((this.localData.tip_streamlabsCharity_minAmount || 0) > 0) {
				label += " ("+this.localData.tip_streamlabsCharity_minAmount+"🪙"+minSuffix+")";
			}
			platforms.push(label);
		}
		if(this.localData.tip_streamelements){
			let label = "Streamelements";
			if((this.localData.tip_streamelements_minAmount || 0) > 0) {
				label += " ("+this.localData.tip_streamelements_minAmount+"🪙"+minSuffix+")";
			}
			platforms.push(label);
		}
		if(this.localData.tip_tipeee){
			let label = "Tipeee";
			if((this.localData.tip_tipeee_minAmount || 0) > 0) {
				label += " ("+this.localData.tip_tipeee_minAmount+"🪙"+minSuffix+")";
			}
			platforms.push(label);
		}
		if(this.localData.tip_tiltify){
			let label = "Tiltify";
			if((this.localData.tip_tiltify_minAmount || 0) > 0) {
				label += " ("+this.localData.tip_tiltify_minAmount+"🪙"+minSuffix+")";
			}
			platforms.push(label);
		}
		if(this.localData.tip_twitchCharity){
			let label = "Twitch charity";
			if((this.localData.tip_twitchCharity_minAmount || 0) > 0) {
				label += " ("+this.localData.tip_twitchCharity_minAmount+"🪙"+minSuffix+")";
			}
			platforms.push(label);
		}

		return [
			{tag:"PLATFORMS", descKey:"raffle.configs.message_cmd_placeholder", example:platforms.join(", ")},
		];
	}

	public get canListSubs():boolean { return TwitchUtils.hasScopes([TwitchScopes.LIST_SUBSCRIBERS]); }

	public beforeMount(): void {
		this.winnerPlaceholders			= [{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store.auth.twitch.user.displayNameOriginal}];
		this.joinPlaceholders			= [{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store.auth.twitch.user.displayNameOriginal+", @Twitch, @Durss"}];
		this.winnerTipsPlaceholders		= [
			{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store.auth.twitch.user.displayNameOriginal},
			{tag:"AMOUNT", descKey:"raffle.params.amount_placeholder", example:"$25"},
			{tag:"PLATFORM", descKey:"raffle.params.amount_placeholder", example:"Streamlabs"},
		];
		this.joinTipsPlaceholders		= [
			{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store.auth.twitch.user.displayNameOriginal+", Twitch, Durss"},
			{tag:"AMOUNT", descKey:"raffle.params.amount_placeholder", example:"$25"},
			{tag:"PLATFORM", descKey:"raffle.params.amount_placeholder", example:"Streamlabs"},
		];
		this.winnerSubsPlaceholders		= [
			{tag:"USER", descKey:"raffle.params.usernames_placeholder", example:this.$store.auth.twitch.user.displayNameOriginal},
		];
		this.winnerListPlaceholders		=
		this.winnerValuesPlaceholders	= [
			{tag:"ENTRY", descKey:"raffle.params.entry_placeholder", example:"My Awesome Entry"},
		];

		this.param_rewardvalue.listValues = [{value:undefined, labelKey:"global.select_placeholder"}];

		if(this.isAffiliate) {
			TwitchUtils.getRewards().then(list => {
				list.sort((a,b)=> {
					if(a.title > b.title) return 1;
					if(a.title < b.title) return -1;
					return 0
				}).forEach(v=> {
					this.param_rewardvalue.listValues!.push({value:v.id, label:v.title});
				});
			});
		}

		this.param_values.listValues = this.$store.values.valueList.map(v=> {
			return <TwitchatDataTypes.ParameterDataListValue<TwitchatDataTypes.ValueData>>{value:v, label:v.name};
		})

		if(this.triggerMode !== false) {
			if(this.action.raffleData) {
				this.localData = this.action.raffleData;
				this.param_command.value = this.action.raffleData.command != undefined;
				this.param_maxUsersToggle.value = this.action.raffleData.maxEntries > 0;
				this.param_reward.value = this.action.raffleData.reward_id != undefined;
				const preselectedValue = this.param_values.listValues.find(v=>v.value.id === this.action.raffleData.value_id)?.value;
				if(preselectedValue) {
					this.param_values.value = preselectedValue;
				}

				if(this.triggerMode && this.action) {
					if(!this.action.raffleData.messages) {
						this.action.raffleData.messages = reactive({
							raffleStart:{
								enabled:false,
								message:this.$store.i18n.t("params.botMessages.raffleStart")
							},
							raffleJoin:{
								enabled:false,
								message:this.$store.i18n.t("params.botMessages.raffleJoin")
							},
							raffleWinner:{
								enabled:false,
								message:this.$store.i18n.t("params.botMessages.raffle")
							}
						});
					}
				}
			}

			this.param_customEntries.placeholderList = TriggerEventPlaceholders(this.triggerData.type);
		}else{
			this.param_showCountdownOverlay.value = DataStore.get(DataStore.RAFFLE_OVERLAY_COUNTDOWN) === "true";
		}

		watch(()=>this.localData, ()=>this.onValueChange(), {deep:true});
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

		watch(()=>this.param_showCountdownOverlay.value, ()=>{
			if(this.triggerMode) return;

			DataStore.set(DataStore.RAFFLE_OVERLAY_COUNTDOWN, this.param_showCountdownOverlay.value)
		})

		watch(()=>this.localData.mode, () => this.onValueChange());

		this.onValueChange();

		this.pickingEntry = true;
		this.subs = await TwitchUtils.getSubsList(false);
		this.pickingEntry = false;
		// this.onValueChange();
	}

	public beforeUnmount():void {
		if(this.voiceController) this.voiceController.dispose();
	}


	/**
	 * Create a raffle
	 */
	public async submitForm():Promise<void> {
		if(this.triggerMode) return;

		const payload:TwitchatDataTypes.RaffleData = JSON.parse(JSON.stringify(this.localData)) as typeof this.localData;
		payload.messages = undefined;

		//Force autoclose for those raffle types as they don't need to persist
		if(payload.mode == "manual" || payload.mode == "values") payload.autoClose = true;

		//Sub mode specifics
		if(this.localData.mode == "sub") {
			let subs = Utils.shuffle(await TwitchUtils.getSubsList(false));
			let interval = window.setInterval(()=> {
				this.winnerTmp = Utils.pickRand(subs).user_name;
			}, 70)
			this.winner = null;
			this.pickingEntry = true;
			await Utils.promisedTimeout(2000);
			payload.resultCallback = (winner:TwitchatDataTypes.RaffleEntry)=> {
				clearInterval(interval);
				this.winnerTmp = null;
				this.winner = winner.label;
			}
		}

		this.pickingEntry = true;
		await this.$store.raffle.startRaffle(payload);
		if(this.localData.mode == "chat" || this.localData.mode == "tips") {
			this.close();
		}else{
			await Utils.promisedTimeout(500);
		}
		this.pickingEntry = false;


		if(!this.triggerMode && this.localData.mode == "manual") {
			this.param_customEntries.value = payload.customEntries;
		}
	}

	public openParam(page:TwitchatDataTypes.ParameterPagesStringType):void {
		if(this.triggerMode) {
			this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS);
		}else{
			this.$store.params.openParamsPage(page);
		}
	}

	public onValueChange():void {
		if(this.param_command.value === true) {
			this.localData.command = this.param_commandValue.value || this.$t("raffle.params.command_placeholder");
		}else{
			this.localData.command = undefined;
		}

		if(this.param_ponderateVotes.value == false) {
			this.localData.vipRatio = 0;
			this.localData.followRatio = 0;
			this.localData.subRatio = 0;
			this.localData.subT2Ratio = 0;
			this.localData.subT3Ratio = 0;
			this.localData.subgiftRatio = 0;
		}else{
			this.localData.vipRatio = this.localData.vipRatio || 1;
			this.localData.followRatio = this.localData.followRatio || 1;
			this.localData.subRatio = this.localData.subRatio || 1;
			this.localData.subT2Ratio = this.localData.subT2Ratio || 1;
			this.localData.subT3Ratio = this.localData.subT3Ratio || 1;
			this.localData.subgiftRatio = this.localData.subgiftRatio || 1;
		}

		if(this.param_maxUsersToggle.value == false) {
			this.localData.maxEntries = 0;
		}else{
			this.localData.maxEntries = this.localData.maxEntries || 100;
		}

		if(this.param_reward.value == false) {
			this.localData.reward_id = undefined;
		}

		if(this.action) {
			// this.param_rewardvalue.value = this.action.raffleData.reward_id || "";
			this.action.raffleData = this.localData;
		}

		this.localData.value_id = this.param_values.selectedListValue?.value.id;
	}

	public requestSubPermission():void {
		this.$store.auth.requestTwitchScopes([TwitchScopes.LIST_SUBSCRIBERS]);
	}

	public openValues():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.VALUES);
	}

}
export default toNative(RaffleForm);
</script>

<style scoped lang="less">
.raffleform{

	.legal {
		margin: 0 auto;
		width: 100%;
		max-width: 600px;
	}

	.triggerInfo {
		font-size: .8em;
		line-height: 1.4em;
		.icon {
			height: 1em;
			margin-right: .25em;
		}
	}

	.content {
		.voiceHelper {
			margin: auto;
		}

		.info {
			font-size: .9em;
			background-color: var(--color-primary-fader);
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

			.splitterField {
				:deep(.inputHolder) {
					align-self: flex-end;
					flex-grow: 0;
					flex-basis: 100px;
					input {
						padding-right: 1.5em;
					}
				}
			}
		}
	}

	.placeholderInfo {
		.icon {
			height: 1em;
			margin-right: .25em;
			vertical-align: baseline;
		}
	}
}
</style>
