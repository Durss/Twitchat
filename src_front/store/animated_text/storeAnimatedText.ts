import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import StoreProxy, { type IAnimatedTextActions, type IAnimatedTextGetters, type IAnimatedTextState } from '../StoreProxy';

const queryIdToResolver = new Map<string, ()=>void>();

export const storeAnimatedText = defineStore('animatedtext', {
	state: () => ({
		animatedTextList: [] as TwitchatDataTypes.AnimatedTextData[],
	} as IAnimatedTextState),



	getters: {
	} as IAnimatedTextGetters
	& ThisType<UnwrapRef<IAnimatedTextState> & _StoreWithGetters<IAnimatedTextGetters> & PiniaCustomProperties>
	& _GettersTree<IAnimatedTextState>,



	actions: {
		async populateData():Promise<void> {
			const json = DataStore.get(DataStore.ANIMATED_TEXT_CONFIGS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.animatedTextList = data.animatedTextList
			}

			/**
			 * Called when animated text overlay requests for a animated text configs
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_ANIMATED_TEXT_CONFIGS, (event:TwitchatEvent<{ id?:string }>)=> {
				if(event.data?.id) {
					this.broadcastStates(event.data.id);
				}else{
					//Broadcast all states
					for (let i = 0; i < this.animatedTextList.length; i++) {
						const entry = this.animatedTextList[i];
						this.broadcastStates(entry.id);
					}
				}
			});

			/**
			 * Called when animated text overlay completes hide animation
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.ANIMATED_TEXT_HIDE_COMPLETE, (event:TwitchatEvent<{ queryId?:string }>)=> {
				if(event.data?.queryId) {
					const resolver = queryIdToResolver.get(event.data?.queryId);
					if(resolver) resolver();
				}
			});

			/**
			 * Called when animated text overlay completes show animation
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.ANIMATED_TEXT_SHOW_COMPLETE, (event:TwitchatEvent<{ queryId?:string }>)=> {
				if(event.data?.queryId) {
					const resolver = queryIdToResolver.get(event.data?.queryId);
					if(resolver) resolver();
				}
			});
		},

		broadcastStates(id?:string) {
			for (let i = 0; i < this.animatedTextList.length; i++) {
				const entry = this.animatedTextList[i];
				if(id && entry.id !== id || !entry.enabled) continue;
				PublicAPI.instance.broadcast(TwitchatEvent.ANIMATED_TEXT_CONFIGS, entry);
			}
		},

		createAnimatedText() {
			if(!StoreProxy.auth.isPremium && this.animatedTextList.length >= Config.instance.MAX_TIMERS) return;
			const data:TwitchatDataTypes.AnimatedTextData = {
				id:Utils.getUUID(),
				title:"",
				enabled:true,
				animDurationScale:1,
				animStrength:1,
				animStyle:"wave",
				colorBase:"#008667",
				colorHighlights:"#e04e00",
				textFont:"Inter",
				textSize:30,
			}
			this.animatedTextList.push(data);
			this.saveData();
		},

		deleteAnimatedText(id:string) {
			const index = this.animatedTextList.findIndex(t=> t.id === id);
			if(index == -1) return;
			StoreProxy.main.confirm(StoreProxy.i18n.t("overlay.animatedText.delete_confirm.title"), StoreProxy.i18n.t("overlay.animatedText.delete_confirm.message"))
			.then(()=> {
				this.animatedTextList.splice(index, 1);
				this.saveData();
			}).catch(_=> {});
		},

		saveData() {
			const data:IStoreData = {
				animatedTextList:this.animatedTextList
			};
			DataStore.set(DataStore.ANIMATED_TEXT_CONFIGS, data);
		},

		async animateText(overlayId:string, text:string, autoHide:boolean = false, bypassAll:boolean = false):Promise<void> {
			return new Promise<void>((resolve, reject)=> {
				const queryId:string = Utils.getUUID();
				queryIdToResolver.set(queryId, resolve);
				PublicAPI.instance.broadcast(TwitchatEvent.ANIMATED_TEXT_SET, {overlayId, queryId, text, autoHide, bypassAll});
			});
		},

		async hideText(overlayId:string):Promise<void> {
			return new Promise<void>((resolve, reject)=> {
				const queryId:string = Utils.getUUID();
				queryIdToResolver.set(queryId, resolve);
				PublicAPI.instance.broadcast(TwitchatEvent.ANIMATED_TEXT_CLOSE, {overlayId, queryId});
		});
		},
	} as IAnimatedTextActions
	& ThisType<IAnimatedTextActions
		& UnwrapRef<IAnimatedTextState>
		& _StoreWithState<"animatedtext", IAnimatedTextState, IAnimatedTextGetters, IAnimatedTextActions>
		& _StoreWithGetters<IAnimatedTextGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeAnimatedText, import.meta.hot))
}

interface IStoreData {
	animatedTextList:TwitchatDataTypes.AnimatedTextData[];
}
