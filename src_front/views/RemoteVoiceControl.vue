<template>
	<div class="voicecontrol">
		<div class="card-item primary block head">
			<Icon name="voice" alt="voice icon" class="icon" />
			<p>{{ $t("voice.remote.title") }}</p>
		</div>

		<ToggleBlock
			class="block conf"
			:open="!connected"
			icon="info"
			:title="$t('obs.credentials_form_title')"
		>
			<OBSConnectForm class="connectForm" />
		</ToggleBlock>

		<div class="block card-item tuto">
			<p v-html="$t('voice.remote.commands')"></p>
		</div>

		<VoiceControlForm class="block card-item" v-if="connected" sttOnly />
	</div>
</template>

<script setup lang="ts">
import DataStore from "@/store/DataStore";
import OBSWebsocket from "@/utils/OBSWebsocket";
import { computed, onMounted, ref } from "vue";
import ToggleBlock from "../components/ToggleBlock.vue";
import OBSConnectForm from "../components/params/contents/obs/OBSConnectForm.vue";
import VoiceControlForm from "../components/voice/VoiceControlForm.vue";

const showStorageModal = ref(false);

const connected = computed(() => OBSWebsocket.instance.connected.value);

onMounted(() => {
	showStorageModal.value = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) == null;
});
</script>

<style scoped lang="less">
.voicecontrol {
	.block {
		max-width: 600px;
		margin: auto;
		padding: 0;
		margin: 0.5em auto;
		color: var(--color-text);

		&:not(.conf) {
			padding: 1em;
		}

		&.head {
			text-align: center;
			.icon {
				height: 5em;
				margin-bottom: 1em;
			}

			.install {
				margin-top: 1em;
				font-size: 0.8em;
			}
		}

		&.tuto {
			text-align: center;
		}
	}

	.connectForm {
		max-width: 500px;
		margin: auto;
	}
}
</style>
