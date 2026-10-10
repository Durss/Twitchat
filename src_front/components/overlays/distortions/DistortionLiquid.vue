<template>
	<div class="distortionliquid"></div>
</template>

<script setup lang="ts">
import ripples from "@/assets/img/distortions/ripples.png";
import ripplesShadow from "@/assets/img/distortions/ripples_shadow.png";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { gsap } from "gsap/gsap-core";
import { onMounted } from "vue";
import { useDistortion, type IDistortItem } from "./useDistortion";

const props = defineProps<{
	params: TwitchatDataTypes.HeatDistortionData;
}>();

const { initialize } = useDistortion(props, ({ buildItem, removeItem }) => {
	return (px?: number, py?: number): IDistortItem => {
		const item = buildItem(px, py);
		if (px != undefined) item.x = px;
		if (py != undefined) item.y = py;
		item.alphaSpeed = 0;
		item.frame = 0;
		item.scale = 0.001;
		item.scaleSpeed = 0;
		item.angle = 0; //Math.random() * Math.PI * 2;
		let scale = 20 * Math.random() + 3;
		gsap.to(item, {
			scale,
			frame: 128,
			ease: "none",
			duration: Math.max(1, scale * 0.25),
			onComplete: () => {
				removeItem(item);
			},
		});
		return item;
	};
});

onMounted(() => {
	initialize({
		cols: 16,
		rows: 8,
		uvScaleX: 256 / 4096,
		uvScaleY: 256 / 2048,
		frames: 128,
		texture: ripples,
		overlay: ripplesShadow,
	});
});
</script>

<style scoped lang="less">
.distortionliquid {
}
</style>
