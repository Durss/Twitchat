<template>
	<div :class="classes" v-if="ready">
		<template v-if="bingo">
			<div class="cells" ref="cellsHolder"
			:style="{aspectRatio: bingo.cols/bingo.rows,
				fontSize:bingo.textSize+'px',
				color:bingo.textColor,
				backgroundColor:backgroundColor,
				gridTemplateColumns: 'repeat('+bingo.cols+', 1fr)'}">
				<TransitionGroup name="flip-list">
					<div v-for="entry in bingo.entries"
						ref="cell"
						@click="entry.check = !entry.check"
						:class="cellClasses(entry)"
						:data-cellid="entry.id"
						:key="entry.id"
						:style="{width:'100%'}">
						<span class="label">{{ entry.label }}</span>
						<!-- <Transition name="scale"> -->
							<Icon class="check" name="checkmark" v-show="entry.check" :ref="'check_'+entry.id" />
						<!-- </Transition> -->
					</div>
				</TransitionGroup>
			</div>
			<div class="grid" ref="gridHolder"
			:style="{aspectRatio: bingo.cols/bingo.rows,
				color:bingo.textColor,
				gridTemplateColumns: 'repeat('+bingo.cols+', 1fr)'}">
				<div v-for="entry in bingo.entries" :class="cellClasses(entry)"></div>
			</div>
			<Teleport :to="currentCell" v-if="currentCell">
				<div class="clouds">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 454.53 357.01"
					v-for="i in 10" ref="clouds"><path style="fill:currentColor" d="m451.87,164.84c-12.25-41.03-46.83-57.62-87.58-55.57,33.41-69.32-41.48-137.27-107.32-97.44-14.48-7.85-33.7-10.29-50.1-6.58-27.67-8.64-60.16-.57-81.64,18.51-17.09,2.98-35.97,13.92-45.18,28.92C-5.8,50.25-31.33,162.4,46.86,197.46c-15.69,37.25-2.84,84.19,33.2,104.16,19.41,63.84,92.17,72.48,135.73,26.04,15.8,7.54,33.62,12.01,51.02,8.57,13.61,2.89,27.52,4.54,41.31,6.2,36.35-.86,71.56-28.72,73.95-66.27,43.86-15.69,83.2-62.69,69.8-111.32Z"/></svg>
				</div>
			</Teleport>

			<div class="stars">
				<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="445.2px" height="426.2px" viewBox="0 0 445.2 426.2"
				v-for="i in 100"
				ref="stars"
				class="star"><path style="fill:#FFFFFF;" d="M247.5,16l47.2,95.6c4,8.2,11.8,13.9,20.9,15.2L421,142c22.7,3.3,31.8,31.3,15.4,47.3L360,263.7
					c-6.5,6.4-9.5,15.5-8,24.5l18,105c3.9,22.7-19.9,39.9-40.2,29.2l-94.3-49.6c-8.1-4.2-17.7-4.2-25.8,0l-94.3,49.6
					c-20.3,10.7-44.1-6.6-40.2-29.2l18-105c1.5-9-1.4-18.2-8-24.5L8.9,189.3c-16.5-16-7.4-44,15.4-47.3l105.4-15.3
					c9-1.3,16.8-7,20.9-15.2L197.8,16C207.9-4.7,237.3-4.7,247.5,16z"/></svg>
			</div>
		</template>
		<div v-else class="error card-item alert">{{ $t("bingo_grid.overlay.bingo_not_found") }}</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import gsap, { Elastic, Sine } from 'gsap';
