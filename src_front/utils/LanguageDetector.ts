import { TranslatableLanguagesMap } from "@/TranslatableLanguages";
import StoreProxy from "@/store/StoreProxy";
import EldWorker, { type EldModel, type Language } from "./EldWorker";
import LandeWorker from "./LandeWorker";

//"autoTranslateModel" param values running on ELD. Anything else runs on Lande
const PARAM_TO_ELD_MODEL: { [param: string]: EldModel } = {
	eld_xs: "extrasmall",
	eld_s: "small",
	eld_m: "medium",
	eld_l: "large",
};

/**
 * Redirects language detections to the engine selected on "autoTranslateModel" param
 * Created : 03/11/2026
 */
export default class LanguageDetector {
	private static _instance: LanguageDetector;

	constructor() {}

	/********************
	 * GETTER / SETTERS *
	 ********************/
	static get instance(): LanguageDetector {
		if (!LanguageDetector._instance) {
			LanguageDetector._instance = new LanguageDetector();
		}
		return LanguageDetector._instance;
	}

	/******************
	 * PUBLIC METHODS *
	 ******************/
	/**
	 * Detects the language of a text.
	 * "language" is undefined if the engine isn't sure or if it's not a translatable language.
	 */
	public detect(text: string, callback: (language: Language | undefined) => void): void {
		const param = StoreProxy.params.features.autoTranslateModel.value as string;
		const eldModel = PARAM_TO_ELD_MODEL[param];
		//Stop the other engine so only the selected one stays in memory
		if (eldModel) {
			LandeWorker.instance.stop();
			EldWorker.instance.setModel(eldModel);
			EldWorker.instance.detect(text, (language, reliable) => {
				callback(reliable ? language : undefined);
			});
		} else {
			EldWorker.instance.stop();
			this.detectWithLande(text, callback);
		}
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	private detectWithLande(
		text: string,
		callback: (language: Language | undefined) => void,
	): void {
		LandeWorker.instance.lande(text, (langs) => {
			const iso3 = langs[0]![0] as keyof typeof TranslatableLanguagesMap;
			//Force to english if confidence is too low as it tends to detect weird languages for basic english messages
			//Also force english if first returned lang is Affrikaan and second is english.
			//It detects most english messages as Afrikaan.
			const lang =
				langs[0]![1] < 0.6 || (langs[0]![0] == "afr" && langs[1]![0] == "eng")
					? TranslatableLanguagesMap["eng"]
					: TranslatableLanguagesMap[iso3];
			callback(lang);
		});
	}
}
