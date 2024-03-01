<template>
	<div class="connectstreamlabs parameterContent">
		<Icon name="streamlabs" class="icon" />
		
		
		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamlabs.header">
				<template #LINK>
					<a href="https://streamlabs.com/" target="_blank">Streamlabs</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!$store.auth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{ $t('premium.become_premiumBt')  }}</TTButton>
		</section>

		<section v-else-if="!$store.streamlabs.connected">
			<form @submit.prevent="connect()">
				<ParamItem class="param" :paramData="param_key" />
	
				<ToggleBlock small :title="$t('streamlabs.find_key_title')" :open="false">
					<i18n-t tag="p" class="whereToFind" scope="global" keypath="streamlabs.find_key">
						<template #LINK><a href="https://streamlabs.com/dashboard#/settings/api-settings" target="_blank">{{ $t("streamlabs.find_key_link") }}</a></template>
						<template #TAB><mark>{{ $t("streamlabs.find_key_tab") }}</mark></template>
						<template #ITEM><mark>{{ $t("streamlabs.find_key_item") }}</mark></template>
					</i18n-t>
				</ToggleBlock>
				
				<TTButton type="submit" :loading="loading">{{ $t("global.connect") }}</TTButton>

				<div class="card-item alert error" v-if="error" @click="error = false">{{ $t("error.streamlabs_connect_failed") }}</div>
			</form>
		</section>

		<section v-else>
			<TTButton alert @click="$store.streamlabs.disconnect()">{{ $t("global.disconnect") }}</TTButton>
		</section>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { ParamItem } from '../../ParamItem.vue';
import { TTButton } from '@/components/TTButton.vue';
import { ToggleBlock } from '@/components/ToggleBlock.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
class ConnectStreamlabs extends Vue {

	public error = false;
	public loading = false;
	public connected = false;

	public param_key:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", labelKey:"streamlabs.param_key"};

	public beforeMount():void {
		this.param_key.value = this.$store.streamlabs.token || "";
	}

	/**
	 * Connect to socket
	 */
	public async connect():Promise<void> {
		this.error = false;
		this.loading = true;
		this.error = !await this.$store.streamlabs.connect(this.param_key.value);
		this.loading = false;
	}

	/**
	 * Opens the premium param page
	 */
	public openPremium():void{
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

}
export default toNative(ConnectStreamlabs);
</script>

<style scoped lang="less">
.connectstreamlabs{
	form {
		display: flex;
		flex-direction: column;
		gap: .5em;
		margin: auto;
		width: 400px;

		.whereToFind {
			text-align: justify;
			line-height: 1.25em;
		}
		.param {
			:deep(label) {
				flex-basis: 100% !important;
			}
		}
		.error {
			cursor: pointer;
			line-height: 1.2em;
			text-align: center;
			white-space: pre-line;
		}
	}
}
</style>