import { CustomEase } from 'gsap/all';
import { Component, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import AbstractOverlay from './AbstractOverlay';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
export class OverlayBingoGrid extends AbstractOverlay {

	public ready:boolean = false;
	public currentCell:HTMLElement | null = null;
	public bingo:TwitchatDataTypes.BingoGridConfig | null = null;

	private id:string = "";
	private starIndex:number = 0;
	private broadcastPresenceInterval:string = "";
	private bingoUpdateHandler!:(e:TwitchatEvent<{id:string, bingo:TwitchatDataTypes.BingoGridConfig, newVerticalBingos:number[], newHorizontalBingos:number[], newDiagonalBingos:number[]}>) => void;
	private prevCheckStates:{[key:string]:boolean} = {};

	public get classes():string[] {
		let res:string[] = ["overlaybingogrid"];
		if(this.bingo?.showGrid === true) res.push("border");
		return res;
	}

	public cellClasses(entry:TwitchatDataTypes.BingoGridConfig["entries"][number]):string[] {
		let res:string[] = ["cell"];
		if(entry.check === true) res.push("check");
		return res;
	}

	public get backgroundColor():string {
		const base = this.bingo!.backgroundColor || '#000000';
		const alpha = this.bingo!.backgroundAlpha || 0;
		return base+Math.round(alpha/100*0xff).toString(16).padStart(2, "0")
	}

	public beforeMount(): void {
		this.id = this.$route.query.bid as string ?? "";
		this.bingoUpdateHandler = (e) => this.onBingoUpdate(e);
		PublicAPI.instance.addEventListener(TwitchatEvent.BINGO_GRID_PARAMETERS, this.bingoUpdateHandler);

		this.broadcastPresenceInterval = SetIntervalWorker.instance.create(()=>{
			this.broadcastPresence();
		}, 20000);
	}

	public beforeUnmount(): void {
		SetIntervalWorker.instance.delete(this.broadcastPresenceInterval);
		PublicAPI.instance.removeEventListener(TwitchatEvent.BINGO_GRID_PARAMETERS, this.bingoUpdateHandler);
	}

	/**
	 * Ask bingo info from Twitchat
	 */
	override requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_BINGO_GRID_PARAMETERS, {bid:this.id});
	}

	/**
	 * Tell Twitchat overlay exists
	 */
	public broadcastPresence():void {
		if(!this.bingo) return;
		PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_OVERLAY_PRESENCE, {bid:this.id});
	}

	/**
	 * Called when clicking overlay via heat
	 */
	public onHeatClick(event:TwitchatDataTypes.HeatClickData, x:number, y:number):void {
		let element = document.elementFromPoint(x, y) as HTMLElement;
		if(element) {
			while(!element.dataset["cellid"] && element != document.body) {
				element = element.parentElement as HTMLElement;
			}
			if(element != document.body) {
				const id = element.dataset["cellid"] || "";
				PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_HEAT_CLICK, {gridId:this.bingo!.id, entryId:id, click:event});
			}
		}
	}

	/**
	 * Called when bingo data are changed
	 */
	private async onBingoUpdate(e:TwitchatEvent<{id:string, bingo:TwitchatDataTypes.BingoGridConfig, newVerticalBingos:number[], newHorizontalBingos:number[], newDiagonalBingos:number[]}>):Promise<void> {
		if(e.data) {
			const data = e.data;
			if(data.id != this.id) return;
			const animate = !this.ready;
			this.ready = true;
			if(data.bingo) this.bingo = data.bingo;

			this.broadcastPresence();

			await this.$nextTick();

			if(animate) {
				const spiralOrder: number[] = [];

				// (di, dj) is a vector - direction in which we move right now
				let di = 1;
				let dj = 0;
				// length of current segment
				let segment_length = 1;

				// current position (i, j) and how much of current segment we passed
				let i = 0;
				let j = 0;
				const cx = Math.ceil(data.bingo.cols/2)-1;
				const cy = Math.ceil(data.bingo.rows/2)-1;
				let segment_passed = 0;

				spiralOrder.push(cx + cy*data.bingo.cols);
				//From https://stackoverflow.com/a/3706260/3813220
				//TODO doesn't work well for rectangular grids
				for (let k = 0; k < data.bingo.entries.length; ++k) {
					// make a step, add 'direction' vector (di, dj) to current position (i, j)
					i += di;
					j += dj;
					++segment_passed;
					const index = (i+cx) + (j+cy) * data.bingo.cols;
					// console.log(i, j, index);

					if(index > -1 && index < data.bingo.entries.length) spiralOrder.push(index);

					if (segment_passed == segment_length) {
						// done with current segment
						segment_passed = 0;

						// 'rotate' directions

						let buffer = di;

						di = -dj;
						dj = buffer;

						// increase segment length if necessary
						if (dj == 0) ++segment_length;
					}
				}

				const cells = this.$refs.cell as HTMLElement[];
				gsap.from([this.$refs.cellsHolder, this.$refs.gridHolder], {scale:0, ease:Sine.easeOut, duration:.35, clearProps:"transform"});
				//Animate items from center
				cells.forEach((cell, index) => {
					let distance = spiralOrder.findIndex(v=>v===index);
					if(distance < 0) distance = spiralOrder.length;
					gsap.from(cell, {scale:0, ease:Elastic.easeOut, duration:1.3, delay: .3 + distance*.05});
				});
			}


			if(this.bingo) {
				//Animate new checks display
				this.bingo.entries.forEach(entry => {
					if(this.prevCheckStates[entry.id] != entry.check && entry.check) {
						const checks = this.$refs["check_"+entry.id] as Vue[];
						const cell = document.querySelector("[data-cellid=\""+entry.id+"\"]") as HTMLElement;
						if(checks?.length > 0) {
							if(checks[0].$el.nodeName != "#comment") {
								gsap.killTweensOf(checks[0].$el);
								gsap.fromTo(checks[0].$el, {opacity:0}, {opacity:1, duration:.25});
								const ease = CustomEase.create("custom", "M0,0 C0,0 0.325,0.605 0.582,0.977 0.647,0.839 0.817,0.874 0.854,0.996 0.975,0.9 1,1 1,1 ");
								const angle = (Math.random()-Math.random()) * 25;
								gsap.fromTo(checks[0].$el, {transform:"scale(3)", rotation:"0deg"}, {transform:"scale(1)", rotation:angle+"deg", ease, duration:.25});
								setTimeout(() => {
									this.popClouds(cell);
								}, 150);
							}
						}
					}
					this.prevCheckStates[entry.id] = entry.check;
				});

				this.animateBingos(data.newVerticalBingos, data.newHorizontalBingos, data.newDiagonalBingos);
			}
		}
	}

	/**
	 * Animates a new bingo
	 */
	private animateBingos(vertical:number[], horizontal:number[], diagonal:number[]):void {
		const bingo = this.bingo!;
		let delay = .5;
		const animateCell = (holder:HTMLElement)=>{
			const color100 = bingo.textColor+"ff";
			const color0 = bingo.textColor+"00";
			gsap.fromTo(holder, {scale:2}, {scale:1, delay, duration:.5, immediateRender:false, ease:"back.out"});
			gsap.fromTo(holder, {backgroundColor:color0},
			{backgroundColor:color0, delay, duration:.5, immediateRender:false, ease:"sine.out", onStart:()=>{
				this.popStars(holder);
			}});
		}

		horizontal.forEach(y=>{
			for (let x = 0; x < bingo.cols; x++) {
				const cell = this.getCellByCoords(x, y);
				cell.holder.classList.add("bingo");
				delay += .05;
				animateCell(cell.holder);
			}
			delay += .1;
		});

		vertical.forEach(x=>{
			for (let y = 0; y < bingo.rows; y++) {
				const cell = this.getCellByCoords(x, y);
				cell.holder.classList.add("bingo");
				delay += .05;
				animateCell(cell.holder);
			}

			delay += .1;
		});

		diagonal.forEach(dir=>{
			for (let x = 0; x < bingo.cols; x++) {
				const px = dir === 0? x : bingo.rows - 1 - x;
				const y = x;
				const cell = this.getCellByCoords(px, y);
				cell.holder.classList.add("bingo");
				delay += .05;
				animateCell(cell.holder);
			}
			delay += .1;
		});
	}

	/**
	 * Gets a cell's details from its index
	 * @param index
	 */
	private getCellByCoords(x:number, y:number):{data:TwitchatDataTypes.BingoGridConfig["entries"][number], holder:HTMLElement} {
		const bingo = this.bingo!;
		const data = bingo.entries[x + y*bingo.cols];
		const holder = document.querySelector("[data-cellid=\""+data.id+"\"]") as HTMLElement;
		return {data, holder};
	}

	/**
	 * Animates clouds when ticking a cell
	 * @param ref
	 */
	private async popClouds(ref:HTMLElement):Promise<void> {
		this.currentCell = ref;
		await this.$nextTick();
		const clouds = this.$refs.clouds as SVGElement[];
		const bounds = ref.getBoundingClientRect();
		clouds.forEach(cloud => {
			const left = bounds.width/2;
			const top = bounds.height/2;
			const angle = (Math.random()-Math.random()) * 100;
			const scaleRatio = Math.random() - Math.random();
			cloud.style.left = left+"px";
			cloud.style.top = top+"px";
			cloud.style.width = (bounds.width*(.5+scaleRatio*.25))+"px";
			cloud.style.height = (bounds.height*(.5+scaleRatio*.25))+"px";
			cloud.style.opacity = "1";
			const x = (Math.random()-Math.random()) * bounds.width;
			const y = (Math.random()-Math.random()) * bounds.height;
			gsap.to(cloud, {opacity:0, x:"-50%", y:"-50%", rotation:angle+"deg", left:left+x, top:top+y, duration:.5, ease:"sine.out"});
		});
	}

	/**
	 * Pop stars over the given cell
	 * @param ref
	 */
	private async popStars(ref:HTMLElement):Promise<void> {
		this.currentCell = ref;
		await this.$nextTick();
		const stars = this.$refs.stars as SVGElement[];
		const bounds = ref.getBoundingClientRect();
		for (let i = 0; i < 10; i++) {
			const star = stars[(this.starIndex++)%stars.length]
			const left = bounds.x + bounds.width/2;
			const top = bounds.y + bounds.height/2;
			const angle = (Math.random()-Math.random()) * 250;
			const scaleRatio = Math.random();
			star.style.left = left+"px";
			star.style.top = top+"px";
			star.style.width = (bounds.width*(.1+scaleRatio*.15))+"px";
			star.style.height = (bounds.height*(.1+scaleRatio*.15))+"px";
			star.style.opacity = "1";
			const x = (Math.random()-Math.random()) * bounds.width;
			const y = (Math.random()-Math.random()) * bounds.height;
			gsap.to(star, {opacity:0, x:"-50%", y:"-50%", rotation:angle+"deg", left:left+x, top:top+y, duration:Math.random(), ease:"sine.out"});
		}
	}

}
export default toNative(OverlayBingoGrid);
</script>

