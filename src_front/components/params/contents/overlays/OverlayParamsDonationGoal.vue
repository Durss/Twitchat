<template>
	<div class="overlayparamsdonationgoal overlayParamsSection">
		
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
						<TTButton @click.stop="$store.donationGoals.removeOverlay(overlay.id)" icon="trash" alert />
					</div>
				</template>

				<div class="form">
					<div class="card-item install">
						<label><Icon name="obs" />{{$t('donation_goals.install_title')}}</label>
						<OverlayInstaller type="donationgoals" :sourceSuffix="overlay.title" :id="overlay.id" :queryParams="{bid:overlay.id}" />
					</div>

					<ParamItem :paramData="param_color[overlay.id]" v-model="overlay.color" @change="save(overlay.id)" />
					<ParamItem :paramData="param_notifyTips[overlay.id]" v-model="overlay.notifyTips" @change="save(overlay.id)" />
					<ParamItem :paramData="param_autoDisplay[overlay.id]" v-model="overlay.autoDisplay" @change="save(overlay.id)" />
					<ParamItem :paramData="param_limitEntryCount[overlay.id]" v-model="overlay.limitEntryCount" @change="save(overlay.id)">
						<ParamItem :paramData="param_maxDisplayedEntries[overlay.id]" v-model="overlay.maxDisplayedEntries" @change="save(overlay.id)" :childLevel="1" noBackground />
					</ParamItem>

					<Splitter>{{ $t("donation_goals.goal_list") }}</Splitter>

					<div class="goalItemList" v-if="overlay.goalList.length > 0">
						<div class="card-item goalItem" v-for="goal in (overlay.goalList || [])" :key="goal.id">
							<input class="amount" type="number" v-model="goal.amount" min="0" max="1000000000" @change="save(overlay.id)" step="any">
							<span class="currency">{{ $store.streamlabs.charityTeam?.currency }}</span>
							<textarea class="title" type="text" v-model="goal.title" @change="save(overlay.id)" rows="1" maxlength="100"></textarea>
							<TTButton @click="removeGoal(overlay, goal.id)" icon="trash" alert />
							<!-- <ParamItem :paramData="param_goal_title[goal.id]" v-model="goal.title" @change="save(overlay.id)" noBackground />
							<ParamItem :paramData="param_goal_amount[goal.id]" v-model="goal.amount" @change="save(overlay.id)" noBackground /> -->
							<ParamItem class="secret" :paramData="param_goal_secret[goal.id]" v-model="goal.secret" @change="save(overlay.id)" noBackground />
						</div>
					</div>

					<TTButton @click="addGoal(overlay)" icon="add" class="addGoalBt">{{ $t("donation_goals.add_goal_bt") }}</TTButton>
				</div>
			</ToggleBlock>
		</VueDraggable>
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { VueDraggable } from 'vue-draggable-plus';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import Splitter from '@/components/Splitter.vue';

@Component({
	components:{
		TTButton,
		Splitter,
		ParamItem,
		ToggleBlock,
		ToggleButton,
		VueDraggable,
		OverlayInstaller,
	},
	emits:[],
})
class OverlayParamsDonationGoal extends Vue {
	
	public param_color:{[overlayId:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_showCurrency:{[overlayId:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_currency:{[overlayId:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_notifyTips:{[overlayId:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_autoDisplay:{[overlayId:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_limitEntryCount:{[overlayId:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_maxDisplayedEntries:{[overlayId:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_goal_title:{[overlayId:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_goal_amount:{[overlayId:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_goal_secret:{[overlayId:string]:TwitchatDataTypes.ParameterData<boolean>} = {};

	public get maxOverlaysReached():boolean {
		if(this.$store.auth.isPremium) {
			return this.$store.donationGoals.overlayList.length >= this.$config.MAX_DONATION_GOALS_PREMIUM;
		}else{
			return this.$store.donationGoals.overlayList.length >= this.$config.MAX_DONATION_GOALS;
		}
	}

	/**
	 * Save data to storage
	 */
	public beforeMount():void {
		this.initParams();
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
	 * Opens the premium section
	 */
	public addGoal(overlay:TwitchatDataTypes.DonationGoalOverlayConfig):void {
		const goal:TwitchatDataTypes.DonationGoalOverlayConfig["goalList"][number] = {
			id:Utils.getUUID(),
			amount:0,
			secret:false,
			title:"",
		};

		this.param_goal_title[goal.id]	= {type:"string", value:"", labelKey:"donation_goals.param_goal_title", icon:"font"};
		this.param_goal_secret[goal.id]	= {type:"boolean", value:false, labelKey:"donation_goals.param_goal_secret", icon:"anon"};
		this.param_goal_amount[goal.id]	= {type:"number", value:0, min:0, max:1000000000, labelKey:"donation_goals.param_goal_amount", icon:"coin"};
		
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
	 * Create parameters for a bingo entry
	 * @param id
	 */
	private initParams():void {
		this.$store.donationGoals.overlayList.forEach(overlay=> {
			const id = overlay.id;

			//Ignore if already initialized
			if(this.param_notifyTips[id]) return;

			this.param_color[id]				= {type:"color", value:"", labelKey:"donation_goals.param_color", icon:"color"};
			this.param_showCurrency[id]			= {type:"boolean", value:"", labelKey:"donation_goals.param_showCurrency", icon:"coin"};
			this.param_currency[id]				= {type:"string", value:"", labelKey:"donation_goals.param_currency", icon:"coin"};
			this.param_notifyTips[id]			= {type:"boolean", value:overlay.notifyTips, labelKey:"donation_goals.param_notifyTips", icon:"notification"};
			this.param_autoDisplay[id]			= {type:"boolean", value:overlay.autoDisplay, labelKey:"donation_goals.param_autoDisplay", icon:"show"};
			this.param_limitEntryCount[id]		= {type:"boolean", value:overlay.limitEntryCount, labelKey:"donation_goals.param_limitEntryCount", icon:"number"};
			this.param_maxDisplayedEntries[id]	= {type:"number", value:overlay.maxDisplayedEntries, min:0, max:overlay.goalList.length, labelKey:"donation_goals.param_maxDisplayedEntries", icon:"number"};

			overlay.goalList.sort((a,b)=>a.amount-b.amount).forEach(goal=>{
				this.param_goal_title[goal.id]	= {type:"string", value:goal.title, labelKey:"donation_goals.param_goal_title", icon:"font"};
				this.param_goal_secret[goal.id]	= {type:"boolean", value:goal.secret, labelKey:"donation_goals.param_goal_secret", icon:"anon"};
				this.param_goal_amount[goal.id]	= {type:"number", value:goal.amount, min:0, max:1000000000, labelKey:"donation_goals.param_goal_amount", icon:"coin"};
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
		.flip-list-leave-to {
			display: none !important;
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

		.splitter {
			margin: 1em 0 .5em 0;
		}

		.goalItem {
			gap: 1px;
			row-gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			*:not(:last-child) {
				border-radius: 0;
			}
			*:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			.amount {
				min-width: 3em;
				flex-shrink: 0;
				text-align: right;
				field-sizing: content;
			}
			.currency {
				background-color: var(--background-color-fader);
				margin-left: -1px;
				display: flex;
				align-items: center;
				padding-right: .5em;
				font-size: .7em;
			}
			.title {
				flex-grow: 1;
				width: 0;
				resize: vertical;
				min-height: 1.75em;
				field-sizing: content;
			}
			.button {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
			.secret {
				flex-basis: 100%;
			}
		}

		.addGoalBt {
			align-self: center;
		}
	}
}
</style>