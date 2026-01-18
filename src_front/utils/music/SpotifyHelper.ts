import TwitchatEvent from "@/events/TwitchatEvent";
import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import { rebuildPlaceholdersCache } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import type { JsonObject } from "type-fest";
import { reactive } from "vue";
import ApiHelper from "../ApiHelper";
import type { PlaylistCachedIdItem, SearchPlaylistItem, SearchPlaylistResult, SearchTrackItem, SearchTrackResult, SpotifyAuthToken, SpotifyScopesString, SpotifyTrack } from "../../types/spotify/SpotifyDataTypes";

/**
* Created : 23/05/2022
*/
export default class SpotifyHelper {

	public connected:boolean = false;
	public currentTrack:TwitchatDataTypes.MusicTrackData|null = null;
	public currentPlaylist:PlaylistCachedIdItem|null = null;

	private static _instance:SpotifyHelper;
	private _isPlaying = false;
	private _token!:SpotifyAuthToken;
	private _refreshTimeout!:number;
	private _getTrackTimeout!:number;
	private _lastTrackInfo!:{progress:number, track:TwitchatDataTypes.MusicTrackData}|null;
	private _headers!:{"Accept":string, "Content-Type":string, "Authorization":string};
	private _clientID = "";
	private _clientSecret = "";
	private _playlistsCache:SearchPlaylistItem[] = [];
	private _playlistsIdCache:{[playlistId:string]:PlaylistCachedIdItem} = {};
	private _trackIdToRequest:{[trackId:string]:{user:TwitchatDataTypes.TwitchatUser, search?:string, skip?:boolean}} = {};

	constructor() {
		this.initialize();
	}

	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():SpotifyHelper {
		if(!SpotifyHelper._instance) {
			SpotifyHelper._instance = reactive(new SpotifyHelper()) as SpotifyHelper;
		}
		return SpotifyHelper._instance;
	}


	public get clientSecret():string { return this._clientSecret; }
	public get isPlaying():boolean { return this._isPlaying; }

	public get clientID():string {
		return this._clientID;
		// if(this._clientID) {
		// 	return this._clientID;
		// }else{
		// 	return Config.instance.SPOTIFY_CLIENT_ID;
		// }
	}



	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Connects the user to spotify
	 */
	public connect():void {
		const appParams	= DataStore.get(DataStore.SPOTIFY_APP_PARAMS);
		const authToken	= DataStore.get(DataStore.SPOTIFY_AUTH_TOKEN);

		if(appParams) {
			const credentials		= JSON.parse(appParams);
			this._clientID		= credentials.client;
			this._clientSecret	= credentials.secret;
		}
		if(authToken) {
			this._token			= JSON.parse(authToken);
			if(appParams) this.refreshToken();
		}
	}

	/**
	 * Disconnects the user from spotify
	 */
	public disconnect():void {
		clearTimeout(this._refreshTimeout);
		clearTimeout(this._getTrackTimeout);
		this.connected = false;
		DataStore.remove(DataStore.SPOTIFY_AUTH_TOKEN);
		rebuildPlaceholdersCache();
	}

	/**
	 * Returns if current session includes the given scopes.
	 * All given scopes must be granted for this function to return true
	 *
	 * @param scopes
	 */
	public hasScopes(scopes: SpotifyScopesString[]): boolean {
		if (!Array.isArray(scopes)) {
			scopes = [scopes];
		}

		const grantedScopes = this._token.scope.split(" ");
		for (const scope of scopes) {
			if (grantedScopes.indexOf(scope) == -1) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Makes sure a track added to the queue will be skipped when it's started.
	 * This is a workaround for the lack of "remove track from queue" API endpoint.
	 * When the track starts it's automatically skipped
	 * @param user
	 * @param trackId
	 */
	public skipQueuedTrack(user:TwitchatDataTypes.TwitchatUser, trackId:string):void {
		const entry = this._trackIdToRequest[trackId];
		if(entry && entry.user == user) entry.skip = true;
	}

	/**
	 * Sets spotify app credentials
	 *
	 * @param clientID
	 * @param clientSecret
	 */
	public setCredentials(clientId:string, clientSecret:string):void {
		this._clientID		= clientId;
		this._clientSecret	= clientSecret;
		DataStore.set(DataStore.SPOTIFY_APP_PARAMS, {
			client:clientId,
			secret:clientSecret,
		}, false);
	}

	/**
	 * Starts the aut flow
	 */
	public async startAuthFlow():Promise<void> {
		DataStore.remove(DataStore.SPOTIFY_AUTH_TOKEN);//Avoid auto reconnect attempt on redirect
		const {json} = await ApiHelper.call("auth/CSRFToken", "GET");

		const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"spotify/auth"}).href;
		const url = new URL("https://accounts.spotify.com/authorize");
		url.searchParams.append("client_id", this._clientID);
		url.searchParams.append("response_type", "code");
		url.searchParams.append("redirect_uri", redirectURI);
		url.searchParams.append("scope", Config.instance.SPOTIFY_SCOPES);
		url.searchParams.append("state", json.token);
		url.searchParams.append("show_dialog", "true");

		document.location.href = url.href;
	}

