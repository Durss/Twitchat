import type { TwitchDataTypes } from '@/types/TwitchDataTypes'
import IRCClient from '@/utils/IRCClient';
import type { ActivityFeedData, IRCEventDataList } from '@/utils/IRCEventDataTypes';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import { defineStore } from 'pinia'
import StoreProxy from '../StoreProxy';


export const storePoll = defineStore('poll', {
	state: () => ({
		data: {} as TwitchDataTypes.Poll,
	}),



	getters: {
	},



	actions: {

		setPolls(data:TwitchDataTypes.Poll[], postOnChat?:boolean) {
			const list = StoreProxy.chat.activityFeed as ActivityFeedData[];
			if(postOnChat === true) {
				const poll = data[0];
				if(poll.status == "COMPLETED" || poll.status == "TERMINATED") {
					if(list.findIndex(v=>v.type == "poll" && v.data.id == poll.id) == -1) {
						const m:IRCEventDataList.PollResult = {
							tags:{
								id:IRCClient.instance.getFakeGuid(),
								"tmi-sent-ts": Date.now().toString()},
							type:"poll",
							markedAsRead:false,
							data:poll
						};
						StoreProxy.chat.addChatMessage(m);
						TriggerActionHandler.instance.onMessage(m);
					}
				}
			}
			
			this.data = data.find(v => {
				return (v.status == "ACTIVE" || v.status == "COMPLETED" || v.status == "TERMINATED");
			}) as  TwitchDataTypes.Poll;
		},
	},
})