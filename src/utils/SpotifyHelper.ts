import type { MusicMessage, MusicTriggerData } from "@/types/TwitchatDataTypes";
import type { JsonObject } from "type-fest";
import { reactive } from "vue";
import Config from "./Config";
import { EventDispatcher } from "./EventDispatcher";
import PublicAPI from "./PublicAPI";
import type { SearchPlaylistItem, SearchPlaylistResult, SearchTrackItem, SearchTrackResult, SpotifyAuthToken, SpotifyTrack } from "./SpotifyDataTypes";
import SpotifyHelperEvent from "./SpotifyHelperEvent";
import StoreProxy from "./StoreProxy";
import TriggerActionHandler from "./TriggerActionHandler";
import TwitchatEvent from "./TwitchatEvent";
import Utils from "./Utils";

/**
* Created : 23/05/2022 
*/
export default class SpotifyHelper extends EventDispatcher {
	
	public isPlaying = false;
	public currentTrack!:MusicMessage;

	private static _instance:SpotifyHelper;
	private _token!:SpotifyAuthToken;
	private _refreshTimeout!:number;
	private _getTrackTimeout!:number;
	private _lastTrackInfo!:MusicMessage|null;
	private _headers!:{"Accept":string, "Content-Type":string, "Authorization":string};
	private _clientID = "";
	private _clientSecret = "";
	private _playlistsCache:SearchPlaylistItem[] = [];

	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():SpotifyHelper {
		if(!SpotifyHelper._instance) {
			SpotifyHelper._instance = reactive(new SpotifyHelper()) as SpotifyHelper;
			SpotifyHelper._instance.initialize();
		}
		return SpotifyHelper._instance;
	}
	
