<template>
	<div :class="classes" v-if="ready">
		<template v-if="bingo">
			<div class="cells"
			:style="{aspectRatio: bingo.cols/bingo.rows,
				fontSize:bingo.textSize+'px',
				color:bingo.textColor,
				backgroundColor:backgroundColor,
				gridTemplateColumns: 'repeat('+bingo.cols+', 1fr)'}">
				<TransitionGroup name="flip-list">
					<div v-for="entry in bingo.entries"
						class="cell"
						ref="cell"
						:data-gridid="entry.id"
						:key="entry.id"
						:style="{width:'100%'}">
						<span class="label">{{ entry.label }}</span>
						<Icon class="cross" name="cross" v-if="entry.check" />
					</div>
				</TransitionGroup>
			</div>
			<div class="grid"
			:style="{aspectRatio: bingo.cols/bingo.rows,
				color:bingo.textColor,
				gridTemplateColumns: 'repeat('+bingo.cols+', 1fr)'}">
				<div v-for="entry in bingo.entries" class="cell"></div>
			</div>
		</template>
		<div v-else class="error card-item alert">{{ $t("bingo_grid.overlay.bingo_not_found") }}</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import PublicAPI from '@/utils/PublicAPI';
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Icon from '../Icon.vue';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import gsap from 'gsap';
import { Back } from 'gsap';
import { Bounce } from 'gsap';
import { Elastic } from 'gsap';
import { Sine } from 'gsap';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
export class OverlayBingoGrid extends AbstractOverlay {


	public ready:boolean = false;
	public bingo:TwitchatDataTypes.BingoGridConfig | null = null;

	private id:string = "";
	private broadcastPresenceInterval:string = "";
	private bingoUpdateHandler!:(e:TwitchatEvent<{id:string, bingo:TwitchatDataTypes.BingoGridConfig}>) => void;

	public get classes():string[] {
		let res:string[] = ["overlaybingogrid"];
		if(this.bingo?.showGrid === true) res.push("border");
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
			while(!element.dataset["gridid"] && element != document.body) {
				element = element.parentElement as HTMLElement;
			}
			if(element != document.body) {
				const id = element.dataset["gridid"] || "";
				PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_HEAT_CLICK, {gridId:this.bingo!.id, entryId:id, click:event});
			}
		}
	}

	/**
	 * Called when bingo data are changed
	 */
	private async onBingoUpdate(e:TwitchatEvent<{id:string, bingo:TwitchatDataTypes.BingoGridConfig}>):Promise<void> {
		if(e.data) {
			const data = e.data;
			if(data.id != this.id) return;
			const animate = !this.ready;
			this.ready = true;
			if(data.bingo) this.bingo = data.bingo;

			this.broadcastPresence();
			if(animate) {
				await this.$nextTick();
				const cells = this.$refs.cell as HTMLElement[];
				gsap.from(this.$el, {scale:0, ease:Sine.easeOut, duration:.35});
				let stagger = 0;
				//Animate items from center
				cells.forEach((cell, index) => {
					stagger += .05;
					const x = index % this.bingo!.cols;
					const y = Math.floor(index / this.bingo!.cols);
					const centerRow = (this.bingo!.rows - 1) / 2;
					const centerCol = (this.bingo!.cols - 1) / 2;
					const distance = Math.sqrt(Math.pow(y - centerRow, 2) + Math.pow(x - centerCol, 2));
					gsap.from(cell, {scale:0, ease:Elastic.easeOut, duration:1.3, delay: .25 + distance*.1});
				})
			}
		}
	}
}
export default toNative(OverlayBingoGrid);
</script>

<style scoped lang="less">
.overlaybingogrid{
	@borderSize: 3px;
	padding: @borderSize;
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

			.cross {
				position: absolute;
				top: 50%;
				left: 50%;
				width: 80%;
				transform: translate(-50%, -50%);
				color: #cc0000;
				pointer-events: none;
			}

			.label {
				display: block;
				width: 100%;
			}
		}
	}

	.grid {
		display: none;
		transform: translateY(-100%);
		box-shadow:0 0 0 @borderSize;
		.cell {
			box-shadow:0 0 0 @borderSize;
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
	}

	&.border {
		.grid {
			display: grid;
		}
		// .cells {
		// 	box-shadow:0 0 0 @borderSize;
		// 	.entry {
		// 		box-shadow:0 0 0 @borderSize;
		// 	}
		// }
	}
}
</style>
