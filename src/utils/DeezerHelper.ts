import type { MusicMessage } from "@/types/TwitchatDataTypes";
import { reactive } from "vue";
import Config from "./Config";
import DeezerHelperEvent from "./DeezerHelperEvent";
import { EventDispatcher } from "./EventDispatcher";
import PublicAPI from "./PublicAPI";
import TwitchatEvent from "./TwitchatEvent";

/**
* Created : 23/05/2022 
TODO : when closing the popin and opening it back the DZ.login() callback is called twice, then 3 times, then 4, ...
*/
export default class DeezerHelper extends EventDispatcher{
	
	public currentTrack:MusicMessage|null = null;
	public queue:DeezerQueueItem[] = [];
	public userInteracted = false;
	public currentTrackIndex = 0;
	public playing = false;
	public playbackPos = 0;

	private static _instance:DeezerHelper;
	private _playerHolder!:HTMLDivElement;
	private _searchPromise!:(value: DeezerTrack[] | PromiseLike<DeezerTrack[]>) => void;
	private _createPromiseSuccess!:() => void;
	private _createPromiseError!:() => void;
	private _idToTrack:{[key:string]:MusicMessage} = {};
	private _forcePlay = true;
	private _scriptElement!:HTMLScriptElement;
	private _initCheckInterval!:number;
	private _sessionIndex = 0;
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():DeezerHelper {
		if(!DeezerHelper._instance) {
			DeezerHelper._instance = reactive(new DeezerHelper()) as DeezerHelper;
			DeezerHelper._instance.initialize();
		}
		return DeezerHelper._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public createPlayer():Promise<void> {
		return new Promise((resolve, reject)=> {
			this._createPromiseSuccess = resolve;
			this._createPromiseError = reject;
			const index = ++this._sessionIndex;
			//@ts-ignore
			if(window.dzAsyncInit) return;
			//@ts-ignore
			window.dzAsyncInit = () => {
				console.log("DZ ASYNC INIT");
				DZ.init({
					appId  : Config.instance.DEEZER_CLIENT_ID,
					channelUrl : document.location.origin+'/deezer.html',
					player : {
						onload: () => {
							console.log("ON LOAD", index, this._sessionIndex);
							if(index != this._sessionIndex)	{
								console.log("Stop init", index, this._sessionIndex);
								return;
							}
							console.log("ON LOAD > start auth");
							this.startAuthFlow();
						}
					}
				});
				let readyFlag = false;
				DZ.ready((sdk_options) => {
					readyFlag = true;
					console.log('DZ SDK is ready', sdk_options);
				});
				//Because deezer player is dick coded it "sometimes" fails to initialize
				//This interval is here to refresh the iframe until the ready event is
				//properly fired.
				clearInterval(this._initCheckInterval);
				this._initCheckInterval = window.setInterval(()=> {
					if(!readyFlag) {
						console.log("DZ SDK failed to initialize, try again");
						const iframe:HTMLIFrameElement = this._playerHolder.getElementsByTagName("iframe")[0];
						iframe.src += "&1";
					}else{
						clearInterval(this._initCheckInterval);
					}
				}, 5000);
			};
	
			this._scriptElement = document.createElement('script');
			this._scriptElement.src = 'https://e-cdn-files.dzcdn.net/js/min/dz.js';
			this._scriptElement.async = true;
			this._playerHolder = document.createElement("div");
			this._playerHolder.setAttribute("id", "dz-root");
			document.body.appendChild( this._playerHolder );
			this._playerHolder.appendChild(this._scriptElement);
			this._playerHolder.classList.add("hide");
			//@ts-ignore
			window.onDeezerSearchResult = (data:unknown) => this.onSearchResult(data);
		})
	}

	/**
	 * Disposes the deezer player
	 */
	public dispose():void {
		clearInterval(this._initCheckInterval);
		this._forcePlay = true;
		this.playbackPos = 0;
		this.currentTrack = null;
		this._scriptElement.remove();
		//@ts-ignore
		//esling-disable-next-line
		this._playerHolder.replaceChildren();
		this._playerHolder.parentNode?.removeChild(this._playerHolder);
		//@ts-ignore
		//esling-disable-next-line
		delete window.dzAsyncInit;
		//@ts-ignore
		delete window.DZ;
	}

	/**
	 * Starts the aut flow
	 */
	public async startAuthFlow():Promise<void> {
		console.log("START AUTH FLOW");
		// let url = "https://connect.deezer.com/oauth/auth.php";
		// url += "?app_id="+Config.instance.DEEZER_CLIENT_ID;
		// url += "&redirect_uri="+encodeURIComponent( document.location.origin+"/deezer/auth" );
		// url += "&perms="+Config.instance.DEEZER_SCOPES;

		// document.location.href = url;
		DZ.login((res)=> {
			console.log("Login handler");
			if (res.status == "connected") {
				this.userInteracted = false;
				this._playerHolder.classList.remove("hide");
				const onFocus = () => {
					window.focus();
				};
				window.addEventListener("mouseenter", onFocus);
				
				const onBlur = () => {
					window.setTimeout(() => {
						if(!document.activeElement) return;
						if (document.activeElement.tagName === "IFRAME") {
							this.userInteracted = true;
							this._playerHolder.classList.add("hide");
							window.removeEventListener("blur", onBlur);
							window.removeEventListener("mouseenter", onFocus);
						}
					}, 0);
				};
				window.addEventListener("blur", onBlur);

				DZ.Event.subscribe('current_track', (arg) => {
					const track = this._idToTrack[arg.track.id];
					this.queue = DZ.player.getTrackList();
					this.currentTrackIndex = DZ.player.getCurrentIndex();
					if(track) {
						if(track != this.currentTrack || this._forcePlay) {
							if(DZ.player.isPlaying() !== true) {
								this._forcePlay = false;
								DZ.player.play();
							}
						}
						this.currentTrack = track;
					}
					this.publishTrackEvent();
				});

				DZ.Event.subscribe('tracklist_changed', () => {
					this.queue = DZ.player.getTrackList();
					this.currentTrackIndex = DZ.player.getCurrentIndex();
					if(DZ.player.isPlaying() !== true) {
						this._forcePlay = true;
						// this.queue = 
						// DZ.player.play();
					}
				});

				DZ.Event.subscribe('player_position', (arg) => {
					// event_listener_append('position', arg[0], arg[1]);
					this.playbackPos = arg[0];
				});

				DZ.Event.subscribe('player_paused', () => { this.playing = false; });
				DZ.Event.subscribe('player_play', () => { this.playing = true; });
				DZ.Event.subscribe('track_end', () => {
					const ids = this.queue.map(t => parseInt(t.id)).splice(1);
					DZ.player.playTracks(ids);
				});
				
				this.dispatchEvent(new DeezerHelperEvent(DeezerHelperEvent.CONNECTED));
				this._createPromiseSuccess();
			}else{
				this.dispatchEvent(new DeezerHelperEvent(DeezerHelperEvent.CONNECT_ERROR));
				this._createPromiseError();
			}
		}, {perms: Config.instance.DEEZER_SCOPES});
	}

	/**
	 * Authenticate the user after receiving the auth_code once
	 * oauth flow completes.
	 * 
	 * @param authCode 
	 */
	// public async authenticate(authCode:string):Promise<void> {
	// 	let json:DeezerAuthToken = {} as DeezerAuthToken;
	// 	const res = await fetch(Config.instance.API_PATH+"/deezer/auth?code="+authCode+"&isProd="+(Config.instance.IS_PROD?"1":"0"), {method:"GET"});
	// 	json = await res.json();
	// 	if(json.access_token) {
	// 		//store.dispatch("setDeezerToken", json);
	//		this.dispatchEvent(new DeezerHelperEvent(DeezerHelperEvent.CONNECTED, json));
	// 	}else{
	// 		throw(json);
	// 	}
	// }

	/**
	 * Adds a track to the queue
	 * 
	 * @returns the tracks matching the search
	 */
	public async searchTracks(search:string, limit=50):Promise<DeezerTrack[]> {
		return new Promise((resolve)=> {
			const e = document.createElement('script');
			e.src = 'https://api.deezer.com/search?q=' + search + '&output=jsonp&callback=onDeezerSearchResult&limit='+limit;
			e.async = true;
			e.onload = ()=> {
				//Cleanup DOM
				window.setTimeout(()=> {
					document.body.removeChild(e);
				}, 1000)
			}
			document.body.appendChild(e);
			this._searchPromise = resolve;
		});
	}

	/**
	 * Plays a specific track
	 * @param track 
	 */
	public playTrack(track:DeezerTrack|number):void {
		if(typeof track === "number") {
			DZ.player.playTracks([track]);
		}else{
			DZ.player.playTracks([track.id]);
		}
	}

	/**
	 * Brings a track to the begining of the queue
	 */
	public bringQueuedTrackToTop(index:number):void {
		const ids = this.queue.map(v=>parseInt(v.id));
		ids.unshift( ids.splice(index, 1)[0] );
		DZ.player.playTracks(ids);
		// DZ.player.changeTrackOrder(ids);//Does not updates the queue -_-
	}
	
	/**
	 * Removes a track from the queue
	 */
	public removeTrack(index:number):void {
		const ids = this.queue.map(v=>parseInt(v.id));
		ids.splice(index, 1);
		if(ids.length == 0) {
			DZ.player.pause();
		}else{
			DZ.player.playTracks(ids);
		}
	}
	
	/**
	 * Adds a track to the queue
	 * @param track 
	 */
	public addToQueue(track:DeezerTrack|number):void {
		let id = 0;
		if(typeof track === "number") id = track;
		else id = track.id;
		this._forcePlay = true;
		if(!this.currentTrack) this.currentTrack = this._idToTrack[id];
		DZ.player.addToQueue([id]);
	}

	/**
	 * Plays next track in queue
	 * @returns 
	 */
	public nextTrack():void {
		const ids = this.queue.map(t => parseInt(t.id));
		ids.splice(0, 1);
		DZ.player.playTracks(ids);
		// DZ.player.next();
	}

	/**
	 * Plays previous track
	 * @returns 
	 */
	public prevTrack():void {
		DZ.player.prev();
	}

	/**
	 * Pause the playback
	 * @returns 
	 */
	public pause():void {
		DZ.player.pause();
	}

	/**
	 * Resume/starts the playback
	 * @returns 
	 */
	public resume():void {
		DZ.player.play();
	}

	/**
	 * Seek the track
	 * @param percent value between 0 and 100
	 */
	public seek(percent:number):void {
		DZ.player.seek(percent);
	}

	/**
	 * Seek the volume
	 * @param percent value between 0 and 100
	 */
	public setVolume(percent:number):void {
		DZ.player.setVolume(percent);
	}

	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TRACK, ()=>{
			this.publishTrackEvent();
		});
	}

	private publishTrackEvent():void {
		if(this.currentTrack) {
			//Broadcast to the overlays
			PublicAPI.instance.broadcast(TwitchatEvent.CURRENT_TRACK, {
				trackName: this.currentTrack.title,
				artistName: this.currentTrack.artist,
				trackDuration: this.currentTrack.duration * 1000,
				trackPlaybackPos: this.playbackPos * 1000,
				cover: this.currentTrack.cover,
			});
		}
	}

	private onSearchResult(json:{data:DeezerTrack[], next:string, total:number}):void {
		console.log("ON SEARCH RESULT");
		console.log(json);
		if (json.data && json.data.length > 0) {
			for (let i = 0; i < json.data.length; i++) {
				const track = json.data[i];
				const music:MusicMessage =  {
					type:"music",
					title:track.title,
					artist:track.artist.name,
					album:track.album.title,
					cover:track.album.cover_medium,
					duration:track.duration,
					url:track.link,
				};
				this._idToTrack[track.id] = music;
			}
			this._searchPromise( json.data );
		}
	}

}

