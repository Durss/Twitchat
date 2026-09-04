<template>
	<div class="labelseditor">
		<div class="head">
			<AppLangSelector class="langSelector" allLocales v-model:langRef="langRef" showRef />

			<div class="sectionList">
				<TTButton
					v-for="(value, key) in labelsRef"
					:key="key"
					:selected="selectedSectionKey == key"
					:value="value"
					:parentKey="key"
					:class="getProgressClasses(key)"
					@click="onSelectSection(key)"
					>{{ key }}</TTButton
				>
			</div>

			<!-- <TTButton @click="exportZIP()" secondary icon="download">Export ZIP</TTButton>
			<TTButton @click="downloadSection()" secondary icon="download" v-if="selectedSection">Download current section</TTButton> -->
			<form class="searchForm" @submit.prevent="doSearch()">
				<input
					v-model="search"
					type="text"
					placeholder="search text..."
					@keydown.esc="
						search = '';
						searchKeys = [];
					"
				/>
				<TTButton icon="checkmark" type="submit"></TTButton>
			</form>
			<div class="card-item alert" v-if="noResult">No result</div>
		</div>

		<template v-if="selectedSectionLabels">
			<div class="card-item progress" :class="getProgressClasses(selectedSectionKey)">
				Translations done: {{ progresses[selectedSectionKey]!.done }}/{{
					progresses[selectedSectionKey]!.total
				}}
				({{
					(
						(progresses[selectedSectionKey]!.done /
							progresses[selectedSectionKey]!.total) *
						100
					).toFixed(0)
				}}%)
			</div>

			<div class="labels card-item">
				<div class="header">
					<h2 class="title">{{ selectedSectionKey }}</h2>
				</div>
				<template
					v-for="(value, key) in selectedSectionLabels"
					:key="[selectedSectionKey, key].join('.')"
				>
					<LabelsEditorEntry
						:value="value"
						:langRef="langRef"
						:pathToSelect="pathToSelect"
						:path="[selectedSectionKey, key]"
						@change="
							computeProgresses();
							saveSection();
						"
						@delete="
							computeProgresses();
							saveSection();
							onSelectSection(selectedSectionKey, [], true);
						"
					/>
				</template>
			</div>
			<div
				class="floatingActions"
				v-if="progresses[selectedSectionKey]!.done < progresses[selectedSectionKey]!.total"
			>
				<TTButton icon="down" alert @click="nextError()"></TTButton>
			</div>
		</template>

		<template v-else-if="searchKeys.length > 0">
			<div
				class="labels card-item search"
				v-for="value in searchKeys"
				:key="value.join('.')"
				:data-test="value.join('.')"
			>
				<div class="header">
					<h2 class="title">{{ value.slice(0, value.length - 1).join(".") }}</h2>
				</div>
				<div class="content">
					<LabelsEditorEntry
						value=""
						:langRef="langRef"
						:path="value"
						@change="saveSection(value[0])"
					/>
					<TTButton icon="newtab" @click="onSelectSection(value[0]!, value)"></TTButton>
				</div>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import AppLangSelector from "@/components/AppLangSelector.vue";
import LabelsEditorEntry from "@/components/LabelsEditorEntry.vue";
import TTButton from "@/components/TTButton.vue";
import StoreProxy from "@/store/StoreProxy";
import ApiHelper from "@/utils/ApiHelper";
import Utils from "@/utils/Utils";
import type { RemoveIndexSignature } from "@intlify/core-base";
import { gsap } from "gsap/gsap-core";
import { useI18n } from "vue-i18n";
import type { LocaleMessageValue, VueMessageType } from "vue-i18n";

//@ts-ignore
import { BlobWriter, TextReader, ZipWriter } from "https://deno.land/x/zipjs@v2.7.32/index.js";
import type { JsonObject } from "type-fest";
import { onBeforeMount, ref, watch } from "vue";

const { locale } = useI18n();

const selectedSectionKey = ref("");
const selectedSectionLabels = ref<RemoveIndexSignature<{
	[x: string]: LocaleMessageValue<VueMessageType>;
}> | null>(null);
const labelsCurrent = ref<
	RemoveIndexSignature<{
		[x: string]: LocaleMessageValue<VueMessageType>;
	}>
>({});
const labelsRef = ref<RemoveIndexSignature<{ [x: string]: LocaleMessageValue<VueMessageType> }>>(
	{},
);
const progresses = ref<{ [key: string]: { total: number; done: number } }>({});
const langRef = ref("en");
const search = ref("");
const searchKeys = ref<string[][]>([]);
const pathToSelect = ref<string[]>([]);
const noResult = ref(false);

let currentErrorIndex = -1;

