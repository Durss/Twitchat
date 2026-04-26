<template>
	<div
		ref="rootEl"
		class="bingogridcontrols blured-background-window"
		v-if="!leaderBoardID || storeBingoGrid.viewersBingoCount[leaderBoardID]?.length === 0"
	>
		<div
			v-for="grid in gridList"
			class="card-item entry"
			:title="grid.title"
			:open="false"
			:key="grid.id"
		>
			<h2>{{ grid.title }}</h2>
			<template
				v-if="
					search.trim().length > 0 || storeBingoGrid.controlerModeCache[grid.id] == 'list'
				"
			>
				<div class="listMode">
					<Checkbox
						v-for="entry in grid.entries
							.concat(grid.additionalEntries || [])
							.filter((v) => new RegExp(search.trim(), 'gi').test(v.label))
							.sort((a, b) => a.label.localeCompare(b.label))"
						class="entry"
						:key="entry.id"
						v-model="entry.check"
						@click.capture.stop="storeBingoGrid.toggleCell(grid.id, entry.id)"
					>
						<span class="label">{{ entry.label }}</span>
					</Checkbox>
				</div>
				<div
					class="noResult"
					v-if="
						grid.entries
							.concat(grid.additionalEntries || [])
							.filter((v) => new RegExp(search.trim(), 'gi').test(v.label)).length ==
						0
					"
				>
					{{ t("global.no_result") }}
				</div>
			</template>

			<template v-else>
				<div
					class="grid"
					:style="{ gridTemplateColumns: 'repeat(' + grid.cols + ', 1fr)' }"
				>
					<TransitionGroup name="flip-list">
						<Checkbox
							v-for="entry in grid.entries"
							class="entry"
							:secondary="entry.lock"
							:key="entry.id"
							:style="{ opacity: entry.label ? 1 : 0.25 }"
							v-model="entry.check"
							v-tooltip="entry.label"
							@click.capture.stop="storeBingoGrid.toggleCell(grid.id, entry.id)"
						/>
					</TransitionGroup>
				</div>

				<ToggleBlock
					v-if="grid.additionalEntries && grid.additionalEntries.length > 0"
					small
					:title="t('bingo_grid.form.additional_cells')"
					:open="false"
				>
					<div class="additionalEntryList">
						<div v-for="entry in grid.additionalEntries" class="entry">
							<Checkbox
								class="entry"
								:key="entry.id"
								v-model="entry.check"
								@click.capture.stop="storeBingoGrid.toggleCell(grid.id, entry.id)"
							>
								<span class="label">{{ entry.label }}</span>
							</Checkbox>
						</div>
					</div>
				</ToggleBlock>
			</template>

			<div class="ctas">
				<TTButton
					:icon="
						storeBingoGrid.controlerModeCache[grid.id] == 'list' ? 'bingo_grid' : 'list'
					"
					@click="toggleRenderMode(grid.id)"
				/>
				<TTButton
					icon="shuffle"
					:loading="loading"
					@click="shuffleGrid(grid.id)"
					v-tooltip="t('bingo_grid.form.shuffle_bt')"
				/>
				<TTButton
					icon="refresh"
					:loading="loading"
					@click="untickAll(grid.id)"
					v-tooltip="t('bingo_grid.form.reset_bt')"
				/>
				<TTButton
					v-if="
						storeBingoGrid.viewersBingoCount[grid.id] &&
						storeBingoGrid.viewersBingoCount[grid.id]!.length > 0
					"
					icon="leaderboard"
					small
					v-newflag="{ date: $config.NEW_FLAGS_DATE_V13, id: 'bingogrid_leaderboard' }"
					v-tooltip="t('bingo_grid.form.leaderBoard.open_bt_tt')"
					@click="openLeaderBoard(grid)"
					>{{
						t(
							"bingo_grid.form.leaderBoard.open_bt",
							{
								COUNT: Object.keys(storeBingoGrid.viewersBingoCount[grid.id]!)
									.length,
							},
							Object.keys(storeBingoGrid.viewersBingoCount[grid.id]!).length,
						)
					}}</TTButton
				>
			</div>
			<ToggleButton v-model="grid.enabled" class="togglebutton" small />
		</div>

		<SearchForm
			v-model="search"
			:debounce-delay="0"
			:placeholder="t('global.search_placeholder')"
		/>
	</div>

	<div class="bingogridcontrols blured-background-window leaderboard" v-else>
		<Icon name="leaderboard" />
		<div class="list">
			<div
				class="entry"
				v-for="entry in storeBingoGrid.viewersBingoCount[leaderBoardID]!.sort(
					(a, b) => b.count - a.count,
				)"
				:key="entry.user.id"
			>
				<img class="avatar" :src="entry.user.avatarPath" alt="avatar" />
				<a class="name" @click="openUserCard(entry.user)">{{ entry.user.displayName }}</a>
				<strong class="count">x{{ entry.count }}</strong>
			</div>
		</div>
		<TTButton class="showBt" icon="show" @click="showLeaderboard()">{{
			t("bingo_grid.state.showLeaderboard_bt")
		}}</TTButton>
		<TTButton class="showBt" icon="hide" @click="hideLeaderboard()">{{
			t("bingo_grid.state.hideLeaderboard_bt")
		}}</TTButton>
		<TTButton class="backBt" icon="back" @click="leaderBoardID = ''" transparent />
	</div>
</template>

