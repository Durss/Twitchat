import type { TwitchDataTypes } from '@/types/TwitchDataTypes'
import IRCClient from '@/utils/IRCClient';
import type { ActivityFeedData, IRCEventDataList } from '@/utils/IRCEventDataTypes';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import { defineStore } from 'pinia'
import StoreProxy from '../StoreProxy';

export const storePrediction = defineStore('prediction', {
	state: () => ({
		data: {} as TwitchDataTypes.Prediction,
	}),



	getters: {
	},



	actions: {

		//TODO abstract this to handle only 1 prediction data
		setPredictions(payload:TwitchDataTypes.Prediction[]) {
			const list = StoreProxy.chat.activityFeed as ActivityFeedData[];
			if(payload[0].status == "RESOLVED" && new Date(payload[0].ended_at as string).getTime() > Date.now() - 5 * 60 * 1000) {
				if(list.findIndex(v=>v.type == "prediction" && v.data.id == payload[0].id) == -1) {
					const m:IRCEventDataList.PredictionResult = {
						tags:{
							id:IRCClient.instance.getFakeGuid(),
							"tmi-sent-ts": Date.now().toString()},
						type:"prediction",
						markedAsRead:false,
						data:payload[0]
					};
					StoreProxy.chat.addChatMessage(m);
					TriggerActionHandler.instance.onMessage(m);
				}
			}
			this.data = payload.find(v => {
				return (v.status == "ACTIVE" || v.status == "LOCKED");
			}) as  TwitchDataTypes.Prediction;
		},
	},
})