export interface DeezerAuthResult {
	code:string;
}

export interface DeezerAuthToken {
	access_token:string;
	token_type:string;//Bearer
	scope:string;
	expires_at:number;//In seconds
	expires_in:number;//In seconds
	refresh_token:string;
}

export interface DeezerTrack {
	id: number;
	readable: boolean;
	title: string;
	title_short: string;
	link: string;
	duration: number;
	rank: number;
	explicit_lyrics: boolean;
	explicit_content_lyrics: number;
	explicit_content_cover: number;
	preview: string;
	md5_image: string;
	artist: Artist;
	album: Album;
	type: string;
}

export interface Artist {
	id: number;
	name: string;
	link: string;
	picture: string;
	picture_small: string;
	picture_medium: string;
	picture_big: string;
	picture_xl: string;
	tracklist: string;
	type: string;
}

export interface Album {
	id: number;
	title: string;
	cover: string;
	cover_small: string;
	cover_medium: string;
	cover_big: string;
	cover_xl: string;
	md5_image: string;
	tracklist: string;
	type: string;
}

export interface DeezerQueueItem {
	id:string;
	title:number;
	duration:number;
	album:{
		id:string;
		title:string;
	};
	artist:{
		id:string;
		name:string;
	};
}


declare namespace DZ {

