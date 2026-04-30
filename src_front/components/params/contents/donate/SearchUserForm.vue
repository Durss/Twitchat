<template>
	<div
		class="searchuserform"
		:class="{ inline: props.inline !== false, upwards: props.upwards !== false }"
	>
		<form @submit.prevent>
			<input
				class="giftedInput"
				type="text"
				maxlength="25"
				:placeholder="t('global.search_placeholder')"
				v-model="search"
				@input="onSearch()"
				@keydown.stop="onKeyDown($event)"
				v-autofocus
			/>
			<Icon v-if="searching" name="loader" class="loader" />
			<TTButton
				v-else-if="search"
				icon="cross"
				class="cancel"
				transparent
				noBounce
				@click="clearSearch()"
			></TTButton>
		</form>

		<div class="userList" v-if="users.length > 0">
			<TransitionGroup name="list" :css="false" @enter="onEnter">
				<button
					type="button"
					v-for="(user, index) in users"
					v-if="showResult"
					:class="{
						user: true,
						selected: selectedindex === index,
						live: liveStates[user.id],
					}"
					:key="user.id"
					:data-index="index"
					@click="selectUser(user)"
				>
					<img :src="user.profile_image_url.replace(/300x300/gi, '50x50')" alt="avatar" />
					<Icon name="mod" class="icon" v-if="moderatedChanIds.includes(user.id)" />
					<div class="login">{{ user.display_name }}</div>
				</button>
			</TransitionGroup>
		</div>

		<div class="userList">
			<TransitionGroup name="list" :css="false" @enter="onEnter" @leave="onLeave">
				<button
					class="user live"
					type="button"
					v-for="(user, index) in staticUserListFiltered"
					v-if="staticUserListFiltered.length > 0 && search.length == 0 && showStatic"
					:key="user.id"
					:data-index="index"
					@click="selectUser(user)"
				>
					<img :src="user.profile_image_url.replace(/300x300/gi, '50x50')" alt="avatar" />
					<Icon name="mod" class="icon" v-if="moderatedChanIds.includes(user.id)" />
					<div class="login">{{ user.display_name }}</div>
				</button>
			</TransitionGroup>
		</div>
		<div class="noResult" v-if="noResult">{{ t("global.no_result") }}</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { gsap } from "gsap/gsap-core";
import { computed, nextTick, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		modelValue?: TwitchDataTypes.UserInfo;
		inline?: boolean;
		upwards?: boolean;
		excludedUserIds?: string[];
		staticUserList?: TwitchDataTypes.UserInfo[];
	}>(),
	{
		inline: false,
		upwards: false,
		excludedUserIds: () => [],
		staticUserList: () => [],
	},
);

