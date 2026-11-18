<template>
	<div class="distortionexpand"></div>
</template>

<script setup lang="ts">
import bubble from "@/assets/img/distortions/bubble.png";
import bubbleShadow from "@/assets/img/distortions/bubble_shadow.png";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { gsap, Elastic } from "gsap/gsap-core";
import { onMounted } from "vue";
import { useDistortion, type IDistortItem } from "./useDistortion";

const props = defineProps<{
	params: TwitchatDataTypes.HeatDistortionData;
}>();

const { initialize } = useDistortion(props, ({ buildItem, removeItem }) => {
	return (px?: number, py?: number): IDistortItem => {
		const item = buildItem(px, py);
		item.alphaSpeed = 0;
		item.frame = 20; //Math.round(Math.random()*50);
		item.scale = 0.001;
		item.scaleSpeed = 0;
		item.angle = Math.PI;
		let scale = 3 + Math.random() * 2;
		if (Math.random() > 0.98) {
			scale = 15 + Math.random() * 5;
			// item.frame = 0;
		}
		gsap.fromTo(item, { scale: 0 }, { scale, angle: 0, ease: Elastic.easeOut, duration: 1 });
		gsap.to(item, {
			scale: 0,
			angle: Math.PI,
			ease: "back.in(5)",
			duration: 0.5,
			delay: 5,
			immediateRender: false,
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
		texture: bubble,
		overlay: bubbleShadow,
	});
});
</script>

<style scoped lang="less">
.distortionexpand {
}
</style>
