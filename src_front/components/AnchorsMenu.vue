<template>
	<div class="anchorsmenu" ref="content">
		<div v-for="(a, i) in items" :key="i" :class="getClasses(a)"
		@mouseenter="mouseEnter"
		@mouseleave="mouseLeave"
		@click="selectItem(a)"
		ref="item">
			<button>
				<Icon :name="a.icon" class="icon" />
				<div class="label">{{a.label}}</div>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { gsap } from 'gsap/gsap-core';
import { nextTick, onMounted, ref, useTemplateRef } from 'vue';
import Icon from './Icon.vue';

const props = withDefaults(defineProps<{
	items?: TwitchatDataTypes.AnchorData[];
	openAnimaton?: boolean;
	openDelay?: number;
}>(), {
	items: () => [],
	openAnimaton: false,
	openDelay: 0,
});

const emit = defineEmits<{
	select: [item: TwitchatDataTypes.AnchorData];
}>();

const content = useTemplateRef("content");
const item = ref<HTMLDivElement[]>([]);

function getClasses(a: TwitchatDataTypes.AnchorData): string[] {
	let res = ["item"];
	if(a.selected) res.push("selected");
	return res;
}

onMounted(async ()=> {
	await nextTick();
	resetRender();
})

function resetRender(): void {
	const labels = content.value?.querySelectorAll(".label");
	if(labels && labels.length > 0) gsap.set(labels, {padding:0, margin:0, width:0});
	if(props.openAnimaton !== false && item.value) {
		const delay = props.openDelay ?? 0;
		gsap.from(item.value as HTMLDivElement[], {duration:.3, x:-50, stagger:0.035, ease:"back.out(3)", delay, clearProps:"all"});
	}
}

function mouseEnter(event: MouseEvent): void {
	const target = event.target as HTMLDivElement;
	const label = target.querySelector(".label");
	gsap.killTweensOf(label);
	label?.removeAttribute("style");
	gsap.from(label, {duration:.25, padding:0, margin:0, width:0, clearProps:"all"});
}

function mouseLeave(event: MouseEvent): void {
	const target = event.target as HTMLDivElement;
	const label = target.querySelector(".label");
	gsap.killTweensOf(label);
	gsap.to(label, {duration:.25, padding:0, margin:0, width:0});
}

function selectItem(itemData: TwitchatDataTypes.AnchorData): void {
	for (let i = 0; i < props.items!.length; i++) {
		props.items![i]!.selected = false;
	}

	if(itemData.selected !== true) {
		itemData.selected = true;
		emit("select", itemData);
	}
}
</script>

<style scoped lang="less">
.anchorsmenu{
	position: fixed;
	left: 0;
	top: 50%;
	transform: translate(0, -50%);
	gap: 10px;
	display: flex;
	flex-direction: column;
	padding-left: .5em;
	z-index: 1;

	.item {
		@size: 1.75em;
		@sizeHover: 1.75em;
		min-width: @size;
		cursor: pointer;
		transition: all .25s;
	
		button {
			display: flex;
			flex-direction: row;
			align-items: center;
			border-radius: 10em;
			background-color: var(--background-color-primary);
			transition: background-color .25s;
			box-shadow: 0 0 5px 0px rgba(0, 0, 0, .5);
			color: var(--color-text);

			.icon {
				width: @size;
				height: @size;
				padding: 5px;
				display: flex;
				justify-content: center;
			}

			.label {
				flex-grow: 1;
				white-space: nowrap;
				margin: 0 1em 0 .5em;
				overflow: hidden;
			}
		}

		&.selected {
			@size:1.25em;
			font-size: @size;
			margin-left: calc((1em - @size ) / 2);
			button {
				background-color: var(--color-primary);
				.label {
					font-size: 1rem;
					color: var(--color-light);
				}
				.icon {
					filter:brightness(100);
				}
			}
		}
	}
}
@media only screen and (max-width: 900px) {
	.anchorsmenu{
		.item {

			button {
				.label {
					display: none;
				}
			}
		}
	}

}
</style>