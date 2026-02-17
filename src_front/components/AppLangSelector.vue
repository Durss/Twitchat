<template>
	<form class="applangselector">
		<div class="row" v-for="lang in enabledLocales" @click.ctrl.stop.prevent="onCtrlClick(lang)">
			<input type="radio" name="language" :id="'lang_'+lang" :value="lang" v-model="$i18n.locale.value">
			<label :for="'lang_'+lang">
				<CountryFlag :country="$t('global.lang_flag', 1, {locale:lang})" class="flag" /><span class="text">{{ $t('global.lang_label', 1, {locale:lang})}}</span>
				<Icon name="highlight" v-if="showRef !== false && langRef == lang" v-tooltip="'CTRL+click a language\nto make it the reference'" />
			</label>
		</div>
	</form>
</template>

<script setup lang="ts">
import DataStore from '@/store/DataStore';
import { computed, onMounted, watch } from 'vue';
import CountryFlag from 'vue-country-flag-next';
import { useI18n } from 'vue-i18n';
import Icon from './Icon.vue';

const props = withDefaults(defineProps<{
	allLocales?: boolean;
	langRef?: string;
	showRef?: boolean;
}>(), {
	allLocales: false,
	langRef: "en",
	showRef: false,
});

const emit = defineEmits<{
	'update:langRef': [value: string];
}>();

const $i18n = useI18n();

const enabledLocales = computed(() => {
	if(props.allLocales !== false) return $i18n.availableLocales;

	return $i18n.availableLocales.filter((v: string) => {
		let root: any = $i18n.getLocaleMessage(v);
		if(!root.global) return false;
		return root.global.lang_enabled;
	})
});

function onCtrlClick(lang: string): void {
	emit("update:langRef", lang);
}

watch(() => $i18n.locale.value, () => {
	DataStore.set(DataStore.LANGUAGE, $i18n.locale.value);
});
</script>

<style scoped lang="less">
.applangselector{
	display: flex;
	flex-direction: column;
	gap: .5em;
	width: 200px;
	.row {
		display: flex;
		position: relative;
		justify-content: center;
		flex-wrap: wrap;
		align-items: flex-start;

		.icon {
			height: 1em;
			vertical-align: top;
			margin-left: .5em;
		}

		.reference {
			width: 100%;
			font-size: .8;
			text-align: center;
			font-family: "Inter";
			transform: scaleX(1.5);
		}

		label {
			text-align: center;
			flex-grow: 1;
			padding: .5em;
			border-radius: var(--border-radius);
			margin: 0;
			color:var(--color-light);
			cursor: pointer;
			border-bottom: 1px solid rgba(0, 0, 0, .25);
			border-right: 1px solid rgba(0, 0, 0, .25);
			border-left: 1px solid rgba(0, 0, 0, .25);
			background-color: var(--color-primary);
			&::before{
				content: "◌";
				position: absolute;
				left: .5em;
			}
			.text {
				margin-left: .5em;
			}
		}
		input{
			top: 0;
			left: 0;
			opacity: 0;
			position: absolute;
		}
		input[type="radio"]:checked+label {
			font-weight: bold;
			background-color: var(--color-secondary);
			&::before{
				content: "●";
			}
		}
		.flag {
			margin-left: 0 !important;
		}
	}
}
</style>
