<template>
	<div class="connectlumia parameterContent">
		<Icon name="lumia" class="icon" />
		
		
		<div class="head">
			<i18n-t scope="global" tag="span" keypath="lumia.header">
				<template #LINK>
					<a href="https://lumiastream.com/" target="_blank">Lumia Stream</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!$store.auth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{ $t('premium.become_premiumBt')  }}</TTButton>
		</section>

		<form class="card-item" @submit.prevent="onConnect()" v-else-if="!$store.lumia.connected">
			<ParamItem class="param" :paramData="param_token" noBackground v-model="token" />
			<div class="hint">({{ $t("lumia.param_token_help") }})</div>
			<TTButton type="submit" icon="offline" :disabled="token.length < 10" :loading="loading">{{ $t("global.connect") }}</TTButton>
		</form>

		<div v-else>
			<TTButton alert @click="disconnect()" :loading="loading">{{ $t("global.disconnect") }}</TTButton>
		</div>

		<div class="card-item alert error" v-if="error" @click="error=false">{{$t("error.lumia_connect_failed")}}</div>

		<section class="card-item infos">
			<i18n-t scope="global" tag="p" keypath="lumia.info">
				<template #TRIGGERS>
					<a @click.prevent="openTriggers()">{{ $t("params.categories.triggers") }}</a>
				</template>
			</i18n-t>
		</section>

	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { ParamItem } from '../../ParamItem.vue';
import TTButton from '@/components/TTButton.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:[],
})
class ConnectLumia extends Vue {

	public token:string = "";
	public error:boolean = false;
	public loading:boolean = false;
	public param_token:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:40, labelKey:"lumia.param_token"}

	/**
	 * Attempt to connect to Lumia's socket
	 */
	public async onConnect():Promise<void> {
		this.loading = true;
		try {
			await this.$store.lumia.connect(this.token);
		}catch(error){}
		this.error = !this.$store.lumia.connected
		this.loading = false;
	}

	/**
	 * Opens the premium param page
	 */
	public openPremium():void{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Opens the triggers page
	 */
	public async openTriggers():Promise<void>{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}

	/**
	 * Disconnects from Lumia Stream
	 */
	public async disconnect():Promise<void>{
		this.$store.lumia.disconnect();
	}

}
export default toNative(ConnectLumia);
</script>

<style scoped lang="less">
.connectlumia{
	align-items: center;

	form {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.param {
			:deep(.holder) {
				flex-direction: column;
			}
			:deep(.inputHolder) {
				width: 100%;
			}
		}
		.hint {
			font-size: .9em;
			font-style: italic;
		}
	}

	.error {
		margin: auto;
		cursor: pointer;
		white-space: pre-line;
		text-align: center;
		line-height: 1.25em;
	}

	.infos {
		max-width: 400px;
		line-height: 1.25em;
		text-align: center;
	}
	
}
</style>