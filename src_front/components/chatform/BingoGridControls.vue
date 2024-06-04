<template>
	<div class="bingogridcontrols blured-background-window" v-if="!leaderBoardID || $store.bingoGrid.viewersBingoCount[leaderBoardID]?.length === 0">
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

			<ToggleBlock v-if="grid.additionalEntries" small :title="$t('bingo_grid.form.additional_cells')">
				<div v-for="entry in grid.additionalEntries" class="additionalEntry">
					<Checkbox class="entry"
						:key="entry.id"
						v-model="entry.check"
						v-tooltip="entry.label"
						@click.capture.stop="$store.bingoGrid.toggleCell(grid.id, entry.id)">
						<span class="label">{{ entry.label }}</span>
					</Checkbox>
				</div>
			</ToggleBlock>

			<div class="ctas">
				<TTButton icon="shuffle" @click="$store.bingoGrid.shuffleGrid(grid.id)" v-tooltip="$t('bingo_grid.form.shuffle_bt')"></TTButton>
				<TTButton icon="refresh" @click="$store.bingoGrid.resetCheckStates(grid.id)" v-tooltip="$t('bingo_grid.state.reset_bt')"></TTButton>
				<TTButton v-if="$store.bingoGrid.viewersBingoCount[grid.id] && $store.bingoGrid.viewersBingoCount[grid.id].length > 0"
				icon="leaderboard"
				small
				v-tooltip="$t('bingo_grid.form.leaderBoard.open_bt_tt')"
				@click="openLeaderBoard(grid)">{{ $tc("bingo_grid.form.leaderBoard.open_bt", Object.keys($store.bingoGrid.viewersBingoCount[grid.id]).length, {COUNT:Object.keys($store.bingoGrid.viewersBingoCount[grid.id]).length}) }}</TTButton>
			</div>
		</div>
	</div>
	<div class="bingogridcontrols blured-background-window leaderboard" v-else>
		<Icon name="leaderboard" />

		<div class="list">
			<div class="entry"
			v-for="entry in $store.bingoGrid.viewersBingoCount[leaderBoardID].sort((a,b)=>b.count-a.count)"
			:key="entry.user.id">
				<img class="avatar" :src="entry.user.avatarPath" alt="avatar">
				<a class="name" @click="openUserCard(entry.user)">{{ entry.user.displayName }}</a>
				<strong class="count">x{{ entry.count }}</strong>
			</div>
		</div>
		<TTButton class="backBt" icon="back" @click="leaderBoardID=''" transparent />
	</div>
</template>

<script lang="ts">
import { gsap } from 'gsap/gsap-core';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import ToggleBlock from '../ToggleBlock.vue';
import Checkbox from '../Checkbox.vue';
import TTButton from '../TTButton.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		TTButton,
		Checkbox,
		ToggleBlock,
	},
	emits:["close"],
})
class BingoGridControls extends Vue {

	public leaderBoardID:string = "";

	private clickHandler!:(e:MouseEvent) => void;

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.open();
	}

	/**
	 * Open grid's leaderboard
	 * @param gridId 
	 */
	public openLeaderBoard(grid:TwitchatDataTypes.BingoGridConfig):void {
		this.leaderBoardID = grid.id;
	}

	/**
	 * Opens up a user card
	 * @param user 
	 */
	public openUserCard(user:TwitchatDataTypes.TwitchatUser, chanId?:string):void {
		this.$store.users.openUserCard(user, chanId, "twitch");
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
		gap: .25em;
		margin-top: .5em;
		display: flex;
		flex-direction: row;
		justify-content: space-evenly;
	}

	.flip-list-move {
		transition: transform .25s;
	}
	.flip-list-leave-to {
		display: none !important;
	}

	&.leaderboard {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.icon {
			height: 2em;
			flex-shrink: 0;
		}
		.list {
			gap: .5em;
			display: flex;
			flex-direction: column;
			align-items: center;
			max-height: 50vh;
			overflow: auto;
			padding: .5em;
			.entry {
				gap: .5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				.avatar {
					border-radius: 50%;
					width: 2em;
					height: 2em;
				}
				.count {
					font-weight: 1.5em;
				}
			}
		}
		.backBt {
			position: absolute;
			top: 0;
			left: 0;
			padding: 1em
		}
	}

	.additionalEntry {
		&:not(:first-child) {
			margin-top: .25em;
		}
		.label {
			display: inline-block;
			max-width: 200px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			line-height: 1.25em;
		}
	}
}
</style>
