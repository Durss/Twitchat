<template>
	<div class="overlayparamsdonationgoal overlayParamsSection">
		<div class="header">{{ $t("donation_goals.header") }}</div>

		<!-- <a href="https://www.youtube.com/playlist?list=PLJsQIzUbrDiEDuQ66YhtM6C8D3hZKL629" target="_blank" class="youtubeTutorialBt">
			<Icon name="youtube" theme="light" />
			<span>{{ $t('overlay.youtube_demo_tt') }}</span>
			<Icon name="newtab" theme="light" />
		</a> -->

		<div class="createForm">
			<TTButton class="addBt"
			v-if="$store.auth.isPremium || $store.donationGoals.overlayList.length < $config.MAX_DONATION_GOALS"
			@click="addGrid()" icon="add">{{ $t("donation_goals.create_bt") }}</TTButton>

			<div class="card-item secondary" v-else-if="$store.auth.isPremium && $store.donationGoals.overlayList.length > $config.MAX_DONATION_GOALS_PREMIUM">{{ $t("donation_goals.premium_limit") }}</div>

			<div class="premium" v-else>
				<div>{{ $t("donation_goals.non_premium_limit", {MAX:$config.MAX_DONATION_GOALS_PREMIUM}) }}</div>
				<TTButton icon="premium" @click="openPremium()" light premium>{{$t('premium.become_premiumBt')}}</TTButton>
			</div>
		</div>

		<VueDraggable class="overlayList"
		v-model="$store.donationGoals.overlayList"
		:group="{name:'bingo_grids'}"
		handle=".header"
		animation="250">
			<ToggleBlock v-for="overlay in $store.donationGoals.overlayList"
			editableTitle
			v-model:title="overlay.title"
			:titleDefault="$t('donation_goals.default_title')"
			:titleMaxLengh="30"
			:open="false"
			:key="overlay.id"
			@update:title="save(overlay.id)">

				<template #left_actions>
					<div class="leftActions">
						<ToggleButton v-model="overlay.enabled" @click.native.stop @change="save(overlay.id)" v-if="$store.auth.isPremium || overlay.enabled || $store.donationGoals.overlayList.filter(v=>v.enabled).length < $config.MAX_DONATION_GOALS" />
					</div>
				</template>

				<template #right_actions>
					<div class="rightActions">
						<TTButton @click.stop="duplicateGrid(overlay.id)" icon="copy" v-tooltip="$t('global.duplicate')" v-if="!maxOverlaysReached" />
						<TTButton @click.stop :copy="overlay.id" icon="id" v-tooltip="$t('global.copy_id')" />
						<TTButton @click.stop="$store.donationGoals.removeOverlay(overlay.id)" icon="trash" alert />
					</div>
				</template>

				<div class="form">
					<div class="card-item install">
						<label><Icon name="obs" />{{$t('donation_goals.install_title')}}</label>
						<OverlayInstaller type="donationgoals" :sourceSuffix="overlay.title" :id="overlay.id" :queryParams="{bid:overlay.id}" />
					</div>

					<form class="card-item dark simulate" @submit.prevent="simulateAmount(overlay.id)">
						<input type="number" step="any" v-model="simulatedAmount" />
						<span class="currency" v-if="overlay.currency">{{ overlay.currency }}</span>
						<TTButton icon="test" type="submit">{{ $t("donation_goals.simulate_bt") }}</TTButton>
					</form>

					<ParamItem :paramData="param_dataSource[overlay.id]" v-model="overlay.dataSource" @change="save(overlay.id)">
						<div class="card-item alert missingCharity"
						v-if="overlay.dataSource == 'streamlabs_charity' && $store.streamlabs.charityTeam == null">
							<div>{{ $t("donation_goals.streamlabs_charity_not_connected") }}</div>
							<TTButton icon="streamlabs" @click="openStreamlabs" light alert>{{ $t("global.connect") }}</TTButton>
						</div>
						<div class="card-item alert missingCharity"
						v-if="overlay.dataSource == 'tiltify' && !$store.tiltify.connected">
							<div>{{ $t("donation_goals.tiltify_not_connected") }}</div>
							<TTButton icon="tiltify" @click="openTiltify" light alert>{{ $t("global.connect") }}</TTButton>
						</div>
						<div class="card-item alert missingCharity"
						v-else-if="overlay.dataSource == 'tiltify' && $store.tiltify.campaignList.length == 0">
							<div>{{ $t("donation_goals.tiltify_no_campaign") }}</div>
						</div>
						<div class="card-item alert missingCharity"
						v-else-if="overlay.dataSource == 'counter' && $store.counters.counterList.length == 0">
							<div>{{ $t("donation_goals.counter_empty") }}</div>
							<TTButton icon="counter" @click="openCounters" light alert>{{ $t("donation_goals.counter_createBt") }}</TTButton>
						</div>
						<div class="card-item alert missingCharity"
						v-else-if="overlay.dataSource == 'twitch_charity' && !canListTwitchCharities">
							<div>{{ $t("donation_goals.twitch_charity_not_connected") }}</div>
							<TTButton icon="twitch_charity" @click="grantCharityScope" light alert>{{ $t("global.grant_scope") }}</TTButton>
						</div>
						<div class="card-item alert missingCharity"
						v-else-if="overlay.dataSource == 'twitch_charity' && !$store.twitchCharity.currentCharity">
							<div>{{ $t("donation_goals.twitch_charity_no_campaign") }}</div>
							<TTButton type="link" href="https://dashboard.twitch.tv/charity/" target="_blank" icon="newtab" alert light>{{$t("donation_goals.twitch_charity_open")}}</TTButton>
						</div>

						<ParamItem  :paramData="param_campaignId[overlay.id]" v-model="overlay.campaignId" @change="save(overlay.id)"
							v-if="(overlay.dataSource == 'streamlabs_charity' || overlay.dataSource == 'tiltify' || overlay.dataSource == 'twitch_charity') && (param_campaignId[overlay.id].listValues || []).length > 0"
							:childLevel="1" noBackground />

						<ParamItem :paramData="param_counterId[overlay.id]" v-model="overlay.counterId" @change="save(overlay.id)"
							v-if="overlay.dataSource == 'counter' && (param_counterId[overlay.id].listValues || []).length > 0" :childLevel="1" noBackground />

						<div class="parameter-child charityDetails" v-if="overlay.dataSource == 'twitch_charity' && $store.twitchCharity.currentCharity != null">
							<div class="holder">
								<span><Icon name="twitch_charity"/>{{ $t("donation_goals.param_campaignId") }}:</span>
								<a :href=" $store.twitchCharity.currentCharity!.charity_website" target="_blank"><Icon name="newtab"/>{{ $store.twitchCharity.currentCharity!.charity_name }}</a>
							</div>
						</div>

						<div class="parameter-child charityDetails" v-if="overlay.dataSource == 'streamlabs_charity' && $store.streamlabs.charityTeam != null">
							<div class="holder">
								<span><Icon name="streamlabs"/>{{ $t("donation_goals.param_campaignId") }}:</span>
								<a :href="$store.streamlabs.charityTeam.pageUrl" target="_blank"><Icon name="newtab"/>{{ $store.streamlabs.charityTeam.title }}</a>
							</div>
							<TTButton icon="refresh" @click="resyncTips()">{{ $t("donation_goals.import_streamlabs_resync") }}</TTButton>
							<TTButton icon="download" v-if="!showSLCGoalImport" @click="showSLCGoalImport = true">{{ $t("donation_goals.import_streamlabs_goals") }}</TTButton>
							<ul v-else-if="!showSLCGoalSuccess">
								<i18n-t scope="global" keypath="donation_goals.import_streamlabs_step1" tag="li">
									<template #LINK>
										<a :href="$t('donation_goals.import_streamlabs_step1_url')" target="_blank"><Icon name="newtab" />{{ $t("donation_goals.import_streamlabs_step1_link") }}</a>
									</template>
								</i18n-t>
								<li>
									<label for="slc_dg_import_url">{{ $t("donation_goals.import_streamlabs_step2") }}</label>
									<form @submit.prevent="importDonationGoalsFromSLC(overlay)">
										<input type="text" id="slc_dg_import_url" v-model="slcGoalImportURL" placeholder="https://streamlabscharity.com/widgets/milestone/...">
										<TTButton type="submit" :loading="importingSLCGoals" icon="download" primary>{{$t("global.import")}}</TTButton>
									</form>
								</li>
							</ul>
							<div class="card-item primary"
							@click="showSLCGoalSuccess = showSLCGoalImport = false;"
							v-if="showSLCGoalSuccess">
								<Icon name="checkmark"/>
								{{$t("donation_goals.import_streamlabs_complete")}}
							</div>
						</div>
					</ParamItem>
					<ParamItem :paramData="param_currency[overlay.id]" v-model="overlay.currency" @change="save(overlay.id)" class="currencyField" />
					<ParamItem :paramData="param_color[overlay.id]" v-model="overlay.color" @change="save(overlay.id)" />
					<ParamItem :paramData="param_notifyTips[overlay.id]" v-model="overlay.notifyTips" @change="save(overlay.id)" v-if="overlay.dataSource != 'counter'" />
					<ParamItem :paramData="param_autoDisplay[overlay.id]" v-model="overlay.autoDisplay" @change="save(overlay.id)" />
					<ParamItem :paramData="param_hideDone[overlay.id]" v-model="overlay.hideDone" @change="save(overlay.id)">
						<ParamItem :paramData="param_hideDelay[overlay.id]" v-model="overlay.hideDelay" @change="save(overlay.id)" :childLevel="1" noBackground />
					</ParamItem>
					<ParamItem :paramData="param_limitEntryCount[overlay.id]" v-model="overlay.limitEntryCount" @change="save(overlay.id)">
						<ParamItem :paramData="param_maxDisplayedEntries[overlay.id]" v-model="overlay.maxDisplayedEntries" @change="save(overlay.id)" :childLevel="1" noBackground />
					</ParamItem>

					<Splitter>{{ $t("donation_goals.goal_list") }}</Splitter>

					<div class="goalItemList" v-if="overlay.goalList.length > 0">
						<div class="card-item goalItem" v-for="goal in (overlay.goalList || [])" :key="goal.id">
							<input class="amount" type="number" v-model="goal.amount" min="0" max="1000000000" @change="save(overlay.id)" step="any">
							<TTButton @click.stop :copy="goal.id" icon="id" v-tooltip="$t('global.copy_id')" class="copyIdBt" small />
							<span class="currency" v-if="overlay.currency">{{ overlay.currency }}</span>
							<textarea class="title"
								rows="1"
								maxlength="150"
								v-model="goal.title"
								:placeholder="$t('donation_goals.param_goal_title_placeholder')"
								@change="save(overlay.id)"
								@blur="goal.title = goal.title.substring(0,150)"></textarea>
							<TTButton @click="removeGoal(overlay, goal.id)" icon="trash" alert />
							<ParamItem class="secret" :paramData="param_goal_secret[goal.id]" v-model="goal.secret" @change="onSecretChange(goal); save(overlay.id)" noBackground>
								<div class="parameter-child secretOptions">
									<div class="holder option">
										<label :for="'secret_blur_'+goal.id">{{  $t('donation_goals.param_goal_secret_blur') }}</label>
										<input type="radio"
											v-model="goal.secret_type"
											:name="'secret_type-'+goal.id"
											value="blur"
											:id="'secret_blur_'+goal.id"
											@change="save(overlay.id)">
									</div>
								</div>
								<div class="parameter-child secretOptions">
									<div class="holder option">
										<label :for="'secret_preogressive_'+goal.id">{{  $t('donation_goals.param_goal_secret_progressive') }}</label>
										<input type="radio"
											v-model="goal.secret_type"
											:name="'secret_type-'+goal.id"
											value="progressive"
											:id="'secret_preogressive_'+goal.id"
											@change="save(overlay.id)">
										</div>
								</div>
							</ParamItem>
						</div>
					</div>

					<TTButton @click="addGoal(overlay)" icon="add" class="addGoalBt">{{ $t("donation_goals.add_goal_bt") }}</TTButton>
				</div>
			</ToggleBlock>
		</VueDraggable>
	</div>