	interface SubscribeFunc {
		(event:'current_track', callback:(arg:{
			index:number;
			track:DeezerQueueItem;
		})=>void): void;
		(event:'player_play', callback:()=>void): void;
		(event:'player_paused', callback:()=>void): void;
		(event:'player_loaded', callback:()=>void): void;
		(event:'track_end', callback:(position:number)=>void): void;
		(event:'tracklist_changed', callback:()=>void): void;
		(event:'player_position', callback:(arg:[pos:number, duration:number])=>void): void;
	}

	const player:{
		playTracks:(ids:number[])=>void;
		addToQueue:(ids:number[])=>void;
		changeTrackOrder:(ids:number[])=>void;
		next:()=>void;
		prev:()=>void;
		play:()=>void;
		pause:()=>void;
		isPlaying():boolean;
		getTrackList():DeezerQueueItem[];
		getCurrentIndex():number;
		seek(percent:number):void;
		setVolume(percent:number):void;
	};

	const Event:{
		subscribe:SubscribeFunc;
	}

	function login(arg:(res:{
		authResponse?:{
			accessToken:string;
			expire:number;
		};
		userID:string;
		status:"connected";
		authInitDate:number;
	})=>void, options:{perms:string}):void
	
	function logout():void

	function init(args:
		{
			appId: string;
			channelUrl: string;
			player?: {
				container?: string;
				width?: number;
				height?: number;
				layout?: string;
				onload?: (args:{
					volume:number;
					suffle:number;
					repeat:number;
					muted:number;
				})=>void;
			}
		}
	):void;

	function ready(callback:(sdk_options:
		{
			player:{
				volume:number;
				suffle:number;
				repeat:number;
				muted:number;
			};
			token:{
				accessToken:string;
				expire:number;
			}
		}
	)=>void):void;
}