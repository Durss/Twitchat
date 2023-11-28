/**
* Created : 28/11/2023 
*/
export default class YoutubeMessengerClient {

	private static _instance:YoutubeMessengerClient;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():YoutubeMessengerClient {
		if(!YoutubeMessengerClient._instance) {
			YoutubeMessengerClient._instance = new YoutubeMessengerClient();
			YoutubeMessengerClient._instance.initialize();
		}
		return YoutubeMessengerClient._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		
	}
}