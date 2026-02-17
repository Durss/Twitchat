<template>
	<span :class="classes" v-html="svg" v-if="svg"></span>

	<svg class="icon" v-else-if="error" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
		width="27.9px" height="27.9px" viewBox="0 0 27.9 27.9" style="enable-background:new 0 0 27.9 27.9;" xml:space="preserve">
	<path style="fill:#CC0000;" d="M24.9,27.9H3.1c-1.7,0-3.1-1.4-3.1-3.1V3.1C0,1.4,1.4,0,3.1,0h21.8c1.7,0,3.1,1.4,3.1,3.1v21.8
		C27.9,26.5,26.5,27.9,24.9,27.9z"/>
	<polygon style="fill:#FFFFFF;" points="17.3,7.3 14,10.6 10.6,7.3 7.3,10.6 10.6,14 7.3,17.3 10.6,20.6 14,17.3 17.3,20.6
		20.6,17.3 17.3,14 20.6,10.6 "/>
	</svg>


</template>

<script setup lang="ts">
import { watch, ref, computed, onBeforeMount, onBeforeUnmount, getCurrentInstance } from 'vue';
import { storeCommon } from '@/store/common/storeCommon';

const store = storeCommon();
const props = withDefaults(defineProps<{
	name: string;
	theme?: string;
}>(), {
	theme: "",
});

const instance = getCurrentInstance();
const svg = ref("");
const error = ref(false);
const disposed = ref(false);

const classes = computed(() => {
	let res = ["icon"];
	if(props.theme == "dark") res.push("dark");
	if(props.theme == "light") res.push("light");
	if(props.theme == "primary") res.push("primary");
	if(props.theme == "secondary") res.push("secondary");
	if(props.theme == "alert") res.push("alert");
	if(props.theme == "premium") res.push("premium");
	if(props.theme == "twitch") res.push("twitch");
	return res;
});

async function loadImage(): Promise<void> {
	if(disposed.value) return;
	// Couldn't figure out why but there are quite many sentry issues
	// about this.$store being undefined here
	const cacheMap = store.iconCache || {};

	// store.iconCache = {};//Disable cache for debug
	let cache = cacheMap[props.name];
	
	//Icon is pending for loading, wait for it
	if(cache && typeof cache != "string") {
		await cache;
		cache = cacheMap[props.name];
	}

	//If icon is loaded, load it from cache
	if(cache && typeof cache == "string") {
		svg.value = cache;
		return;
	}

	//Icon not yet loaded, load it
	try {
		const $asset = instance?.appContext.config.globalProperties.$asset;
		if (!$asset) throw("$asset not available");
		
		const url = $asset("icons/"+props.name+".svg");
		if(/undefined$/.test(url)) {
			throw("icon not found");
		}
		cacheMap[props.name] = fetch(url)
		.then(async (imgRes) => {
			if(imgRes.status <200 || imgRes.status > 204) {
				error.value = true;
			}else{
				svg.value = (await imgRes.text())
				// .replace(/<style[^<keep]*<\/ ?style>/gim, "")//Cleanup styles
				.replace(/<!--[^<]*-->/g, "")//Cleanup comments
				.replace(/<\?xml[^<]*>/g, "")//cleanup <xml> header
				.replace(/\s+/g, ' ') // Replace multiple spaces with a single space
				.replace(/>\s+</g, '><');//cleanup spaces between tags
				cacheMap[props.name] = svg.value;
			}
		});
	}catch(err) {
		error.value = true;
	}
}

onBeforeMount(() => {
	loadImage();
	watch(() => props.name, () => loadImage());
});

onBeforeUnmount(() => {
	disposed.value = true;
});
</script>
<style scoped lang="less">
.icon{
	display: inline-block;
	// color: inherit;
	:deep(svg) {
		width: auto;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		object-fit: cover;
		display: block;
		* {
			fill: currentColor !important;
		}
	}
	&.light {
		color: var(--color-light) !important;
	}
	&.dark {
		color: var(--color-dark) !important;
	}
	&.primary {
		color: var(--color-primary) !important;
	}
	&.secondary {
		color: var(--color-secondary) !important;
	}
	&.alert {
		color: var(--color-alert) !important;
	}
	&.premium {
		color: var(--color-premium) !important;
	}
	&.twitch {
		color: var(--color-twitch) !important;
	}
}
</style>
