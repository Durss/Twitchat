<template>
	<div :class="classes" v-if="ready">
		<div class="grid" v-if="bingo"
		:style="{aspectRatio: bingo.cols/bingo.rows, fontSize:bingo.textSize+'px', color:bingo.textColor}">
			<TransitionGroup name="flip-list">
				<div v-for="entry in bingo.entries"
					class="entry"
					ref="cell"
					:key="entry.id"
					:style="{width:(1/bingo.cols*100)+'%'}">
					<span class="label">{{ entry.label }}</span>
					<Icon class="cross" name="cross" v-if="entry.check" />
				</div>
			</TransitionGroup>
		</div>
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

@Component({
	components:{
		Icon,
	},
	emits:[],
})
class OverlayBingoGrid extends AbstractOverlay {


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

	override requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_BINGO_GRID_PARAMETERS, {bid:this.id});
	}

	public broadcastPresence():void {
		if(!this.bingo) return;
		PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_OVERLAY_PRESENCE, {bid:this.id});
	}

	/**
	 * Called when bingo data are changed
	 */
	private async onBingoUpdate(e:TwitchatEvent<{id:string, bingo:TwitchatDataTypes.BingoGridConfig}>):Promise<void> {
		if(e.data) {
			const data = e.data;
			if(data.id != this.id) return;
			this.ready = true;
			if(data.bingo) this.bingo = data.bingo;
			this.broadcastPresence();
		}
	}
}
export default toNative(OverlayBingoGrid);
</script>

<style scoped lang="less">
.overlaybingogrid{
	@borderSize: 1px;
	.grid {
		// gap: 3px;
		gap: -@borderSize;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		max-height: 100vh;

		.entry {
			box-sizing: border-box;
			padding: 5px;
			aspect-ratio: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			position: relative;
			font-weight: bold;
			white-space: pre-line;
			text-align: center;
			position: relative;
			word-wrap: break-word;

			.cross {
				position: absolute;
				top: 50%;
				left: 50%;
				width: 80%;
				transform: translate(-50%, -50%);
				color: #cc0000;
			}

			.label {
				display: block;
				width: 100%;
			}
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
			border: @borderSize solid;
			.entry {
				border: @borderSize solid;
			}
		}
	}
}
</style>
