import store, { OBSEventActionData, OBSEventActionDataCategory } from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import OBSWebsocket, { OBSTriggerEventTypes } from '@/utils/OBSWebsocket';
import TwitchUtils from './TwitchUtils';
import Utils from './Utils';

/**
* Created : 22/04/2022 
*/
export default class OBSEventActionHandler {

	private static _instance:OBSEventActionHandler;

	private actionsSpool:MessageTypes[] = [];
	private userCooldowns:{[key:string]:number} = {};
	private globalCooldowns:{[key:string]:number} = {};
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():OBSEventActionHandler {
		if(!OBSEventActionHandler._instance) {
			OBSEventActionHandler._instance = new OBSEventActionHandler();
			OBSEventActionHandler._instance.initialize();
		}
		return OBSEventActionHandler._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public onMessage(message:MessageTypes):void {
		this.actionsSpool.push(message);
		if(this.actionsSpool.length == 1) {
			this.executeNext();
		}
	}
	
	private executeNext():void{
		const message = this.actionsSpool[0];
		if(!message) return;

		if((message.type == "message" || message.type == "highlight")) {
			switch(message.tags["msg-id"]) {
				case "follow": this.handleFollower(message); return;

				case "sub": 
				case "resub": 
				case "giftpaidupgrade": this.handleSub(message); return;
				
				case "subgift": this.handleSubgift(message); return;

				case "raid": this.handleRaid(message); return;
			}

			if(message.reward) {
				this.handleReward(message as IRCEventDataList.Highlight);
				return;

			}else if(message.message) {
				this.handleChatCmd(message as IRCEventDataList.Message);
				return;
			
			}else if(message.tags["first-msg"] === true) {
				this.handleFirstMessageEver(message);
				return;

			}else if(message.firstMessage === true) {
				this.handleFirstMessageToday(message);
				return;

			}else if(message.tags.bits) {
				this.handleBits(message);
				return;

			}

		}else if(message.type == "prediction") {
			this.handlePrediction(message);
			return;
		
		}else if(message.type == "poll") {
			this.handlePoll(message);
			return;
		
		}else if(message.type == "bingo") {
			this.handleBingo(message);
			return;

		}else if(message.type == "raffle") {
			this.handleRaffle(message);
			return;
		}

		this.actionsSpool.shift();
		this.executeNext();
	}

	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		
	}

