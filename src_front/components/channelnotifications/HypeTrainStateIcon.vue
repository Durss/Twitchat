<template>
	<img
		src="@/assets/img/goldenKappa.png"
		alt="golden kappa"
		class="icon kappa"
		v-if="trainData?.type == 'golden_kappa'"
	/>
	<img
		src="@/assets/img/coin.png"
		alt="treasure"
		class="icon coin"
		v-else-if="trainData?.type == 'treasure'"
	/>
	<span class="mythicIcon" v-else-if="trainData?.type == 'mythic'">
		<img src="@/assets/img/mythicTrain.png" alt="mythic" class="icon" />
		<span class="emotes">
			<img src="@/assets/img/mythicEmote_1.png" alt="" class="emote" />
			<img src="@/assets/img/mythicEmote_2.png" alt="" class="emote" />
			<img src="@/assets/img/mythicEmote_3.png" alt="" class="emote" />
		</span>
	</span>
	<Icon name="train" alt="train" class="icon" v-else />
</template>

<script lang="ts" setup>
import { storeStream } from "@/store/stream/storeStream";
import { computed } from "vue";

const store = storeStream();
const trainData = computed(() => {
	return store.hypeTrain;
});
</script>

<style scoped lang="less">
.mythicIcon {
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	flex-shrink: 0;

	.icon {
		width: 1em;
		height: 1em;
		max-width: none;
	}

	// Emotes zoom in/out one after the other, all stacked at the same place
	.emotes {
		position: relative;
		width: 1.25em;
		height: 1.25em;

		@duration: 1.5s; // time each emote spends on screen, zooms included
		.emote {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			max-width: none;
			transform: scale(0);
			animation: mythicEmoteCycle (@duration * 3) infinite backwards;
			&:nth-child(2) {
				animation-delay: @duration;
			}
			&:nth-child(3) {
				animation-delay: (@duration * 2);
			}
		}

		// One third of the cycle per emote: zoom in, hold, zoom out, then
		// stay hidden while the 2 others play
		@keyframes mythicEmoteCycle {
			0% {
				transform: scale(0);
				animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
			}
			6.67% {
				transform: scale(1);
			}
			26.67% {
				transform: scale(1);
				animation-timing-function: ease-in;
			}
			33.33%,
			100% {
				transform: scale(0);
			}
		}
	}
}
</style>
