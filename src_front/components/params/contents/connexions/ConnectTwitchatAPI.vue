<template>
	<div class="connecttwitchatapi parameterContent">
		<Icon name="twitchat_api" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="api.header">
				<template #LINK>
					<a :href="url" target="_blank"
						><Icon name="newtab" />{{ t("api.header_link") }}</a
					>
				</template>
			</i18n-t>
		</div>

		<template v-if="!storeAuth.isPremium">
			<TTButton class="premiumBt" icon="premium" @click="openPremium()" premium big>{{
				$t("premium.become_premiumBt")
			}}</TTButton>
		</template>

		<section v-else class="card-item form">
			<template v-if="privateKey && storeApi.connected">
				<div class="warning">
					<Icon name="alert" />
					<strong>{{ t("api.key_warning") }}</strong>
				</div>
				<div class="warning">
					<Icon name="info" />
					<span>{{ t("api.key_info") }}</span>
				</div>
				<div class="keyHolder">
					<Icon name="key" />
					<span>{{ t("api.param_key") }}</span>
					<div
						class="inputField"
						:class="{ censor }"
						@click="censor = false"
						v-tooltip="t('api.click_reveal')"
					>
						<input
							type="text"
							:value="censor ? '' : privateKey"
							name="apiKey"
							readonly
						/>
						<Icon v-if="censor" class="censorIcon" name="spoiler" />
					</div>
					<TTButton
						class="copyBt"
						icon="copy"
						:copy="privateKey"
						v-tooltip="t('global.copy')"
						transparent
					/>
				</div>
			</template>

			<div class="actions">
				<TTButton
					v-if="!storeApi.connected"
					icon="refresh"
					:loading="loading"
					@click="generateKey()"
					>{{ t("api.generate_key") }}</TTButton
				>

				<TTButton
					v-else
					icon="cross"
					alert
					:loading="deleting"
					@click="revokeKey()"
					v-tooltip="t('api.revoke_key_tt')"
					>{{ t("api.revoke_key") }}</TTButton
				>
			</div>

			<div v-if="error" class="errorMessage">{{ error }}</div>
		</section>

		<section class="card-item tutorial">
			<h1>{{ t("api.tutorial_title") }}</h1>
			<p>{{ t("api.tutorial_intro") }}</p>

			<ol>
				<li class="card-item">
					<span class="index">1.</span>
					<span>{{ t("api.tutorial_step1") }}</span>
					<div class="codeBlock">
						<code>{{ t("api.tutorial_step1_detail") }}</code>
					</div>
				</li>

				<li class="card-item">
					<span class="index">2.</span>
					<span>{{ t("api.tutorial_step2") }}</span>
					<div class="codeBlock">
						<code>{{ signaturePayloadExample }}</code>
					</div>
				</li>

				<li class="card-item">
					<span class="index">3.</span>
					<span>{{ t("api.tutorial_step3") }}</span>
					<div class="codeBlock">
						<code>POST {{ apiEndpoint }}</code>
					</div>
				</li>

				<li class="card-item">
					<span class="index">4.</span>
					<span>{{ t("api.tutorial_step4") }}</span>
					<div class="codeBlock">
						<code>{{ headersExample }}</code>
					</div>
				</li>

				<li class="card-item">
					<span class="index">5.</span>
					<i18n-t scope="global" tag="span" keypath="api.tutorial_step5">
						<template #LINK>
							<a :href="url" target="_blank"
								><Icon name="newtab" />{{ t("api.tutorial_step5_link") }}</a
							>
						</template>
					</i18n-t>
				</li>

				<li class="card-item">
					<span class="index">6.</span>
					<span>{{ t("api.tutorial_step6") }}</span>
					<TabMenu
						class="codeExampleTabs"
						v-model="exampleLang"
						:values="['javascript', 'nodejs', 'python']"
						:labels="['JavaScript', 'Node.js', 'Python']"
						small
					/>
					<div class="codeExampleWrapper">
						<pre class="codeBlock"><code v-html="activeHighlighted"></code></pre>

						<TTButton
							class="copyBt"
							icon="copy"
							:copy="activeHighlightedCopy"
							transparent
						/>
					</div>
				</li>
			</ol>
		</section>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import TabMenu from "@/components/TabMenu.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeAPI as useStoreAPI } from "@/store/api/storeAPI";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useHighlight } from "@/composables/useHighlight";