<script setup lang="ts">
import { storeBingoGrid as useStoreBingoGrids } from "@/store/bingo_grid/storeBingoGrid";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { gsap } from "gsap/gsap-core";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import Checkbox from "../Checkbox.vue";
import SearchForm from "../params/contents/SearchForm.vue";
import ToggleBlock from "../ToggleBlock.vue";
import TTButton from "../TTButton.vue";
import { useConfirm } from "@/composables/useConfirm";
import { onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import ToggleButton from "../ToggleButton.vue";
import { watch } from "vue";

const { t } = useI18n();
const storeUsers = useStoreUsers();
const { confirm } = useConfirm();
const storeBingoGrid = useStoreBingoGrids();
const emits = defineEmits<{ close: [] }>();
const rootEl = useTemplateRef("rootEl");
const search = ref<string>("");
const loading = ref<boolean>(false);
const leaderBoardID = ref<string>("");
const clickHandler = (e: MouseEvent) => onClick(e);

const gridList = computed(() => storeBingoGrid.gridList.filter((v) => v.enabled));

onMounted(() => {
	document.addEventListener("mousedown", clickHandler);
	open();
});

onBeforeUnmount(() => {
	document.removeEventListener("mousedown", clickHandler);
});

watch(
	() => gridList.value.length,
	() => {
		if (gridList.value.length == 0) {
			close();
		}
	},
);

/**
 * Open grid's leaderboard
 * @param gridId
 */
function openLeaderBoard(grid: TwitchatDataTypes.BingoGridConfig): void {
	leaderBoardID.value = grid.id;
}

/**
 * Opens up a user card
 * @param user
 */
function openUserCard(user: TwitchatDataTypes.TwitchatUser, chanId?: string): void {
	storeUsers.openUserCard(user, chanId, "twitch");
}

/**
 * Sends current leadeboard to the overlay
 */
function showLeaderboard(): void {
	storeBingoGrid.showLeaderboard(leaderBoardID.value);
}

/**
 * Hides current leadeboard from the overlay
 */
function hideLeaderboard(): void {
	storeBingoGrid.hideLeaderboard(leaderBoardID.value);
}

/**
 * Shuffles the grid
 */
async function shuffleGrid(gridId: string): Promise<void> {
	loading.value = true;
	try {
		// await confirm("???", "???");
		await storeBingoGrid.shuffleGrid(gridId);
	} catch (error) {
		//ignore
	}
	loading.value = false;
}

/**
 * Unticks all cells in the grid
 */
async function untickAll(gridId: string): Promise<void> {
	loading.value = true;
	try {
		// await confirm("???", "???");
		await storeBingoGrid.resetCheckStates(gridId);
	} catch (error) {
		//ignore
	}
	loading.value = false;
}

/**
 * Open animation
 */
function open(): void {
	const element = rootEl.value;
	gsap.killTweensOf(element);
	gsap.from(element, {
		duration: 0.2,
		scaleX: 0,
		delay: 0.1,
		clearProps: "scaleX",
		ease: "back.out",
	});
	gsap.from(element, { duration: 0.3, scaleY: 0, clearProps: "scaleY", ease: "back.out" });
}

/**
 * Close animation
 */
function close(): void {
	const element = rootEl.value;
	gsap.killTweensOf(element);
	gsap.to(element, { duration: 0.3, scaleX: 0, ease: "back.in" });
	gsap.to(element, {
		duration: 0.2,
		scaleY: 0,
		delay: 0.1,
		clearProps: "scaleY, scaleX",
		ease: "back.in",
		onComplete: () => {
			emits("close");
		},
	});
}

/**
 * Detect click outside window to close hte window
 */
function onClick(e: MouseEvent): void {
	let target = e.target as HTMLDivElement;
	const ref = rootEl.value;
	while (target != document.body && target != ref && target) {
		target = target.parentElement as HTMLDivElement;
	}
	if (target != ref) {
		//Close if clicking outside of the holder
		close();
	}
}

/**
 * Toggle between grid and list display modes
 */
function toggleRenderMode(gridId: string): void {
	storeBingoGrid.controlerModeCache[gridId] =
		storeBingoGrid.controlerModeCache[gridId] == "list" ? "grid" : "list";
}
</script>

<style scoped lang="less">
.bingogridcontrols {
	gap: 1em;
	display: flex;
	flex-direction: column;
	max-width: 400px;
	left: auto;
	right: 0;
	margin-left: auto;
	transform-origin: bottom right;
	color: var(--color-light);
	align-items: center;

	.entry {
		width: 100%;
		h2 {
			margin: auto;
			margin-bottom: 0.5em;
			text-align: center;
			word-wrap: break-word;
		}
		.grid {
			gap: 5px;
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
		gap: 0.5em;
		margin-top: 0.5em;
		display: flex;
		flex-direction: row;
		justify-content: center;
	}

	.flip-list-move {
		transition: transform 0.25s;
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
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			align-items: center;
			max-height: 50vh;
			overflow: auto;
			padding: 0.5em;
			.entry {
				gap: 0.5em;
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
			padding: 1em;
		}
	}

	.listMode,
	.additionalEntryList {
		display: grid;
		align-items: flex-start;
		grid-template-columns: repeat(auto-fill, minmax(min(130px, 100%), 1fr));

		.entry {
			padding: 0.25em;
			margin: -0.125em;
			z-index: 1;
			border-radius: var(--border-radius);
			align-items: flex-start;
			font-size: 0.9em;
			line-height: 0.9em;

			&:hover {
				background-color: var(--background-color-fader);
			}
		}
	}

	.noResult {
		text-align: center;
		font-style: italic;
		opacity: 0.75;
	}

	.togglebutton {
		margin: auto;
		margin-top: 0.5em;
	}
}
</style>
