<template>
	<div class="changelog3rdpartyanim">
		<Teleport to="body">
			<TTButton primary big ref="item"
				v-for="item in categories"
				style="z-index:100; position:fixed; top:0px; left:0px; pointer-events:none"
				:icon="item.icon">{{ item.label }}</TTButton>
		</Teleport>
		<TTButton primary ref="target" big icon="offline">{{ $t("params.categories.connexions") }}</TTButton>
		<template v-for="item, index in categories">
			<Transition name="fadein">
				<TTButton v-if="childIndex > index" class="childItem" :icon="item.icon">{{ item.label }}</TTButton>
			</Transition>
			<TTButton v-if="childIndex <= index" class="childItem hidden" :icon="item.icon">{{ item.label }}</TTButton>
		</template>
	</div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { TTButton } from '../TTButton.vue';
import { gsap } from 'gsap/gsap-core';
import Utils from '@/utils/Utils';
import type { ComponentPublicInstance } from 'vue';

@Component({
	components:{
		TTButton,
	},
	emits:[],
})
class Changelog3rdPartyAnim extends Vue {


	public childIndex = 0;
	public categories = [
							{label:"Websocket", icon:"broadcast"},
							{label:"Heat", icon:"heat"},
							{label:"OBS", icon:"obs"},
							{label:"Stream Deck", icon:"elgato"},
							{label:"GoXLR", icon:"goxlr"},
							{label:"Voicemod", icon:"voicemod"},
							{label:"Youtube",icon:"youtube"},
							{label:"Spotify",icon:"spotify"},
							{label:"Discord",icon:"discord"},
							{label:"Streamlabs",icon:"streamlabs"},
							{label:"Streamelements",icon:"streamelements"},
							{label:"Ko-fi",icon:"kofi"},
							{label:"Lumia Stream",icon:"lumia"},
						];

	public mounted():void {
		const items = (this.$refs.item as ComponentPublicInstance[]).map( i => i.$el as HTMLElement);
		const target = (this.$refs.target as ComponentPublicInstance).$el as HTMLElement;

		gsap.from(target, {duration:.5, scale:0, ease:"back.out", delay:.1});

		//If i set opacity as an inlined value of the item as I do with the other
		//styles, it gets reset any time "childIndex" value is updated which
		//f** up the animation
		items.forEach(item => item.style.opacity = "0");

		window.setTimeout(async ()=> {
			for (let i = 0; i < items.length; i++) {
				const el = items[i];
				await Utils.promisedTimeout(200);

				const boundsParent = target.getBoundingClientRect();
				const tX = boundsParent.x + boundsParent.width / 2;
				const tY = boundsParent.y + boundsParent.height / 2;

				let bounds = el.getBoundingClientRect();
				const dist = 300;
				let angle = Math.random() * Math.PI/2 + Math.PI/4;
				if(i%2 == 0) angle += Math.PI;
				const x = tX + Math.cos(angle) * dist;
				const y = tY + Math.sin(angle) * dist;
				const duration = 1;

				gsap.fromTo(el, {opacity:0}, {duration:.1, opacity:1});
				gsap.fromTo(el, {x, y}, {duration, x:tX - bounds.width / 2, y:tY - bounds.height / 2, ease:"sine.easeIn"});
				const delayHide = duration * .8;
				gsap.to(el, {delay:delayHide, duration:duration*.2, scale:2, opacity:0, onComplete:()=>{
					el.style.display = "none";
				}});

				gsap.delayedCall(delayHide, ()=> {
					this.childIndex ++;
					gsap.fromTo(target, {scaleX:1.5}, {scaleX:1, ease:"elastic.out", duration:.75});
					gsap.fromTo(target, {scaleY:2}, {scaleY:1, ease:"elastic.out", duration:.75, delay:.1});
				});
			}
		}, 50);
	}
}
export default toNative(Changelog3rdPartyAnim);
</script>

<style scoped lang="less">
.changelog3rdpartyanim{
	gap: .5em;
	display: flex;
	flex-direction: column;
	pointer-events: none;

	.childItem {
		opacity: 1;
		transition: .5s;
		margin-left: 2em;
		&::before {
			position: absolute;
			left: -1em;
			top: .1em;
			font-size: 1.5em;
			content: "⤷";
			display: block;
		}
		&.hidden {
			opacity: 0;
		}
	}
	.fadein-enter-from,
	.fadein-leave-to {
		transform: translateY(-100%);
		opacity:0;
	}
}
</style>