<style scoped lang="less">
.overlaybingogrid{
	@borderSize: 3px;
	padding: @borderSize;
	transform-origin: center center;
	.cells, .grid {
		gap: @borderSize;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		max-width: 100vw;
		max-height: calc(100vh - @borderSize * 2);
		border-radius: calc(min(100vw, 100vh) / 50);
		overflow: hidden;

		.cell {
			padding: 5px;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			font-weight: bold;
			white-space: pre-line;
			text-align: center;
			word-wrap: break-word;
			position: relative;
			aspect-ratio: 1;
			cursor: pointer;

			.check {
				pointer-events: none;
				position: absolute;
				top: 50%;
				left: 50%;
				width: 70%;
				color: #00cc00;
				pointer-events: none;
				transform-origin: center center;
				margin-left: -35%;
				margin-top: -35%;
				z-index: 10000;
				filter: drop-shadow(2px 2px 5px rgba(0,0,0,.5));
			}

			.label {
				display: block;
				width: 100%;
			}
		}
	}

	.grid {
		pointer-events: none;
		display: none;
		transform: translateY(-100%);
		box-shadow:0 0 0 @borderSize currentColor;
		.cell {
			box-shadow:0 0 0 @borderSize currentColor;
		}
	}

	.clouds {
		color: #eeeeee;
		svg {
			transform-origin: center center;
			transform: translate(-50%, -50%);
			position: absolute;
			top: 0;
			left: 0;
		}
	}

	.stars {
		color: #eeeeee;
		svg {
			transform-origin: center center;
			transform: translate(-50%, -50%);
			position: absolute;
			top: 0;
			left: 0;
		}
	}

	.flip-list-move {
		transition: transform .25s;
	}

	.error {
		.center();
		position: absolute;
		font-size: 2em;
		text-align: center;
		width: 80vw;
		left: 50vw;
		top: 50vh;
	}

	&.border {
		.grid {
			display: grid;
		}
	}
}
</style>
