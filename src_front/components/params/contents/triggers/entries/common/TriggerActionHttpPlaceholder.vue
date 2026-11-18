<template>
	<div class="triggeractionhttpplaceholder">
		<div class="card-item placeholderList">
			<p icon="add">{{ t("triggers.actions.http_ws.extract_data") }}</p>
			<div v-for="(item, index) in props.placeholderList" class="item">
				<div class="jsonpath" v-if="item.type == 'json'">
					<input
						type="text"
						maxlength="500"
						v-model="item.path"
						:placeholder="t('triggers.actions.http_ws.extract_data_jsonpath')"
					/>
					<TTButton
						class="helpBt"
						icon="help"
						secondary
						type="link"
						target="_blank"
						href="https://wikipedia.org/wiki/JSONPath"
					/>
				</div>
				<PlaceholderField
					class="input-field"
					:class="{ error: isDuplicate(item) }"
					v-model="item.placeholder"
					:maxLength="30"
				/>
				<TTButton
					class="deleteBt"
					icon="trash"
					alert
					@click="removeOutputPlacholder(index)"
				/>
			</div>
			<TTButton
				icon="add"
				@click="addOutputPlaceholder"
				v-if="(props.placeholderList || []).length < 50"
				>{{ t("triggers.actions.http_ws.add_placeholder_bt") }}</TTButton
			>
		</div>

		<i18n-t
			scope="global"
			class="card-item info"
			tag="div"
			keypath="triggers.actions.common.custom_placeholder_example"
			v-if="props.placeholderList && props.placeholderList.length > 0"
		>
			<template #PLACEHOLDER>
				<template v-for="(p, index) in props.placeholderList">
					<mark v-click2Select>{{ "{" + p.placeholder.toUpperCase() + "}" }}</mark>
					<template v-if="index < props.placeholderList.length - 1">{{
						t("global.or")
					}}</template>
				</template>
			</template>
		</i18n-t>
	</div>
</template>

<script setup lang="ts">
import PlaceholderField from "@/components/PlaceholderField.vue";
import TTButton from "@/components/TTButton.vue";
import type { IHttpPlaceholder } from "@/types/TriggerActionDataTypes";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	placeholderList: IHttpPlaceholder[];
}>();

const { t } = useI18n();

/**
 * Check if given item has a duplicate placeholder
 * @param item
 */
function isDuplicate(item: IHttpPlaceholder): boolean {
	for (const entry of props.placeholderList) {
		if (entry === item) continue;
		if (entry.placeholder.toUpperCase().trim() === item.placeholder.toUpperCase().trim())
			return true;
	}

	return false;
}

/**
 * Creates an output placeholder
 */
function addOutputPlaceholder(): void {
	props.placeholderList.push({
		type: "json",
		path: "",
		placeholder: "",
	});
}

/**
 * Deletes an output placeholder
 */
function removeOutputPlacholder(index: number): void {
	props.placeholderList.splice(index, 1);
}
</script>

<style scoped lang="less">
.triggeractionhttpplaceholder {
	gap: 0.5em;
	display: flex;
	flex-direction: column;

	.placeholderList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.item {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		border-radius: var(--border-radius);
		&:hover {
			background-color: var(--background-color-fadest);
		}
		& > *:nth-child(2) {
			flex: 1;
		}
		.jsonpath {
			display: flex;
			flex-direction: row;
			flex-basis: 60%;
			& > * {
				border-radius: 0;
				&:first-child {
					border-top-left-radius: var(--border-radius);
					border-bottom-left-radius: var(--border-radius);
				}
				&:last-child {
					border-top-right-radius: var(--border-radius);
					border-bottom-right-radius: var(--border-radius);
				}
			}
			.helpBt {
				flex-shrink: 0;
			}
		}
		.deleteBt {
			flex-shrink: 0;
			flex-basis: 1.5em;
		}
		input {
			flex-grow: 1;
			flex-shrink: 1;
			display: inline-block;
			min-width: 0;
			width: 100%;
			min-width: 8em;
		}
	}
}
</style>
