import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import * as Sentry from "@sentry/vue";
import { toRaw } from "vue";
import StoreProxy from "./StoreProxy";

/**
* Created : 28/07/2023
*/
export default class Database {

	public static MESSAGES_TABLE:string = "messages";
	public static GROQ_HISTORY_TABLE:string = "groqHistory";

	private static _instance:Database;

	private DB_VERSION:number = 5;

	private _dbConnection!:IDBOpenDBRequest;
	private _messageStore!:IDBObjectStore;
	private _groqStore!:IDBObjectStore;
	private _db!:IDBDatabase;
	private _cleanTimeout:number = -1;
	private _maxMessageRecords:number = 20000;
	private _maxGroqRecords:number = 500;
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
					// await this.clearMessages();
					// await this.clearGroqHistory();
				}else{
					try {
						//These should remain within the onupgradeneeded() callback but for some
						//reason it sometimes failed to create a new table after a version upgrade
						//while still upgrading the DB version.
						//This stuck the users with a missing table.
						//So as a fallback, we create tables here if they don't exist.
						await this.createMessageTable();
						await this.createGroqTable();

						await this.limitMessageCount();
						await this.limitGroqCount();
					}catch(error) {
						const tables = Array.from(this._db.objectStoreNames);
						const version = this._db.version;
						// Avoid blocking app start if an error occurs.
						// this would lead to requesting user to authenticated back
						console.error(error);
						Sentry.captureException(error);
						Sentry.captureMessage("Database init error "+(error as Error).message+". Available tables: "+tables.join(", ")+". DB version: "+version);
					}
				}
				resolve();
			}
			this._dbConnection.onupgradeneeded = async (event) => {
				this._ready = false;
				this._db = (event.target as any)?.result;
				await this.createMessageTable();
				await this.createGroqTable();
				this._versionUpgraded = (event.newVersion || 0) > event.oldVersion;
				this._ready = true;
			};
		});
	}

	/**
	 * Get all chat messages from the DB
	 */
	public async getMessageList():Promise<TwitchatDataTypes.ChatMessageTypes[]> {
		if(!this._db || !this._ready) return [];
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
		message = toRaw(message);
		const sAuth = StoreProxy.auth;
		const isFromRemoteChan = message.channel_id != sAuth.twitch.user.id && message.channel_id != sAuth.youtube.user?.id;
		//Don't save messages from remote channels
		if(isFromRemoteChan) return Promise.resolve();

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
					if((event.target as IDBRequest).result > this._maxMessageRecords) {
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
	 * Clears messages database content
	 */
	public async clearMessages():Promise<void>{
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

	/**
	 * Clears groq database content
	 */
	public async clearGroqHistory():Promise<void>{
		if(!this._db || !this._ready) return Promise.resolve();

		return new Promise((resolve, reject)=> {
			this._db.transaction(Database.GROQ_HISTORY_TABLE, "readwrite")
			.objectStore(Database.GROQ_HISTORY_TABLE)
			.clear()
			.addEventListener("success", async (event) => {
				console.log("[IndexedDB] groq history cleared");
				resolve();
			});
		});
	}

	/**
	 * Get all Groq history items
	 */
	public async getGroqHistoryList():Promise<TwitchatDataTypes.GroqHistoryItem[]> {
		if(!this._db || !this._ready) return [];
		return new Promise((resolve, reject)=> {
			const query = this._db.transaction(Database.GROQ_HISTORY_TABLE, "readonly")
			.objectStore(Database.GROQ_HISTORY_TABLE)
			.getAll();
			query.addEventListener("success", event => {
				const result = (event.target as IDBRequest).result as TwitchatDataTypes.GroqHistoryItem[] || [];
				resolve(result);
			})
			query.addEventListener("error", event => {
				console.error("Get Groq history list error");
				console.error(event);
				resolve([]);
			});
		});
	}

	/**
	 * Add a Grod history item to DB
	 *
	 * @param message
	 */
	public async addGroqHistory(data:TwitchatDataTypes.GroqHistoryItem):Promise<void> {
		if(!this._db || !this._ready) return Promise.reject("Database not ready");
		data = toRaw(data);

		return new Promise((resolve, reject)=> {
			const query = this._db.transaction(Database.GROQ_HISTORY_TABLE, "readwrite")
			.objectStore(Database.GROQ_HISTORY_TABLE)
			.add(data)
			query.addEventListener("success", event => {
				clearTimeout(this._cleanTimeout);
				this._cleanTimeout = window.setTimeout(() => {
					if((event.target as IDBRequest).result > this._maxMessageRecords) {
						this.limitGroqCount();
					}
				}, 1000);
				resolve();
			});
			query.addEventListener("error", event => {
				console.error("Add groq history error");
				console.error(event);
				reject();
			});
			query.addEventListener("onabort", event => {
				const error = (event.target as IDBRequest).error;
				if (error && error.name == 'QuotaExceededError' && !this._quotaWarned) {
					this._quotaWarned = true;
					StoreProxy.common.alert("[IndexedDB] Storage quota reached, cannot save Groq answer to history");
					this.limitGroqCount();
				}
				resolve();
			});
		});
	}

	/**
	 * Deletes a Groq history item from DB
	 * @param message
	 */
	public async deleteGroqHistory(id:string):Promise<void>{
		if(!this._db || !this._ready) return Promise.resolve();

		return new Promise((resolve, reject)=> {
			this._db.transaction(Database.GROQ_HISTORY_TABLE, "readwrite")
			.objectStore(Database.GROQ_HISTORY_TABLE)
			.index("id")
			.openCursor(IDBKeyRange.only(id))
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



	/*******************
	* PRIVATE METHODS *
	*******************/
	private limitMessageCount():void {
		this._db.transaction(Database.MESSAGES_TABLE, "readwrite")
		.objectStore(Database.MESSAGES_TABLE)
		.count()
		.addEventListener("success", async (event) => {
			const entry = event.target as IDBRequest;
			const deleteCount = entry.result as number - this._maxMessageRecords;
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

	private limitGroqCount():void {
		this._db.transaction(Database.GROQ_HISTORY_TABLE, "readwrite")
		.objectStore(Database.GROQ_HISTORY_TABLE)
		.count()
		.addEventListener("success", async (event) => {
			const entry = event.target as IDBRequest;
			const deleteCount = entry.result as number - this._maxGroqRecords;
			if(deleteCount > 0) {
				for (let i = 0; i < deleteCount; i++) {
					const store = await this._db.transaction(Database.GROQ_HISTORY_TABLE, "readwrite")
					.objectStore(Database.GROQ_HISTORY_TABLE);
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

	private async createMessageTable():Promise<void> {
		const tableList = this._db.objectStoreNames;
		// Create MESSAGES_TABLE if it doesn't exist
		if (!tableList.contains(Database.MESSAGES_TABLE)) {
			this._messageStore = this._db.createObjectStore(Database.MESSAGES_TABLE, { autoIncrement: true });
			this._messageStore.createIndex("id", "id", { unique: true });
			await new Promise<void>((resolve)=>{
				this._messageStore.transaction.oncomplete = (event) => {
					resolve();
				}
			});
		}
	}

	private async createGroqTable():Promise<void> {
		const tableList = this._db.objectStoreNames;
		// Create GROQ_HISTORY_TABLE if it doesn't exist
		if (!tableList.contains(Database.GROQ_HISTORY_TABLE)) {
			this._groqStore = this._db.createObjectStore(Database.GROQ_HISTORY_TABLE, { autoIncrement: true });
			this._groqStore.createIndex("id", "id", { unique: true });
			await new Promise<void>((resolve)=>{
				this._groqStore.transaction.oncomplete = (event) => {
					resolve();
				}
			});
		}
	}
}
