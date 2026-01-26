<template>
	<div class="connectstreamfog parameterContent">
		<Icon name="streamfog" alt="streamfog icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamfog.header">
				<template #LINK>
					<a href="https://streamfog.com/" target="_blank"><Icon name="newtab" />Streamfog</a>
				</template>
			</i18n-t>
			<div class="card-item secondary infos">
				<span>
					<Icon name="info" />
					<span>{{$t("streamfog.instructions")}}</span>
				</span>
				<TTButton class="installBt"
					href="https://streamfog.com/"
					type="link"
					icon="newtab"
					target="_blank"
					light secondary>{{ $t("streamfog.install") }}</TTButton>
			</div>
		</div>

		<div class="content">
			<form class="card-item" @submit.prevent="connect()">
				<ParamItem noBackground :paramData="param_userId" v-model="$store.streamfog.userId" autofocus/>
			
				<TTButton type="submit"
					v-if="!$store.streamfog.connected"
					:loading="connecting"
					:disabled="!canConnect">{{ $t('global.connect') }}</TTButton>
			</form>
			
			<div class="card-item alert message error" v-if="$store.streamfog.invalidID" @click="$store.streamfog.invalidID = false">{{ $t(`streamfog.error_messages.${error}`) }}</div>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:[],
})
class ConnectStreamfog extends Vue {

	public error:string = "false";
	public connecting:boolean = false;

	public param_userId:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", labelKey:"streamfog.param_userId", maxLength:24};

	public get canConnect():boolean {
		return this.param_userId.value.length >= 24;
	}

	public async connect():Promise<void> {
		this.error = "";
		this.connecting = true;
		const res = await this.$store.streamfog.connect(this.param_userId.value);
		if(res !== true) this.error = res;
		this.connecting = false;
	}

}
export default toNative(ConnectStreamfog);
</script>

<style scoped lang="less">
.connectstreamfog{
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
	}
	
}
</style>