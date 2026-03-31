<template>
	<div class="triggeractioncommandargumentparams">
		<div class="form">
			<div class="inputHolder">
				<Icon name="placeholder" class="icon" />
				<label
					for="chatcmdparam"
					v-tooltip="$t('triggers.slash_cmd.param_cmd_params_tt')"
					>{{ $t("triggers.slash_cmd.param_cmd_params") }}</label
				>
				<div class="input-field">
					<PlaceholderField
						class="inputField"
						v-model="newTag"
						:placeholder="$t('triggers.slash_cmd.param_cmd_params_placeholder')"
						@keyup.enter="createItem()"
						@blur="createItem()"
					/>
				</div>
			</div>
			<div
				class="tags"
				v-if="triggerData.chatCommandParams && triggerData.chatCommandParams.length > 0"
			>
				<div
					class="tag"
					v-for="(item, index) in triggerData.chatCommandParams"
					:key="item.tag"
				>
					<button
						class="deleteBt"
						@click="triggerData.chatCommandParams!.splice(index, 1)"
					>
						<Icon name="cross" alt="delete" class="deleteIcon" theme="light" />
					</button>
					<span v-click2Select @click="copy($event, item)" class="label"
						>{{ "{" }}{{ item.tag }}{{ "}" }}</span
					>
					<!-- <select class="typeSelector" v-model="item.type" v-tooltip="$t('triggers.slash_cmd.param_cmd_params_type_tt')">
						<option value="TEXT">Text</option>
						<option value="USER">User</option>
					</select> -->
				</div>
			</div>
		</div>
		<ToggleBlock
			:title="$t('triggers.slash_cmd.param_cmd_params_example')"
			small
			:open="false"
			class="usage"
			v-if="triggerData.chatCommandParams && triggerData.chatCommandParams.length > 0"
		>
			<div class="content">
				<div class="example">
					<input type="text" class="dark" v-model="usage" />
				</div>
				<div class="result">
					<div class="values">
						<template v-for="(p, index) in triggerData.chatCommandParams">
							<mark @click="copy($event, p)" v-click2Select
								>{{ "{" }}{{ p.tag.toUpperCase() }}{{ "}" }}</mark
							>
							<Icon name="right" class="arrow" />
							<span>"{{ usage.replace(/\s+/gi, " ").split(" ")[index + 1] }}"</span>
						</template>
					</div>
				</div>
			</div>
		</ToggleBlock>
	</div>
</template>

<script setup lang="ts">
import PlaceholderField from "@/components/PlaceholderField.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import type { TriggerChatCommandParam, TriggerData } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { gsap } from "gsap";
import { onMounted, ref } from "vue";

const props = defineProps<{
	triggerData: TriggerData;
}>();

const usage = ref("");
const newTag = ref("");
const param_cmdParams = ref<TwitchatDataTypes.ParameterData<string[]>>({
	type: "editablelist",
	value: [],
	icon: "placeholder",
	labelKey: "triggers.slash_cmd.param_cmd_params",
	placeholderKey: "triggers.slash_cmd.param_cmd_params_placeholder",
	tooltipKey: "triggers.slash_cmd.param_cmd_params_tt",
	max: 30,
	maxLength: 50,
});

onMounted(() => {
	updateUsage();
});

function createItem(): void {
	if (newTag.value.length == 0) return;
	if (!props.triggerData.chatCommandParams) props.triggerData.chatCommandParams = [];
	props.triggerData.chatCommandParams.push({
		tag: newTag.value,
		type: "TEXT",
	});
	newTag.value = "";
	updateUsage();
}

function updateUsage(): void {
	let cmd = props.triggerData.chatCommand ?? "";
	//If usage field content is long enough, no need to do anything
	const availableItems = usage.value
		.replace(cmd, "")
		.replace(/\s+/gi, " ")
		.trim()
		.split(" ")
		.filter((v) => v.length > 0);
	if (
		props.triggerData.chatCommandParams &&
		availableItems.length > props.triggerData.chatCommandParams.length - 1
	)
		return;

	//Generate a fake message
	const words =
		"Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.".trim();
	usage.value =
		cmd +
		" " +
		words.split(" ").splice(0, Math.max(5, param_cmdParams.value.value.length)).join(" ");
}

function copy(event: MouseEvent, item: TriggerChatCommandParam): void {
	Utils.copyToClipboard("{" + item.tag + "}");
	gsap.fromTo(
		event.currentTarget,
		{ scale: 1.2 },
		{ duration: 0.5, scale: 1, ease: "back.out(1.7)" },
	);
}
</script>

<style scoped lang="less">
.triggeractioncommandargumentparams {
	.form {
		flex-grow: 1;
		width: 100%;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		.inputHolder {
			display: flex;
			flex-direction: row;
			align-items: center;

			flex-grow: 1;
			label {
				flex-grow: 1;
			}
		}
		.icon {
			height: 1em;
			width: 1em;
			object-fit: fill;
			margin-right: 0.5em;
			vertical-align: bottom;
		}
		& > *:not(:first-child) {
			margin-left: 1.5em;
		}
		.tags {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			gap: 0.5em;
			color: var(--color-text-light);
			.tag {
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: 0.25em;
				padding: 0.25em;
				border-radius: 0.5em;
				background-color: var(--color-primary);
				.label {
					text-transform: uppercase;
					text-align: right;
					font-weight: bold;
					cursor: pointer !important;
				}
				.typeSelector {
					padding: 0 0.5em !important;
				}
				.deleteBt {
					display: flex;
					//Using negative margin compasated by inverse margin on .deleteIcon
					//so the close button starts at the very sides of the item
					margin: -0.25em;
					align-self: stretch;
					transition: transform 0.2s;
					.deleteIcon {
						height: 1em;
						margin: 0.25em;
						vertical-align: middle;
					}
					&:hover {
						transform: scale(1.1);
					}
				}
			}
		}
	}
	.usage {
		margin-top: 0.5em;
		margin-left: 1.5em;
		.content {
			background-color: var(--color-primary-fadest);
			padding: 0.5em;
			border-radius: 0.5em;
			display: flex;
			flex-direction: column;
			gap: 0.5em;
			.example,
			.result {
				display: flex;
				flex-direction: column;
				align-items: stretch;
			}
			.arrow {
				height: 0.75em;
				margin: 0 0.5em;
			}
			.values {
				display: grid;
				grid-template-columns: auto auto 1fr;
				align-items: center;
				gap: 0.25em;
			}
			mark {
				cursor: pointer !important;
			}
		}
	}
}
</style>