	/**
	 * Authenticate the user after receiving the auth_code once
	 * oauth flow completes.
	 *
	 * @param authCode
	 */
	public async authenticate(authCode:string):Promise<void> {
		let json:SpotifyAuthToken = {} as SpotifyAuthToken;

		const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"spotify/auth"}).href;
		const options = {
			method:"POST",
			headers: {
				"Authorization": "Basic "+btoa(this.clientID+":"+this.clientSecret),
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				'grant_type': 'authorization_code',
				'code': authCode,
				'redirect_uri': redirectURI,
			})
		}

		try {
			const res = await fetch("https://accounts.spotify.com/api/token", options);
			if(res.status==200) {
				json = await res.json();
			}else{
				const err:{error?:string} = await res.json();
				throw(err || {error:"unknown spotify auth error"});
			}
		}catch(error) {
			StoreProxy.common.alert("Spotify authentication failed");
			console.log(error);
			this.connected = false;
			rebuildPlaceholdersCache();
			StoreProxy.music.spotifyConsecutiveErrors ++;
			throw(error);
		}

		StoreProxy.music.spotifyConsecutiveErrors = 0;
		this.setToken(json);
	}

	/**
	 * Refresh the current token
	 */
	public async refreshToken(attempt:number = 0):Promise<void> {
		clearTimeout(this._getTrackTimeout);
		clearTimeout(this._refreshTimeout);

		if(!this._token) return;

		const options = {
			method:"POST",
			headers: {
				"Authorization": "Basic "+btoa(this.clientID+":"+this.clientSecret),
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				'grant_type': 'refresh_token',
				'refresh_token': this._token.refresh_token,
			})
		}

		let json:SpotifyAuthToken = {} as SpotifyAuthToken;
		try {
			const res = await fetch("https://accounts.spotify.com/api/token", options);
			let refreshSuccess = false;
			if(res.status == 200) {
				json = await res.json();
				if(json.access_token) {
					this.setToken(json);
					refreshSuccess = true;
					StoreProxy.music.spotifyConsecutiveErrors = 0;
				}
			}
			if(!refreshSuccess){
				StoreProxy.music.spotifyConsecutiveErrors ++;
				this.connected = false;
				rebuildPlaceholdersCache();
				throw("refresh token failed");
			}
		}catch(error) {
			//Refresh failed, try again
			if(attempt < 5) {
				this._refreshTimeout = window.setTimeout(()=>{
					this.refreshToken(++attempt);
				}, 5000);
			}else{
				//Tried too many times, give up and show alert
				StoreProxy.common.alert(StoreProxy.i18n.t("error.spotify.token_refresh"));
			}
		}
	}

	/**
	 * Get a track by its ID
	 *
	 * @returns track info
	 */
	public async getTrackByID(id:string, isRetry:boolean = false):Promise<SearchTrackItem|null> {
		const options = {
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/tracks/"+encodeURIComponent(id), options);
		if(res.status == 401) {
			await this.refreshToken();
			//Try again
			if(!isRetry) return await this.getTrackByID(id, true);
			else return null;
		}
		if(res.status <= 204 && res.status >= 200) {
			try {
				StoreProxy.music.spotifyConsecutiveErrors = 0;
				return await res.json();
			}catch(error) {
			}
		}
		return null;
	}

	/**
	 * Adds a track to the queue
	 *
	 * @returns if a track has been found or not
	 */
	public async searchTrack(name:string, isRetry:boolean = false):Promise<SearchTrackItem[]|null> {
		const options = {
			headers:this._headers
		}
		const url = new URL("https://api.spotify.com/v1/search");
		url.searchParams.set("type", "track");
		url.searchParams.set("limit", "50");
		url.searchParams.set("q", name);
		const res = await fetch(url, options);
		if(res.status == 401) {
			await this.refreshToken();
			//Try again
			if(!isRetry) return await this.searchTrack(name, true);
			else return null;
		}
		try {
			const json = await res.json();
			const tracks = json.tracks as SearchTrackResult;
			StoreProxy.music.spotifyConsecutiveErrors = 0;
			if(tracks.items.length == 0) {
				return null;
			}else{
				return tracks.items;
			}
		}catch(error) {
			StoreProxy.music.spotifyConsecutiveErrors ++;
			return null;
		}
	}

	/**
	 * Adds a track to the queue
	 *
	 * @returns if a track has been found or not
	 */
	public async searchPlaylist(name:string, isRetry:boolean = false):Promise<SearchPlaylistItem|null> {
		const options = {
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/search?type=playlist&q="+encodeURIComponent(name), options);
		if(res.status == 401) {
			await this.refreshToken();
			//Try again
			if(!isRetry) return await this.searchPlaylist(name, true);
			else return null;
		}
		try {
			const json = await res.json();
			const tracks = json.playlists as SearchPlaylistResult;
			StoreProxy.music.spotifyConsecutiveErrors = 0;
			if(tracks.items.length == 0) {
				return null;
			}else{
				return tracks.items[0]!;
			}
		}catch(error) {
			StoreProxy.music.spotifyConsecutiveErrors ++;
			return null;
		}
	}

	/**
	 * Adds a track to the queue
	 *
	 * @param track Spotify URI of the track to add. Get one with "searchTrack()" method
	 * @param isRetry is trying again to execute the add to queue command?
	 * @param user User that adds the track
	 * @param searchTerms Search terms that triggered this add to queue command
	 * @returns if a track has been added or not
	 */
	public async addToQueue(track:SearchTrackItem, isRetry:boolean = false, user?:TwitchatDataTypes.TwitchatUser, searchTerms?:string):Promise<boolean|"NO_ACTIVE_DEVICE"> {
		const options = {
			headers:this._headers,
			method:"POST",
		}
		const res = await fetch("https://api.spotify.com/v1/me/player/queue?uri="+encodeURIComponent(track.uri), options);
		if(res.status <= 204 && res.status >= 200) {
			if(user) {
				this._trackIdToRequest[track.id] = {user, search:searchTerms};
			}
			StoreProxy.music.spotifyConsecutiveErrors = 0;
			return true;
		}else
		if(res.status == 401) {
			await this.refreshToken();
			//Try again
			if(!isRetry) return await this.addToQueue(track, true, user, searchTerms);
			else return false;
		}else
		if(res.status == 409) {
			StoreProxy.common.alert( StoreProxy.i18n.t("error.spotify.api_rate") );
		}else {
			try {
				const json = await res.json();
				if(json.error.reason == "NO_ACTIVE_DEVICE") {
					StoreProxy.common.alert( StoreProxy.i18n.t("error.spotify.no_device") );
					return "NO_ACTIVE_DEVICE";

				}else if(json.error.message) {
					StoreProxy.common.alert( "[SPOTIFY] "+json.error.message );
				}else {
					throw(new Error("unknown error"))
				}
			}catch(error) {
				StoreProxy.music.spotifyConsecutiveErrors ++;
				StoreProxy.common.alert( "[SPOTIFY] an unknown error occurred when adding a track to the queue. Server responded with HTTP status:"+res.status );
			}
		}
		return false;
	}

	/**
	 * Adds a track to the given playlist
	 *
	 * @param track Spotify URI of the track to add. Get one with "searchTrack()" method
	 * @param isRetry is trying again to execute the add to queue command?
	 * @returns if a track has been added or not
	 */
	public async addToPlaylist(track:SearchTrackItem, playlistId:string, isRetry:boolean = false, position?:number):Promise<boolean|"NO_ACTIVE_DEVICE"> {
		const options = {
			headers:this._headers,
			method:"POST",
			body:JSON.stringify({
				uris:[track.uri],
				position
			})
		}
		const res = await fetch("https://api.spotify.com/v1/playlists/"+playlistId+"/tracks", options);
		if(res.status <= 204 && res.status >= 200) {
			StoreProxy.music.spotifyConsecutiveErrors = 0;
			return true;
		}else
		if(res.status == 401) {
			await this.refreshToken();
			//Try again
			if(!isRetry) return await this.addToPlaylist(track, playlistId, true);
			else return false;
		}else
		if(res.status == 409) {
			StoreProxy.common.alert( StoreProxy.i18n.t("error.spotify.api_rate") );
		}else {
			try {
				const json = await res.json();
				if(json.error.reason == "NO_ACTIVE_DEVICE") {
					StoreProxy.common.alert( StoreProxy.i18n.t("error.spotify.no_device") );
					return "NO_ACTIVE_DEVICE";

				}else if(json.error.message) {
					StoreProxy.common.alert( "[SPOTIFY] "+json.error.message );
				}else {
					throw(new Error("unknown error"))
				}
			}catch(error) {
				StoreProxy.music.spotifyConsecutiveErrors ++;
				StoreProxy.common.alert( "[SPOTIFY] an unknown error occurred when adding a track to the playlist. Server responded with HTTP status:"+res.status );
			}
		}
		return false;
	}

	/**
	 * Get the currently playing track
	 * This starts a routine that automatically checks for new
	 * track info.
	 */
	public async getCurrentTrack():Promise<void> {
		if(!this.connected) return;

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
			StoreProxy.music.spotifyConsecutiveErrors ++;
			this._getTrackTimeout = window.setTimeout(()=> this.getCurrentTrack(), 3000);
			return;
		}
		if(res.status == 401) {
			await this.refreshToken();
			this._getTrackTimeout = window.setTimeout(()=> this.getCurrentTrack(), 1000);
			return;
		}
		if(res.status == 204) {
			//No content, nothing is playing
			this._isPlaying = false;
			this._getTrackTimeout = window.setTimeout(()=> this.getCurrentTrack(), 10000);
			StoreProxy.music.spotifyConsecutiveErrors = 0;
			return;
		}

		let json:SpotifyTrack|null = null;
		try {
			json = await res.json();
		}catch(error) { }
		if(!json) {
			this._getTrackTimeout = window.setTimeout(()=> {
				this.getCurrentTrack();
			}, 3000);
			return;
		}

		json = json!;
		StoreProxy.music.spotifyConsecutiveErrors = 0;

		if(json.currently_playing_type == "episode") {
			const episode = await this.getEpisodeInfos();
			if(episode) json = episode;
		}

		if(json.context && json.context?.type == "playlist") {
			const playlist = await this.getPlaylistById(json.context.uri.split(":").pop() || "");
			this.currentPlaylist = playlist;
		}else{
			this.currentPlaylist = null;
		}

		if(json.item) {
			let cover = json.item.images?.length > 0? json.item.images[0]!.url : "";
			if(json.item.show && json.item.show.images?.length > 0) cover = json.item.show.images[0]!.url;
			else if(json.item.album && json.item.album.images?.length > 0) cover = json.item.album.images[0]!.url;
			this.currentTrack = {
				title:json.item.name,
				artist:json.item.show? json.item.show.name : json.item.artists.map(a=>a.name).join(", "),
				album:json.item.album? json.item.album.name : "",
				cover,
				duration:json.item.duration_ms,
				url:json.item.external_urls.spotify,
				id:json.item.id,
			};
			this._isPlaying = json.is_playing && json.item != null;
			const request = this._trackIdToRequest[this.currentTrack.id];

			//If requested to skip this track
			if(request && request.skip === true) {
				//Delete skip ref to avoid multiple skips.
				//Next "getCurrentTrack" calls may return the same track due to API caching
				//which would execute multiple nextTrack() actions until spotify returns
				//the actual new track
				delete this._trackIdToRequest[this.currentTrack.id];
				await this.nextTrack();
				this._getTrackTimeout = window.setTimeout(()=> { this.getCurrentTrack(); }, 500);
				return;
			}

			if(this._isPlaying) {
				let trackChanged = false;
				//Check if track has changed
				if(!this._lastTrackInfo
				|| this._lastTrackInfo?.track.duration != this.currentTrack.duration
				|| this._lastTrackInfo?.track.title != this.currentTrack.title
				|| this._lastTrackInfo?.track.artist != this.currentTrack.artist) {
					trackChanged = true;
					const message:TwitchatDataTypes.MessageMusicStartData = {
						id:Utils.getUUID(),
						date:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.MUSIC_START,
						platform:"twitchat",
						track:this.currentTrack,
						channel_id:StoreProxy.auth.twitch.user.id,
						userOrigin:request?.user,
						searchTerms:request?.search,
					};
					StoreProxy.chat.addMessage(message);
					delete this._trackIdToRequest[this.currentTrack.id];

					StoreProxy.labels.updateLabelValue("MUSIC_TITLE", this.currentTrack.title);
					StoreProxy.labels.updateLabelValue("MUSIC_ARTIST", this.currentTrack.artist);
					StoreProxy.labels.updateLabelValue("MUSIC_ALBUM", this.currentTrack.album);
					StoreProxy.labels.updateLabelValue("MUSIC_COVER", this.currentTrack.cover);
					this.resyncQueue();

				}

				//If track changed or progress has moved by more than 10s
				if(trackChanged
				|| Math.abs(json.progress_ms - (this._lastTrackInfo?.progress || -100000)) > 10000) {
					//Broadcast to the overlays
					const apiData = {
						trackName: this.currentTrack.title,
						artistName: this.currentTrack.artist,
						trackDuration: this.currentTrack.duration,
						trackPlaybackPos: json.progress_ms,
						cover: this.currentTrack.cover,
						params: StoreProxy.music.musicPlayerParams,
						skin: Config.instance.GET_CURRENT_AUTO_SKIN_CONFIG()?.skin || "default",
					}
					PublicAPI.instance.broadcast(TwitchatEvent.CURRENT_TRACK, (apiData as unknown) as JsonObject);
				}

				this._lastTrackInfo = {
					track:this.currentTrack,
					progress:json.progress_ms,
				};

				let delay = json.item.duration_ms - json.progress_ms;
				if(isNaN(delay)) delay = 3000;
				this._getTrackTimeout = window.setTimeout(()=> {
					this.getCurrentTrack();
				}, Math.min(3000, delay + 1000));

			}else{
				//Broadcast to the overlays
				if(this._lastTrackInfo != null) {

					StoreProxy.labels.updateLabelValue("MUSIC_TITLE", "");
					StoreProxy.labels.updateLabelValue("MUSIC_ARTIST", "");
					StoreProxy.labels.updateLabelValue("MUSIC_ALBUM", "");
					StoreProxy.labels.updateLabelValue("MUSIC_COVER", "");

					PublicAPI.instance.broadcast(TwitchatEvent.CURRENT_TRACK, {
						params: (StoreProxy.music.musicPlayerParams as unknown) as JsonObject,
					});

					//Broadcast to the triggers
					const message:TwitchatDataTypes.MessageMusicStopData = {
						id:Utils.getUUID(),
						date:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP,
						platform:"twitchat",
						track:this.currentTrack,
						channel_id:StoreProxy.auth.twitch.user.id,
					};
					StoreProxy.chat.addMessage(message);

					this._lastTrackInfo = null;
				}
				this._getTrackTimeout = window.setTimeout(()=> { this.getCurrentTrack(); }, 3000);
			}
		}else{
			this._getTrackTimeout = window.setTimeout(()=> { this.getCurrentTrack(); }, 3000);
		}
	}

	/**
	 * Gets a playlist by its name
	 *
	 * @returns track info
	 */
	public async getPlaylistById(id:string, forceReload:boolean = false):Promise<PlaylistCachedIdItem|null> {
		if(this._playlistsIdCache[id] && !forceReload) return this._playlistsIdCache[id];
		const options = {
			headers:this._headers
		}
		let json:PlaylistCachedIdItem;
		const url = new URL("https://api.spotify.com/v1/playlists/"+id);
		url.searchParams.set("fields", "name,description,href,id,public,external_urls,uri,images,tracks.total");
		const res = await fetch(url, options);
		try {
			json = await res.json();
		}catch(error) {
			return null;
		}
		this._playlistsIdCache[id] = json;
		return json;
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
				try {
					json = await res.json();
				}catch(error) {
					return null;
				}
				offset += limit;
				playlists = playlists.concat((json.items as unknown) as SearchPlaylistItem[]);
			}while(json.next);
			this._playlistsCache = playlists;
		}

		let minDist = 10;
		let selected:SearchPlaylistItem|null = null;
		for (const p of this._playlistsCache) {
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

	/**
	 * Get how many tracks the users has pending in the queue
	 */
	public getPendingTracksForUser(user:TwitchatDataTypes.TwitchatUser):number {
		let count = 0;
		for (const id in this._trackIdToRequest) {
			const request = this._trackIdToRequest[id]!;
			if(request.skip !== true && request.user.id == user.id) count ++;
		}
		return count;
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TRACK, ()=>{
			if(!this._lastTrackInfo) return;
			const apiData = {
				trackName: this._lastTrackInfo.track.title,
				artistName: this._lastTrackInfo.track.artist,
				trackDuration: this._lastTrackInfo.track.duration,
				trackPlaybackPos: this._lastTrackInfo.progress,
				cover: this._lastTrackInfo.track.cover,
				params: StoreProxy.music.musicPlayerParams,
				skin: Config.instance.GET_CURRENT_AUTO_SKIN_CONFIG()?.skin || "default",
			}
			PublicAPI.instance.broadcast(TwitchatEvent.CURRENT_TRACK, (apiData as unknown) as JsonObject);
		});
	}

	/**
	 * Set access token
	 * @param value
	 */
	private setToken(value:SpotifyAuthToken | null) {
		if(value == null) {
			this.disconnect();
			return;
		}

		//Backup refresh token from prev token as spotify does not send us back a refrehs
		//token after refreshing a token.
		if(this._token?.refresh_token && !value?.refresh_token) value.refresh_token = this._token.refresh_token;

		this._token = value;
		this._token.expires_at =  Date.now() + this._token.expires_in * 1000;
		DataStore.set(DataStore.SPOTIFY_AUTH_TOKEN, this._token);

		this._headers = {
			"Accept":"application/json",
			"Content-Type":"application/json",
			"Authorization":"Bearer "+this._token.access_token,
		}
		this.connected = this._token? this._token.expires_at > Date.now() : false;
		rebuildPlaceholdersCache();

		if(Date.now() > this._token.expires_at - 10 * 60 * 1000) {
			this.refreshToken();
		}else{
			this.getCurrentTrack();
		}
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
		if(res.status <= 204 && res.status >= 200) {
			StoreProxy.music.spotifyConsecutiveErrors = 0;
			return true;
		}
		if(res.status == 404) {
			try {
				const json = await res.json();
				if(json.error?.reason == "NO_ACTIVE_DEVICE") {
					StoreProxy.common.alert( StoreProxy.i18n.t("music.spotify_play") );
				}
			}catch(error){
				StoreProxy.music.spotifyConsecutiveErrors ++;
				StoreProxy.common.alert( "[SPOTIFY] an unknown error occurred when calling endpoint "+path+"("+method+"). Server responded with HTTP status:"+res.status );
			}
		}else
		if(res.status == 409) {
			StoreProxy.common.alert( StoreProxy.i18n.t("error.spotify.api_rate") );
		}else {
			try {
				const json = await res.json();
				if(json.error.message) {
					StoreProxy.common.alert( "[SPOTIFY] "+json.error.message );
				}else {
					throw(new Error("Missing error details"))
				}
			}catch(error) {
				StoreProxy.music.spotifyConsecutiveErrors ++;
				StoreProxy.common.alert( "[SPOTIFY] an unknown error occurred when calling endpoint "+path+"("+method+"). Server responded with HTTP status:"+res.status );
			}
		}
		return false;
	}

	/**
	 * Gets a podcast infos
	 */
	private async getEpisodeInfos():Promise<SpotifyTrack|null> {
		const options:RequestInit = {
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode", options);
		if(res.status == 401) {
			await this.refreshToken();
			return null;
		}
		try {
			return await res.json();
		}catch(error) {
			return null;
		}
	}

	/**
	 * Loads current queue and remove any SR tracks that are not in the queue
	 */
	private async resyncQueue():Promise<void> {
		const options:RequestInit = {
			method:"GET",
			headers:this._headers
		}
		const res = await fetch("https://api.spotify.com/v1/me/player/queue", options);
		if(res.status == 401) {
			await this.refreshToken();
			return;
		}
		try {
			const json = await res.json() as {currently_playing:SpotifyTrack["item"], queue:SpotifyTrack["item"][]};
			const trackIds = json.queue.map(v=> v.id);
			for (const id in this._trackIdToRequest) {
				if(trackIds.indexOf(id) == -1) {
					//Pending track request not found on queue, remove it
					//this makes sure a viewer can make a new !sr even if the
					//track has been skipped by the streamer
					delete this._trackIdToRequest[id];
				}
			}
		}catch(error){

		}
	}

}
