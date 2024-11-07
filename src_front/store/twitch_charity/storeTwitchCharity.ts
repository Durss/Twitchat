import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { ITwitchCharityActions, ITwitchCharityGetters, ITwitchCharityState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from '@/utils/Utils';

export const storeTwitchCharity = defineStore('switchcharity', {
	state: () => ({
		currentCharity:null
	} as ITwitchCharityState),



	getters: {
	} as ITwitchCharityGetters
	& ThisType<UnwrapRef<ITwitchCharityState> & _StoreWithGetters<ITwitchCharityGetters> & PiniaCustomProperties>
	& _GettersTree<ITwitchCharityState>,



	actions: {
		async populateData():Promise<void> {
			[this.currentCharity] = await TwitchUtils.getCharityList(StoreProxy.auth.twitch.user.id);
			this.updateLabels();
		},

		onCharityStart(charity:TwitchDataTypes.CharityCampaign):void {
			console.log("START IT ", charity.charity_name);
			this.currentCharity = charity;
			this.updateLabels();
		},

		onCharityProgress(charityId:string, currentAmount:TwitchDataTypes.CharityCampaign["current_amount"], goalAmount:TwitchDataTypes.CharityCampaign["target_amount"]):void {
			if(this.currentCharity && this.currentCharity.id == charityId) {
				//There's a bug on eventsub where the goal value sent is "0".
				//Keeping local value if remote isn't valid
				this.currentCharity.current_amount.value = currentAmount.value || this.currentCharity.current_amount.value;
				this.currentCharity.target_amount.value = goalAmount.value || this.currentCharity.target_amount.value;
				this.currentCharity.current_amount.currency = currentAmount.currency || this.currentCharity.current_amount.currency;
				this.currentCharity.target_amount.currency = goalAmount.currency || this.currentCharity.target_amount.currency;
				this.currentCharity.current_amount.decimal_places = currentAmount.decimal_places || this.currentCharity.current_amount.decimal_places;
				this.currentCharity.target_amount.decimal_places = goalAmount.decimal_places || this.currentCharity.target_amount.decimal_places;
				this.updateLabels();
				StoreProxy.donationGoals.onSourceValueUpdate("twitch_charity", charityId);
			}
		},
		
		onCharityDonation(charityId:string, user:TwitchatDataTypes.TwitchatUser, amount:number, currency:string):void {
			if(this.currentCharity && this.currentCharity.id == charityId) {
				const goal = this.currentCharity.target_amount.value/Math.pow(10, this.currentCharity.target_amount.decimal_places);
				const raised = this.currentCharity.current_amount.value/Math.pow(10, this.currentCharity.current_amount.decimal_places);
				const message:TwitchatDataTypes.MessageCharityDonationData = {
					id:Utils.getUUID(),
					type:TwitchatDataTypes.TwitchatMessageType.TWITCH_CHARITY_DONATION,
					date:Date.now(),
					channel_id:StoreProxy.auth.twitch.user.id,
					platform:"twitch",
					user,
					amount,
					currency,
					amountFormatted: amount + currency,
					goal,
					goalFormatted: goal + this.currentCharity.target_amount.currency,
					raised,
					raisedFormatted: raised + this.currentCharity.current_amount.currency,
					campaign: {
						id:this.currentCharity.id,
						title:this.currentCharity.charity_name,
						url:this.currentCharity.charity_website,
					},
				};

				StoreProxy.chat.addMessage(message);
			}
		},

		onCharityStop(charityId:string):void {
			if(this.currentCharity && this.currentCharity.id == charityId) {
				console.log("STOP IT ", this.currentCharity.charity_name);
				this.currentCharity = null;
				this.populateData();
				this.updateLabels();
			}
		},

		updateLabels():void {
			StoreProxy.labels.updateLabelValue("TWITCH_CHARITY_GOAL", this.currentCharity ? this.currentCharity.target_amount.value/Math.pow(10, this.currentCharity.target_amount.decimal_places) : 0);
			StoreProxy.labels.updateLabelValue("TWITCH_CHARITY_RAISED", this.currentCharity ? this.currentCharity.current_amount.value/Math.pow(10, this.currentCharity.current_amount.decimal_places) : 0);
			StoreProxy.labels.updateLabelValue("TWITCH_CHARITY_IMAGE", this.currentCharity ? this.currentCharity.charity_logo : StoreProxy.asset("@/assets/icons/twitch_charity.svg"));
			StoreProxy.labels.updateLabelValue("TWITCH_CHARITY_NAME", this.currentCharity ? this.currentCharity.charity_name : "");
		}

	} as ITwitchCharityActions
	& ThisType<ITwitchCharityActions
		& UnwrapRef<ITwitchCharityState>
		& _StoreWithState<"switchcharity", ITwitchCharityState, ITwitchCharityGetters, ITwitchCharityActions>
		& _StoreWithGetters<ITwitchCharityGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeTwitchCharity, import.meta.hot))
}