import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import StoreProxy from "./StoreProxy";
import { reactive } from "vue";

/**
* Created : 28/07/2023 
*/
export default class Database {

	public static MESSAGES_TABLE:string = "messages";

	private static _instance:Database;

	private DB_VERSION:number = 4;

	private _dbConnection!:IDBOpenDBRequest;
	private _messageStore!:IDBObjectStore;
	private _db!:IDBDatabase;
	private _cleanTimeout:number = -1;
	private _maxRecords:number = 20000;
	private _ready:boolean = true;
	private _quotaWarned:boolean = false;
	private _versionUpgraded:boolean = false;

	
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
			const indexedDB:IDBFactory =
			//@ts-ignore
			window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
			this._dbConnection = indexedDB.open("Twitchat", this.DB_VERSION);
			this._dbConnection.onerror = (event) => {
				console.log(event);
				StoreProxy.common.alert("[IndexedDB] An error occurred when connecting to local database: "+((event.target as any)?.errorCode || (event.target as any)?.error?.message))
			}
			this._dbConnection.onsuccess = async (event) => {
				if(event.type != "success") {
					StoreProxy.common.alert("[IndexedDB] An error occurred when connecting to local database: "+((event.target as any)?.errorCode || event.type));
					return;
				}
				this._db = (event.target as any)?.result;
				if(this._versionUpgraded) {
					await this.clear();
				}else{
					await this.limitMessageCount();
				}
				resolve();
			}
			this._dbConnection.onupgradeneeded = (event) => {
				this._ready = false;
				this._db = (event.target as any)?.result;
				
				if(!this._db.objectStoreNames.contains(Database.MESSAGES_TABLE)) {
					this._messageStore = this._db.createObjectStore(Database.MESSAGES_TABLE, {autoIncrement: true});
					this._messageStore.createIndex("id", "id", { unique: true });
					this._messageStore.transaction.oncomplete = (event) => {
						this._ready = true;
					}
				}
				this._versionUpgraded = (event.newVersion || 0) > event.oldVersion;
			};
		});
	}

	/**
	 * Get all chat messages from the DB
	 */
	public async getMessageList():Promise<TwitchatDataTypes.ChatMessageTypes[]> {
		if(!this._db || !this._ready) return Promise.resolve([]);
		return new Promise((resolve, reject)=> {
			const query = this._db.transaction(Database.MESSAGES_TABLE, "readonly")
			.objectStore(Database.MESSAGES_TABLE)
			.getAll();
			query.addEventListener("success", event => {
				const result = (event.target as IDBRequest).result as TwitchatDataTypes.ChatMessageTypes[] || [];
				resolve(result);
			})
			query.addEventListener("error", event => {
				console.error("Get message list error");
				console.error(event);
				resolve([]);
			});
		});
	}

	/**
	 * Add a chat message to the DB
	 * 
	 * @param message 
	 */
	public async addMessage(message:TwitchatDataTypes.ChatMessageTypes):Promise<void> {
		if(!this._db || !this._ready) return Promise.reject("Database not ready");
		const sAuth = StoreProxy.auth;
		const isFromRemoteChan = message.channel_id != sAuth.twitch.user.id && message.channel_id != sAuth.youtube.user?.id;
		//Don't save messages from remote channels
		// if(isFromRemoteChan) return Promise.resolve();

		const ignoreList:TwitchatDataTypes.TwitchatMessageStringType[] = [
			TwitchatDataTypes.TwitchatMessageType.JOIN,
			TwitchatDataTypes.TwitchatMessageType.LEAVE,
			TwitchatDataTypes.TwitchatMessageType.CONNECT,
			TwitchatDataTypes.TwitchatMessageType.DISCONNECT,
			TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD,
			TwitchatDataTypes.TwitchatMessageType.SCOPE_REQUEST,
			TwitchatDataTypes.TwitchatMessageType.ROOM_SETTINGS,
			TwitchatDataTypes.TwitchatMessageType.HISTORY_SPLITTER,
		];
		//Do not save above message types. They're useless to recover
		if(ignoreList.includes(message.type)) return;
		if(message.type == TwitchatDataTypes.TwitchatMessageType.NOTICE && message.noticeId == "devMode") return

		return new Promise((resolve, reject)=> {

			const {data, json} = this.removeCircularReferences(message);

			//Dirty way to check if a user is pending for login or display name
			//to be loaded. Wait an arbitrary duration to give it some time to
			//load and update the message on the database.
			//Far from ideal and clean solution i know...
			//This "fixes" issues when receiving a user event but this user's
			//profile have not been loaded/filled yet. The message is directly
			//saved on the DB but as the user info are not yet loaded we end up
			//with "...loading..." as usernames stored on DB.
			//These temporary usernames then show up on the history after
			//reloading twitchat.
			//For example this happens when receiving a whisper from someone who's profile
			//has not been loaded before.
			if(json.indexOf(StoreProxy.users.tmpDisplayName) > -1) {
				window.setTimeout(() => {
					this.updateMessage(message);
				}, 5000);
			}
	
			const query = this._db.transaction(Database.MESSAGES_TABLE, "readwrite")
			.objectStore(Database.MESSAGES_TABLE)
			.add(data)
			query.addEventListener("success", event => {
				clearTimeout(this._cleanTimeout);
				this._cleanTimeout = window.setTimeout(() => {
					if((event.target as IDBRequest).result > this._maxRecords) {
						this.limitMessageCount();
					}
				}, 1000);
				resolve();
			});
			query.addEventListener("error", event => {
				console.error("Get message list error");
				console.error(event);
				reject();
			});
			query.addEventListener("onabort", event => {
				const error = (event.target as IDBRequest).error;
				if (error && error.name == 'QuotaExceededError' && !this._quotaWarned) {
					this._quotaWarned = true;
					StoreProxy.common.alert("[IndexedDB] Storage quota reached, cannot save new message in history");
					this.limitMessageCount();
				}
				resolve();
			});
		});
	}

	/**
	 * Updates a message on the DB
	 * @param message 
	 */
	public async updateMessage(message:TwitchatDataTypes.ChatMessageTypes):Promise<void>{
		if(!this._db || !this._ready) return Promise.resolve();
		const sAuth = StoreProxy.auth;
		const isFromRemoteChan = message.channel_id != sAuth.twitch.user.id && message.channel_id != sAuth.youtube.user?.id;
		//Don't save messages from remote channels
		if(isFromRemoteChan) return Promise.resolve();

		return new Promise((resolve, reject)=> {
			this._db.transaction(Database.MESSAGES_TABLE, "readwrite")
			.objectStore(Database.MESSAGES_TABLE)
			.index("id")
			.openCursor(IDBKeyRange.only(message.id))
			.addEventListener("success", event => {
				const pointer = (event.target as IDBRequest).result;
				if(pointer) {
					const {data} = this.removeCircularReferences(message);
					pointer.update(data).addEventListener("success", ()=>{
						resolve();
					});
				}else{
					resolve();
				}
			});
		});
	}

	/**
	 * Deletes a message from the DB
	 * @param message 
	 */
	public async deleteMessage(message:TwitchatDataTypes.ChatMessageTypes):Promise<void>{
		if(!this._db || !this._ready) return Promise.resolve();
		const sAuth = StoreProxy.auth;
		const isFromRemoteChan = message.channel_id != sAuth.twitch.user.id && message.channel_id != sAuth.youtube.user?.id;
		//Don't save messages from remote channels
		if(isFromRemoteChan) return Promise.resolve();

		return new Promise((resolve, reject)=> {
			this._db.transaction(Database.MESSAGES_TABLE, "readwrite")
			.objectStore(Database.MESSAGES_TABLE)
			.index("id")
			.openCursor(IDBKeyRange.only(message.id))
			.addEventListener("success", event => {
				const pointer = (event.target as IDBRequest).result;
				if(pointer) {
					pointer.delete().addEventListener("success", ()=>{
						resolve();
					});
				}else{
					resolve();
				}
			});
		});
	}

	/**
	 * Clears database content
	 */
	public async clear():Promise<void>{
		if(!this._db || !this._ready) return Promise.resolve();

		return new Promise((resolve, reject)=> {
			this._db.transaction(Database.MESSAGES_TABLE, "readwrite")
			.objectStore(Database.MESSAGES_TABLE)
			.clear()
			.addEventListener("success", async (event) => {
				console.log("[IndexedDB] message history cleared");
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

	/**
	 * Remove some props known for being potential source of circular references
	 * @param value 
	 */
	private removeCircularReferences<T>(value:T):{data:T, json:string} {
		type KeysOfUnion<T> = T extends T ? keyof T: never;
		type keys = KeysOfUnion<TwitchatDataTypes.ChatMessageTypes>;

		const json = JSON.stringify(value, (key, value)=>{
			const typedKey = key as keys;
			if(typedKey == "answers") return [];
			if(typedKey == "answersTo") return undefined;
			return value;
		})
		const clone = JSON.parse(json);

		return {data:clone, json};
	}
}