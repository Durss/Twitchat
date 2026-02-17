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

<script setup lang="ts">
import { Languages } from '@/Languages';
import { watch, ref, computed, onMounted, getCurrentInstance } from 'vue';
import CountryFlag from 'vue-country-flag-next';

const props = defineProps<{
	lang?: string;
}>();

const emit = defineEmits<{
	'update:lang': [value: string];
}>();

const instance = getCurrentInstance();
const $placeDropdown = instance?.appContext.config.globalProperties.$placeDropdown;

const langLocal = ref<{label: string, value: string[][]}>({label: "", value: []});
const sublangLocal = ref<{label: string, value: string[]}>({label: "", value: []});

const languages = computed(() => {
	return Languages.map(v => { return {label: v[0] as string, value: v}});
});

const subLanguages = computed(() => {
	if(!langLocal.value) return [];
	const lang = Languages.find(v => v[0] == langLocal.value.label);
	if(!lang) return [];
	const sublangs = lang.slice(1) as string[][];
	return sublangs.map(v => { return {label: v[1] as string, value: v}}); 
});

function getISOFromLang(l: string): string { 
	return l.split("-")[1]!; 
}

/**
 * Called when selecting a lang or sublang from a list
 */
function onChange(resetSubList: boolean = false): void {
	if(resetSubList) {
		if(subLanguages.value.length > 0) {
			sublangLocal.value.label = subLanguages.value[0]!.label;
			sublangLocal.value.value = subLanguages.value[0]!.value;
		}else{
			sublangLocal.value.label = "";
			sublangLocal.value.value = [];
		}
	}
	if(!langLocal.value) {
		emit("update:lang", "");
	}else
	if(!sublangLocal.value.label) {
		emit("update:lang", langLocal.value.value[1]![0]!);
	}else{
		emit("update:lang", sublangLocal.value.value[0]!);
	}
}

onMounted(() => {
	//Pre-select language from "lang" param
	langLocal.value.label = Languages[0]![0] as string;
	if(props.lang) {
		for (const l of Languages) {
			for (let j = 1; j < l.length; j++) {
				const sl = l[j]!;
				if(sl[0]!.toLowerCase() == props.lang.toLowerCase()) {
					langLocal.value.label = l[0] as string;
					if(l.length > 1) {
						sublangLocal.value.label = sl[1]!;
					}
					break;
				}
			}
		}
	}

	watch(() => langLocal.value, () => { onChange(true); });
	watch(() => sublangLocal.value, () => { onChange(); });
});
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