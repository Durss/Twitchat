<template>
	<div class="langselector">
		<vue-select v-model="langLocal" :options="languages" @option:selected="onChange(true)">
			<template v-slot:option="option">
				<CountryFlag :iso="getISOFromLang(option.value[1][0])" mode="rounded" class="flag" />
				{{ option.label }}
			</template>
		</vue-select>
		<vue-select v-model="sublangLocal" :options="subLanguages" v-if="subLanguages?.length > 1" @option:selected="onChange()">
			<template v-slot:option="option">
				<CountryFlag :iso="getISOFromLang(option.value[0])" mode="rounded" class="flag" />
				{{ option.label }}
			</template>
		</vue-select>

		<!-- <div>
			<div v-for="(l,index) in languages" :key="index" :value="index">
				<CountryFlag :iso="getISOFromLang(l)" mode="rounded" class="flag" />
				<span>{{l[0]}}</span>
			</div>
		</div>
		<div v-if="subLanguages?.length > 1">
			<div v-for="(l,index) in subLanguages" :key="index" :value="l[0]">
				<span>{{l[1]}}</span>
			</div>
		</div> -->
	</div>
</template>

<script lang="ts">
import { Languages } from '@/Languages';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import CountryFlag from 'vue3-country-flag-icon'
import 'vue3-country-flag-icon/dist/CountryFlag.css' // import stylesheet

@Options({
	props:{
		lang:String,
	},
	components:{
		CountryFlag,
	},
	emits:["update:lang"]
})
export default class LangSelector extends Vue {

	public lang!:string;

	public langLocal:{label:string, value:string[][]} = {label:"", value:[]};
	public sublangLocal:{label:string, value:string[]} = {label:"", value:[]};

	public get languages():{label: string, value: (string | string[])[]}[] {
		return Languages.map(v=> { return {label:v[0] as string, value:v}});
	}
	
	public get subLanguages():{label:string, value:(string[])}[] {
		const lang = Languages.find(v=>v[0]==this.langLocal.label);
		if(!lang) return [];
		const sublangs = lang.slice(1) as string[][];
		return sublangs.map(v=> { return {label:v[1] as string, value:v}}); 
	}

	public getISOFromLang(l:string):string {
		return l.split("-")[1];
	}

	public mounted():void {
		//Pre-select language from "lang" param
		this.langLocal.label = Languages[0][0] as string;
		if(this.lang) {
			for (let i = 0; i < Languages.length; i++) {
				const l = Languages[i];
				for (let j = 1; j < l.length; j++) {
					const sl = l[j];
					if(sl[0].toLowerCase() == this.lang.toLowerCase()) {
						this.langLocal.label = l[0] as string;
						if(j>1) {
							this.sublangLocal.label = sl[1];
						}
						break;
					}
				}
			}
		}
	}

	public onChange(resetSubList:boolean = false):void {
		if(resetSubList) {
			this.sublangLocal.label = this.subLanguages[0].label;
			this.sublangLocal.value = this.subLanguages[0].value;
		}
		console.log(this.langLocal.value[1][0]);
		console.log(this.sublangLocal);
		if(!this.sublangLocal.label) {
			this.$emit("update:lang", this.langLocal.value[1][0]);
		}else{
			this.$emit("update:lang", this.sublangLocal.value[0]);
		}
	}

}
</script>

<style scoped lang="less">
.langselector{
	.flag {
		margin-right: .25em;
	}
}
</style>