const emit = defineEmits<{
	close: [];
	"update:modelValue": [user: TwitchDataTypes.UserInfo];
	select: [user: TwitchDataTypes.UserInfo];
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();

const search = ref<string>("");
const selectedindex = ref(0);
const users = ref<TwitchDataTypes.UserInfo[]>([]);
const noResult = ref<boolean>(false);
const searching = ref<boolean>(false);
const showResult = ref<boolean>(false);
const showStatic = ref<boolean>(false);
const liveStates = ref<{ [uid: string]: boolean }>({});
const moderatedChanIds = ref<string[]>([]);

let abortQuery: AbortController | null = null;

const staticUserListFiltered = computed<TwitchDataTypes.UserInfo[]>(() => {
	return (props.staticUserList || [])
		.filter((user) => (props.excludedUserIds || []).indexOf(user.id) === -1)
		.sort((a, b) => {
			if (moderatedChanIds.value.includes(a.id) && !moderatedChanIds.value.includes(b.id))
				return -1;
			if (!moderatedChanIds.value.includes(a.id) && moderatedChanIds.value.includes(b.id))
				return 1;
			return a.login.toLowerCase().localeCompare(b.login.toLowerCase());
		});
});

onMounted(() => {
	showStatic.value = true;
	moderatedChanIds.value = storeAuth.twitchModeratedChannels.map((u) => u.broadcaster_id);
});

function onKeyDown(event: KeyboardEvent): void {
	if (event.key == "Escape") {
		clearSearch();
	}
	if (event.key == "ArrowDown") {
		selectedindex.value += props.upwards !== false ? -1 : 1;
	}
	if (event.key == "ArrowUp") {
		selectedindex.value += props.upwards !== false ? 1 : -1;
	}
	if (selectedindex.value < 0) selectedindex.value = users.value.length - 1;
	if (selectedindex.value >= users.value.length) selectedindex.value = 0;
	if (event.key == "Enter") {
		selectUser(users.value[selectedindex.value]!);
	}
}

async function onSearch(): Promise<void> {
	searching.value = search.value != "";
	noResult.value = false;
	if (abortQuery && !abortQuery.signal.aborted) abortQuery.abort("search update");
	abortQuery = new AbortController();
	if (searching.value) {
		const signal = abortQuery!.signal;
		const result = (await TwitchUtils.searchUser(search.value, 5, signal)) || [];
		liveStates.value = result.liveStates;
		users.value = result.users
			.filter((user) => (props.excludedUserIds || []).indexOf(user.id) === -1)
			.sort((a, b) => {
				const aMod = moderatedChanIds.value.includes(a.id);
				const bMod = moderatedChanIds.value.includes(b.id);
				if (aMod && !bMod) return -1;
				if (!aMod && bMod) return 1;
				if (aMod && bMod)
					return a.login
						.toLowerCase()
						.toLowerCase()
						.localeCompare(b.login.toLowerCase().toLowerCase());
				return 0;
			});
		if (!signal.aborted) {
			searching.value = false;
			noResult.value = users.value.length === 0;
			await nextTick();
			showResult.value = true;
		}
		selectedindex.value = 0;
	} else {
		users.value = [];
		showResult.value = false;
	}
}

function clearSearch(): void {
	search.value = "";
	onSearch();
	emit("close");
}

function selectUser(user: TwitchDataTypes.UserInfo): void {
	emit("update:modelValue", user);
	emit("select", user);
	clearSearch();
}

function onEnter(el: Element, done: () => void) {
	gsap.fromTo(
		el,
		{ opacity: 0, y: -20 },
		{
			y: 0,
			opacity: 1,
			duration: 0.25,
			// maxHeight: "2em",
			delay: parseInt((el as HTMLElement).dataset.index!) * 0.015,
			onComplete: done,
		},
	);
}

function onLeave(el: Element, done: () => void) {
	gsap.to(el, {
		y: -20,
		opacity: 0,
		duration: 0.25,
		delay: parseInt((el as HTMLElement).dataset.index!) * 0.015,
		onComplete: done,
	});
}
</script>

<style scoped lang="less">
.searchuserform {
	position: relative;

	&.inline {
		background: unset;
		backdrop-filter: unset;
		box-shadow: unset;
		input {
			background-color: var(--background-color-fader);
		}

		.userList {
			position: relative;
			background: unset;
			.user:hover {
				background-color: var(--background-color-fader);
			}
		}
	}
	form {
		.loader {
			height: 1em;
			width: 1em;
			position: relative;
			top: 0.25em;
			margin-left: -1.25em;
		}
		.cancel {
			position: relative;
			top: 0.25em;
			margin-left: -1.7em;
		}
		input {
			background-color: var(--grayout-fadest);
			width: 100%;
			min-width: unset;
			max-width: unset;
		}
	}

	.noResult {
		text-align: center;
		margin-top: 0.5em;
	}

	.userList {
		gap: 1px;
		display: flex;
		flex-direction: column;
		position: absolute;
		padding: 0.5em;
		border-radius: var(--border-radius);
		background: var(--background-color-secondary);
		width: 100%;
		&:empty {
			display: none;
		}
		.user.live > img {
			border: 1px solid #f00;
		}
		.user.live::after {
			content: "";
			width: 7px;
			height: 7px;
			border-radius: 50%;
			background-color: #f00;
			box-shadow: -2px 2px 3px #000;
			position: absolute;
			top: 0.1em;
			left: 1.6em;
		}
	}

	&.upwards {
		.userList {
			bottom: 100%;
			flex-direction: column-reverse;
		}
	}

	.user {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		color: var(--color-text);
		border-radius: 50px;
		position: relative;
		border: 1px solid transparent;
		.login {
			text-overflow: ellipsis;
			overflow: hidden;
			flex-grow: 1;
		}
		img {
			height: 2em;
			border-radius: 50%;
		}
		.icon {
			height: 1em;
			border-radius: 50%;
		}
		&:hover {
			background-color: var(--grayout);
		}
		&.selected {
			// border-color: var(--color-text);
			background-color: var(--grayout);
		}
	}
}
</style>

