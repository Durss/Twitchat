<template>
	<div class="langselector">
		<vue-select v-model="langLocal"
		placeholder="Select language..."
		:options="languages"
		:appendToBody="true"
		@option:selected="onChange(true)"
		>
			<template v-slot:option="option">
				<CountryFlag :iso="getISOFromLang(option.value[1][0])" mode="rounded" class="flag" />
				{{ option.label }}
			</template>
		</vue-select>
		<vue-select v-model="sublangLocal"
		v-if="subLanguages?.length > 1"
		placeholder="Select country..."
		:options="subLanguages"
		:appendToBody="true"
		@option:selected="onChange()"
		>
			<template v-slot:option="option">
				<CountryFlag :iso="getISOFromLang(option.value[0])" mode="rounded" class="flag" />
				{{ option.label }}
			</template>
		</vue-select>
	</div>
</template>

<script lang="ts">
import { Languages } from '@/Languages';
import { Options, Vue } from 'vue-class-component';
import CountryFlag from 'vue3-country-flag-icon';
import 'vue3-country-flag-icon/dist/CountryFlag.css'; // import stylesheet

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
		if(!this.langLocal) return [];
		const lang = Languages.find(v=>v[0]==this.langLocal.label);
		if(!lang) return [];
		const sublangs = lang.slice(1) as string[][];
		return sublangs.map(v=> { return {label:v[1] as string, value:v}}); 
	}

	public getISOFromLang(l:string):string { return l.split("-")[1]; }

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

	/**
	 * Called when selecting a lang o rsublang from a list
	 * @param resetSubList 
	 */
	public onChange(resetSubList:boolean = false):void {
		if(resetSubList) {
			this.sublangLocal.label = this.subLanguages[0].label;
			this.sublangLocal.value = this.subLanguages[0].value;
		}
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
	display: flex;
	flex-direction: row;
	&>*{
		flex-grow: 1;
		width: 50%;
	}

	.flag {
		margin-right: .25em;
	}
}
</style>