<template>
	<img src="@/assets/img/goldenKappa.png" alt="golden kappa" class="icon kappa" v-if="trainData?.type == 'golden_kappa'" />
	<img src="@/assets/img/coin.png" alt="treasure" class="icon coin" v-if="trainData?.type == 'treasure'" />
	<Icon name="train" alt="train" class="icon" v-else />
</template>

<script lang="ts" setup>
import { storeStream } from '@/store/stream/storeStream';
import { computed } from 'vue';

const store = storeStream();
const trainData = computed(()=> {
	return store.hypeTrain;
});
</script>