import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue'
import type { ILumiaActions, ILumiaGetters, ILumiaState } from '../StoreProxy'
import StoreProxy from '../StoreProxy';
import DataStore from '../DataStore';

let socket:WebSocket|undefined = undefined;
let reconnectTimeout:number = -1;
let reconnectAttempts:number = 0;
let autoReconnect:boolean = false;

export const storeLumia = defineStore('lumia', {
	state: () => ({
		connected:false,
		socketToken:"",
	} as ILumiaState),



	getters: {
	} as ILumiaGetters
	& ThisType<UnwrapRef<ILumiaState> & _StoreWithGetters<ILumiaGetters> & PiniaCustomProperties>
	& _GettersTree<ILumiaState>,



	actions: {
		populateData():void {
			const data = DataStore.get(DataStore.LUMIA);
			if(data) {
				const json = JSON.parse(data) as LumiaStoreData;
				this.socketToken = json.token;
				if(this.socketToken){
					this.connect(this.socketToken).then(success=>{
						if(!success) {
							StoreProxy.common.alert(StoreProxy.i18n.t("error.lumia_connect_failed"));
						}
					});
				}
			}
		},

		async connect(token:string, isReconnect:boolean = false):Promise<boolean> {
			if(!StoreProxy.auth.isPremium) return Promise.resolve(false);

			//Token changed
			if(isReconnect && token != this.socketToken) return Promise.resolve(false);
			
			this.disconnect();

			if(!isReconnect) {
				this.socketToken = token;
			}

			autoReconnect = true;

			return new Promise<boolean>((resolve, reject)=> {
		
				socket = new WebSocket(`ws://127.0.0.1:39231/api?token=${token}&origin=Twitchat&name=Twitchat`);
				socket.onopen = (e) => {
					this.connected = true;
					this.socketToken = token;
					resolve(true);
					this.saveData();
				}
				
				socket.onclose = (event) => {
					//Do not reconnect if token changed
					if(token != this.socketToken) return;
					if(!autoReconnect) return;

					this.connected = false;
					clearTimeout(reconnectTimeout);
					reconnectAttempts ++;
					reconnectTimeout = window.setTimeout(()=> {
						socket = undefined;
						this.connect(token, true);
					}, 500 * reconnectAttempts);
				};
				
				socket.onerror = (error) => {
					resolve(false);
					this.connected = false;
					if(!autoReconnect) return;
					reconnectAttempts ++;
					clearTimeout(reconnectTimeout);
					reconnectTimeout = window.setTimeout(()=> {
						socket = undefined;
						this.connect(token, true);
					}, 500 * reconnectAttempts);
				};
			});
		},
		
		disconnect():void {
			autoReconnect = false;
			this.connected = false;
			this.socketToken = "";
			this.saveData();
			clearTimeout(reconnectTimeout);
			if(socket && this.connected) socket.close();
		},

		setColor(color:number|string, brightness:number, duration:number, transition:number):void {
			if(!socket) return;
			let rgb:number = 0;
			if(typeof color == "number") rgb = color;
			else rgb = parseInt(color.replace(/[^0-9]/, ""), 16);
			const data:IColorCommand ={
					type:'rgb-color',
					params:{
						value:{ r: (rgb>>16) & 0xff, g:(rgb >> 8) & 0xff, b:(rgb >> 0) & 0xff },
						brightness,
						duration,
						transition,
					}
				};
			socket.send(JSON.stringify(data));
		},

		sendTTS(message:string, voice:typeof LumiaVoiceList[number]):void {
			if(!socket) return;
			const data:ITTSCommand ={
					type:'tts',
					params:{
						value:message,
						voice,
					}
				};
			socket.send(JSON.stringify(data));
		},

		saveData():void {
			const data:LumiaStoreData = {
				token:this.socketToken,
			}
			DataStore.set(DataStore.LUMIA, data);
		}
	} as ILumiaActions
	& ThisType<ILumiaActions
		& UnwrapRef<ILumiaState>
		& _StoreWithState<"lumia", ILumiaState, ILumiaGetters, ILumiaActions>
		& _StoreWithGetters<ILumiaGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeLumia, import.meta.hot))
}

export interface LumiaStoreData {
	token:string;
}


interface ICommand {
	type:CommandCode;
}

interface IColorCommand extends ICommand {
	type:"rgb-color";
	params: {
		value:{
			r: number;
			g: number;
			b: number;
		};
		brightness:number;
		duration:number;
		transition:number;
	}
}

