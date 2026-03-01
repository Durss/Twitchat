<template>
	<div class="overlayquizleaderboard" ref="rootEl">
		<div class="leaderboard-list">
			<div v-for="user in rankedUsers" :key="user.uid" class="leaderboard-entry"
			:class="{ 'top-1': user.rank === 1, 'top-2': user.rank === 2, 'top-3': user.rank === 3 }">
				<span class="rank">#{{ user.rank }}</span>
				<img v-if="user.avatarPath" :src="user.avatarPath" class="avatar" alt="" />
				<Icon v-else name="avatar" class="avatar" />
				<Icon :name="user.platform" class="platform-icon" />
				<span class="name">{{ user.isAnonymous ? 'Anonymous' : user.name }}</span>
				<span class="score">{{ user.score.toFixed(1) }}</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import gsap from 'gsap/all';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps<{
	users: TwitchatDataTypes.QuizState["users"];
}>();

const rootEl = ref<HTMLElement | null>(null);
let scrollAnimation: number | null = null;

const rankedUsers = computed(() => {
	const users = Object.entries(props.users).map(([uid, u]) => ({
		uid,
		name: u.name,
		avatarPath: u.avatarPath,
		platform: u.platform,
		score: u.score,
		isAnonymous: u.isAnonymous,
		rank: 0,
	}));
	users.sort((a, b) => b.score - a.score);
	let currentRank = 1;
	for (let i = 0; i < users.length; i++) {
		if (i > 0 && users[i]!.score < users[i - 1]!.score) {
			currentRank = i + 1;
		}
		users[i]!.rank = currentRank;
	}
	return users;
});

watch(() => props.users, () => {
	nextTick(() => startScroll());
}, { immediate: true });

let starRequesttId = -1;
async function startScroll() {
	if (scrollAnimation) cancelAnimationFrame(scrollAnimation);
	const el = rootEl.value;
	if (!el) return;
	const listEl = el.querySelector('.leaderboard-list') as HTMLElement;
	if (!listEl) return;
	starRequesttId ++
	let localStartId = starRequesttId;

	const containerHeight = el.clientHeight;
	const listHeight = listEl.scrollHeight;

	let offset = 0;//containerHeight;
	const endOffset = -listHeight;
	listEl.style.transform = `translateY(${offset}px)`;

	const entries = [...rootEl.value!.querySelectorAll('.leaderboard-entry') || []] as HTMLElement[];
	if(entries.length > 0) {
		await new Promise(resolve => {
			gsap.killTweensOf(entries);
			gsap.fromTo(entries.splice(0,3), { opacity: 0, y: 20, scale:2 }, { opacity: 1, y: 0, scale:1, stagger: 1, ease: "back.out", onComplete: resolve });
			if(starRequesttId !== localStartId) return;
			entries.forEach((entry) => {
				entry.style.transition = "none";
				entry.style.transitionDelay = "0s";
			});
			nextTick().then(() => {
				if(starRequesttId !== localStartId) return;
				entries.forEach((entry) => {
					entry.style.opacity = "0";
				});
			});
		})
		if(starRequesttId !== localStartId) return;
		entries.forEach((entry, index) => {
			entry.style.transition = "all .5s";
			entry.style.transitionDelay = `${index * 0.1}s`;
			entry.style.opacity = "1";
		});
	}
	if(starRequesttId !== localStartId) return;

	const pixelsPerSecond = 100;
	let lastTime: number | null = null;
	let paused = true;

	function step(time: number) {
		if (paused) {
			paused = false;
			lastTime = time;
			scrollAnimation = requestAnimationFrame(step);
			return;
		}

		if(listHeight <= containerHeight && offset <= 0) {
			return;
		}
		if (lastTime !== null) {
			const delta = (time - lastTime) / 1000;
			offset -= pixelsPerSecond * delta;
			if (offset <= endOffset) {
				listEl.style.transform = `translateY(${endOffset}px)`;
				startScroll();
				return;
			}
			listEl.style.transform = `translateY(${offset}px)`;
		}
		lastTime = time;
		scrollAnimation = requestAnimationFrame(step);
	}
	if(scrollAnimation) cancelAnimationFrame(scrollAnimation);
	scrollAnimation = requestAnimationFrame(step);
}

onBeforeUnmount(() => {
	if (scrollAnimation) cancelAnimationFrame(scrollAnimation);
});
</script>

<style scoped lang="less">
.overlayquizleaderboard {
	width: 100%;
	max-width: 600px;
	max-height: 50vh;
	overflow: hidden;

	.leaderboard-list {
		display: flex;
		flex-direction: column;
		gap: 0.4em;
		will-change: transform;
	}

	.leaderboard-entry {
		display: flex;
		align-items: center;
		gap: .5rem;
		padding: 0.7rem 1.2rem;
		border-radius: 1rem;
		font-size: .9em;
		background: linear-gradient(135deg, rgba(30, 30, 30, 0.8), rgba(50, 50, 50, 0.7));
		color:#ffffff;
		backdrop-filter: blur(5px);
		opacity: 0;
		
		&.top-1 {
			font-size: 1.6em;
			color: #202020;
			background: linear-gradient(135deg, rgba(255, 215, 0, 0.5), rgba(255, 180, 0, 0.4));
			.rank { color: inherit; }
		}
		&.top-2 {
			font-size: 1.4em;
			color: #202020;
			background: linear-gradient(135deg, rgba(192, 192, 192, 0.5), rgba(160, 160, 160, 0.4));
			.rank { color: inherit; }
		}
		&.top-3 {
			font-size: 1.2em;
			color: #202020;
			background: linear-gradient(135deg, rgba(205, 127, 50, 0.5), rgba(180, 110, 40, 0.4));
			.rank { color: inherit; }
		}

		.rank {
			font-size: 1.5em;
			font-weight: 800;
			color: #ffffff;
			min-width: 2.5rem;
			text-align: left;
			flex-shrink: 0;
		}

		.platform-icon {
			height: 1em;
			flex-shrink: 0;
		}

		.avatar {
			width: 2.4em;
			height: 2.4em;
			border-radius: 50%;
			object-fit: cover;
			flex-shrink: 0;
			border: 1px solid rgba(0, 0, 0, 0.8);
		}

		.icon {
			color:inherit;
		}

		.name {
			flex: 1;
			font-size: 1.15em;
			font-weight: 600;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.score {
			font-size: 1.3em;
			font-weight: 800;
			flex-shrink: 0;
			min-width: 2em;
			text-align: right;
		}
	}
}
</style>
