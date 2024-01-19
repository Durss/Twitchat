<template>
	<div class="labelseditor">
		<div class="head">
			<!-- <select v-model="locale">
				<option :value="lang" v-for="lang in $i18n.availableLocales">{{ $t('global.lang_label', lang)}}</option>
			</select> -->
			<AppLangSelector class="langSelector" />
			<div class="sectionList">
				<TTButton v-for="(value, key) in labels"
				:selected="selectedSectionKey == key"
				:value="value"
				:parentKey="key"
				:class="getProgressClasses(key)"
				@click="onSelectSection(key)">{{ key }}</TTButton>
			</div>
	
			<!-- <TTButton @click="exportZIP()" secondary icon="download">Export ZIP</TTButton>
			<TTButton @click="downloadSection()" secondary icon="download" v-if="selectedSection">Download current section</TTButton> -->
			<form class="searchForm" @submit.prevent="doSearch()">
				<input v-model="search" type="text" placeholder="search text..." @keydown.esc="search = ''; searchKeys = []">
				<TTButton icon="checkmark" type="submit"></TTButton>
			</form>
			<div class="card-item alert" v-if="noResult">No result</div>
		</div>

		<template v-if="selectedSection">
			<div class="card-item progress"
			:class="getProgressClasses(selectedSectionKey)">Translations done: {{ progresses[selectedSectionKey].done }}/{{ progresses[selectedSectionKey].total }} ({{ (progresses[selectedSectionKey].done/progresses[selectedSectionKey].total * 100).toFixed(0) }}%)</div>
	
			<div class="labels card-item">
				<div class="header">
					<h2 class="title">{{ selectedSectionKey }}</h2>
				</div>
				<template  v-for="(value, key) in selectedSection" :key="key">
					<LabelsEditorEntry
						:value="value"
						:langRef="langRef"
						:pathToSelect="pathToSelect"
						:path="[selectedSectionKey,key]"
						@change="computeProgresses(); saveSection()"
						/>
				</template>
			</div>
			<div class="floatingActions" v-if="progresses[selectedSectionKey].done < progresses[selectedSectionKey].total">
				<TTButton icon="down" alert @click="nextError()"></TTButton>
			</div>
		</template>

		<template v-else-if="searchKeys.length > 0">
			<div class="labels card-item search" v-for="(value, key) in searchKeys" :key="value.join('.')">
				<div class="header">
					<h2 class="title">{{ value.slice(0, value.length-1).join(".") }}</h2>
				</div>
				<div class="content">
					<LabelsEditorEntry
						value=""
						:langRef="langRef"
						:path="value"
						@change="saveSection(value[0])"
						/>
					<TTButton icon="newtab" @click="onSelectSection(value[0], value)"></TTButton>
				</div>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import LabelsEditorEntry from '@/components/LabelsEditorEntry.vue';
import TTButton from '@/components/TTButton.vue';
import StoreProxy from '@/store/StoreProxy';
import Utils from '@/utils/Utils';
import type { RemoveIndexSignature } from '@intlify/core-base';
import { Component, Vue } from 'vue-facing-decorator';
import type { LocaleMessageValue, VueMessageType } from 'vue-i18n';
import AppLangSelector from '@/components/AppLangSelector.vue';
//@ts-ignore
import { BlobWriter, TextReader, ZipWriter } from "https://deno.land/x/zipjs@v2.7.32/index.js";
import { watch } from 'vue';
import gsap from 'gsap';
import ApiController from '@/utils/ApiController';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';

@Component({
	components:{
		TTButton,
		AppLangSelector,
		LabelsEditorEntry,
	},
	emits:[],
})
export default class LabelsEditor extends Vue {

	public selectedSectionKey:string = "";
	public selectedSection:RemoveIndexSignature<{[x: string]:LocaleMessageValue<VueMessageType>}>|null = null;
	public labels:RemoveIndexSignature<{[x: string]:LocaleMessageValue<VueMessageType>}> = {};
	public progresses:{[key:string]:{total:number, done:number}} = {};
	public langRef = "en";
	public search = "";
	public searchKeys:string[][] = [];
	public pathToSelect:string[] = [];
	public noResult:boolean = false;

	private currentErrorIndex = -1;

	public getProgressClasses(section:string):string[] {
		const res = [];
		const progress = this.progresses[section];
		if(progress.done/progress.total < .9) res.push("alert");
		else if(progress.done/progress.total < 1) res.push("secondary");
		else res.push("primary");
		return res;
	}

	public beforeMount() {
		this.labels = StoreProxy.i18n.getLocaleMessage(this.langRef);
		watch(()=>this.$i18n.locale, ()=>{
			this.computeProgresses(true);
		});
		this.computeProgresses();
	}

	public onSelectSection(key:string, pathToSelect:string[] = []):void {
		if(this.selectedSectionKey === key) return;
		this.selectedSection = this.labels[key as keyof typeof this.labels];
		this.selectedSectionKey = key;
		this.currentErrorIndex = -1;
		this.pathToSelect = pathToSelect;
		this.computeProgresses();
	}

	public async downloadSection():Promise<void> {
		const json:any = {};
		json[this.selectedSectionKey] = this.selectedSection;
		Utils.downloadFile(this.selectedSectionKey+".json", JSON.stringify(json))
	}

