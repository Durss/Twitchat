import type { SettingsExportData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import * as Sentry from "@sentry/vue";
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import { unref, type UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IExporterActions, IExporterGetters, IExporterState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import ApiHelper from '@/utils/ApiHelper';

export const storeExporter = defineStore('Exporter', {
	state: () => ({
		exportingSelectedSettings:false,
		selectedTimerIDs:[],
		selectedTriggerIDs:[],
		selectedCounterIDs:[],
		selectedValueIDs:[],
		selectedLabelIDs:[],
		selectedAnimatedTextIDs:[],
		selectedCustomTrainIDs:[],
		selectedEndingCreditsSlotIDs:[],
		selectedBingoGridIDs:[],
	} as IExporterState),



	getters: {
	} as IExporterGetters
	& ThisType<UnwrapRef<IExporterState> & _StoreWithGetters<IExporterGetters> & PiniaCustomProperties>
	& _GettersTree<IExporterState>,



	actions: {
		async exportSelectedSettings(exportName:string,
		description:string,
		autoDeleteDate:string|undefined,
		paramList:SettingsExportData["params"],
		password?:string):Promise<string|false> {
			const triggers:SettingsExportData["triggers"] = [];
			const timers:SettingsExportData["timers"] = [];
			const counters:SettingsExportData["counters"] = [];
			const values:SettingsExportData["values"] = [];
			const labels:SettingsExportData["labels"] = [];
			const animatedTexts:SettingsExportData["animatedTexts"] = [];
			const customTrains:SettingsExportData["customTrains"] = [];
			const endingCreditsSlots:SettingsExportData["endingCreditsSlots"] = [];

			StoreProxy.exporter.selectedTriggerIDs.forEach(id => {
				const t = unref(StoreProxy.triggers.triggerList.find(v=> v.id == id));
				if(t) {
					triggers.push(t);
				}
			});

			StoreProxy.exporter.selectedTimerIDs.forEach(id => {
				const c = unref(StoreProxy.timers.timerList.find(v=> v.id == id));
				if(c) {
					timers.push(c);
				}
			});

			StoreProxy.exporter.selectedCounterIDs.forEach(id => {
				const c = unref(StoreProxy.counters.counterList.find(v=> v.id == id));
				if(c) {
					counters.push(c);
				}
			});

			StoreProxy.exporter.selectedValueIDs.forEach(id => {
				const v = unref(StoreProxy.values.valueList.find(v=> v.id == id));
				if(v) {
					values.push(v);
				}
			});

			StoreProxy.exporter.selectedLabelIDs.forEach(id => {
				const l = unref(StoreProxy.labels.labelList.find(v=> v.id == id));
				if(l) {
					labels.push(l);
				}
			});

			StoreProxy.exporter.selectedAnimatedTextIDs.forEach(id => {
				const a = unref(StoreProxy.animatedText.animatedTextList.find(v=> v.id == id));
				if(a) {
					animatedTexts.push(a);
				}
			});

			StoreProxy.exporter.selectedCustomTrainIDs.forEach(id => {
				const c = unref(StoreProxy.customTrain.customTrainList.find(v=> v.id == id));
				if(c) {
					customTrains.push(c);
				}
			});

			const json = DataStore.get(DataStore.ENDING_CREDITS_PARAMS);
			if(json) {
				const creditsData = JSON.parse(json) as TwitchatDataTypes.EndingCreditsParams|undefined;
				StoreProxy.exporter.selectedEndingCreditsSlotIDs.forEach(id => {
					const e = unref(creditsData?.slots.find(v=> v.id == id));
					if(e) {
						endingCreditsSlots.push(e);
					}
				});
			}

			if(triggers.length === 0
			&& timers.length === 0
			&& counters.length === 0
			&& values.length === 0
			&& labels.length === 0
			&& animatedTexts.length === 0
			&& customTrains.length === 0
			&& endingCreditsSlots.length === 0) {
				return Promise.resolve(false);
			}

			const data:Omit<SettingsExportData, "authorId"> = {
				version: 1,
				triggers,
				timers,
				counters,
				values,
				labels,
				animatedTexts,
				customTrains,
				endingCreditsSlots,
				info: description,
				autoDelete_at: autoDeleteDate? new Date(autoDeleteDate).getTime() : 0,
				params: paramList,
				name: exportName,
			};
			
			if(isNaN(data.autoDelete_at)){
				data.autoDelete_at = 0;
			}
			this.exportingSelectedSettings = true;
			let encrypted:string | undefined = undefined;
			if(password && password.length > 0) {
				const dataStr = JSON.stringify(data);
				encrypted = await Utils.encryptMessage(dataStr, password);
			}
			let result:string|false = false;
			try {
				// await Utils.promisedTimeout(1500)
				const query = await ApiHelper.call("user/settingsPreset", "POST", {name:exportName, data:encrypted? undefined : data, encrypted}, false);
				if(query.json.success && query.json.fileName) {
					result = query.json.fileName as string;
				}
			} catch (error) {
				console.error("Error exporting triggers:", error);
				StoreProxy.common.alert("Failed to export triggers");
			}
			await Utils.promisedTimeout(250);
			this.exportingSelectedSettings = false;
			return result;
		},

		importSettings(data:SettingsExportData):void {
			try {
				const replaceList = data.params.map(v=> {
					let escapedKey = v.key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
					// Enforce default boolean values to false
					if(v.valueType == "boolean") {
						if(v.value === undefined ) v.value = false;
						// Remove surrounding quotes if any
						escapedKey = `("|')?${escapedKey}("|')?`;
					}
					return {
						reg: new RegExp(escapedKey, "gi"),
						value: v.value
					}
				})
				
				let str = JSON.stringify(data);
				replaceList.forEach(r => {
					str = str.replace(r.reg, r.value?.toString() || "");
				});
				data = JSON.parse(str) as SettingsExportData;

				//Import triggers
				if(data.triggers.length > 0) {
					data.triggers.forEach(t => {
						if(data.autoDelete_at > 0) {
							t.autoDelete_at = data.autoDelete_at;
						}
						t.importedInfo = {
							author: data.authorId,
							name: data.name,
						}
						
						const existsAt = StoreProxy.triggers.triggerList.findIndex(v=> v.id == t.id);
						if(existsAt !== -1) {
							//If the trigger already exists just update it
							StoreProxy.triggers.triggerList[existsAt] = t;
						}else{
							//Add the new trigger
							StoreProxy.triggers.triggerList.push(t);
						}
					});
					
					StoreProxy.triggers.saveTriggers();
				}

				// Import timers
				if(data.timers.length > 0) {
					const timerList = StoreProxy.timers.timerList;
					data.timers.forEach(t => {
						const existsAt = timerList.findIndex(v=> v.id == t.id);
						if(existsAt !== -1) {
							//If the timer already exists just update it
							timerList[existsAt] = t;
						}else{
							//Add the new timer
							timerList.push(t);
						}
					});
				}

				// Import Counters
				if(data.counters.length > 0) {
					const counterList = StoreProxy.counters.counterList;
					data.counters.forEach(c => {
						const existsAt = counterList.findIndex(v=> v.id == c.id);
						if(existsAt !== -1) {
							//If the counter already exists just update it
							counterList[existsAt] = c;
						}else{
							//Add the new counter
							counterList.push(c);
						}
					});
				}

				// Import Values
				if(data.values.length > 0) {
					const valueList = StoreProxy.values.valueList;
					data.values.forEach(v => {
						const existsAt = valueList.findIndex(val=> val.id == v.id);
						if(existsAt !== -1) {
							//If the value already exists just update it
							valueList[existsAt] = v;
						}else{
							//Add the new value
							valueList.push(v);
						}
					});
				}

				// Import Labels
				if(data.labels.length > 0) {
					const labelList = StoreProxy.labels.labelList;
					data.labels.forEach(l => {
						const existsAt = labelList.findIndex(val=> val.id == l.id);
						if(existsAt !== -1) {
							//If the label already exists just update it
							labelList[existsAt] = l;
						}else{
							//Add the new label
							labelList.push(l);
						}
					});
				}
				
				// Import Animated Texts
				if(data.animatedTexts.length > 0) {
					const animatedTextList = StoreProxy.animatedText.animatedTextList;
					data.animatedTexts.forEach(a => {
						const existsAt = animatedTextList.findIndex(val=> val.id == a.id);
						if(existsAt !== -1) {
							//If the animated text already exists just update it
							animatedTextList[existsAt] = a;
						}else{
							//Add the new animated text
							animatedTextList.push(a);
						}
					});
				}
				
				// Import Custom Trains
				if(data.customTrains.length > 0) {
					const customTrainList = StoreProxy.customTrain.customTrainList;
					data.customTrains.forEach(ct => {
						const existsAt = customTrainList.findIndex(val=> val.id == ct.id);
						if(existsAt !== -1) {
							//If the custom train already exists just update it
							customTrainList[existsAt] = ct;
						}else{
							//Add the new custom train
							customTrainList.push(ct);
						}
					});
				}

				// Import Ending Credits slots
				if(data.endingCreditsSlots.length > 0) {
					const creditsData = StoreProxy.endingCredits.overlayData
					data.endingCreditsSlots.forEach(slot => {
						const existsAt = creditsData.slots.findIndex(val => val.id == slot.id);
						if(existsAt !== -1) {
							//If the slot already exists just update it
							creditsData.slots[existsAt] = slot;
						}else{
							//Add the new slot
							creditsData.slots.push(slot);
						}
					});
				}
			}catch(e) {
				console.error("Error importing triggers:", e);
				Sentry.captureException("Failed importing triggers", { attachments: [{ filename: "imported_data", data: JSON.stringify(data) }] });
			}
		}
	} as IExporterActions
	& ThisType<IExporterActions
		& UnwrapRef<IExporterState>
		& _StoreWithState<"Exporter", IExporterState, IExporterGetters, IExporterActions>
		& _StoreWithGetters<IExporterGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeExporter, import.meta.hot))
}