const { t } = useI18n();
const storeParams = useStoreParams();
const storeAuth = useStoreAuth();
const storeApi = useStoreAPI();
const censor = ref(true);
const loading = ref(false);
const deleting = ref(false);
const error = ref("");
const privateKey = ref("");
const { loadHighlightJs, highlighted } = useHighlight();
const exampleLang = ref<"javascript" | "nodejs" | "python">("javascript");
loadHighlightJs();

const gitBranch = Config.instance.BETA_MODE ? "v17" : "main";
const url = `https://github.com/Durss/Twitchat/blob/${gitBranch}/PUBLIC_API.md#actions-you-can-perform`;

const apiEndpoint = computed(() => Config.instance.API_PATH + "/remote/action");

const userId = computed(() => storeAuth.twitch.user.id);

const keyValue = computed(() => privateKey.value || "twitchat_XXX");

const signaturePayloadExample = computed(() => `TIMESTAMP\\nACTION\\nJSON_BODY`);

const headersExample = computed(
	() =>
		`X-Twitchat-UserId: ${userId.value}\nX-Twitchat-Timestamp: {unix_ms}\nX-Twitchat-Signature: {base64_signature}\nContent-Type: application/json`,
);

const nodejsExample = computed(
	() =>
		`import { createPrivateKey, sign } from "crypto";

// Reconstruct private key from your twitchat_ key
const apiKey = "${keyValue.value}";
const seed = Buffer.from(apiKey.replace("twitchat_", ""), "base64url");
const prefix = Buffer.from("302e020100300506032b657004220420", "hex");
const privateKey = createPrivateKey({
  key: Buffer.concat([prefix, seed]),
  format: "der",
  type: "pkcs8",
});

// Build and sign the request
const timestamp = Date.now().toString();
const action = "ACTION_NAME";
const actionData = {};
const body = JSON.stringify({ action, data: actionData });
const payload = \`\${timestamp}\\n\${action}\\n\${body}\`;
const signature = sign(null, Buffer.from(payload), privateKey)
  .toString("base64");

// Send it
const res = await fetch("${apiEndpoint.value}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Twitchat-UserId": "${userId.value}",
    "X-Twitchat-Timestamp": timestamp,
    "X-Twitchat-Signature": signature,
  },
  body,
});
console.log(await res.json());`,
);

const javascriptExample = computed(
	() =>
		`// Decode the twitchat_ key and build the PKCS8 DER
const apiKey = "${keyValue.value}";
const b64 = apiKey.replace("twitchat_", "")
  .replace(/-/g, "+").replace(/_/g, "/");
const seed = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const prefix = new Uint8Array([
  0x30,0x2e,0x02,0x01,0x00,0x30,0x05,0x06,
  0x03,0x2b,0x65,0x70,0x04,0x22,0x04,0x20
]);
const pkcs8 = new Uint8Array([...prefix, ...seed]);

// Import as an Ed25519 signing key
const key = await crypto.subtle.importKey(
  "pkcs8", pkcs8, { name: "Ed25519" }, false, ["sign"]
);

// Build and sign the request
const timestamp = Date.now().toString();
const action = "ACTION_NAME";
const actionData = {};
const body = JSON.stringify({ action, data: actionData });
const payload = \`\${timestamp}\\n\${action}\\n\${body}\`;
const sig = await crypto.subtle.sign(
  "Ed25519", key, new TextEncoder().encode(payload)
);
const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

// Send it
const res = await fetch("${apiEndpoint.value}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Twitchat-UserId": "${userId.value}",
    "X-Twitchat-Timestamp": timestamp,
    "X-Twitchat-Signature": signature,
  },
  body,
});
console.log(await res.json());`,
);

const pythonExample = computed(
	() =>
		`from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
import base64, json, time, requests

compact_key = "${keyValue.value}"
seed = base64.urlsafe_b64decode(compact_key.replace("twitchat_", "") + "==")
private_key = Ed25519PrivateKey.from_private_bytes(seed)

timestamp = str(int(time.time() * 1000))
action = "ACTION_NAME"
body = json.dumps({"action": action, "data": {}}, separators=(',', ':'))
payload = f"{timestamp}\\n{action}\\n{body}"
signature = base64.b64encode(
    private_key.sign(payload.encode())
).decode()

res = requests.post("${apiEndpoint.value}", data=body, headers={
    "Content-Type": "application/json",
    "X-Twitchat-UserId": "${userId.value}",
    "X-Twitchat-Timestamp": timestamp,
    "X-Twitchat-Signature": signature,
})
print(res.json())`,
);

const highlightedJavascript = highlighted(javascriptExample, "javascript");
const highlightedNodejs = highlighted(nodejsExample, "javascript");
const highlightedPython = highlighted(pythonExample, "python");

