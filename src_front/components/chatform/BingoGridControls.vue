<template>
	<div class="bingogridcontrols blured-background-window">
		<div v-for="grid in $store.bingoGrid.availableOverlayList"
		class="card-item entry"
		:title="grid.title"
		:open="false"
		:key="grid.id">
			<h2>{{grid.title}}</h2>
			<div class="grid" :style="{gridTemplateColumns: 'repeat('+grid.cols+', 1fr)'}">
				<TransitionGroup name="flip-list">
					<Checkbox v-for="entry in grid.entries"
						class="entry"
						:secondary="entry.lock"
						:key="entry.id"
						v-model="entry.check"
						v-tooltip="entry.label"
						@click.capture.stop="$store.bingoGrid.toggleCell(grid.id, entry.id)" />
				</TransitionGroup>
			</div>
			<div class="ctas">
				<TTButton icon="dice" @click="$store.bingoGrid.shuffleGrid(grid.id)" v-tooltip="$t('bingo_grid.form.shuffle_bt')"></TTButton>
				<TTButton icon="refresh" @click="$store.bingoGrid.resetCheckStates(grid.id)" v-tooltip="$t('bingo_grid.state.reset_bt')"></TTButton>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { gsap } from 'gsap/gsap-core';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import ToggleBlock from '../ToggleBlock.vue';
import Checkbox from '../Checkbox.vue';
import TTButton from '../TTButton.vue';

@Component({
	components:{
		TTButton,
		Checkbox,
		ToggleBlock,
	},
	emits:["close"],
})
class BingoGridControls extends Vue {

	private clickHandler!:(e:MouseEvent) => void;

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.open();
	}

	/**
	 * Open animation
	 */
	private open():void {
		const element = this.$el as HTMLDivElement;
		gsap.killTweensOf(element);
		gsap.from(element, {duration:.2, scaleX:0, delay:.1, clearProps:"scaleX", ease:"back.out"});
		gsap.from(element, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
	}

	/**
	 * Close animation
	 */
	private close():void {
		const element = this.$el as HTMLDivElement;
		gsap.killTweensOf(element);
		gsap.to(element, {duration:.3, scaleX:0, ease:"back.in"});
		gsap.to(element, {duration:.2, scaleY:0, delay:.1, clearProps:"scaleY, scaleX", ease:"back.in", onComplete:() => {
			this.$emit("close");
		}});
	}

	/**
	 * Detect click outside window to close hte window
	 */
	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			//Close if clicking outside of the holder
			this.close();
		}
	}
}
export default toNative(BingoGridControls);
</script>

<style scoped lang="less">
.bingogridcontrols{
	gap: 1em;
	display: flex;
	flex-direction: column;
	width: fit-content;
	left: auto;
	right: 0;
	margin-left: auto;
	transform-origin: bottom right;
	color:var(--color-light);

	.entry{
		h2 {
			text-align: center;
			margin-bottom: .5em;
			max-width: min(100vw, 300px);
			word-wrap: break-word;
		}
		.grid {
			gap:5px;
			display: grid;
			grid-template-columns: repeat(1, 1fr);
			width: min-content;
			margin: auto;
			.entry {
				width: 1.5em;
				height: 1.5em;
			}
		}
	}

	.ctas {
		margin-top: .5em;
		display: flex;
		flex-direction: row;
		justify-content: space-evenly;
	}

	.flip-list-move {
		transition: transform .25s;
	}
}
</style>
