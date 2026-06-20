<template>
	<div class="greetThem" v-show="messages.length > 0" :style="styles" ref="rootEl">
		<div class="header" @click="toggleList()">
			<div class="title">
				<ButtonNotification
					class="scrollBt clearButton"
					:aria-label="
						t(
							scrollDownAuto
								? 'greet.auto_scroll_off_aria'
								: 'greet.auto_scroll_on_aria',
						)
					"
					:icon="'scroll' + (scrollDownAuto ? 'Down' : 'Up')"
					v-tooltip="
						t(scrollDownAuto ? 'greet.auto_scroll_down' : 'greet.auto_scroll_up')
					"
					@click.stop="toggleScroll()"
				/>

				<h1>
					{{ t("greet.title") }} <span class="count">({{ messages.length }})</span>
				</h1>

				<ButtonNotification
					class="clearBt clearButton"
					icon="checkmark"
					v-tooltip="t('greet.clearBt')"
					@click.stop="clearAll()"
				/>

				<ButtonNotification
					class="clearBt clearButton"
					icon="date"
					v-tooltip="t('greet.resetBt')"
					@click.stop="resetHistory()"
				/>
			</div>

			<div class="topForm" v-if="showList" @click.stop>
				<form class="row">
					<label for="greetThem_duration"
						><Icon name="timeout" theme="light" alt="timer" />{{
							t("greet.auto_delete")
						}}</label
					>
					<select
						id="greetThem_duration"
						v-model.number="storeParams.greetThemAutoDelete"
					>
						<option v-for="v in autoDeleteOptions" :value="v.seconds">
							{{ v.label }}
						</option>
					</select>
				</form>
			</div>
		</div>

		<div class="messageList" v-if="showList" ref="messageList">
			<template v-for="(m, index) in messagesFiltered" :key="m.id">
				<MessageItem
					class="messageListItem"
					ref="message"
					:messageData="m"
					:data-index="index"
					:lightMode="true"
					:disableConversation="true"
					@mouseover="onMouseOver($event, index)"
					@mouseout="onMouseOut()"
					@click="deleteMessage(m, index)"
					@contextmenu.prevent="deleteMessage(m, index, true)"
				/>
			</template>
			<div class="more" v-if="messages.length > messagesFiltered.length">
				+{{ messages.length - messagesFiltered.length }}
			</div>
		</div>
		<div class="grip" v-if="showList" @mousedown="startDrag()" @touchstart="startDrag()"></div>
	</div>
</template>

<script setup lang="ts">
import EventBus from "@/events/EventBus";
import GlobalEvent from "@/events/GlobalEvent";
import type { TwitchatEventMap } from "@/events/TwitchatEvent";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import DataStore from "@/store/DataStore";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { useConfirm } from "@/composables/useConfirm";
import PublicAPI from "@/utils/PublicAPI";
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	ref,
	useTemplateRef,
	watch,
	type ComponentPublicInstance,
} from "vue";
import { useI18n } from "vue-i18n";
import ButtonNotification from "../ButtonNotification.vue";
import Icon from "../Icon.vue";
import MessageItem from "../messages/MessageItem.vue";

const { t } = useI18n();
const { confirm } = useConfirm();

const storeChat = useStoreChat();
const storeParams = useStoreParams();

const rootEl = useTemplateRef("rootEl");
const messageList = useTemplateRef("messageList");
const message = useTemplateRef<ComponentPublicInstance[]>("message");

const overIndex = ref(-1);
const showList = ref(true);
const scrollDownAuto = ref(false);
const indexOffset = ref(0);
const windowHeight = ref(0.3);
const messages = ref<(TwitchatDataTypes.GreetableMessages | TwitchatDataTypes.MessageCustomData)[]>(
	[],
);

const maxItems = 50;
let deleteInterval = -1;
let disposed = false;
let resizing = false;
let mouseY = 0;

let mouseUpHandler!: (e: MouseEvent | TouchEvent) => void;
let mouseMoveHandler!: (e: MouseEvent | TouchEvent) => void;
let publicApiEventHandler!: (e: unknown) => void;
let deleteMessageHandler!: (e: GlobalEvent) => void;
let addMessageHandler!: (e: GlobalEvent) => void;

