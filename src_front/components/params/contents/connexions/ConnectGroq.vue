<template>
	<div class="connectgroq parameterContent">
		<Icon name="groq" alt="groq icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="groq.header">
				<template #LINK>
					<a href="https://groq.com" target="_blank"><Icon name="newtab" />Groq</a>
				</template>
			</i18n-t>

			<div class="small disclaimer">
				<Icon name="info" />
				<i18n-t scope="global" tag="span" keypath="groq.disclaimer">
					<template #GROQ>Gro<strong>Q</strong></template>
					<template #GROK>Gro<strong>K</strong></template>
				</i18n-t>
			</div>

			<div class="card-item secondary infos" v-if="!storeGroq.connected">
				<span>
					<Icon name="info" />
					<span>{{ t("groq.instructions") }}</span>
				</span>
				<TTButton
					class="installBt"
					href="https://console.groq.com/keys"
					type="link"
					icon="newtab"
					target="_blank"
					light
					secondary
					>{{ t("groq.install") }}</TTButton
				>
			</div>
		</div>

		<div class="content">
			<TTButton class="connectBt" v-if="storeGroq.connected" alert @click="disconnect()">{{
				t("global.disconnect")
			}}</TTButton>

			<form class="card-item" v-if="!storeGroq.connected" @submit.prevent="connect()">
				<ParamItem
					noBackground
					:paramData="param_apiKey"
					v-model="storeGroq.apiKey"
					autofocus
				/>

				<div class="ctas">
					<TTButton type="submit" :loading="connecting" :disabled="!canConnect">{{
						t("global.connect")
					}}</TTButton>
				</div>
			</form>
			<div class="card-item alert error" v-if="error" @click="error = false">
				{{ t("groq.invalid_api_key") }}
			</div>

			<template v-if="storeGroq.connected">
				<div class="card-item infos">
					<i18n-t scope="global" keypath="groq.usage" tag="span">
						<template #TRIGGERS>
							<a @click.prevent="openTriggers()">{{
								t("params.categories.triggers")
							}}</a>
						</template>
					</i18n-t>
				</div>

				<!-- <i18n-t class="card-item" scope="global" keypath="groq.credits_usage" tag="div">
					<template #LIMIT>
						<strong>{{ storeGroq.creditsTotal }}</strong>
					</template>
					<template #REMAINING>
						<strong>{{ storeGroq.creditsTotal - storeGroq.creditsUsed }}</strong>
					</template>
				</i18n-t> -->

				<form class="card-item modelList">
					<p class="head">
						{{ t("groq.default_model") }} <br /><i
							><a href="https://groq.com/pricing/" target="_blank">{{
								t("groq.models_pricing")
							}}</a></i
						>
						<span> · </span>
						<i
							><a href="https://console.groq.com/settings/limits/" target="_blank">{{
								t("groq.models_limits")
							}}</a></i
						>
					</p>
					<template v-for="category in modelCategories">
						<p class="categoryName">{{ category.name }}</p>
						<ul>
							<li
								v-for="model in category.models"
								:class="{ selected: model.id == storeGroq.defaultModel }"
							>
								<input
									type="radio"
									:id="model.id"
									:name="model.id"
									v-model="storeGroq.defaultModel"
									:value="model.id"
									@change="storeGroq.saveConfigs()"
								/>
								<label :for="model.id">
									<span class="size"
										>{{ Math.floor(model.context_window / 1024) }}K</span
									>
									<span class="name">{{ model.id.replace(/-/g, " ") }}</span>
								</label>
							</li>
						</ul>
					</template>
				</form>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { storeGroq as useStoreGroq } from "@/store/groq/storeGroq";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";

const { t } = useI18n();
const storeGroq = useStoreGroq();
const storeParams = useStoreParams();

const error = ref(false);
const connecting = ref(false);
const param_apiKey = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "password",
	icon: "key",
	labelKey: "groq.apiKey",
	isPrivate: true,
});

const canConnect = computed(() => param_apiKey.value.value.length >= 30);

/**
 * Get models sorted by owners
 * Excluding models for speech recognition
 */
const modelCategories = computed(() => {
	type modesType = typeof storeGroq.availableModels;
	const res: { name: string; models: modesType }[] = [];
	const sorted = storeGroq.availableModels
		.sort((a, b) => a.owned_by.localeCompare(b.owned_by))
		.filter((m) => m.type == "text");
	let category: (typeof res)[0] = { name: sorted[0]!.owned_by, models: [] };
	for (const model of sorted) {
		if (model.owned_by != category.name) {
			res.push(category);
			category = { name: model.owned_by, models: [] };
		}
		category.models.push(model);
	}
	res.push(category);
	return res.filter((c) => c.models.length > 0);
});

async function connect(): Promise<void> {
	error.value = false;
	connecting.value = true;
	const res = await storeGroq.connect();
	error.value = !res;
	connecting.value = false;
}

function disconnect(): void {
	storeGroq.disconnect();
}

function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}
</script>

<style scoped lang="less">
.connectgroq {
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;

		form {
			display: flex;
			flex-direction: column;
			gap: 0.5em;
		}
		.ctas {
			gap: 1em;
			display: flex;
			flex-direction: row;
			justify-content: center;
		}

		.error {
			cursor: pointer;
			white-space: pre-line;
			text-align: center;
		}
	}

	.infos {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.2em;
		white-space: pre-line;
	}

	.disclaimer {
		padding: 0.25em 0.5em;
		background-color: var(--color-alert-fader);
		border-radius: var(--border-radius);
		animation: fadeInOut 1s infinite;
		.icon {
			margin-right: 0.5em;
		}

		@keyframes fadeInOut {
			0%,
			100% {
				background-color: var(--color-alert-fade);
			}
			50% {
				background-color: var(--color-alert-transparent);
			}
		}
	}

	.modelList {
		display: flex;
		flex-direction: column;
		.head {
			font-weight: bold;
			text-align: center;
			margin-bottom: 1em;
			line-height: 1.25em;
		}
		.categoryName {
			font-style: italic;
			opacity: 0.8;
			font-size: 0.9em;
		}
		ul {
			gap: 0.5em;
			margin-left: 2em;
			margin-bottom: 1em;
			li {
				padding: 0.2em 0.5em;
				border: 1px solid transparent;
				border-radius: var(--border-radius);
				input {
					width: 0.8em;
					min-width: 0.8em;
					max-width: 0.8em;
					height: 0.8em;
					margin-right: 0.5em;
					padding: 0;
					margin-top: -0.15em;
				}
				label {
					cursor: pointer;
					.name {
						flex: 1;
						text-transform: capitalize;
					}
					.size {
						display: inline-block;
						min-width: 3em;
					}
				}
				&.selected {
					border-color: var(--color-secondary);
				}
			}
		}
	}
}
</style>
