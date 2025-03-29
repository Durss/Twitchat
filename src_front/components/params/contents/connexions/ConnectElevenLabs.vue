<template>
	<div class="connectelevenlabs parameterContent">
		<Icon name="elevenlabs" alt="elevenlabs icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="elevenlabs.header">
				<template #LINK>
					<a href="https://elevenlabs.io" target="_blank"><Icon name="newtab" />ElevenLabs</a>
				</template>
			</i18n-t>
			<div class="card-item secondary infos" v-if="!$store.elevenLabs.connected">
				<span>
					<Icon name="info" />
					<span>{{$t("elevenlabs.instructions")}}</span>
				</span>
				<TTButton class="installBt"
					href="https://elevenlabs.io/app/settings/api-keys"
					type="link"
					icon="newtab"
					target="_blank"
					light secondary>{{ $t("elevenlabs.install") }}</TTButton>
			</div>
		</div>

		<div class="content">
	
			<TTButton class="connectBt" alert @click="disconnect()">{{ $t('global.disconnect') }}</TTButton>

			<form class="card-item" v-if="!$store.elevenLabs.connected" @submit.prevent="connect()">
				<ParamItem noBackground :paramData="param_apiKey" v-model="$store.elevenLabs.apiKey" autofocus/>

				<div class="ctas">
					<TTButton type="submit"
						:loading="connecting"
						:disabled="!canConnect">{{ $t('global.connect') }}</TTButton>
				</div>
			</form>
			<div class="card-item alert error" v-if="error" @click="error=false">{{$t("elevenlabs.invalid_api_key")}}</div>
	
			<template v-if="$store.elevenLabs.connected">
				<div class="card-item infos">
					<i18n-t scope="global" keypath="elevenlabs.usage" tag="span">
						<template #TTS>
							<a @click.prevent="openTTS()">{{ $t("params.categories.tts") }}</a>
						</template>
						<template #TRIGGERS>
							<a @click.prevent="openTriggers()">{{ $t("params.categories.triggers") }}</a>
						</template>
					</i18n-t>
				</div>

				<i18n-t class="card-item" scope="global" keypath="elevenlabs.credits_usage" tag="div">
					<template #LIMIT>
						<strong>{{ $store.elevenLabs.creditsTotal }}</strong>
					</template>
					<template #REMAINING>
						<strong>{{ $store.elevenLabs.creditsTotal - $store.elevenLabs.creditsUsed }}</strong>
					</template>
				</i18n-t>
			</template>
		</div>

	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import TTButton from '@/components/TTButton.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:[],
})
class ConnectElevenLabs extends Vue {

	public error = false;
	public showSuccess = false;
	public connecting = false;

	public param_apiKey:TwitchatDataTypes.ParameterData<string> = {value:"", type:"password", icon:"key", labelKey:"elevenlabs.apiKey", isPrivate:true};
		
	public get canConnect():boolean {
		return this.param_apiKey.value.length >= 30;
	}

	public beforeMount():void {
		
	}

	public async connect():Promise<void> {
		this.error = false;
		this.connecting = true;
		const res = await this.$store.elevenLabs.connect();
		this.error = !res;
		this.connecting = false;
	}

	public disconnect():void {
		this.$store.elevenLabs.disconnect();
	}

	public openTTS():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TTS);
	}
	
	public openTriggers():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}
}
export default toNative(ConnectElevenLabs);
</script>

<style scoped lang="less">
.connectelevenlabs{
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
	
		form {
			display: flex;
			flex-direction: column;
			gap:.5em;
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
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.2em;
	}
	
}
</style>