const messagesFiltered = computed<
	(TwitchatDataTypes.GreetableMessages | TwitchatDataTypes.MessageCustomData)[]
>(() => {
	return messages.value.concat().splice(0, maxItems);
});

const styles = computed((): { [key: string]: string } => {
	if (!showList.value) return { "min-height": "unset" };
	return {
		height: windowHeight.value * 100 + "%",
		"min-height": "max(calc(75px + 1.5em), " + windowHeight.value * 100 + "%)",
	};
});

const autoDeleteOptions = computed<{ seconds: number; label: string }[]>(() => {
	const durations = [60, 120, 180, 240, 300, 600, 900, 1200, 1800, 3600];
	const res: { seconds: number; label: string }[] = [];
	for (const duration of durations) {
		res.unshift({ seconds: duration, label: Math.round(duration / 60).toString() + "m" });
	}
	const v = storeParams.greetThemAutoDelete;
	if (!durations.includes(v)) {
		res.unshift({ seconds: v, label: Math.round(v / 60).toString() + "m" });
	}
	res.unshift({ seconds: -1, label: t("greet.never") });
	res.sort((a, b) => a.seconds - b.seconds);
	return res;
});

onBeforeMount(() => {
	const storeValue = DataStore.get(DataStore.GREET_AUTO_SCROLL_DOWN);
	if (storeValue == "true") scrollDownAuto.value = true;
	let height = DataStore.get(DataStore.GREET_AUTO_HEIGHT);
	if (height) windowHeight.value = parseFloat(height);

	const autoDeleteStore = DataStore.get(DataStore.GREET_AUTO_DELETE_AFTER);
	if (autoDeleteStore != null) {
		storeParams.greetThemAutoDelete = parseInt(autoDeleteStore);
	}

	//Save new "auto delete after" value when changed
	watch(
		() => storeParams.greetThemAutoDelete,
		() => {
			DataStore.set(DataStore.GREET_AUTO_DELETE_AFTER, storeParams.greetThemAutoDelete);
		},
	);

	//Automatically deletes messages after the configured delay
	deleteInterval = window.setInterval(() => {
		const delay = storeParams.greetThemAutoDelete;
		if (delay == -1) return;

		const clearTimeoffset = Date.now() - delay * 1000;
		for (let i = 0; i < messages.value.length; i++) {
			const m = messages.value[i];
			if (m && m.date < clearTimeoffset) {
				messages.value.splice(i, 1);
				i--;
			}
		}
	}, 5000);

	//Debug to add all the current messages to the list
	//Uncomment it if you want messages to be added to the list after
	//a hot reload during development
	/*
	if(!Config.instance.IS_PROD) {
		const history = storeChat.messages.filter(m => m.type == "message") as TwitchatDataTypes.GreetableMessage[];
		messages.value = messages.value.concat(history);
	}
	//*/

	publicApiEventHandler = (e) => onPublicApiEvent(e as any);
	mouseUpHandler = () => (resizing = false);
	mouseMoveHandler = (e: MouseEvent | TouchEvent) => onMouseMove(e);
	deleteMessageHandler = (e: GlobalEvent) => onDeleteMessage(e);
	addMessageHandler = (e: GlobalEvent) => onAddMessage(e);

	document.addEventListener("mouseup", mouseUpHandler);
	document.addEventListener("touchend", mouseUpHandler);
	document.addEventListener("mousemove", mouseMoveHandler);
	document.addEventListener("touchmove", mouseMoveHandler);
	PublicAPI.instance.addEventListener("SET_GREET_FEED_READ", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_GREET_FEED_READ_ALL", publicApiEventHandler);
	EventBus.instance.addEventListener(GlobalEvent.ADD_MESSAGE, addMessageHandler);
	EventBus.instance.addEventListener(GlobalEvent.DELETE_MESSAGE, deleteMessageHandler);
});

onBeforeUnmount(() => {
	disposed = true;
	clearInterval(deleteInterval);
	document.removeEventListener("mouseup", mouseUpHandler);
	document.removeEventListener("touchend", mouseUpHandler);
	document.removeEventListener("mousemove", mouseMoveHandler);
	document.removeEventListener("touchmove", mouseMoveHandler);
	PublicAPI.instance.removeEventListener("SET_GREET_FEED_READ", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_GREET_FEED_READ_ALL", publicApiEventHandler);
	EventBus.instance.removeEventListener(GlobalEvent.ADD_MESSAGE, addMessageHandler);
	EventBus.instance.removeEventListener(GlobalEvent.DELETE_MESSAGE, deleteMessageHandler);
});

/**
 * Called when starting window resize
 */
function startDrag(): void {
	resizing = true;
	renderFrame();
}

/**
 * Called when a new message is received
 */
async function onAddMessage(event: GlobalEvent): Promise<void> {
	const m = event.data as
		| TwitchatDataTypes.GreetableMessages
		| TwitchatDataTypes.MessageCustomData;
	if (!m.todayFirst) return;

	messages.value.push(m);
	await nextTick();
	scrollTo();
}

/**
 * Called when a message is deleted
 */
function onDeleteMessage(e: GlobalEvent): void {
	const data = e.data as {
		message: TwitchatDataTypes.GreetableMessages | TwitchatDataTypes.MessageCustomData;
		force: boolean;
	};

	//remove from displayed messages
	for (let i = messages.value.length - 1; i >= 0; i--) {
		const m = messages.value[i]!;
		if (m.id == data.message.id) {
			messages.value.splice(i, 1);
			break;
		}
	}
}

/**
 * Called when requesting an action from the public API
 */
function onPublicApiEvent(
	e:
		| { type: "GREET_FEED_READ"; data: TwitchatEventMap["SET_GREET_FEED_READ"] }
		| { type: "GREET_FEED_READ_ALL"; data: TwitchatEventMap["SET_GREET_FEED_READ_ALL"] },
): void {
	let readCount = 0;
	switch (e.type) {
		case "GREET_FEED_READ": {
			if (e.data && !isNaN(e.data.messageCount)) {
				readCount = e.data.messageCount;
			} else {
				readCount = 1;
			}
			break;
		}
		case "GREET_FEED_READ_ALL": {
			readCount = messages.value.length;
			break;
		}
	}

	for (let i = 0; i < readCount; i++) {
		if (messages.value.length === 0) break;
		messages.value.splice(0, 1);
	}
}

/**
 * Called when clicking a message
 * Either removes a streak of messages or one single message
 */
function deleteMessage(
	m: TwitchatDataTypes.GreetableMessages | TwitchatDataTypes.MessageCustomData,
	index: number,
	singleMode = false,
): void {
	if (singleMode) {
		let el = message.value![index]!;
		indexOffset.value = parseInt((el.$el as HTMLElement).dataset.index as string);
		messages.value.splice(index, 1);
	} else {
		indexOffset.value = 0;
		overIndex.value = -1;
		let list = messages.value;
		let idx = list.findIndex((v) => v.id == m.id);
		for (let i = 0; i < idx + 1; i++) {
			list.splice(0, 1);
		}
	}
}

/**
 * Removes all messages
 */
function clearAll(): void {
	messages.value = [];
}

/**
 * Reset greeting history
 */
function resetHistory(): void {
	confirm(t("greet.reset_confirm_title"), t("greet.reset_confirm_description"), null)
		.then(() => {
			storeChat.resetGreetingHistory();
		})
		.catch(() => {});
}

/**
 * Called when rolling over an item
 */
function onMouseOver(e: MouseEvent, index: number): void {
	if (resizing) return;

	overIndex.value = index;
	let items = messageList.value!.querySelectorAll<HTMLElement>(".messageListItem");
	for (let i = 0; i <= index; i++) {
		const item = items[i];
		if (!item) continue;
		//Why the hell do I use inline styles this way instead of
		//doing it the Vue way by simply updating a prop set
		//to the component so it automatically updates when updating
		//that prop ?
		//Because it's drastically faster this way. There's a huge
		//rendering pipeline performance issue i couldn't solve
		//by any other method.
		item.style.opacity = ".3";
	}
}

/**
 * Called when the mouse moves
 */
async function onMouseMove(e: MouseEvent | TouchEvent): Promise<void> {
	if (e.type == "mousemove") {
		mouseY = (e as MouseEvent).clientY;
	} else {
		mouseY = (e as TouchEvent).touches[0]!.clientY;
	}
}

/**
 * Called when rolling out of an item
 */
function onMouseOut(): void {
	overIndex.value = -1;
	const items = message.value ?? [];
	for (const item of items) {
		(item.$el as HTMLDivElement).removeAttribute("style");
	}
}

async function toggleList(): Promise<void> {
	showList.value = !showList.value;
	if (showList.value) {
		await nextTick();
		scrollTo();
	}
}

function toggleScroll(): void {
	scrollDownAuto.value = !scrollDownAuto.value;
	DataStore.set(DataStore.GREET_AUTO_SCROLL_DOWN, scrollDownAuto.value);
	if (scrollDownAuto.value) {
		scrollTo();
	}
}

function scrollTo(): void {
	let el = messageList.value;
	if (el && scrollDownAuto.value) {
		el.scrollTop = el.scrollHeight;
	}
}

function renderFrame(): void {
	if (disposed || !resizing) return;
	requestAnimationFrame(() => renderFrame());

	const bounds = (rootEl.value!.parentElement as HTMLDivElement).getBoundingClientRect();
	const maxHeight = 0.8;
	windowHeight.value = Math.min(maxHeight, (mouseY - bounds.top) / bounds.height);

	DataStore.set(DataStore.GREET_AUTO_HEIGHT, windowHeight.value);
}
</script>

<style scoped lang="less">
.greetThem {
	background-color: var(--background-color-secondary);
	display: flex;
	flex-direction: column;
	min-height: calc(75px + 1.5em);
	max-height: 60vh;
	z-index: 1;
	position: relative;

	.header {
		background-color: var(--color-primary);
		padding: 0.5em 0;
		cursor: pointer;
		.title {
			display: flex;
			flex-direction: row;
			justify-content: center;
			color: var(--color-light);
			h1 {
				text-align: center;
				margin: 0 10px;

				.count {
					// font-style: italic;
					font-size: 0.65em;
					font-weight: normal;
				}
			}
			.clearBt,
			.scrollBt {
				height: 1.5em;
				width: 1.5em;
				padding: 3px;
				border-radius: var(--border-radius);
			}
		}

		.topForm {
			display: flex;
			flex-direction: column;
			align-items: center;
			.row {
				display: flex;
				flex-direction: row;
				align-items: center;
				font-size: 0.8em;

				label {
					margin: 0;
					margin-right: 5px;
					color: var(--color-light);
					.icon {
						height: 0.8em;
						margin-right: 3px;
					}
				}
				select {
					font-size: 0.8em;
					padding: 0px 2px;
					color: var(--color-light);
					background-color: rgba(0, 0, 0, 0.5);
					option {
						color: var(--color-light);
						background-color: var(--color-dark);
					}
				}
			}
		}
	}

	.messageList {
		overflow-y: auto;
		flex-grow: 1;
		border: 2px solid var(--color-primary);
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.5);
		.messageListItem {
			cursor: pointer;
			overflow: hidden;
			font-family: var(--font-inter);
			transition: background-color 0.25s;
			margin: 0;

			&:nth-child(odd) {
				background-color: fade(#ffffff, 5%);
			}

			& > :deep(*) {
				//avoid being able to click on nicknames, links, ...
				pointer-events: none;
			}
		}

		.more {
			text-align: center;
			font-style: italic;
			font-size: 0.8em;
			padding: 0.25em;
			color: var(--color-text);
		}
	}

	.grip {
		height: 10px;
		width: 100%;
		position: absolute;
		bottom: -6px;
		// background-color: fade(red, 50%);
		cursor: ns-resize;
		user-select: none;
	}
}
</style>

