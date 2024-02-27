<template>
	<div class="section" :class="classes" v-if="!isLabel">
		<div class="header">
			<h2 class="title">{{path[path.length-1]}}</h2>
		</div>
		<LabelsEditorEntry v-for="(val, key) in value"
			@change="$emit('change')"
			:value="val"
			:langRef="langRef"
			:path="[...path,key]"
			:pathToSelect="pathToSelect"
			:data-test="[...path,key].join('.')"
			:key="[...path,key].join()" />
	</div>
	
	<div class="label" :class="classes" v-else @click="open($event)">
		<strong class="key">{{path[path.length-1]}}</strong>
		<div class="form">
			<contenteditable class="text" tag="div"
				:key="'label_'+path.join()"
				:contenteditable="true"
				v-model="labelValue"
				:no-html="true"
				@focus="onEditLabel(false); labelValue = labelValue == defaultLabel? '' : labelValue;"
				@blur="onEditLabel()" />
				
			<div class="sources" v-if="showSources">
				<div v-for="lang in $i18n.availableLocales.filter(v=>v != $i18n.locale)">
					<CountryFlag :country="$t('global.lang_flag', lang)" class="flag" />
					<TTButton transparent icon="copy" v-tooltip="'Copy value'" @click="copyValue(getUnparsedLabel(lang))"></TTButton>
					<span>{{ getUnparsedLabel(lang) }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { RemoveIndexSignature } from '@intlify/core-base';
import gsap from 'gsap';
import { watch } from 'vue';
import contenteditable from 'vue-contenteditable';
import CountryFlag from 'vue-country-flag-next';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import type { LocaleMessageValue, VueMessageType } from 'vue-i18n';
import TTButton from './TTButton.vue';

@Component({
	name:"LabelsEditorEntry",
	components:{
		TTButton,
		CountryFlag,
		contenteditable,
	},
	emits:["change"]
})
 class LabelsEditorEntry extends Vue {

	@Prop
	public value!:RemoveIndexSignature<{[x: string]:LocaleMessageValue<VueMessageType>}> | string;

	@Prop
	public path!:string[];

	@Prop
	public pathToSelect!:string[];

	@Prop
	public langRef!:string;

	public labelValue:string = "";
	public showSources:boolean = false;
	public defaultLabel ="### MISSING LABEL ###";
	
	private opened = false;
	private wasErrored = false;
	private defaultHeight = 0;
	private prevValue:string = "";
	private originalType:"string"|"boolean"|"number" = "string";
	private clickHandler!:(e:MouseEvent) => void;

	public get isLabel():boolean {
		return typeof this.value == "string" ||  typeof this.value == "number" || typeof this.value == "boolean";
	}

	public getUnparsedLabel(locale:string):string {
		let root = StoreProxy.i18n.getLocaleMessage(locale);
		let messages:any = root;
		const chunks = this.path;
		for (let i = 0; i < chunks.length; i++) {
			const key = chunks[i];
			messages = messages[key as keyof typeof messages];
			if(messages == undefined) return "";
		}
		return messages;
	}

	public get classes():string[] {
		const res = ["labelseditorentry", "card-item"];
		if(this.isArray) res.push("isArray");
		if(this.isLabel && this.labelValue == this.defaultLabel) res.push("missingLabel");
		return res;
	}

	public get isArray():boolean {
		return Array.isArray(this.value);
	}

	public beforeMount():void {
		this.originalType = typeof this.value as typeof this.originalType;
		this.initLabel();

		this.clickHandler = (e:MouseEvent) => {
			let t = e.target as HTMLElement;
			while(t != this.$el && t != document.body && t) {
				t = t.parentElement as HTMLElement;
			}
			if(t == document.body) this.close();
		};
		document.addEventListener("click", this.clickHandler);

		watch(()=>this.$i18n.locale, ()=> {
			this.initLabel();
		});
	}

	public mounted():void {
		if(this.path.join(".") == (this.pathToSelect || []).join(".")) {
			(this.$el as HTMLElement).scrollIntoView();
			gsap.fromTo(this.$el, {scaleY:1.5, filter:"brightness(4)"}, {duration:.5, scaleY:1, ease:"sine.in", filter:"brightness(1)", clearProps:"filter,scaleY", delay:.25, immediateRender:false});
		}
	}

	public beforeUnmount():void {
		document.removeEventListener("click", this.clickHandler);
	}

	public initLabel():void {
		let label = this.getUnparsedLabel(this.$i18n.locale);
		if(this.isLabel && label == undefined || (label == "" && this.getUnparsedLabel(this.langRef) != "")) {
			this.labelValue = this.defaultLabel;
		}else{
			this.labelValue = this.getUnparsedLabel(this.$i18n.locale).toString();
		}
	}

	public copyValue(text:string):void {
		const errored = this.labelValue == this.defaultLabel;
		this.wasErrored = errored;
		this.labelValue = text;
		this.onEditLabel();
	}

	public open(e:MouseEvent):void {
		if(this.opened) return;
		this.opened = true;
		this.showSources = true;
		const bounds = (this.$el as HTMLElement).getBoundingClientRect();
		this.defaultHeight = bounds.height;
		this.$nextTick().then(()=>{
			gsap.from(this.$el, {height:this.defaultHeight, duration:.25, clearProps:"height"});
		})
	}

	public close():void {
		if(!this.opened) return;
		this.opened = false;
		gsap.to(this.$el, {height:this.defaultHeight, duration:.25, clearProps:"height", onComplete:()=>{
			this.showSources = false;
		}});
	}

	public onEditLabel(reinit:boolean = true):void {
		let root = StoreProxy.i18n.getLocaleMessage(this.$i18n.locale);
		let messages:any = root;
		let path:string[] = [];
		const chunks = this.path;
		for (let i = 0; i < chunks.length; i++) {
			const key = chunks[i];
			path.push(key);
			if(i < chunks.length-1) {
				if(this.$te(path.join("."))) {
					messages = messages[key as keyof typeof messages];
				}else{
					let v = this.$tm(path.join("."));
					if(Array.isArray(v)) {
						messages = messages[key] = [];
					}else if(typeof v == "object") {
						messages = messages[key] = {};
					}else{
						messages = v;
					}
				}
			}else{
				if(this.labelValue != this.defaultLabel) {
					let v:any = this.labelValue.replace(/\n/gi, "\n");
					if(this.originalType == "boolean") v = v === "true"
					else if(this.originalType == "number") v = parseFloat(v);
					messages[key] = v;
				}
			}
		}
		StoreProxy.i18n.setLocaleMessage(this.$i18n.locale, root);
		if(reinit) this.initLabel();

		//Broadcast change if state changed
		const errored = this.labelValue == this.defaultLabel;
		if(!reinit) {
			this.wasErrored = errored;
			this.prevValue = this.labelValue;
		}
		else if(this.wasErrored != errored || this.prevValue != this.labelValue) {
			console.log("CHANGE", this.path);
			this.$emit("change");
		}
	}

}
export default toNative(LabelsEditorEntry);
</script>

<style scoped lang="less">
.labelseditorentry{

	&.isArray {
		background-color: var(--color-secondary-fadest);
	}

	&.label {
		gap: 1em;
		row-gap: .25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		font-family: Nbsp, Inter;
		padding: 0;
		overflow: hidden;
		.key {
			padding: .5em;
		}
		.form {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			align-self: flex-start;
			.text {
				background-color: var(--background-color-primary);
				padding: .5em;
			}
			
			.sources {
				align-items: center;
				flex: 1 1 100%;
				padding: .5em;
				font-size: .8em;
				line-height: 1.5em;
				.button {
					padding: 0;
					margin-right: .5em;
				}
				.flag {
					vertical-align: top !important;
					margin-right: -.5em !important;
				}
			}
		}
	}

	&.section {
		margin-top: 1em;
		margin-left: 1em;
		
		gap: .25em;
		display: flex;
		flex-direction: column;
	}
	
	&.missingLabel {
		background-color: var(--color-alert);
		.form>.text {
			background-color: var(--grayout-fader);
		}
	}
}
</style>