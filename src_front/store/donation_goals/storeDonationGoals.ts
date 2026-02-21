import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import StoreProxy, { type IDonationGoalActions, type IDonationGoalGetters, type IDonationGoalState } from '../StoreProxy';


const donationGoalStatesCache:Record<string, number> = {"coucou":0};

export const storeDonationGoals = defineStore('donationGoals', {
	state: () => ({
		overlayList: [],
	} as IDonationGoalState),



	getters: {
	} as IDonationGoalGetters
	& ThisType<UnwrapRef<IDonationGoalState> & _StoreWithGetters<IDonationGoalGetters> & PiniaCustomProperties>
	& _GettersTree<IDonationGoalState>,



	actions: {
		/**
		 * Populates store from DataStorage
		 */
		populateData():void {
			const json = DataStore.get(DataStore.DONATION_GOALS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.overlayList = data.overlayList || [];
			}

			/**
			 * Listen for overlays requesting their parameters
			 */
			PublicAPI.instance.addEventListener("GET_DONATION_GOALS_OVERLAY_CONFIGS", (event)=>{
				if(!event.data) return;
				if(!event.data.id) return;
				this.broadcastData(event.data.id);
			});
			this.broadcastData();
		},

		addOverlay():TwitchatDataTypes.DonationGoalOverlayConfig {
			const data:TwitchatDataTypes.DonationGoalOverlayConfig = {
				id:Utils.getUUID(),
				dataSource:"streamlabs_charity",
				title:"",
				enabled:true,
				hideDone:true,
				autoDisplay:false,
				notifyTips:true,
				limitEntryCount:false,
				maxDisplayedEntries:0,
				hideDelay:30,
				goalList:[],
				color:"#e04e00",
				currency:"",
			}
			this.overlayList.push(data);
			this.saveData();
			return data;
		},

		removeOverlay(id:string):void {
			const t = StoreProxy.i18n.t;
			StoreProxy.main.confirm(t("donation_goals.delete_confirm.title"), t("donation_goals.delete_confirm.description"))
			.then(()=>{
				this.overlayList = this.overlayList.filter(g => g.id !== id);
				this.saveData();
			}).catch(()=>{})
		},

		duplicateOverlay(id:string):void {
			const source = this.overlayList.find(g => g.id === id);
			if(!source) return;
			const clone = JSON.parse(JSON.stringify(source)) as typeof source;
			clone.id = Utils.getUUID();
			this.overlayList.push(clone);
			this.saveData();
		},

		saveData(updatedOverlayId?:string):void {
			this.overlayList.forEach(overlay => {
				overlay.goalList.forEach(goal => {
					goal.amount = Math.max(0, Math.min(1000000000, goal.amount));
				});
			});
			if(updatedOverlayId) {
				this.broadcastData(updatedOverlayId);
			}
			const data:IStoreData = {
				overlayList:this.overlayList,
			};
			DataStore.set(DataStore.DONATION_GOALS, data);
		},

		broadcastData(overlayId?:string):void {
			for (const overlay of this.overlayList) {
				if(overlayId && overlay.id != overlayId) continue;

				let goal = 0;
				let raisedTotal = 0;
				let raisedPersonnal = 0;
				let skin = Config.instance.GET_CURRENT_AUTO_SKIN_CONFIG()?.skin || "default";
				if(overlay.dataSource == "streamlabs_charity") {
					if(!StoreProxy.streamlabs.charityTeam) continue;
					goal = StoreProxy.streamlabs.charityTeam.amountGoal_cents/100;
					raisedTotal = StoreProxy.streamlabs.charityTeam.amountRaised_cents/100;
					raisedPersonnal = StoreProxy.streamlabs.charityTeam.amountRaisedPersonnal_cents/100;
				}

				if(overlay.dataSource == "tiltify") {
					if(!StoreProxy.tiltify.campaignList) continue;
					const campaign = StoreProxy.tiltify.campaignList.find(v=>v.id == overlay.campaignId);
					if(!campaign) continue;

					goal = parseFloat(campaign.goal.value);
					raisedTotal = parseFloat(campaign.total_amount_raised.value);
					raisedPersonnal = parseFloat(campaign.amount_raised.value);
				}

				if(overlay.dataSource == "twitch_charity") {
					const campaign = StoreProxy.twitchCharity.currentCharity;
					if(!campaign) continue;

					goal = campaign.target_amount.value/Math.pow(10, campaign.target_amount.decimal_places);
					raisedTotal =
					raisedPersonnal = campaign.current_amount.value/Math.pow(10, campaign.current_amount.decimal_places);
				}

				if(overlay.dataSource == "counter") {
					const counter = StoreProxy.counters.counterList.find(v=>v.id == overlay.counterId);
					if(!counter) continue;
					goal = counter.max || 0;
					raisedTotal =
					raisedPersonnal = counter.value;
				}

				if(overlay.dataSource == "twitch_subs") {
					const subs = StoreProxy.labels.getLabelByKey("SUB_COUNT") as number || 0;
					if(isNaN(subs)) continue;
					goal = subs;
					raisedTotal =
					raisedPersonnal = subs;
				}

				if(overlay.dataSource == "twitch_followers") {
					const followers = StoreProxy.labels.getLabelByKey("FOLLOWER_COUNT") as number || 0;
					if(isNaN(followers)) continue;
					goal = followers;
					raisedTotal =
					raisedPersonnal = followers;
				}

				const currentStepIndex = overlay.goalList.concat().sort((a,b) => a.amount - b.amount).findLastIndex(v=>v.amount <= raisedTotal);
				if(donationGoalStatesCache[overlay.id] != currentStepIndex) {
					if(donationGoalStatesCache[overlay.id]! < currentStepIndex) {
						const currentStep = overlay.goalList[currentStepIndex]!;
						const triggerEvent:TwitchatDataTypes.MessageGoalStepCompleteData = {
							channel_id:StoreProxy.auth.twitch.user.id,
							date:Date.now(),
							id:Utils.getUUID(),
							goalConfig:overlay,
							platform:"twitchat",
							type:TwitchatDataTypes.TwitchatMessageType.GOAL_STEP_COMPLETE,
							stepConfig:currentStep,
							stepIndex:currentStepIndex,
						}
						TriggerActionHandler.instance.execute(triggerEvent);
					}
					donationGoalStatesCache[overlay.id] = currentStepIndex;
				}

				PublicAPI.instance.broadcast("ON_DONATION_GOALS_OVERLAY_CONFIGS", {params:overlay, goal, raisedTotal, raisedPersonnal, skin});
			}
		},

		onSourceValueUpdate(platform:TwitchatDataTypes.DonationGoalOverlayConfig["dataSource"], sourceId?:string):void {
			for (const overlay of this.overlayList) {
				if(overlay.dataSource == platform) {
					if( platform == "streamlabs_charity"
					|| platform == "twitch_charity"
					|| overlay.campaignId == sourceId
					|| overlay.counterId == sourceId
					|| !sourceId) {
						this.broadcastData(overlay.id);
					}
				}
			}
		},

		onDonation(username:string, amount:string, platform:TwitchatDataTypes.DonationGoalOverlayConfig["dataSource"], campaignId?:string):void {
			for (const overlay of this.overlayList) {
				if(overlay.dataSource == platform
				&& (!campaignId || !overlay.campaignId || overlay.campaignId == campaignId)) {
					PublicAPI.instance.broadcast("ON_DONATION_EVENT", {username, amount, overlayId:overlay.id});
				}
			}
		},

		async simulateDonation(overlayId:string, newAmount:number, addedAmount:number):Promise<void> {
			const overlay = this.overlayList.find(v=>v.id == overlayId);
			if(!overlay) return;

			const users = await TwitchUtils.getFakeUsers();

			let goal = 0;
			let raisedTotal = newAmount;
			let raisedPersonnal = newAmount;
			let skin = Config.instance.GET_CURRENT_AUTO_SKIN_CONFIG()?.skin || "default";
			PublicAPI.instance.broadcast("ON_DONATION_GOALS_OVERLAY_CONFIGS", {params:overlay, goal, raisedTotal, raisedPersonnal, skin});
			PublicAPI.instance.broadcast("ON_DONATION_EVENT", {username:Utils.pickRand(users).displayName, amount:addedAmount.toString(), overlayId:overlay.id});
		}


	} as IDonationGoalActions
	& ThisType<IDonationGoalActions
		& UnwrapRef<IDonationGoalState>
		& _StoreWithState<"donationGoals", IDonationGoalState, IDonationGoalGetters, IDonationGoalActions>
		& _StoreWithGetters<IDonationGoalGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeDonationGoals, import.meta.hot))
}

interface IStoreData {
	overlayList:TwitchatDataTypes.DonationGoalOverlayConfig[];
}