	public async exportZIP():Promise<void> {
		const messages = StoreProxy.i18n.getLocaleMessage(this.$i18n.locale);
		const zipFileWriter = new BlobWriter();
		const zipWriter = new ZipWriter(zipFileWriter);
		for (const key in messages) {
			let json:any = {};
			json[key] = messages[key as keyof typeof messages];
			const file = new TextReader(JSON.stringify(json));
			await zipWriter.add(key+".json", file);
		}
		await zipWriter.close();
		const zipFileBlob = await zipFileWriter.getData();
		Utils.downloadFile("labels_"+this.$i18n.locale+".zip", zipFileBlob);
	}

	public computeProgresses(forceAll:boolean = false):void {
		const ref = StoreProxy.i18n.getLocaleMessage(this.langRef);
		const buildPaths = (obj:any, parentPath:string[] = []):string[] => {
			let paths:any = [];

			for (const key in obj) {
				const currentPath:string[] = [...parentPath, key];

				// if (Array.isArray(obj[key])) {
				// 	console.log("ignore");
				// 	continue;
				// } else
				if (typeof obj[key] === 'object' && obj[key] !== null) {
					paths = paths.concat(buildPaths(obj[key], currentPath));
				} else {
					paths.push(currentPath);
				}
			}

			return paths;
		}

		// console.log(buildPaths(ref["bingo"], ["bingo"]));
		// return;
		const sections:string[] = (this.selectedSectionKey && !forceAll)? [this.selectedSectionKey] : Object.keys(ref);
		for (let h = 0; h < sections.length; h++) {
			let total = 0;
			let done = 0;
			const section = sections[h];
			const keys = buildPaths(ref[section as keyof typeof ref], [section]);
			const labels = StoreProxy.i18n.getLocaleMessage(this.$i18n.locale);
			if(labels == undefined) continue;
			for (let i = 0; i < keys.length; i++) {
				total ++;
				let chunks = keys[i];
				let root:typeof labels | null = labels;
				let rootRef = ref;
				for (let j = 0; j < chunks.length; j++) {
					const key = chunks[j];
					root = root[key as keyof typeof root];
					rootRef = rootRef[key as keyof typeof rootRef];
					if(root == undefined || (root == "" && rootRef != "")) {
						console.log("Missing", key);
						root = null;
						break;
					}
				}
				if(root != undefined && root != null) done ++;
			}
			this.progresses[section] = {done, total};
		}
	}

	public nextError():void {
		this.currentErrorIndex ++;
		const list = document.getElementsByClassName("missingLabel");
		const item = list[this.currentErrorIndex % list.length];
		const bounds = item.getBoundingClientRect();
		const holder = document.body.getElementsByClassName("app")[0];//Yup. Absolutely dirty.
		gsap.to(holder, {duration:.5, scrollTo:{y:bounds.top + holder.scrollTop - document.body.clientHeight/2.5}});
		gsap.fromTo(item, {scaleY:1.5, filter:"brightness(2)"}, {duration:.25, scaleY:1, filter:"brightness(1)", clearProps:"filter,scaleY", delay:.5, immediateRender:false});
	}

	public doSearch():void {
		if(this.search.length < 2) return;
		const labels = StoreProxy.i18n.getLocaleMessage(this.$i18n.locale);
		const searchValueWithPaths = (json:any, searchWord:string, currentPath:string[] = []):string[][] => {
			let matchingPaths:string[][] = [];

			for (const key in json) {
				const newPath:string[] = currentPath.concat(key);

				if (typeof json[key] === 'object') {
					// Recursively search in nested objects
					const nestedMatches = searchValueWithPaths(json[key], searchWord, newPath);
					matchingPaths = matchingPaths.concat(nestedMatches);
				} else if (typeof json[key] === 'string' && json[key].includes(searchWord)) {
					// Check if the string value contains the search word
					matchingPaths.push(newPath);
				}
			}

			return matchingPaths;
		}
		this.selectedSection = null;
		this.selectedSectionKey = "";
		this.searchKeys = searchValueWithPaths(labels, this.search);
		this.noResult = this.searchKeys.length == 0;
		setTimeout(()=> {
			this.noResult = false;
		}, 1000);
	}

	public async saveSection(section?:string):Promise<void> {
		if(!section) section = this.selectedSectionKey;
		if(!section) return;
		const labels = StoreProxy.i18n.getLocaleMessage(this.$i18n.locale);

		let body = {
			section,
			lang:this.$i18n.locale,
			labels:labels[section as keyof typeof labels]
		};
		let res = await ApiController.call("admin/labels", "POST", body, false);
		PublicAPI.instance.broadcast(TwitchatEvent.LABELS_UPDATE);
	}

}
</script>

<style scoped lang="less">
.labelseditor{
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
			gap: .5em;
			display: flex;
			flex-wrap: wrap;
			flex-direction: row;
			justify-content: center;
		}
	}

	.labels {
		gap: .25em;
		display: flex;
		flex-direction: column;
		align-self: stretch;

		&.search {
			.content {
				gap: .25em;
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
		
		&>* {
			border-radius: 0;
		}
		&>*:first-child{
			border-top-left-radius: var(--border-radius);
			border-bottom-left-radius: var(--border-radius);
		}
		&>*:last-child {
			border-top-right-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);
		}
	}
}
</style>