</template>

<script lang="ts">
import Splitter from '@/components/Splitter.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { VueDraggable } from 'vue-draggable-plus';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import DurationForm from '@/components/DurationForm.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';

@Component({
	components:{
		TTButton,
		Splitter,
		ParamItem,
		ToggleBlock,
		ToggleButton,
		DurationForm,
		VueDraggable,
		OverlayInstaller,
	},
	emits:[],
})
class OverlayParamsDonationGoal extends Vue {

	public simulatedAmount:number = 10;
	public slcGoalImportURL:string = "";
	public importingSLCGoals:boolean = false;
	public showSLCGoalImport:boolean = false;
	public showSLCGoalSuccess:boolean = false;

	public param_color:{[overlayId:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_showCurrency:{[overlayId:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_currency:{[overlayId:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_notifyTips:{[overlayId:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_autoDisplay:{[overlayId:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_hideDone:{[overlayId:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_hideDelay:{[overlayId:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_limitEntryCount:{[overlayId:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_maxDisplayedEntries:{[overlayId:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_goal_secret:{[overlayId:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_goal_secret_type:{[overlayId:string]:TwitchatDataTypes.ParameterData<TwitchatDataTypes.DonationGoalOverlayConfig["goalList"][number]["secret_type"]>} = {};
	public param_dataSource:{[overlayId:string]:TwitchatDataTypes.ParameterData<TwitchatDataTypes.DonationGoalOverlayConfig["dataSource"], TwitchatDataTypes.DonationGoalOverlayConfig["dataSource"]>} = {};
	public param_campaignId:{[overlayId:string]:TwitchatDataTypes.ParameterData<string, string>} = {};
	public param_counterId:{[overlayId:string]:TwitchatDataTypes.ParameterData<string, string>} = {};

	private prevSimulatedAmount = 0;

	public get maxOverlaysReached():boolean {
		if(this.$store.auth.isPremium) {
			return this.$store.donationGoals.overlayList.length >= this.$config.MAX_DONATION_GOALS_PREMIUM;
		}else{
			return this.$store.donationGoals.overlayList.length >= this.$config.MAX_DONATION_GOALS;
		}
	}

	/**
	 * Get if charity read scope has been granted
	 */
	public get canListTwitchCharities():boolean {
		return TwitchUtils.hasScopes([TwitchScopes.CHARITY_READ]);
	}

	/**
	 * Save data to storage
	 */
	public beforeMount():void {
		this.initParams();
	}

	/**
	 * Opens Tiltify parameters
	 */
	public openTiltify():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.TILTIFY);
	}

	/**
	 * Opens Streamlabs parameters
	 */
	public openStreamlabs():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.STREAMLABS);
	}

	/**
	 * Opens Counters parameters
	 */
	public openCounters():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.COUNTERS);
	}

	/**
	 * Request for charity scope
	 */
	public grantCharityScope():void {
		TwitchUtils.requestScopes([TwitchScopes.CHARITY_READ]);
	}

	/**
	 * Save data to storage
	 */
	public save(overlayId:string):void {
		this.$store.donationGoals.saveData(overlayId);
	}

	/**
	 * Create a new grid
	 */
	public addGrid():void {
		this.$store.donationGoals.addOverlay();
		this.initParams();
	}

	/**
	 * Duplicate given grid ID
	 */
	public duplicateGrid(id:string):void {
		this.$store.donationGoals.duplicateOverlay(id)
		this.initParams();
	}

	/**
	 * Opens the premium section
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Add a goal entry
	 */
	public addGoal(overlay:TwitchatDataTypes.DonationGoalOverlayConfig, title:string = "", amount:number = 0):void {
		const goal:TwitchatDataTypes.DonationGoalOverlayConfig["goalList"][number] = {
			id:Utils.getUUID(),
			amount,
			title,
			secret:false,
			secret_type: "blur",
		};

		this.param_goal_secret[goal.id]	= {type:"boolean", value:false, labelKey:"donation_goals.param_goal_secret", icon:"anon"};

		this.param_maxDisplayedEntries[overlay.id].max = overlay.goalList.length;

		overlay.goalList.push(goal);

		this.save(overlay.id);
	}

	/**
	 * Removes a goal
	 */
	public removeGoal(overlay:TwitchatDataTypes.DonationGoalOverlayConfig, goalId:string):void {
		for (let i = 0; i < overlay.goalList.length; i++) {
			const goal = overlay.goalList[i];
			if(goal.id != goalId) continue;
			overlay.goalList.splice(i, 1);
			i--;
		}
		this.save(overlay.id);
	}

	/**
	 * Import donation goals from streamlabs charity
	 * @param id
	 */
	public async importDonationGoalsFromSLC(overlay:TwitchatDataTypes.DonationGoalOverlayConfig):Promise<void> {
		this.importingSLCGoals = true;
		const token = this.slcGoalImportURL.split("/").pop();
		const goalRes = await fetch("https://streamlabscharity.com/api/v1/widgets/milestones/"+token);
		if(goalRes) {
			const goalJSON = await goalRes.json() as {campaign:{milestones:{display_name:string, amount:number}[]}};
			goalJSON.campaign.milestones.forEach(v=> {
				this.addGoal(overlay, v.display_name, v.amount/100);
			});
			this.showSLCGoalSuccess = true;
		}
		this.importingSLCGoals = false;
	}

	/**
	 * Simulates a new amount
	 */
	public simulateAmount(overlayId:string, forcedAmount?:number):void {
		if(forcedAmount != undefined) this.simulatedAmount = forcedAmount;
		this.$store.donationGoals.simulateDonation(overlayId, this.simulatedAmount, this.simulatedAmount - this.prevSimulatedAmount);
		this.prevSimulatedAmount = this.simulatedAmount;
	}

	/**
	 * Called when secret state of a goal is changed.
	 * Initialize the default secret style
	 */
	public onSecretChange(goal:TwitchatDataTypes.DonationGoalOverlayConfig["goalList"][0]):void {
		if(goal.secret && !goal.secret_type) {
			goal.secret_type = "blur";
		}
	}

	public resyncTips():void {
		this.$store.streamlabs.resyncCharityTips();
	}

	/**
	 * Create parameters for a bingo entry
	 * @param id
	 */
	private initParams():void {
		this.$store.donationGoals.overlayList.forEach(overlay=> {
			const id = overlay.id;

			//Ignore if already initialized
			if(this.param_notifyTips[id]) return;
			if(overlay.hideDelay === undefined) overlay.hideDelay = 10;

			this.param_color[id]				= {type:"color", value:"", labelKey:"donation_goals.param_color", icon:"color"};
			this.param_showCurrency[id]			= {type:"boolean", value:"", labelKey:"donation_goals.param_showCurrency", icon:"coin"};
			this.param_currency[id]				= {type:"string", value:"", maxLength:5, labelKey:"donation_goals.param_currency", icon:"font"};
			this.param_notifyTips[id]			= {type:"boolean", value:overlay.notifyTips, labelKey:"donation_goals.param_notifyTips", icon:"notification"};
			this.param_autoDisplay[id]			= {type:"boolean", value:overlay.autoDisplay, labelKey:"donation_goals.param_autoDisplay", icon:"hide"};
			this.param_hideDone[id]				= {type:"boolean", value:overlay.hideDone, labelKey:"donation_goals.param_hideDone", icon:"timer"};
			this.param_hideDelay[id]			= {type:"duration", value:overlay.hideDelay || 10, max:600, labelKey:"donation_goals.param_hideDelay", icon:"timer"};
			this.param_limitEntryCount[id]		= {type:"boolean", value:overlay.limitEntryCount, labelKey:"donation_goals.param_limitEntryCount", icon:"number"};
			this.param_maxDisplayedEntries[id]	= {type:"number", value:overlay.maxDisplayedEntries, min:0, max:overlay.goalList.length, labelKey:"donation_goals.param_maxDisplayedEntries", icon:"number"};
			this.param_campaignId[id]			= {type:"list", value:"", labelKey:"donation_goals.param_campaignId", icon:"charity"};
			this.param_counterId[id]			= {type:"list", value:"", labelKey:"donation_goals.param_counterId", icon:"count"};
			this.param_dataSource[id]			= {type:"list", value:overlay.dataSource, labelKey:"donation_goals.param_dataSource", icon:"charity", editCallback:(data)=> {
				switch(data.value) {
					case "streamlabs_charity": {
						this.param_campaignId[id].listValues = [];
						this.param_campaignId[id].icon = "streamlabs";
						break;
					}

					case "tiltify": {
						const list:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
						this.$store.tiltify.campaignList.forEach(c=>{
							list.push({
								value:c.id,
								label:c.name,
							});
						})
						this.param_campaignId[id].listValues = list;
						this.param_campaignId[id].icon = "tiltify";
						break;
					}

					case "counter": {
						const list:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
						this.$store.counters.counterList
						.filter(c=>c.perUser !== true)
						.forEach(c=>{
							list.push({
								value:c.id,
								label:c.name,
							});
						})
						this.param_counterId[id].listValues = list;
					}
				}
			}};
			//Make sure the campaign list is up to date on init
			this.param_dataSource[id].editCallback!(this.param_dataSource[id]);

			this.param_dataSource[id].listValues = [
				{value:"tiltify", label:"Tiltify"},
				{value:"streamlabs_charity", label:"Streamlabs Charity"},
				{value:"twitch_charity", labelKey:"donation_goals.twitch_charity"},
				{value:"counter", labelKey:"donation_goals.counter_entry"},
				{value:"twitch_subs", labelKey:"donation_goals.twitch_subs_entry"},
				{value:"twitch_followers", labelKey:"donation_goals.twitch_followers_entry"},
			]

			overlay.goalList.sort((a,b)=>a.amount-b.amount).forEach(goal=>{
				this.param_goal_secret[goal.id]			= {type:"boolean", value:goal.secret, labelKey:"donation_goals.param_goal_secret", icon:"anon"};
				this.param_goal_secret_type[goal.id]	= {type:"string", value:"blur", labelKey:"donation_goals.param_goal_secret", icon:"anon"};
			})
		});
	}

}
export default toNative(OverlayParamsDonationGoal);
</script>

<style scoped lang="less">
.overlayparamsdonationgoal{
    width: 100%;
    max-width: 600px;
	min-width: 330px !important;
	display: flex;
	flex-direction: column;
	justify-content: stretch;

	.missingCharity {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: .5em;
	}
	.charityDetails {
		gap: .5em;
		display: flex;
		flex-direction: column;
		.icon {
			height: 1em;
			margin-right: .25em;
			vertical-align: middle;
		}
		.holder {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			a {
				flex-basis: 300px;
			}
		}

		ul {
			list-style-position: inside;
			li:not(last-child) {
				margin-bottom: .5em;
			}
			form {
				display: flex;
				flex-direction: row;
				flex-grow: 1;
				margin-top: .25em;

				input {
					width: 0;
					flex-grow: 1;
				}
				&>* {
					border-radius: 0;
				}
				&>:first-child {
					border-top-left-radius: var(--border-radius);
					border-bottom-left-radius: var(--border-radius);
				}
				&>:last-child {
					border-top-right-radius: var(--border-radius);
					border-bottom-right-radius: var(--border-radius);
				}
			}
		}
	}

	.createForm {
		text-align: center;
		.premium {
			background-color: var(--color-premium);
			border-radius: var(--border-radius);
			padding: .5em;
			.button {
				margin-top: .5em;
			}
		}
	}

	.form, .goalItemList {
		gap: .5em;
		display: flex;
		flex-direction: column;
	}

	.simulate {
		gap: 1px;
		display: flex;
		flex-direction: row;
		justify-content: center;
		&>*{
			border-radius: 0;
		}
		&>:first-child {
			border-top-left-radius: var(--border-radius);
			border-bottom-left-radius: var(--border-radius);
		}
		&>:last-child {
			border-top-right-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);
		}
		input {
			text-align: right;
			width: 0;
			flex-basis: 100px;
		}
	}

	.missingCharity {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.overlayList {
		display: flex;
		flex-direction: column;
		justify-content: stretch;
		gap: .5em;

		.install {
			gap: .5em;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: space-between;
			.icon {
				height: 1em;
			}
			label {
				gap: .5em;
				display: flex;
				flex-direction: row;
				align-items: center;
			}
		}

		.leftActions {
			align-self: stretch;
		}

		.rightActions, .leftActions {
			gap: .25em;
			display: flex;
			flex-direction: row;
			align-items: center;
			flex-shrink: 0;
			.button {
				margin: -.5em 0;
				align-self: stretch;
				border-radius: 0;
				flex-shrink: 0;
				padding: 0 .5em;
			}
		}

		.currencyField {
			:deep(.inputHolder) {
				max-width: 135px;
			}
		}

		.splitter {
			margin: 1em 0 .5em 0;
		}

		.goalItem {
			gap: 1px;
			row-gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			position: relative;
			overflow: visible;
			&>*{
				border-radius: 0;
			}
			&>:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			.button {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
			.amount {
				min-width: 3em;
				flex-shrink: 0;
				text-align: right;
				field-sizing: content;
			}
			.title {
				flex-grow: 1;
				width: 0;
				resize: vertical;
				min-height: 1.75em;
				field-sizing: content;
			}
			.secret {
				flex-basis: 100%;
				.secretOptions {
					gap: .5em;
					display: flex;
					flex-direction: column;
					.option {
						display: flex;
						flex-direction: row;
						justify-content: space-between;
						label {
							flex-grow: 1;
							cursor: pointer;
						}
					}
				}
			}

			.copyIdBt {
				position: absolute;
				top: 0;
				left: 0;
				z-index: 1;
				border-radius: var(--border-radius);
				transform: translate(-25%, -25%);
				opacity: 0;
			}

			&:hover {
				background-color: var(--background-color-fader);
				.copyIdBt {
					opacity: 1;
				}
			}
		}

		.addGoalBt {
			align-self: center;
		}
		.currency {
			background-color: var(--background-color-fader);
			margin-left: -1px;
			display: flex;
			align-items: center;
			padding-right: .5em;
			font-size: .7em;
		}
	}
}
</style>