function getProgressClasses(section: string): string[] {
	const res: string[] = [];
	const progress = progresses.value[section]!;
	if (progress.done / progress.total < 0.9) res.push("alert");
	else if (progress.done / progress.total < 1) res.push("secondary");
	else if (progress.done / progress.total > 1) res.push("premium");
	else res.push("primary");
	return res;
}

onBeforeMount(() => {
	const reloadLabels = () => {
		labelsRef.value = StoreProxy.i18n.getLocaleMessage(langRef.value);
		computeProgresses(true);
		if (selectedSectionKey.value) {
			onSelectSection(selectedSectionKey.value, [], true);
		}
	};
	reloadLabels();
	watch(
		() => langRef.value,
		() => reloadLabels(),
	);
	watch(
		() => locale.value,
		() => {
			computeProgresses(true);
			if (selectedSectionKey.value) {
				onSelectSection(selectedSectionKey.value, [], true);
			}
		},
	);
	computeProgresses();
});

function onSelectSection(
	key: string,
	pathToSelectParam: string[] = [],
	force: boolean = false,
	event?: MouseEvent,
): void {
	if (event && (event.ctrlKey || event.metaKey)) {
		langRef.value = key;
		computeProgresses();
		return;
	}
	if (selectedSectionKey.value === key && !force) return;
	let sectionRef = labelsRef.value[key as keyof typeof labelsRef.value];
	let sectionCurrent = labelsCurrent.value[key as keyof typeof labelsCurrent.value];

	const mergeJSON = (json1: JsonObject, json2: JsonObject) => {
		let mergedJSON = { ...json1 };

		for (let key in json2) {
			if (json2.hasOwnProperty(key)) {
				if (mergedJSON.hasOwnProperty(key)) {
					if (!Array.isArray(mergedJSON[key]) && !Array.isArray(json2[key])) {
						if (typeof mergedJSON[key] === "object" && typeof json2[key] === "object") {
							mergedJSON[key] = mergeJSON(
								mergedJSON[key] as JsonObject,
								json2[key] as JsonObject,
							);
						} else {
							mergedJSON[key] = json2[key]!;
						}
					}
				} else {
					mergedJSON[key] = json2[key]!;
				}
			}
		}
		return mergedJSON;
	};

	selectedSectionLabels.value = mergeJSON(sectionRef, sectionCurrent);
	selectedSectionKey.value = key;
	currentErrorIndex = -1;
	pathToSelect.value = pathToSelectParam;
	computeProgresses();
}

async function downloadSection(): Promise<void> {
	const json: any = {};
	json[selectedSectionKey.value] = selectedSectionLabels.value;
	Utils.downloadFile(selectedSectionKey.value + ".json", JSON.stringify(json));
}

async function exportZIP(): Promise<void> {
	const messages = StoreProxy.i18n.getLocaleMessage(locale.value);
	const zipFileWriter = new BlobWriter();
	const zipWriter = new ZipWriter(zipFileWriter);
	for (const key in messages) {
		let json: any = {};
		json[key] = messages[key as keyof typeof messages];
		const file = new TextReader(JSON.stringify(json));
		await zipWriter.add(key + ".json", file);
	}
	await zipWriter.close();
	const zipFileBlob = await zipFileWriter.getData();
	Utils.downloadFile("labels_" + locale.value + ".zip", zipFileBlob);
}

function computeProgresses(forceAll: boolean = false): void {
	const refLabels = labelsRef.value;
	const labels = StoreProxy.i18n.getLocaleMessage(locale.value);
	labelsCurrent.value = labels;
	if (labels == undefined) return;
	const buildPaths = (obj: any, parentPath: string[] = []): string[][] => {
		let paths: any = [];

		for (const key in obj) {
			const currentPath: string[] = [...parentPath, key];

			//Ignore array items
			if (Array.isArray(obj[key])) {
				continue;
			} else if (
				typeof obj[key] === "object" &&
				obj[key] !== null &&
				Object.keys(obj[key]).length > 0
			) {
				paths = paths.concat(buildPaths(obj[key], currentPath));
			} else {
				paths.push(currentPath);
			}
		}

		return paths;
	};

	const sections: string[] =
		selectedSectionKey.value && !forceAll ? [selectedSectionKey.value] : Object.keys(refLabels);
	for (let h = 0; h < sections.length; h++) {
		let total = 0;
		let done = 0;
		const section = sections[h]!;
		let keys = buildPaths(refLabels[section as keyof typeof refLabels], [section]).concat(
			buildPaths(labels[section as keyof typeof refLabels], [section]),
		);
		let keysDone: { [key: string]: boolean } = {};
		//Dedupe key paths
		keys = keys.filter((a) => {
			if (keysDone[a.join(".")] == true) return false;
			keysDone[a.join(".")] = true;
			return true;
		});

		for (let i = 0; i < keys.length; i++) {
			total++;
			let chunks = keys[i]!;
			let rootLabels: typeof labels | null = labels;
			let rootRef = refLabels;
			for (let j = 0; j < chunks.length; j++) {
				const key = chunks[j];
				rootLabels = rootLabels[key as keyof typeof rootLabels];
				rootRef = rootRef[key as keyof typeof rootRef];
				if (rootRef == undefined) {
					//Item is missing from ref, add 1 to total done so it overflows
					//the expected amount
					total--;
					break;
				} else if (rootLabels == undefined || (rootLabels == "" && rootRef != "")) {
					rootLabels = null;
					// done --;
					break;
				}
			}
			if (rootLabels != undefined && rootLabels != null) done++;
		}
		progresses.value[section] = { done, total };
	}
}