	public set token(value:SpotifyAuthToken | null) {
		if(value == null) {
			clearTimeout(this._refreshTimeout);
			clearTimeout(this._getTrackTimeout);
			return;
		}
		this._token = value;
		this._headers = {
			"Accept":"application/json",
			"Content-Type":"application/json",
			"Authorization":"Bearer "+this._token.access_token,
		}
		// if(Date.now() > value.expires_at - 10 * 60 * 1000) {
		// 	this.refreshToken();
		// }else{
		// 	this.getCurrentTrack();
		// }
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public setAppParams(clientID:string, clientSecret:string):void {
		this._clientID = clientID;
		this._clientSecret = clientSecret;
	}
	/**
	 * Starts the aut flow
	 */
	public async startAuthFlow():Promise<void> {
		const res = await fetch(Config.instance.API_PATH+"/CSRFToken", {method:"GET"});
		const json = await res.json();
		const scopes = Config.instance.SPOTIFY_SCOPES.split(" ").join("%20");
		console.log(scopes);

		let url = "https://accounts.spotify.com/authorize";
		url += "?client_id="+this.clientID;
		url += "&response_type=code";
		url += "&redirect_uri="+encodeURIComponent( document.location.origin+"/spotify/auth" );
		url += "&scope=+"+scopes;
		url += "&state="+json.token;
		url += "&show_dialog=true";

		document.location.href = url;
	}

	/**
	 * Authenticate the user after receiving the auth_code once
	 * oauth flow completes.
	 * 
	 * @param authCode 
	 */
	public async authenticate(authCode:string):Promise<void> {
		let json:SpotifyAuthToken = {} as SpotifyAuthToken;
		let url = Config.instance.API_PATH+"/spotify/auth";
		url += "?code="+encodeURIComponent(authCode);
		if(this.clientID && this._clientSecret) {
			url += "&clientId="+encodeURIComponent(this.clientID);
			url += "&clientSecret="+encodeURIComponent(this._clientSecret);
		}
		const res = await fetch(url, {method:"GET"});
		json = await res.json();
		if(json.access_token) {
			this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.CONNECTED, json));
		}else{
			throw(json);
		}
	}

	/**
	 * Refresh the current token
	 */
	public async refreshToken():Promise<void> {
		clearTimeout(this._getTrackTimeout);
		clearTimeout(this._refreshTimeout);

		let json:SpotifyAuthToken = {} as SpotifyAuthToken;
		let url = Config.instance.API_PATH+"/spotify/refresh_token";
		url += "?token="+encodeURIComponent(this._token.refresh_token);
		if(this.clientID && this._clientSecret) {
			url += "&clientId="+encodeURIComponent(this.clientID);
			url += "&clientSecret="+encodeURIComponent(this._clientSecret);
		}
		const res = await fetch(url, {method:"GET"});
		json = await res.json();
		if(json.access_token) {
			json.refresh_token = this._token.refresh_token;//Keep refresh token
			this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.CONNECTED, json));//This computes the expires_at value
	
			//Refresh token 10min before it actually expires
			const delay = (this._token.expires_at - Date.now()) - 10 * 60 * 1000;
			if(!isNaN(delay) && delay > 0) {
				this._refreshTimeout = setTimeout(()=>this.refreshToken(), delay);
			}
			this._headers = {
				"Accept":"application/json",
				"Content-Type":"application/json",
				"Authorization":"Bearer "+this._token.access_token,
			}
		}else{
			this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, "[SPOTIFY] token refresh failed"));
		}
	}

	/**
	 * Get a track by its ID
	 * 
	 * @returns track info
	 */
	public async getTrackByID(id:string):Promise<SearchTrackItem|null> {
		const options = {
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/tracks/"+encodeURIComponent(id), options);
		const json = await res.json();
		return json;
	}

	/**
	 * Adds a track to the queue
	 * 
	 * @returns if a track has been found or not
	 */
	public async searchTrack(name:string):Promise<SearchTrackItem|null> {
		const options = {
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/search?type=track&q="+encodeURIComponent(name), options);
		if(res.status == 401) {
			await this.refreshToken();
			return null;
		}
		const json = await res.json();
		const tracks = json.tracks as SearchTrackResult;
		if(tracks.items.length == 0) {
			return null;
		}else{
			return tracks.items[0];
		}
	}

	/**
	 * Adds a track to the queue
	 * 
	 * @returns if a track has been found or not
	 */
	public async searchPlaylist(name:string):Promise<SearchPlaylistItem|null> {
		const options = {
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/search?type=playlist&q="+encodeURIComponent(name), options);
		if(res.status == 401) {
			await this.refreshToken();
			return null;
		}
		const json = await res.json();
		const tracks = json.playlists as SearchPlaylistResult;
		if(tracks.items.length == 0) {
			return null;
		}else{
			return tracks.items[0];
		}
	}

	/**
	 * Adds a track to the queue
	 * 
	 * @param uri Spotify URI of the track to add. Get one with "searchTrack()" method
	 * @returns if a track has been added or not
	 */
	public async addToQueue(uri:string):Promise<boolean> {
		const options = {
			headers:this._headers,
			method:"POST",
		}
		const res = await fetch("https://api.spotify.com/v1/me/player/queue?uri="+encodeURIComponent(uri), options);
		if(res.status == 401) {
			await this.refreshToken();
			return false;
		}
		if(res.status == 204) {
			return true;
		}
		if(res.status == 409) {
			this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, "[SPOTIFY] API rate limits exceeded"));
			return false;
		}
		if(res.status == 404) {
			const json = await res.json();
			if(json.error) {
				this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, "[SPOTIFY] "+json.error.message));
			}
			return false;
		}
		return false;
	}

	/**
	 * Get the currently playing track
	 * This starts a routine that automatically checks for new
	 * track info.
	 */
	public async getCurrentTrack():Promise<void> {
		clearTimeout(this._getTrackTimeout);

		const options = {
			headers:this._headers
		}
		let res!:Response;
		try {
			res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", options);
			if(res.status > 401) throw("error");
		}catch(error) {
			//API crashed, try again 5s later
			this._getTrackTimeout = setTimeout(()=> { this.getCurrentTrack(); }, 5000);
			return;
		}
		if(res.status == 401) {
			await this.refreshToken();
			return;
		}
		if(res.status == 204) {
			//No content, nothing is playing
			this._getTrackTimeout = setTimeout(()=> { this.getCurrentTrack(); }, 10000);
			return;
		}
		
		let json:SpotifyTrack|null = await res.json();
		if(json?.item) {
			if(json.currently_playing_type == "episode") {
				const episode = await this.getEpisodeInfos();
				if(episode) json = episode;
			}


			this.currentTrack = {
				type:"music",
				title:json.item.name,
				artist:json.item.show? json.item.show.name : json.item.artists[0].name,
				album:json.item.album.name,
				cover:json.item.album.images[0].url,
				duration:json.item.duration_ms,
				url:json.item.href,
			};
			this.isPlaying = json.is_playing && json.item != null;
	
			if(this.isPlaying) {
				let delay = json.item.duration_ms - json.progress_ms;
				if(isNaN(delay)) delay = 5000;
				this._getTrackTimeout = setTimeout(()=> {
					this.getCurrentTrack();
				}, Math.min(5000, delay + 1000));
				
				//Broadcast to the triggers
				if(!this._lastTrackInfo
				|| this._lastTrackInfo?.duration != this.currentTrack.duration 
				|| this._lastTrackInfo?.title != this.currentTrack.title
				|| this._lastTrackInfo?.artist != this.currentTrack.artist) {
					const triggerData:MusicTriggerData = {
						type: "musicEvent",
						start:true,
						music:this.currentTrack,
					}
					TriggerActionHandler.instance.onMessage(triggerData);
				}
				
				//Broadcast to the overlays
				const apiData = {
					trackName: this.currentTrack.title,
					artistName: this.currentTrack.artist,
					trackDuration: this.currentTrack.duration,
					trackPlaybackPos: json.progress_ms,
					cover: this.currentTrack.cover,
					params: StoreProxy.store.state.musicPlayerParams,
				}
				PublicAPI.instance.broadcast(TwitchatEvent.CURRENT_TRACK, (apiData as unknown) as JsonObject);

				this._lastTrackInfo = this.currentTrack;

			}else{
				//Broadcast to the overlays
				if(this._lastTrackInfo != null) {
					PublicAPI.instance.broadcast(TwitchatEvent.CURRENT_TRACK, {
						params: StoreProxy.store.state.musicPlayerParams,
					});

					//Broadcast to the triggers
					const triggerData:MusicTriggerData = {
						type: "musicEvent",
						start:false,
					}
					TriggerActionHandler.instance.onMessage(triggerData);

					this._lastTrackInfo = null;
				}
				this._getTrackTimeout = setTimeout(()=> { this.getCurrentTrack(); }, 5000);
			}
		}
	}

	/**
	 * Gets a playlist by its name
	 * 
	 * @returns track info
	 */
	public async getUserPlaylist(id:string|null, name?:string):Promise<SearchPlaylistItem|null> {
		if(this._playlistsCache.length === 0) {
			const options = {
				headers:this._headers
			}
			let offset = 0;
			const limit = 50;
			let playlists:SearchPlaylistItem[] = [];
			let json:JsonObject;
			do {
				const res = await fetch("https://api.spotify.com/v1/me/playlists?limit="+limit+"&offset="+offset, options);
				json = await res.json();
				offset += limit;
				playlists = playlists.concat((json.items as unknown) as SearchPlaylistItem[]);
			}while(json.next);
			this._playlistsCache = playlists;
		}

		let minDist = 10;
		let selected:SearchPlaylistItem|null = null;
		for (let i = 0; i < this._playlistsCache.length; i++) {
			const p = this._playlistsCache[i];
			if(id === p.id ) return p;
			if(name){
				const dist = Utils.levenshtein(name, p.name);
				if(dist < minDist) {
					minDist = dist;
					selected = p;
				}
			}
		}
		return selected;
	}

	/**
	 * Plays next track in queue
	 * @returns 
	 */
	public async nextTrack():Promise<boolean> {
		return this.simpleAction("me/player/next", "POST");
	}

	/**
	 * Pause the playback
	 * @returns 
	 */
	public async pause():Promise<boolean> {
		return this.simpleAction("me/player/pause", "PUT");
	}

	/**
	 * Resume/starts the playback
	 * @returns 
	 */
	public async resume():Promise<boolean> {
		return this.simpleAction("me/player/play", "PUT");
	}

	/**
	 * Starts playing a playlist
	 * @returns 
	 */
	public async startPlaylist(id:string|null, name?:string):Promise<boolean> {
		let res = await this.getUserPlaylist(id, name);
		if(!res && name) {
			res = await this.searchPlaylist(name);
		}
		if(res) {
			return this.simpleAction("me/player/play", "PUT", {context_uri: res.uri});
		}
		return false;
	}

	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TRACK, ()=>this.getCurrentTrack());
	}

	/**
	 * Executes a simplea ction that requires no param
	 * @param path 
	 * @returns success or not
	 */
	public async simpleAction(path:string, method:"POST"|"PUT"|"GET", body?:JsonObject):Promise<boolean> {
		const options:{[key:string]:unknown} = {
			headers:this._headers,
			method,
		}
		if(body) options.body = JSON.stringify(body);
		const res = await fetch("https://api.spotify.com/v1/"+path, options);
		if(res.status == 401) {
			await this.refreshToken();
			return false;
		}
		if(res.status == 204) {
			return true;
		}
		if(res.status == 404) {
			try {
				const json = await res.json();
				if(json.error?.reason == "NO_ACTIVE_DEVICE") {
					StoreProxy.store.state.alert = "Spotify requires you to first play some music before trying to use it from Twitchat"
				}
			}catch(error){}

			return false;
		}
		if(res.status == 409) {
			this.dispatchEvent(new SpotifyHelperEvent(SpotifyHelperEvent.ERROR, null, "[SPOTIFY] API rate limits exceeded"));
			return false;
		}
		return false;
	}

	/**
	 * Gets a podcast infos
	 */
	private async getEpisodeInfos():Promise<SpotifyTrack|null> {
		const options = {
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode", options);
		if(res.status == 401) {
			await this.refreshToken();
			return null;
		}
		return await res.json();
	}

	private get clientID():string {
		let clientID = Config.instance.SPOTIFY_CLIENT_ID;
		if(this._clientID) {
			clientID = this._clientID;
		}
		return clientID;
	}

}