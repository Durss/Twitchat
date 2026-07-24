<template>
	<div class="voicetriggerlist">
		<div class="card-istem form">
			<VoiceGlobalCommands
				class="action global"
				v-model="globalCommands"
				v-model:complete="globalCommandsOK"
			/>

			<Button
				icon="add"
				class="addBt"
				@click="addAction()"
				v-if="getActionIDs().length > 0 && globalCommandsOK"
				>{{ t("voice.addBt") }}</Button
			>
			<div class="card-item alert error" v-else>{{ t("voice.fill_global") }}</div>
		</div>

		<draggable
			v-if="actions"
			v-model="actions"
			group="actions"
			item-key="id"
			ghost-class="ghost"
			direction="vertical"
			handle=".action>.header>.dragZone"
			class="actionList"
			:animation="250"
		>
			<template #item="{ element, index }">
				<ToggleBlock
					v-if="globalCommandsOK"
					medium
					:open="isOpen(element.id)"
					:title="getLabelFromID(element.id)"
					:ref="(el: any) => setActionRef(element.id, el)"
					class="action"
				>
					<template #left_actions>
						<Icon name="dragZone" class="dragZone" />
						<Icon :name="getIconFromID(element.id)" v-if="element.id" />
					</template>

					<template #right_actions>
						<Button
							alert
							icon="trash"
							class="deleteAction"
							@click.stop="deleteAction(element.id)"
						/>
					</template>

					<div class="content">
						<label :for="'select' + index">{{ t("voice.select_action") }}</label>

						<vue-select
							:id="'select' + index"
							:placeholder="t('voice.select_action_placeholder')"
							v-model="element.id"
							:reduce="reduceSelectData"
							:options="getActionIDs(element)"
							:appendToBody="true"
							:calculate-position="placeDropdown"
						>
							<template v-slot:option="option">
								<Icon
									v-if="option.icon"
									:name="option.icon"
									class="listIcon"
									theme="dark"
								/>
								<span>{{ option.label }}</span>
							</template>
						</vue-select>

						<div class="form">
							<label v-if="element.id" :for="'text' + index"
								><span>{{ t("voice.sentences") }}</span>
								<i>{{ t("voice.sentences_count") }}</i></label
							>
							<textarea
								v-if="element.id"
								:id="'text' + index"
								v-model="element.sentences"
								rows="5"
								maxlength="1000"
							></textarea>
						</div>
					</div>
				</ToggleBlock>
			</template>
		</draggable>
	</div>
</template>

<script setup lang="ts">
import { usePlaceDropdown } from "@/composables/usePlaceDropDown";
import TwitchatEvent, { type TwitchatEventMap } from "@/events/TwitchatEvent";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeVoice as useStoreVoice } from "@/store/voice/storeVoice";
import PublicAPI from "@/utils/PublicAPI";
import VoiceAction from "@/utils/voice/VoiceAction";
import { gsap } from "gsap/gsap-core";
import { onBeforeMount, onBeforeUnmount, ref, watch, type ComponentPublicInstance } from "vue";
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";
import Button from "../TTButton.vue";
import ToggleBlock from "../ToggleBlock.vue";
import VoiceGlobalCommands from "./VoiceGlobalCommands.vue";

const { t } = useI18n();
const { place: placeDropdown } = usePlaceDropdown();
const storeMain = useStoreMain();
const storeVoice = useStoreVoice();

const actions = ref<VoiceAction[]>([]);
const globalCommands = ref<VoiceAction[]>([]);
const openStates: { [id: string]: boolean } = {};
const globalCommandsOK = ref(false);

const actionRefs: Record<string, ComponentPublicInstance> = {};

const triggerHandler = (e: unknown) => onTrigger(e as any);

function setActionRef(id: string | undefined, el: ComponentPublicInstance | null): void {
	if (!id) return;
	if (el) {
		actionRefs[id] = el;
	} else {
		delete actionRefs[id];
	}
}

function reduceSelectData(option: { label: string; value: string }) {
	return option.value;
}

onBeforeMount(() => {
	type VAKeys = keyof typeof VoiceAction;
	actions.value = [];
	actions.value = JSON.parse(JSON.stringify(storeVoice.voiceActions));

	for (let i = 0; i < actions.value.length; i++) {
		const a = actions.value[i]!;
		if (!a.id) continue;
		//ignore global commands
		if (VoiceAction[(a.id + "_IS_GLOBAL") as VAKeys] === true) {
			actions.value.splice(i, 1);
			i--;
			continue;
		}
		openStates[a.id] = false;
	}

	PublicAPI.instance.addEventListener("SET_CHAT_FEED_PAUSE_STATE", triggerHandler);
	PublicAPI.instance.addEventListener("SET_CHAT_FEED_SCROLL", triggerHandler);
	PublicAPI.instance.addEventListener("SET_CHAT_FEED_READ", triggerHandler);
	PublicAPI.instance.addEventListener("SET_GREET_FEED_READ", triggerHandler);
	PublicAPI.instance.addEventListener("SET_CHAT_FEED_READ_ALL", triggerHandler);
	PublicAPI.instance.addEventListener("SET_GREET_FEED_READ_ALL", triggerHandler);
	PublicAPI.instance.addEventListener("SET_VIEWERS_COUNT_TOGGLE", triggerHandler);
	PublicAPI.instance.addEventListener("SET_CENSOR_DELETED_MESSAGES_TOGGLE", triggerHandler);
	PublicAPI.instance.addEventListener("ON_OPEN_POLL_CREATION_FORM", triggerHandler);
	PublicAPI.instance.addEventListener("SET_OPEN_PREDICTION_CREATION_FORM", triggerHandler);
});

