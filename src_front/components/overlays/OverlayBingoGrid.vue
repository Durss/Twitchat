<template>
	<div class="overlaybingogrid" v-if="bingo">
		<div class="grid">
			<div v-for="entry in bingo.entries"
			class="entry"
			:key="entry.id"
			:style="{width:'calc('+(1/bingo.cols*100)+'% - 3px)'}">
				<span>{{ entry.label }}</span>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import PublicAPI from '@/utils/PublicAPI';
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{},
	emits:[],
})
class OverlayBingoGrid extends AbstractOverlay {

	public bingo:TwitchatDataTypes.BingoGridConfig | null = null;

	private id:string = "";
	private bingoUpdateHandler!:(e:TwitchatEvent<TwitchatDataTypes.BingoGridConfig>) => void;

	public beforeMount(): void {
		this.id = this.$route.query.bid as string ?? "";
		this.bingoUpdateHandler = (e) => this.onBingoUpdate(e);
		PublicAPI.instance.addEventListener(TwitchatEvent.BINGO_GRID_PARAMETERS, this.bingoUpdateHandler);
	}

	public beforeUnmount(): void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.BINGO_GRID_PARAMETERS, this.bingoUpdateHandler);
	}

	override requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_BINGO_GRID_PARAMETERS, {bid:this.id});
	}

	/**
	 * Called when bingo data are changed
	 */
	private async onBingoUpdate(e:TwitchatEvent<TwitchatDataTypes.BingoGridConfig>):Promise<void> {
		if(e.data) {
			const bingo = e.data;
			if(bingo.id != this.id) return;
			this.bingo = bingo;
		}
	}

}
export default toNative(OverlayBingoGrid);
</script>

<style scoped lang="less">
.overlaybingogrid{
	.grid {
		width: min(100vw, 100vh);
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 3px;
		.entry {
			display: block;
			aspect-ratio: 1/1;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			background-color: var(--grayout-fader);
			border-radius: var(--border-radius);
			position: relative;
		}
	}
}
</style>
