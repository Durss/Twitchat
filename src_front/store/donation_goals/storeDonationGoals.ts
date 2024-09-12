import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import StoreProxy, { type IDonationGoalActions, type IDonationGoalGetters, type IDonationGoalState } from '../StoreProxy';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import TwitchUtils from '@/utils/twitch/TwitchUtils';


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
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_DONATION_GOALS_OVERLAY_PARAMS, (event:TwitchatEvent<{overlayId:string}>)=>{
				if(!event.data) return;
				if(!event.data.overlayId) return;
				this.broadcastData(event.data.overlayId);
			});
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
				goalList:[],
				color:"#e04e00",
			}
			this.overlayList.push(data);
			this.saveData();
			return data;
		},

		removeOverlay(id:string):void {
			const t = StoreProxy.i18n.t;
			StoreProxy.main.confirm(t("bingo_grid.form.delete_confirm.title"), t("bingo_grid.form.delete_confirm.description"))
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
			const data:IStoreData = {
				overlayList:this.overlayList,
			};
			if(updatedOverlayId) {
				this.broadcastData(updatedOverlayId);
			}
			DataStore.set(DataStore.DONATION_GOALS, data);
		},

		broadcastData(overlayId:string):void {
			const overlay = this.overlayList.find(v=>v.id == overlayId);
			if(!overlay) return;
			let goal = 0;
			let raisedTotal = 0;
			let raisedPersonnal = 0;
			if(overlay.dataSource == "streamlabs_charity") {
				if(!StoreProxy.streamlabs.charityTeam) return;
				goal = StoreProxy.streamlabs.charityTeam.amountGoal_cents/100;
				raisedTotal = StoreProxy.streamlabs.charityTeam.amountRaised_cents/100;
				raisedPersonnal = StoreProxy.streamlabs.charityTeam.amountRaisedPersonnal_cents/100;
			}

			if(overlay.dataSource == "tiltify") {
				if(!StoreProxy.tiltify.campaigns) return;
				const campaign = StoreProxy.tiltify.campaigns.find(v=>v.id == overlay.campaignId);
				if(!campaign) return;

				goal = parseFloat(campaign.goal.value);
				raisedTotal = parseFloat(campaign.total_amount_raised.value);
				raisedPersonnal = parseFloat(campaign.amount_raised.value);
			}
			PublicAPI.instance.broadcast(TwitchatEvent.DONATION_GOALS_OVERLAY_PARAMS, {params:overlay, goal, raisedTotal, raisedPersonnal});
		},

		onCampaignUpdate(platform:TwitchatDataTypes.DonationGoalOverlayConfig["dataSource"], campaignId?:string):void {
			for (let i = 0; i < this.overlayList.length; i++) {
				const overlay = this.overlayList[i];
				if(overlay.dataSource == platform
				&& (!overlay.campaignId || overlay.campaignId == campaignId)) {
					this.broadcastData(overlay.id);
				}
			}
		},

		onDonation(username:string, amount:string, platform:TwitchatDataTypes.DonationGoalOverlayConfig["dataSource"], campaignId?:string):void {
			for (let i = 0; i < this.overlayList.length; i++) {
				const overlay = this.overlayList[i];
				if(overlay.dataSource == platform
				&& (!overlay.campaignId || overlay.campaignId == campaignId)) {
					PublicAPI.instance.broadcast(TwitchatEvent.DONATION_EVENT, {username, amount, overlayId:overlay.id});
				}
			}
		},

		async simulateDonation(overlayId:string, amount:number):Promise<void> {
			const overlay = this.overlayList.find(v=>v.id == overlayId);
			if(!overlay) return;

			const users = await TwitchUtils.getFakeUsers();
			
			let goal = 0;
			let raisedTotal = 0;
			let raisedPersonnal = 0;
			if(overlay.dataSource == "streamlabs_charity") {
				if(!StoreProxy.streamlabs.charityTeam) return;
				goal = StoreProxy.streamlabs.charityTeam.amountGoal_cents/100;
				raisedTotal = StoreProxy.streamlabs.charityTeam.amountRaised_cents/100;
				raisedPersonnal = StoreProxy.streamlabs.charityTeam.amountRaisedPersonnal_cents/100;
			}
			raisedTotal += amount;
			raisedPersonnal += amount;
			PublicAPI.instance.broadcast(TwitchatEvent.DONATION_GOALS_OVERLAY_PARAMS, {params:overlay, goal, raisedTotal, raisedPersonnal});
			
			PublicAPI.instance.broadcast(TwitchatEvent.DONATION_EVENT, {username:Utils.pickRand(users).displayName, amount:"$"+amount});
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
