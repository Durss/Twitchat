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

		<section v-if="!connected">
			<form action="">
				<ParamItem class="param" :paramData="param_key" />
	
				<ToggleBlock small :title="$t('streamlabs.find_key_title')">
					<i18n-t tag="p" class="whereToFind" scope="global" keypath="streamlabs.find_key">
						<template #LINK><a href="https://streamlabs.com/dashboard#/settings/api-settings" target="_blank">{{ $t("streamlabs.find_key_link") }}</a></template>
						<template #TAB><mark>{{ $t("streamlabs.find_key_tab") }}</mark></template>
						<template #ITEM><mark>{{ $t("streamlabs.find_key_item") }}</mark></template>
					</i18n-t>
				</ToggleBlock>
				
				<TTButton>{{ $t("global.connect") }}</TTButton>
			</form>
		</section>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
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

	public connected = false;

	public param_key:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", labelKey:"streamlabs.param_key"}

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

		.whereToFind {
			text-align: justify;
			max-width: 400px;
			line-height: 1.25em;
		}
		.param {
			:deep(label) {
				flex-basis: 100% !important;
			}
		}
	}
}
</style>