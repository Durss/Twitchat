<template>
	<div class="langselector">
		<vue-select v-model="lang" :options="languages">
			<template v-slot:option="option">
				<CountryFlag :iso="getISOFromLang(option.value[1][0])" mode="rounded" class="flag" />
				{{ option.label }}
			</template>
		</vue-select>
		<vue-select v-model="sublang" :options="subLanguages" v-if="subLanguages?.length > 1">
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
import { Options, Vue } from 'vue-class-component';
import CountryFlag from 'vue3-country-flag-icon'
import 'vue3-country-flag-icon/dist/CountryFlag.css' // import stylesheet

@Options({
	props:{},
	components:{
		CountryFlag,
	}
})
export default class LangSelector extends Vue {

	public lang:{label:string, value:string[][]} = {label:"", value:[]};
	public sublang:{label:string, value:string[][]} = {label:"", value:[]};

	public get languages() { return Languages.map(v=> { return {label:v[0] as string, value:v}}); }
	public get subLanguages():{label:string, value:string[]}[] {
		const lang = Languages.find(v=>v[0]==this.lang.label);
		if(!lang) return [];
		const sublangs = lang.slice(1) as string[][];
		return sublangs.map(v=> { return {label:v[1] as string, value:v}}); 
	}

	public getISOFromLang(l:string):string {
		return l.split("-")[1];
	}

	public mounted():void {
		console.log(Languages);
		this.lang.label = Languages[0][0] as string;
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