function nextError(): void {
	currentErrorIndex++;
	const list = document.getElementsByClassName("missingLabel");
	const item = list[currentErrorIndex % list.length]!;
	const bounds = item.getBoundingClientRect();
	const holder = document.body.getElementsByClassName("app")[0]!; //Yup. Absolutely dirty.
	gsap.to(holder, {
		duration: 0.5,
		scrollTo: { y: bounds.top + holder.scrollTop - document.body.clientHeight / 2.5 },
	});
	gsap.fromTo(
		item,
		{ scaleY: 1.5, filter: "brightness(2)" },
		{
			duration: 0.25,
			scaleY: 1,
			filter: "brightness(1)",
			clearProps: "filter,scaleY",
			delay: 0.5,
			immediateRender: false,
		},
	);
}

function doSearch(): void {
	if (search.value.length < 2) return;
	const labels = StoreProxy.i18n.getLocaleMessage(locale.value);
	const searchValueWithPaths = (
		json: any,
		searchWord: string,
		currentPath: string[] = [],
	): string[][] => {
		let matchingPaths: string[][] = [];

		for (const key in json) {
			const newPath: string[] = currentPath.concat(key);

			if (typeof json[key] === "object") {
				// Recursively search in nested objects
				const nestedMatches = searchValueWithPaths(json[key], searchWord, newPath);
				matchingPaths = matchingPaths.concat(nestedMatches);
			} else if (
				typeof json[key] === "string" &&
				json[key].toLowerCase().includes(searchWord)
			) {
				// Check if the string value contains the search word
				matchingPaths.push(newPath);
			}
		}

		return matchingPaths;
	};
	selectedSectionLabels.value = null;
	selectedSectionKey.value = "";
	searchKeys.value = searchValueWithPaths(labels, search.value.toLowerCase());
	noResult.value = searchKeys.value.length == 0;
	window.setTimeout(() => {
		noResult.value = false;
	}, 1000);
}

async function saveSection(section?: string): Promise<void> {
	if (!section) section = selectedSectionKey.value;
	if (!section) return;
	const labels = StoreProxy.i18n.getLocaleMessage(locale.value);

	let body = {
		section,
		lang: locale.value,
		labels: labels[section as keyof typeof labels],
	};
	await ApiHelper.call("admin/labels", "POST", body, false);
}
</script>

<style scoped lang="less">
.labelseditor {
	padding: 1em;
	color: var(--color-text);
	gap: 1em;
	display: flex;
	flex-direction: column;
	align-items: center;

	.langSelector {
		width: 100%;
		flex-wrap: wrap;
		justify-content: center;
		flex-direction: row;
	}

	.progress {
		text-align: center;
		margin: 0 auto;
		justify-self: center;
		align-self: center;
	}

	.head {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;

		.sectionList {
			gap: 0.5em;
			display: flex;
			flex-wrap: wrap;
			flex-direction: row;
			justify-content: center;
		}
	}

	.labels {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		align-self: stretch;

		&.search {
			.content {
				gap: 0.25em;
				display: flex;
				flex-direction: row;
				align-self: stretch;
				.label {
					flex: 1;
				}
				.button {
					flex-basis: 2em;
					padding: 0;
				}
			}
		}
	}

	.floatingActions {
		position: fixed;
		bottom: 1em;
		right: 1em;
	}

	.searchForm {
		margin: auto;
		display: flex;
		flex-direction: row;
		align-self: stretch;

		& > * {
			border-radius: 0;
		}
		& > *:first-child {
			border-top-left-radius: var(--border-radius);
			border-bottom-left-radius: var(--border-radius);
		}
		& > *:last-child {
			border-top-right-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);
		}
	}
}
</style>