interface ITTSCommand extends ICommand {
	type:"tts";
	params: {
		value:string;
		voice:typeof LumiaVoiceList[number];
	}
}

type CommandCode = "alert"
				| "midi"
				| "osc"
				| "artnet"
				| "rgb-color"
				| "hex-color"
				| "chat-command"
				| "twitch-points"
				| "twitch-extension"
				| "trovo-spells"
				| "studio-scene"
				| "studio-animation"
				| "studio-theme"
				| "chatbot-message"
				| "tts"
				| "to-default"
				| "clear-queue"
				| "toggle-fuze"
				| "toggle-lumia"
				| "toggle-stream-mode"
				| "gamesglow-alert"
				| "gamesglow-command"
				| "gamesglow-variable"
				| "gamesglow-virtuallight";

type AlertCode=  "twitch_follower"
				| "twitch_subscriber"
				| "twitch_bits"
				| "twitch_host"
				| "twitch_raid"
				| "youtube_subscriber"
				| "youtube_superchat"
				| "youtube_supersticker"
				| "youtube_member"
				| "facebook_follower"
				| "facebook_reaction"
				| "facebook_star"
				| "facebook_support"
				| "facebook_share"
				| "facebook_fan"
				| "trovo_follower"
				| "trovo_subscriber"
				| "streamlabs_donation"
				| "streamlabs_merch"
				| "streamlabs_redemption"
				| "streamlabs_primegift"
				| "streamelements_donation"
				| "obs_switchscene"
				| "obs_switch_transition"
				| "obs_streamstarting"
				| "obs_streamstopping"
				| "slobs_switchscene"
				| "treatstream_treat"
				| "pulse_heartrate"
				| "pulse_calories";

type LumiaEventCode = "states"
					| "chat"
					| "command"
					| "twitch_points"
					| "twitch_extesions"
					| "trovo_spell"
					| "pulse"
					| "alert"
					| "gamesglow_alert"
					| "gamesglow_command"
					| "gamesglow_virtuallight";

type PlatformCode = "twitch"
					| "youtube"
					| "facebook"
					| "trovo"
					| "glimesh";

type LightBrandCode = "hue"
					| "nanoleaf"
					| "nanoleaf2"
					| "lifx"
					| "tplink"
					| "yeelight"
					| "cololight"
					| "tuya"
					| "smartlife"
					| "wyze"
					| "wiz"
					| "homeassistant"
					| "govee"
					| "wled"
					| "magichome"
					| "logitech"
					| "razer"
					| "corsair"
					| "steelseries"
					| "overlay"
					| "elgato"
					| "virtuallights";

type EventOriginCode = "lumia"
					| "twitch"
					| "youtube"
					| "facebook"
					| "glimesh"
					| "trovo"
					| "streamlabs"
					| "streamelements"
					| "extralife"
					| "donordrive"
					| "tiltify"
					| "patreon"
					| "tipeeestream"
					| "treatstream"
					| "discord"
					| "obs"
					| "slobs"
					| "pulsoid"
					| "paypal";

export const LumiaVoiceList = [
	"default",
	"random",
	"[Cloud] Brian",
	"[Cloud] Ivy",
	"[Cloud] Justin",
	"[Cloud] Russell",
	"[Cloud] Nicole",
	"[Cloud] Emma",
	"[Cloud] Amy",
	"[Cloud] Joanna",
	"[Cloud] Salli",
	"[Cloud] Kimberly",
	"[Cloud] Kendra",
	"[Cloud] Koey",
	"[Cloud] Mizuki (Japanese)",
	"[Cloud] Chantal (French)",
	"[Cloud] Mathieu (French)",
	"[Cloud] Maxim (Russian)",
	"[Cloud] Hans (German)",
	"[Cloud] Raveena (Hindi)",
	"[VM] Chad",
	"[VM] Marcus",
	"[VM] Corinne",
	"[VM] Narrator",
	"[VM] Haley",
	"[VM] Joe",
	"[VM] Karen",
	"[VM] Jennifer",
	"[VM] Cameron",
	"[VM] Daniel",
	"[VM] Alice",
	"[VM] Jeff",
	"[VM] Dean",
	"[VM] Bob",
	"[VM] Claudia",
	"[VM] Agatha",
	"[VM] Matt",
	"[VM] Stephanie",
	"[VM] Blake",
	"[VM] Vicky",
	"[VM] Jackie",
] as const