const activeHighlighted = computed(() => {
	switch (exampleLang.value) {
		case "javascript":
			return highlightedJavascript.value;
		case "python":
			return highlightedPython.value;
		default:
			return highlightedNodejs.value;
	}
});

const activeHighlightedCopy = computed(() => {
	switch (exampleLang.value) {
		case "javascript":
			return javascriptExample.value;
		case "python":
			return pythonExample.value;
		default:
			return nodejsExample.value;
	}
});

async function onTutorialToggle(open: boolean) {
	if (open) await loadHighlightJs();
}

function openPremium() {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

async function generateKey() {
	loading.value = true;
	error.value = "";
	censor.value = true;
	const result = await storeApi.generateKey();
	if (result !== false) {
		privateKey.value = result;
	} else {
		error.value = t("api.generate_error");
	}
	loading.value = false;
}

async function revokeKey() {
	deleting.value = true;
	error.value = "";
	const success = await storeApi.deleteKey(false);
	if (success) {
		privateKey.value = "";
	} else {
		error.value = t("api.revoke_error");
	}
	deleting.value = false;
}
</script>

<style scoped lang="less">
.connecttwitchatapi {
	.form {
		margin: auto;
		gap: 1em;
		display: flex;
		flex-direction: column;
	}

	.warning {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5em;
		white-space: pre-line;
		line-height: 1.25em;

		.icon {
			max-width: 1.5em;
			height: 1.5em;
			flex-shrink: 0;
		}
	}

	.connected {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5em;
		color: var(--color-secondary);

		.icon {
			max-width: 1em;
			height: 1em;
		}
	}

	.actions {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
	}

	.errorMessage {
		color: var(--color-alert);
		text-align: center;
	}

	.keyHolder {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		margin: auto;

		.icon {
			max-width: 1em;
			height: 1em;
		}

		.copyBt {
			height: auto;
			margin-left: -2.25em;
		}
		.inputField {
			position: relative;

			input {
				padding-right: 1.75em;
			}

			.censorIcon {
				position: absolute;
				right: 0.25em;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				pointer-events: none;
			}

			&.censor {
				input {
					cursor: pointer;
					@c1: var(--grayout-fadest);
					@c2: transparent;
					background-image: repeating-linear-gradient(
						-45deg,
						@c1,
						@c1 10px,
						@c2 10px,
						@c2 20px
					);
				}
			}
		}
	}

	.tutorial {
		text-align: left;

		p {
			margin-bottom: 0.5em;
		}

		ol {
			list-style: none;
			padding: 0;
			display: flex;
			flex-direction: column;
			gap: 0.5em;

			li {
				display: flex;
				flex-direction: column;
				gap: 0.25em;

				.index {
					font-weight: bold;
				}

				a {
					.icon {
						vertical-align: middle;
						margin-right: 0.1em;
						height: 1em;
					}
				}

				span {
					white-space: pre-line;
				}
			}
		}

		.codeBlock {
			background: var(--grayout-fader);
			border-radius: 0.5em;
			padding: 0.5em 0.75em;
			font-family: monospace;
			font-size: 0.85em;
			overflow-x: auto;
			white-space: pre-wrap;
			word-break: break-all;
			tab-size: 2;
			max-width: 600px;
		}

		pre.codeBlock {
			white-space: pre;
			word-break: normal;

			:deep(.hljs-keyword),
			:deep(.hljs-selector-tag) {
				color: #ff7b72;
			}
			:deep(.hljs-string),
			:deep(.hljs-template-variable) {
				color: #a5d6ff;
			}
			:deep(.hljs-comment) {
				color: #8b949e;
			}
			:deep(.hljs-number),
			:deep(.hljs-literal) {
				color: #79c0ff;
			}
			:deep(.hljs-title),
			:deep(.hljs-function) {
				color: #d2a8ff;
			}
			:deep(.hljs-built_in) {
				color: #ffa657;
			}
			:deep(.hljs-variable),
			:deep(.hljs-attr) {
				color: #ffa657;
			}
			:deep(.hljs-params) {
				color: #c9d1d9;
			}
			:deep(.hljs-subst) {
				color: #c9d1d9;
			}
		}

		.codeExampleTabs {
			margin-top: 0.5em;
		}

		.codeExampleWrapper {
			position: relative;

			.copyBt {
				position: absolute;
				top: 0.5em;
				right: 0.5em;
				height: auto;
			}
		}
	}
}
</style>
