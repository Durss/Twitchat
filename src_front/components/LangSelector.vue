<template>
	<div class="langselector">
		<vue-select v-model="langLocal"
		placeholder="Select language..."
		:options="languages"
		:appendToBody="true"
		:calculate-position="$placeDropdown"
		>
			<template v-slot:option="option">
				<CountryFlag :country="getISOFromLang(option.value[1][0])" size="small" class="flag" />
				<span class="text">{{ option.label }}</span>
			</template>
		</vue-select>
		
		<vue-select v-model="sublangLocal"
		v-if="subLanguages?.length > 1"
		placeholder="Select country..."
		:options="subLanguages"
		:appendToBody="true"
		:calculate-position="$placeDropdown"
		>
			<template v-slot:option="option">
				<CountryFlag :country="getISOFromLang(option.value[0])" size="small" class="flag" />
				<span class="text">{{ option.label }}</span>
			</template>
		</vue-select>
	</div>
</template>

<script lang="ts">
import { Languages } from '@/Languages';
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import CountryFlag from 'vue-country-flag-next';

@Component({
	components:{
		CountryFlag,
	},
	emits:["update:lang"]
})
class LangSelector extends Vue {

	@Prop
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

	public getISOFromLang(l:string):string { return l.split("-")[1]!; }

	public mounted():void {
		//Pre-select language from "lang" param
		this.langLocal.label = Languages[0]![0] as string;
		if(this.lang) {
			for (const l of Languages) {
				for (let j = 1; j < l.length; j++) {
					const sl = l[j]!;
					if(sl[0]!.toLowerCase() == this.lang.toLowerCase()) {
						this.langLocal.label = l[0] as string;
						if(l.length>1) {
							this.sublangLocal.label = sl[1]!;
						}
						break;
					}
				}
			}
		}

		watch(()=>this.langLocal, ()=> { this.onChange(true); });
		watch(()=>this.sublangLocal, ()=> { this.onChange(); });
	}

	/**
	 * Called when selecting a lang o rsublang from a list
	 * @param resetSubList 
	 */
	public onChange(resetSubList:boolean = false):void {
		if(resetSubList) {
			if(this.subLanguages.length > 0) {
				this.sublangLocal.label = this.subLanguages[0]!.label;
				this.sublangLocal.value = this.subLanguages[0]!.value;
			}else{
				this.sublangLocal.label = "";
				this.sublangLocal.value = [];
			}
		}
		if(!this.langLocal) {
			this.$emit("update:lang", "");
		}else
		if(!this.sublangLocal.label) {
			this.$emit("update:lang", this.langLocal.value[1]![0]);
		}else{
			this.$emit("update:lang", this.sublangLocal.value[0]);
		}
	}

}
export default toNative(LangSelector);
</script>

<style scoped lang="less">
.langselector{
	display: flex;
	flex-direction: row;
	&>*{
		flex-grow: 1;
		width: 50%;
	}

	.text {
		margin-left: .25em;
	}
}
</style>