<template>
	<ToggleBlock class="heatdebug" :title="$t('heat.debug_interaction')" :open="false" :icons="['debug']" secondary>
		<div class="content">
			<div>{{ $t("heat.debug.description") }}</div>
			
			<div ref="area" class="areaHolder">
				<div class="area" @click="onClickArea" @mousemove="mouseMoveHandler"></div>
				<div class="cursor" ref="cursor"></div>
				<div v-for="click in clicks" class="click" :style="getClickStyles(click)" :key="click.id"></div>
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import HeatSocket from '@/utils/twitch/HeatSocket';
import type { StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleBlock,
	},
	emits:[],
})
export default class HeatDebug extends Vue {

	public clicks:ClickData[] = [];

	public getClickStyles(data:ClickData):StyleValue {
		const bounds = (this.$refs.area as HTMLDivElement).getBoundingClientRect();
		let res:StyleValue = {};
		res.left = (data.px - bounds.left)+"px";
		res.top = (data.py - bounds.top)+"px";
		res.borderColor = data.color;
		return res;
	}

	public mouseMoveHandler(event:MouseEvent):void {
		const bounds = (this.$refs.area as HTMLDivElement).getBoundingClientRect();
		(this.$refs.cursor as HTMLDivElement).style.left = (event.clientX-bounds.left)+"px";
		(this.$refs.cursor as HTMLDivElement).style.top = (event.clientY-bounds.top)+"px";
	}

	public onClickArea(event:MouseEvent):void {
		const bounds = (this.$refs.area as HTMLDivElement).getBoundingClientRect();
		let px = event.clientX - bounds.x;
		let py = event.clientY - bounds.y;
		this.clicks.push({
			id:Math.random(),
			px:event.clientX,
			py:event.clientY,
			color:event.altKey || event.ctrlKey || event.shiftKey? "#12c7d0" : "#e55a37",
		});
		setTimeout(()=>{
			this.clicks.shift();
		}, 500)
		px = px/bounds.width
		py = py/bounds.height
		const uid = this.$store("auth").twitch.user.id
		HeatSocket.instance.fireEvent(uid, px, py, event.altKey, event.ctrlKey, event.shiftKey);
	}

}
interface ClickData {
	id:number;
	px:number;
	py:number;
	color:string;
}
</script>

<style scoped lang="less">
.heatdebug{
	width: 100%;

	.content {
		gap: .5em;
		display: flex;
		flex-direction: column;

		.areaHolder {
			position: relative;

			&:hover {
				.cursor {
					display: block !important;
				}
			}
		}

		.area {
			.bevel();
			cursor: none;
			width: 100%;
			aspect-ratio: 16/9;
			border-radius: var(--border-radius);
			background-color: var(--color-light-fader);
		}

		.click {
			z-index: 999998;
			position: absolute;
			pointer-events: none;
			top: 0;
			left: 0;
			border-radius: 50%;
			border: 1px solid red;
			width: 7px;
			height: 7px;
			transform-origin: center center;
  			animation: expandFadeOut .5s linear;
			transform: translate(-50%, -50%);

			@keyframes expandFadeOut {
				0% {
					opacity: 1;
				}
				50% {
					opacity: 1;
					width: 15px;
					height: 15px;
				}
				100% {
					opacity: 0;
					width: 20px;
					height: 20px;
				}
			}
		}

		.cursor {
			.emboss();
			pointer-events: none;
			position: absolute;
			z-index: 999999;
			top: 0;
			left: 0;
			width: 7px;
			height: 7px;
			border-radius: 50%;
			background-color: #e55a37;
			box-shadow: 2px 2px 2px 0px rgba(0, 0, 0, .5);
			transform-origin: center center;
			transform: translate(-50%, -50%);
			display: none;
		}
	}
}
</style>