onBeforeUnmount(() => {
	PublicAPI.instance.removeEventListener("SET_CHAT_FEED_PAUSE_STATE", triggerHandler);
	PublicAPI.instance.removeEventListener("SET_CHAT_FEED_SCROLL", triggerHandler);
	PublicAPI.instance.removeEventListener("SET_CHAT_FEED_READ", triggerHandler);
	PublicAPI.instance.removeEventListener("SET_GREET_FEED_READ", triggerHandler);
	PublicAPI.instance.removeEventListener("SET_CHAT_FEED_READ_ALL", triggerHandler);
	PublicAPI.instance.removeEventListener("SET_GREET_FEED_READ_ALL", triggerHandler);
	PublicAPI.instance.removeEventListener("SET_VIEWERS_COUNT_TOGGLE", triggerHandler);
	PublicAPI.instance.removeEventListener("SET_CENSOR_DELETED_MESSAGES_TOGGLE", triggerHandler);
	PublicAPI.instance.removeEventListener("ON_OPEN_POLL_CREATION_FORM", triggerHandler);
	PublicAPI.instance.removeEventListener("SET_OPEN_PREDICTION_CREATION_FORM", triggerHandler);
});

function addAction(): void {
	actions.value.push(new VoiceAction());
}

function deleteAction(id: string | undefined): void {
	storeMain
		.confirm(t("voice.delete_confirm_title"), t("voice.delete_confirm_desc"))
		.then(() => {
			const index = actions.value.findIndex((v) => v.id == id);
			actions.value.splice(index, 1);
		})
		.catch((error) => {
			//ignore
		});
}

function isOpen(id: string | undefined): boolean {
	if (!id) return true;
	return openStates[id]!;
}

function getActionIDs(action?: VoiceAction): { label: string; value: string }[] {
	type VAKeys = keyof typeof VoiceAction;
	let availableActions = Object.keys(VoiceAction);
	availableActions = availableActions.filter((v) => v.indexOf("_ICON") == -1);
	availableActions = availableActions.filter((v) => v.indexOf("_IS_GLOBAL") == -1);
	availableActions = availableActions.filter((v) => v.indexOf("_IS_PRIVATE") == -1);

	//Remove actions that are already in use
	for (let i = 0; i < actions.value.length; i++) {
		const a = actions.value[i]!;
		//If it's a new action that has no selection done yet
		if (!a.id || a == action) continue;

		const index = availableActions.indexOf(a.id);
		if (index > -1) availableActions.splice(index, 1);
	}

	//Remove global commands (erase, prev, next, submit)
	for (let i = 0; i < availableActions.length; i++) {
		const isGlobal = VoiceAction[(availableActions[i] + "_IS_GLOBAL") as VAKeys] === true;
		const isPrivate = VoiceAction[(availableActions[i] + "_IS_PRIVATE") as VAKeys] === true;
		if (isGlobal || isPrivate) {
			availableActions.splice(i, 1);
			i--;
		}
	}

	return availableActions.map((v) => {
		const icon = VoiceAction[(v + "_ICON") as VAKeys] as string;
		return {
			label: t("voice.commands." + v),
			value: v,
			icon,
		};
	});
}

function getLabelFromID(id: string | undefined): string {
	if (id === null) return "ACTION ID NOT FOUND : " + id;
	let label = t("voice.select_action_placeholder");
	if (id) {
		label = t("voice.commands." + id);
	}
	return label;
}

function getIconFromID(id: string | undefined): string {
	if (id === null) return "ACTION ID NOT FOUND : " + id;
	type VAKeys = keyof typeof VoiceAction;
	return VoiceAction[(id + "_ICON") as VAKeys] as string;
}

/**
 * When a voice action is triggerd, highlight it
 *
 * @param e
 */
function onTrigger(
	e: TwitchatEvent<keyof TwitchatEventMap, TwitchatEventMap[keyof TwitchatEventMap]>,
): void {
	const el = actionRefs[e.type];
	if (el && el.$el != null) {
		const div = (el.$el as HTMLDivElement).getElementsByClassName("header")[0]!;
		gsap.fromTo(
			div,
			{ paddingTop: "1em", paddingBottom: "1em", filter: "brightness(3)" },
			{
				paddingTop: ".25em",
				paddingBottom: ".25em",
				filter: "brightness(1)",
				duration: 1,
			},
		);
	}
}

function saveActions(): void {
	let list: VoiceAction[] = [];
	list = list.concat(actions.value);
	list = list.concat(globalCommands.value);
	storeVoice.setVoiceActions(list);
}

watch(
	() => actions.value,
	() => {
		saveActions();
	},
	{ deep: true },
);

watch(
	() => globalCommands.value,
	() => {
		saveActions();
	},
	{ deep: true },
);
</script>

<style scoped lang="less">
.voicetriggerlist {
	//.listIcon style is on index.less.
	//Couldn't make it work from the template even in a unscoped tag

	gap: 0.5em;
	display: flex;
	flex-direction: column;

	.form {
		.addBt {
			margin: auto;
			display: flex;
		}

		.global {
			width: 100%;
			margin-bottom: 0.5em;
		}

		.error {
			text-align: center;
		}
	}

	.actionList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		.action {
			align-self: stretch;
			.deleteAction {
				border-radius: 0;
				margin: -0.5em 0;
				align-self: stretch;
			}
			.content {
				gap: 0.5em;
				display: flex;
				flex-direction: column;
				.form {
					gap: 0.5em;
					display: flex;
					flex-direction: column;
				}
			}
		}
	}
}
</style>
