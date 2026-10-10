<template>
	<div class="goxlrdebug">
		<form @submit.prevent="connect()" class="content sidePanel" v-if="!connected">
			<h1>Connect with GoXLR-Utility</h1>
			<ParamItem :paramData="param_ip" />
			<ParamItem :paramData="param_port" />
			<TTButton type="submit" :loading="connecting">Connect</TTButton>
			<div class="card-item alert error" v-if="error" @click="error = false">
				Connection failed
			</div>
		</form>

		<div class="content sidePanel" v-else>
			<div class="card-item">
				<ParamItem noBackground :paramData="param_genderStyle" @change="setGenderStyle" />
				<ParamItem noBackground :paramData="param_genderAmount" @change="setGenderAmount" />
			</div>
			<div class="card-item">
				<ParamItem noBackground :paramData="param_echoStyle" @change="setEchoStyle" />
				<ParamItem noBackground :paramData="param_echoAmount" @change="setEchoAmount" />
			</div>

			<div class="card-item">
				<div>Enable preset</div>
				<div class="presets">
					<TTButton
						v-for="i in 6"
						@click="setActivePreset(i - 1)"
						:selected="selectedPresetIndex == i - 1"
						>{{ i }}</TTButton
					>
				</div>
				<TTButton @click="toggleFX()" :selected="fxEnabled">Toggle FX</TTButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import GoXLRSocket from "@/utils/goxlr/GoXLRSocket";
import { computed, ref, watch } from "vue";

const storeAuth = useStoreAuth();

const error = ref(false);
const fxEnabled = ref(false);
const connecting = ref(false);
const selectedPresetIndex = ref(0);
const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "127.0.0.1",
	label: "IP",
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 14564,
	label: "Port",
});

const param_genderStyle = ref<TwitchatDataTypes.ParameterData<"Narrow" | "Medium" | "Wide">>({
	type: "list",
	listValues: ["Narrow", "Medium", "Wide"].map((v) => {
		return { label: v, value: v };
	}),
	value: "Narrow",
	label: "Gender style",
});
const param_genderAmount = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 0.5,
	min: 0,
	max: 1,
	step: 0.1,
	label: "Gender amount {VALUE}",
});

const param_echoStyle = ref<
	TwitchatDataTypes.ParameterData<
		"Quarter" | "Eighth" | "MultiTap" | "Triplet" | "PingPong" | "ClassicSlap"
	>
>({
	type: "list",
	listValues: ["Quarter", "Eighth", "MultiTap", "Triplet", "PingPong", "ClassicSlap"].map((v) => {
		return { label: v, value: v };
	}),
	value: "Quarter",
	label: "Echo style",
});
const param_echoAmount = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 0.5,
	min: 0,
	max: 1,
	step: 0.1,
	label: "Echo amount {VALUE}",
});

const connected = computed<boolean>(() => GoXLRSocket.instance.connected.value);

async function connect(): Promise<void> {
	error.value = false;
	connecting.value = true;
	try {
		storeAuth.premiumType = "lifetime"; //Force premium to allow connection
		await GoXLRSocket.instance.connect(param_ip.value.value, param_port.value.value);
	} catch (err) {
		console.log(err);
		error.value = true;
	}
	const state = GoXLRSocket.instance.status.value;
	if (state) {
		fxEnabled.value = state.effects.is_enabled;
		selectedPresetIndex.value = parseInt(state.effects.active_preset.replace(/\D/gi, ""));
	}
	connecting.value = false;
}

function setGenderStyle(): void {
	GoXLRSocket.instance.setGenderStyle(param_genderStyle.value.value);
}

function setGenderAmount(): void {
	GoXLRSocket.instance.setEncoderPercentValue("gender", param_genderAmount.value.value);
}

function setEchoStyle(): void {
	GoXLRSocket.instance.setEchoStyle(param_echoStyle.value.value);
}

function setEchoAmount(): void {
	GoXLRSocket.instance.setEncoderPercentValue("echo", param_echoAmount.value.value);
}

function setActivePreset(index: number): void {
	selectedPresetIndex.value = index;
	GoXLRSocket.instance.activeEffectPreset = index;
}

function toggleFX(): void {
	fxEnabled.value = !fxEnabled.value;
	GoXLRSocket.instance.setFXEnabled(fxEnabled.value);
}
</script>

<style scoped lang="less">
.goxlrdebug {
	form {
		max-width: 400px;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		h1 {
			text-align: center;
		}
		.error {
			text-align: center;
		}
	}

	.content {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		padding: 1em;
		margin: auto;
		margin-top: 1em;
		max-width: 800px;
	}

	.card-item {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}
}
</style>
