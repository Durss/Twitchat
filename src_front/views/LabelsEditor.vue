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
				@click="onSelectSection(value, key)">{{ key }}</TTButton>
			</div>
	
			<TTButton @click="exportZIP()" secondary icon="download">Export ZIP</TTButton>
		</div>

		<template v-if="selectedSection">
			<div class="card-item progress"
			:class="getProgressClasses(selectedSectionKey)">Translations done: {{ progresses[selectedSectionKey].done }}/{{ progresses[selectedSectionKey].total }} ({{ (progresses[selectedSectionKey].done/progresses[selectedSectionKey].total * 100).toFixed(0) }}%)</div>
	
			<div class="labels card-item" v-if="selectedSection">
				<div class="header">
					<h2 class="title">{{ selectedSectionKey }}</h2>
				</div>
				<template  v-for="(value, key) in selectedSection" :key="key">
					<LabelsEditorEntry
						:value="value"
						:langRef="langRef"
						:path="[selectedSectionKey,key]"
						@change="computeProgresses()"
						/>
				</template>
			</div>
			<div class="floatingActions" v-if="progresses[selectedSectionKey].done < progresses[selectedSectionKey].total">
				<TTButton icon="down" alert @click="nextError()"></TTButton>
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

	public onSelectSection(value:any, key:string):void {
		if(this.selectedSectionKey === key) return;
		this.selectedSection = value;
		this.selectedSectionKey = key;
		this.currentErrorIndex = -1;
		this.computeProgresses();
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

				if (Array.isArray(obj[key])) {
					console.log("ignore");
					continue;
				} else if (typeof obj[key] === 'object' && obj[key] !== null) {
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
		gsap.fromTo(item, {scaleY:1.5, filter:"brightness(2)"}, {duration:.25, scaleY:1, filter:"brightness(1)", clearProps:"filter,scaleY", delay:.5});
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
	}
	
	.floatingActions {
		position: fixed;
		bottom: 1em;
		right: 1em;
	}
}
</style>