import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import StoreProxy from "./StoreProxy";

/**
* Created : 28/07/2023 
*/
export default class Database {

	public static MESSAGES_TABLE:string = "messages";

	private static _instance:Database;

	private _dbConnection!:IDBOpenDBRequest;
	private _messageStore!:IDBObjectStore;
	private _db!:IDBDatabase;
	private _cleanTimeout:number = -1;
	private _maxRecords:number = 20000;
	private _quotaWarned:boolean = false;

	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():Database {
		if(!Database._instance) {
			Database._instance = new Database();
		}
		return Database._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async connect():Promise<void> {
		if(this._db) return Promise.resolve();

		return new Promise((resolve, reject)=> {
			var indexedDB:IDBFactory =
			//@ts-ignore
			window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
			this._dbConnection = indexedDB.open("Twitchat", 3);
			this._dbConnection.onerror = (event) => {
				console.log(event);
				StoreProxy.main.alert("[IndexedDB] An error occurred when connecting to local database: "+((event.target as any)?.errorCode || (event.target as any)?.error?.message))
			}
			this._dbConnection.onsuccess = (event) => {
				if(event.type != "success") {
					StoreProxy.main.alert("[IndexedDB] An error occurred when connecting to local database: "+((event.target as any)?.errorCode || event.type));
					return;
				}
				this._db = (event.target as any)?.result;
				this.limitMessageCount();
				resolve();
			}
			this._dbConnection.onupgradeneeded = (event) => {
				this._db = (event.target as any)?.result;
				
				this._messageStore = this._db.createObjectStore(Database.MESSAGES_TABLE, {autoIncrement: true});
				this._messageStore.createIndex("id", "id", { unique: true });
				this._messageStore.transaction.oncomplete = (event) => {
					//ignore
				};
			};
		});
	}

	/**
	 * Get all chat messages from the DB
	 */
	public async getMessageList():Promise<TwitchatDataTypes.ChatMessageTypes[]> {
		if(!this._db) return Promise.resolve([]);
		return new Promise((resolve, reject)=> {
			this._db.transaction(Database.MESSAGES_TABLE, "readonly")
			.objectStore(Database.MESSAGES_TABLE)
			.getAll()
			.addEventListener("success", event => {
				const result = (event.target as IDBRequest).result as TwitchatDataTypes.ChatMessageTypes[] || [];
				resolve(result);
			});
		});
	}

	/**
	 * Add a chat message to the DB
	 * 
	 * @param message 
	 */
	public async addMessage(message:TwitchatDataTypes.ChatMessageTypes):Promise<void> {
		if(!this._db) return Promise.reject();

		const ignoreList:TwitchatDataTypes.TwitchatMessageStringType[] = [
			TwitchatDataTypes.TwitchatMessageType.JOIN,
			TwitchatDataTypes.TwitchatMessageType.LEAVE,
			TwitchatDataTypes.TwitchatMessageType.CONNECT,
			TwitchatDataTypes.TwitchatMessageType.DISCONNECT,
			TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD,
			TwitchatDataTypes.TwitchatMessageType.HISTORY_SPLITTER,
		];
		//Do not save above message types. They're useless to recover
		if(ignoreList.includes(message.type)) return;

		return new Promise((resolve, reject)=> {

			const clone = JSON.parse(JSON.stringify(message, (key, value)=>{
				if(key == "answers") return [];
				if(key == "answersTo") return undefined;
				return value;
			})) as TwitchatDataTypes.ChatMessageTypes;
	
			const query = this._db.transaction(Database.MESSAGES_TABLE, "readwrite")
			.objectStore(Database.MESSAGES_TABLE)
			.add(clone)
			query.addEventListener("success", event => {
				clearTimeout(this._cleanTimeout);
				if((event.target as IDBRequest).result > this._maxRecords) {
					this.limitMessageCount();
				}
				resolve();
			});
			query.addEventListener("error", event => {
				reject();
			});
			query.addEventListener("onabort", event => {
				const error = (event.target as IDBRequest).error;
				if (error && error.name == 'QuotaExceededError') {
					this._quotaWarned = true;
					StoreProxy.main.alert("[IndexedDB] Storage quota reached, cannot save new message in history");
					this.limitMessageCount();
				}
				resolve();
			});
		});
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private limitMessageCount():void {
		this._db.transaction(Database.MESSAGES_TABLE, "readwrite")
		.objectStore(Database.MESSAGES_TABLE)
		.count()
		.addEventListener("success", async (event) => {
			const entry = event.target as IDBRequest;
			const deleteCount = entry.result as number - this._maxRecords;
			if(deleteCount > 0) {
				for (let i = 0; i < deleteCount; i++) {
					const store = await this._db.transaction(Database.MESSAGES_TABLE, "readwrite")
					.objectStore(Database.MESSAGES_TABLE);
					store.openKeyCursor()
					.addEventListener("success", (event) => {
						const pointer = event.target as IDBRequest|null;
						if(pointer) {
							store.delete(pointer.result.key);
							this._quotaWarned = false;
						}
					});
				}
			}
		});
	}
}