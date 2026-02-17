<template>
	<div class="card-item">
		<SwitchButton :labels="['🌙','☀️']" :values="[false, true]" v-model="lightMode" @change="toggleTheme()" />
	</div>
</template>

<script lang="ts" setup>
import Utils from '@/utils/Utils';
import { onBeforeMount, ref } from 'vue';
import SwitchButton from './SwitchButton.vue';
import { storeMain } from '@/store/storeMain';

const lightMode = ref(false);
const store = storeMain()
function toggleTheme(): void {
	store.toggleTheme(lightMode.value? "light" : "dark");
}
onBeforeMount(() => {
	lightMode.value = Utils.isLightMode;
});
</script>