	private handleFirstMessageEver(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {
		this.parseSteps(OBSTriggerEventTypes.FIRST_ALL_TIME, message);
		
	}
	
	private handleFirstMessageToday(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {
		this.parseSteps(OBSTriggerEventTypes.FIRST_TODAY, message);
	}
	
	private handleBits(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {
		this.parseSteps(OBSTriggerEventTypes.BITS, message);
	}
	
	private handleFollower(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {
		this.parseSteps(OBSTriggerEventTypes.FOLLOW, message);
	}
	
	private handleSub(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {
		this.parseSteps(OBSTriggerEventTypes.SUB, message);
	}
	
	private handleSubgift(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {
		this.parseSteps(OBSTriggerEventTypes.SUBGIFT, message);
	}
	
	private handlePoll(message:IRCEventDataList.PollResult):void {
		let winnerVotes = 0;
		message.data.choices.forEach(v=>{
			if(v.votes > winnerVotes) {
				winnerVotes = v.votes;
				message.winner = v.title;
			}
		});
		this.parseSteps(OBSTriggerEventTypes.POLL_RESULT, message);
	}
	
	private handlePrediction(message:IRCEventDataList.PredictionResult):void {
		message.data.outcomes.forEach(v=>{
			if(v.id == message.data.winning_outcome_id) {
				message.winner = v.title;
			}
		});
		this.parseSteps(OBSTriggerEventTypes.PREDICTION_RESULT, message);
	}
	
	private handleBingo(message:IRCEventDataList.BingoResult):void {
		message.winner = message.data.winners[0];
		this.parseSteps(OBSTriggerEventTypes.BINGO_RESULT, message);
	}
	
	private handleRaffle(message:IRCEventDataList.RaffleResult):void {
		message.winner = message.data.winners[0];
		this.parseSteps(OBSTriggerEventTypes.RAFFLE_RESULT, message);
	}
	
	private handleRaid(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {
		this.parseSteps(OBSTriggerEventTypes.RAID, message);
	}
	
	private handleChatCmd(message:IRCEventDataList.Message):void {
		const cmd = message.message.trim();
		this.parseSteps(OBSTriggerEventTypes.CHAT_COMMAND+"_"+cmd, message);
	}
	
	private handleReward(message:IRCEventDataList.Highlight):void {
		if(message.reward) {
			let id = message.reward.redemption.reward.id;
			if(id == "TEST_ID") {
				id = OBSTriggerEventTypes.REWARD_REDEEM;
			}else{
				id = OBSTriggerEventTypes.REWARD_REDEEM+"_"+id;
			}
			console.log(message);
			this.parseSteps(id, message);
		}
	}

	/**
	 * Executes the steps of the trigger
	 * 
	 * @param eventType 
	 * @param message 
	 */
	private async parseSteps(eventType:string, message:MessageTypes):Promise<void> {
		const steps = store.state.obsEventActions[ eventType ];
		let actions:OBSEventActionData[] = [];
		let canExecute = true;

		if(!Array.isArray(steps)) {
			const data = steps as OBSEventActionDataCategory;
			actions = data.actions;
			const m = message as IRCEventDataList.Message;
			const uid = m.tags['user-id'];
			const key = eventType+"_"+uid;
			const now = Date.now();
			console.log(eventType, key);
			console.log("G ", this.globalCooldowns[eventType]);
			console.log("U ", this.userCooldowns[key]);
			//Apply cooldowns if any
			if(this.globalCooldowns[eventType] > 0 && this.globalCooldowns[eventType] > now) canExecute = false;
			else if(data.cooldown.global > 0) this.globalCooldowns[eventType] = now + data.cooldown.global * 1000;

			if(this.userCooldowns[key] > 0 && this.userCooldowns[key] > now) canExecute = false;
			else if(canExecute && data.cooldown.user > 0) this.userCooldowns[key] = now + data.cooldown.user * 1000;
		}else{
			actions = steps;
		}
		
		if(!steps || actions.length == 0) canExecute = false;
		// console.log(steps);
		// console.log(message);
		
		console.log("Can execute ? ", canExecute);
		if(canExecute) {
			for (let i = 0; i < actions.length; i++) {
				const step = actions[i];
				if(step.text) {
					const text = await this.parseText(eventType, message, step.text as string);
					await OBSWebsocket.instance.setTextSourceContent(step.sourceName, text);
				}
				if(step.url) {
					const url = await this.parseText(eventType, message, step.url as string, true);
					await OBSWebsocket.instance.setBrowserSourceURL(step.sourceName, url);
				}
				if(step.mediaPath) {
					await OBSWebsocket.instance.setMediaSourceURL(step.sourceName, step.mediaPath);
				}
	
				if(step.filterName) {
					OBSWebsocket.instance.setFilterState(step.sourceName, step.filterName, step.show);
				}else{
					OBSWebsocket.instance.setSourceState(step.sourceName, step.show);
				}
				await Utils.promisedTimeout(step.delay * 1000);
			}
		}

		//Remove item done
		this.actionsSpool.shift();
		if(this.actionsSpool.length > 0) {
			this.executeNext();
		}
	}

	/**
	 * Replaces placeholders by their values on the message
	 */
	private async parseText(eventType:string, message:MessageTypes, src:string, urlEncode:boolean = false):Promise<string> {
		let res = src;
		eventType = eventType.replace(/_.*$/gi, "");//Remove suffix to get helper for the global type
		const helpers = OBSEventActionHelpers[eventType];
		for (let i = 0; i < helpers.length; i++) {
			const h = helpers[i];
			// let value = 
			const chunks:string[] = h.pointer.split(".");
			let value = message as unknown;
			try {
				for (let i = 0; i < chunks.length; i++) {
					value = (value as {[key:string]:unknown})[chunks[i]];
				}
			}catch(error) {
				console.warn("Unable to find pointer for helper", h);
				value = "";
			}
			
			if(h.tag === "SUB_TIER") {
				if(!isNaN(value as number) && (value as number) > 0) {
					value = Math.round((value as number)/1000)
				}else{
					value = 1;//Fallback just in case but shouldn't be necessary
				}
			}

			if(h.tag === "MESSAGE") {
				const m = message as IRCEventDataList.Highlight;
				if(m.message) {
					//Parse emotes
					const chunks = TwitchUtils.parseEmotes(m.message as string, m.tags['emotes-raw'], true);
					let cleanMessage = ""
					for (let i = 0; i < chunks.length; i++) {
						const v = chunks[i];
						if(v.type == "text") {
							cleanMessage += v.value+" ";
						}
					}
					value = cleanMessage.trim();
				}
			}
			
			if(eventType === OBSTriggerEventTypes.BITS && h.tag === "MESSAGE") {
				//Parse cheermotes
				const m = message as IRCEventDataList.Highlight;
				value = await TwitchUtils.parseCheermotes(value as string, m.tags['room-id'] as string);
			}

			if(value && typeof value == "string") {
				//Strip HTML tags (removes emotes and cheermotes)
				value = (value as string).replace(/<\/?\w+(?:\s+[^\s/>"'=]+(?:\s*=\s*(?:".*?[^"\\]"|'.*?[^'\\]'|[^\s>"']+))?)*?>/gi, "");
				
				if(urlEncode) {
					value = encodeURIComponent(value as string);
				}
			}
			res = res.replace(new RegExp("\\{"+h.tag+"\\}", "gi"), value as string);
		}
		return res;
	}
}


type MessageTypes = IRCEventDataList.Message
| IRCEventDataList.Highlight
| IRCEventDataList.Message
| IRCEventDataList.PredictionResult
| IRCEventDataList.PollResult
| IRCEventDataList.BingoResult
| IRCEventDataList.RaffleResult;

export const OBSEventActionHelpers:{[key:string]:{tag:string, desc:string, pointer:string}[]} = {};

OBSEventActionHelpers[OBSTriggerEventTypes.FIRST_ALL_TIME] = [
	{tag:"USER", desc:"User name", pointer:"tags.display-name"},
	{tag:"MESSAGE", desc:"Message content", pointer:"message"},
];

OBSEventActionHelpers[OBSTriggerEventTypes.FIRST_TODAY] = [
	{tag:"USER", desc:"User name", pointer:"tags.display-name"},
	{tag:"MESSAGE", desc:"Message content", pointer:"message"},
];

OBSEventActionHelpers[OBSTriggerEventTypes.POLL_RESULT] = [
	{tag:"TITLE", desc:"Poll title", pointer:"data.title"},
	{tag:"WIN", desc:"Winning choice title", pointer:"winner"},
	// {tag:"PERCENT", desc:"Votes percent of the winning choice", pointer:""},
];

OBSEventActionHelpers[OBSTriggerEventTypes.PREDICTION_RESULT] = [
	{tag:"TITLE", desc:"Prediction title", pointer:"data.title"},
	{tag:"WIN", desc:"Winning choice title", pointer:"winner"},
];

OBSEventActionHelpers[OBSTriggerEventTypes.BINGO_RESULT] = [
	{tag:"WINNER", desc:"Winner name", pointer:"winner.display-name"},
];

OBSEventActionHelpers[OBSTriggerEventTypes.RAFFLE_RESULT] = [
	{tag:"WINNER", desc:"Winner name", pointer:"winner.user.display-name"},
];

OBSEventActionHelpers[OBSTriggerEventTypes.CHAT_COMMAND] = [
	{tag:"USER", desc:"User name", pointer:"tags.display-name"},
];

OBSEventActionHelpers[OBSTriggerEventTypes.SUB] = [
	{tag:"USER", desc:"User name", pointer:"tags.display-name"},
	{tag:"SUB_TIER", desc:"Sub tier 1, 2 or 3", pointer:"methods.plan"},
	{tag:"MESSAGE", desc:"Message of the user", pointer:"message"},
];

OBSEventActionHelpers[OBSTriggerEventTypes.SUBGIFT] = [
	{tag:"USER", desc:"User name of the sub gifter", pointer:"tags.display-name"},
	{tag:"RECIPIENT", desc:"Recipient user name", pointer:"recipient"},
	{tag:"SUB_TIER", desc:"Sub tier 1, 2 or 3", pointer:"methods.plan"},
	{tag:"MESSAGE", desc:"Message of the user", pointer:"message"},
];

OBSEventActionHelpers[OBSTriggerEventTypes.BITS] = [
	{tag:"USER", desc:"User name", pointer:"tags.display-name"},
	{tag:"BITS", desc:"Number of bits", pointer:"tags.bits"},
	{tag:"MESSAGE", desc:"Message of the user", pointer:"message"},
];

OBSEventActionHelpers[OBSTriggerEventTypes.FOLLOW] = [
	{tag:"USER", desc:"User name of the new follower", pointer:"tags.username"},
];

OBSEventActionHelpers[OBSTriggerEventTypes.RAID] = [
	{tag:"USER", desc:"User name of the new follower", pointer:"username"},
	{tag:"VIEWERS", desc:"Number of viewers", pointer:"viewers"},
];

OBSEventActionHelpers[OBSTriggerEventTypes.REWARD_REDEEM] = [
	{tag:"USER", desc:"User name", pointer:"tags.display-name"},
	{tag:"TITLE", desc:"Reward title", pointer:"reward.redemption.reward.title"},
	{tag:"DESCRIPTION", desc:"Reward description", pointer:"reward.redemption.reward.prompt"},
	{tag:"COST", desc:"Reward cost", pointer:"reward.redemption.reward.cost"},
];