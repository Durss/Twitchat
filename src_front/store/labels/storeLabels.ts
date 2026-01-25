import { LabelItemPlaceholderList, type LabelItemData, type LabelItemPlaceholder } from '@/types/ILabelOverlayData';
import PublicAPI from '@/utils/PublicAPI';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ILabelsActions, ILabelsGetters, ILabelsState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import * as Sentry from "@sentry/vue";

let ready = false;
let readyResolver:() => void;
let readyPromise = new Promise<void>((resolve) => readyResolver = resolve);
let broadcastCount:number = 0;
let broadcastDebounce:number = -1;
let saveDebounce:number = -1;
let lastSaveDate:number = Date.now();

export const storeLabels = defineStore('labels', {
	state: () => ({
		labelList:[],
		placeholders:{},
		selectedLabelIDs:[],
	} as ILabelsState),



	getters: {
		allPlaceholders() {
			const placeholders = JSON.parse(JSON.stringify(this.placeholders)) as typeof this.placeholders;
			const values = StoreProxy.values.valueList;
			values.forEach(v=> {
				if(v.perUser) return;
				placeholders["VALUE_"+v.placeholderKey as "SUB_TIER"] = {
					value:v.value,
					category:"value",
					placeholder:{
						descriptionKey: "overlay.labels.placeholders.VALUE",
						descriptionKeyName: v.name,
						//@ts-ignore super dirty way of bypassing type checking on this I know...
						tag:"VALUE_"+v.placeholderKey,
						type:"string",
					}
				};
			});
			const counters = StoreProxy.counters.counterList;
			counters.forEach(v=> {
				if(v.perUser) return;
				placeholders["COUNTER_"+v.placeholderKey as "SUB_TIER"] = {
					value:v.value,
					category:"counter",
					placeholder:{
						descriptionKey: "overlay.labels.placeholders.COUNTER",
						descriptionKeyName: v.name,
						//@ts-ignore super dirty way of bypassing type checking on this I know...
						tag:"COUNTER_"+v.placeholderKey,
						type:"string",
					}
				};
			});

			return placeholders;
		}
	} as ILabelsGetters
	& ThisType<UnwrapRef<ILabelsState> & _StoreWithGetters<ILabelsGetters> & PiniaCustomProperties>
	& _GettersTree<ILabelsState>,



	actions: {
		populateData():void {
			LabelItemPlaceholderList.forEach(p => {
				this.placeholders[p.tag] = {
					value: p.type == "number"? 0 : "",
					category:p.category,
					placeholder:p,
				}
			});
			const json = DataStore.get(DataStore.OVERLAY_LABELS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.labelList = data.labelList;

				//Restore placeholder values from cache
				if(data.cachedValues) {
					for (const tag in data.cachedValues) {
						const typedKey = tag as keyof typeof this.placeholders;
						const placeholder = this.placeholders[typedKey];
						const value = data.cachedValues[typedKey];
						if(!placeholder || !value) continue;
						placeholder.value = value;
					}
				}
			}

			PublicAPI.instance.addEventListener("GET_LABEL_OVERLAY_PLACEHOLDERS", ()=>{
				this.broadcastPlaceholders();
			});

			PublicAPI.instance.addEventListener("GET_LABEL_OVERLAY_CONFIGS", (e)=> {
				if(e.data) this.broadcastLabelParams(e.data.id);
			});

			this.placeholders["DATE"]		= {value:Date.now(), category:"date", placeholder:LabelItemPlaceholderList.find(v=>v.tag ==  "DATE")!};
			this.placeholders["TIME"]		= {value:Date.now(), category:"date", placeholder:LabelItemPlaceholderList.find(v=>v.tag ==  "TIME")!};
			this.placeholders["DATE_TIME"]	= {value:Date.now(), category:"date", placeholder:LabelItemPlaceholderList.find(v=>v.tag ==  "DATE_TIME")!};

			ready = true;
			readyResolver();

			this.broadcastPlaceholders();
		},

		getLabelByKey(key:typeof LabelItemPlaceholderList[number]["tag"]):string|number|undefined {
			// Special case for generic viewer count, return the sum of all platforms
			if(key == "VIEWER_COUNT") {
				let twitch = this.getLabelByKey("VIEWER_COUNT_TWITCH") as number || 0;
				let youtube = this.getLabelByKey("VIEWER_COUNT_YOUTUBE") as number || 0;
				let tiktok = this.getLabelByKey("VIEWER_COUNT_TIKTOK") as number || 0;
				return twitch + youtube + tiktok;
			}
			return this.placeholders[key]?.value;
		},

		addLabel():void {
			this.labelList.push({
				id:Utils.getUUID(),
				enabled:true,
				title:"",
				html:"",
				css:"",
				placeholder:"",
				mode:"placeholder",
				fontFamily:"",
				fontSize:20,
				backgroundColor:"#ffffff",
				backgroundEnabled:true,
				fontColor:"#000000",
				scrollContent:false,
				textAlign:"left",
			});
			this.saveData();
		},

		removeLabel(labelId:string):void {
			const t = StoreProxy.i18n.t;
			StoreProxy.main.confirm(t("overlay.labels.delete_confirm.title"), t("overlay.labels.delete_confirm.description"))
			.then(()=>{
				this.labelList = this.labelList.filter(v => v.id !== labelId);
				this.saveData();
			}).catch(()=>{})
		},

		saveData(labelId?:string):void {
			//Saves currently cached values
			const cachedValues:IStoreData["cachedValues"] = {};
			for (const tag in this.placeholders) {
				const typedKey = tag as keyof typeof this.placeholders;
				const placeholder = this.placeholders[typedKey];
				if(placeholder && LabelItemPlaceholderList.find(v=>v.tag == typedKey)?.backup !== false) {
					cachedValues[typedKey] = placeholder.value;
				}
			}

			const data:IStoreData = {
				labelList:this.labelList,
				cachedValues,
			}

			let elapsedSinceLastSave = Date.now() - lastSaveDate;
			clearTimeout(saveDebounce);
			saveDebounce = window.setTimeout(() => {
				lastSaveDate = Date.now();
				DataStore.set(DataStore.OVERLAY_LABELS, data);
			}, 30000);
			//Make sure labels are saved at least every 5 minutes
			if(elapsedSinceLastSave > 5 * 60 * 1000) {
				lastSaveDate = Date.now();
				DataStore.set(DataStore.OVERLAY_LABELS, data);
			}
			if(labelId) this.broadcastLabelParams(labelId);
		},

		async updateLabelValue(key:typeof LabelItemPlaceholderList[number]["tag"], value:string|number, userId?:string):Promise<void> {
			if(!ready) {
				//Store not yet ready, wiat for it to be ready
				await readyPromise;
			}

			//Load avatar if the one given is empty
			if(userId && !value && key.indexOf("_AVATAR")) {
				const [user] = await TwitchUtils.getUserInfo([userId]);
				if(user) value = user.profile_image_url;
			}
			if(this.placeholders[key] && this.placeholders[key].value != value) {
				this.placeholders[key].value = value;
				this.broadcastPlaceholders();
				this.saveData();
			}else if(this.placeholders[key] === undefined) {
				Sentry.captureMessage("[LABELS] Trying to update unknown label placeholder: "+key);
			}
		},

		async incrementLabelValue(key:typeof LabelItemPlaceholderList[number]["tag"], value:number):Promise<void> {
			if(value == 0) return;
			if(!ready) {
				//Store not yet ready, wiat for it to be ready
				await readyPromise;
			}
			const prevValue = this.placeholders[key]!.value as number || 0;
			this.placeholders[key]!.value = prevValue + value;
			this.broadcastPlaceholders();
			this.saveData();
		},

		broadcastPlaceholders():void {
			//This condition makes sure that even if some part of the code
			//ends up spamming "broadcastPlaceholders()" calls, at least
			//every few events get actually fired without clogging the
			//communication channel
			if(++broadcastCount != 50) clearTimeout(broadcastDebounce);
			broadcastDebounce = window.setTimeout(() => {
				broadcastCount = 0;
				const list:{[tag:string]:{value:string|number, type:LabelItemPlaceholder["type"]}} = {};
				for (const key in this.allPlaceholders) {
					type typedKey = keyof typeof this.allPlaceholders;
					const ph = this.allPlaceholders[key as typedKey]!;
					list[key] = {
						type:ph.placeholder.type,
						value:ph.value,
					}
					if(list[key].value === undefined) {
						if(ph.placeholder.type == "date" || ph.placeholder.type == "datetime" || ph.placeholder.type == "time") {
							list[key].value = Date.now();
						}else if(ph.placeholder.type == "image" || ph.placeholder.type == "string") {
							list[key].value = "";
						}else if(ph.placeholder.type == "number" || ph.placeholder.type == "duration") {
							list[key].value = 0;
						}
					}
				}
				PublicAPI.instance.broadcast("ON_LABEL_OVERLAY_PLACEHOLDERS", list);
			}, 100);
		},

		broadcastLabelParams(labelId:string):void {
			const data = this.labelList.find(v=>v.id == labelId) || null;
			const tag = data?.placeholder;
			const validTag = data?.mode == "placeholder" && tag && this.allPlaceholders[tag];
			if(data && data.enabled === true) {
				PublicAPI.instance.broadcast("ON_LABEL_OVERLAY_CONFIGS", {id:labelId, data, exists:true, isValid:(!!validTag || data.mode == "html")});
			}else{
				PublicAPI.instance.broadcast("ON_LABEL_OVERLAY_CONFIGS", {id:labelId, data:null, exists:false});
			}
		},

		duplicateLabel(labelId:string):void {
			const label = this.labelList.find(v=>v.id == labelId) || null;
			if(label) {
				const clone = JSON.parse(JSON.stringify(label)) as typeof label;
				clone.id = Utils.getUUID();
				clone.title += " (copy)"
				this.labelList.push(clone);
				this.saveData();
			}

		}

	} as ILabelsActions
	& ThisType<ILabelsActions
		& UnwrapRef<ILabelsState>
		& _StoreWithState<"labels", ILabelsState, ILabelsGetters, ILabelsActions>
		& ILabelsGetters
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeLabels, import.meta.hot))
}

interface IStoreData {
	labelList:LabelItemData[];
	cachedValues:Partial<{[key in typeof LabelItemPlaceholderList[number]["tag"]]:string|number}>;
}
