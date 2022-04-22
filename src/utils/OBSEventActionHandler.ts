import IRCEvent, { ActivityFeedData, IRCEventData, IRCEventDataList } from '@/utils/IRCEvent';

/**
* Created : 22/04/2022 
*/
export default class OBSEventActionHandler {

	private static _instance:OBSEventActionHandler;
	
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
	public onMessage(message:IRCEventDataList.Message
	|IRCEventDataList.Highlight
	|IRCEventDataList.Message
	|IRCEventDataList.PredictionResult
	|IRCEventDataList.PollResult
	):void {
		if((message.type == "message" || message.type == "highlight")) {
			if(message.tags["first-msg"] === true) {
				this.handleFirstMessageEver(message);

			}else if(message.firstMessage === true) {
				this.handleFirstMessageToday(message);

			} if(message.tags.bits) {
				this.handleBits(message);

			}else{
				switch(message.tags["msg-id"]) {
					case "follow": this.handleFollower(message); break;

					case "sub": 
					case "resub": 
					case "giftpaidupgrade": this.handleSub(message); break;
					
					case "subgift": this.handleSubgift(message); break;
				}
			}

		}else if(message.type == "prediction") {
			this.handlPrediction(message)
		
		}else if(message.type == "poll") {
			this.handlPoll(message)
		}
	}

	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		
	}

	private handleFirstMessageEver(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {

	}

	private handleFirstMessageToday(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {

	}

	private handleBits(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {

	}

	private handleFollower(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {

	}

	private handleSub(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {

	}

	private handleSubgift(message:IRCEventDataList.Message|IRCEventDataList.Highlight):void {

	}

	private handlPoll(message:IRCEventDataList.PollResult):void {

	}

	private handlPrediction(message:IRCEventDataList.PredictionResult):void {

	}
}