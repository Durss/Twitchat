<template>
	<div class="connectstreamsocket parameterContent">
		<Icon name="streamsocket" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamsocket.header">
				<template #LINK>
					<a href="https://dashboard.twitch.tv/extensions/1lpj3883m4u6exlgdwzuk627bvpabj" target="_blank"><Icon name="newtab" />StreamSocket Events</a>
				</template>
			</i18n-t>
		</div>

		<template v-if="!$store.streamSocket.connected">
			<section>
				<TTButton icon="newtab" type="link" href="https://dashboard.twitch.tv/extensions/1lpj3883m4u6exlgdwzuk627bvpabj" target="_blank"
					@click="$store.streamSocket.disconnect(true)">{{ $t("streamsocket.installBt") }}</TTButton>
			</section>

			<section class="card-item form">
				<form @submit.prevent="$store.streamSocket.connect(secretField.value)">

					<ParamItem :paramData="secretField" v-model="secretField.value" noBackground />

					<ToggleBlock small :title="$t('streamsocket.help')" :open="false">
						<div class="infos">
							<span>{{ $t("streamsocket.find_secret") }}</span>
							<img src="@/assets/img/streamsocket_secret.png" width="330" />
						</div>
					</ToggleBlock>

					<TTButton
						icon="online"
						type="submit"
						:loading="$store.streamSocket.connecting"
						:disabled="secretField.value.length < 100">{{ $t("global.connect") }}</TTButton>

					<div class="card-item alert error"
						v-if="$store.streamSocket.invalidSecret"
						@click="$store.streamSocket.invalidSecret = false">{{ $t("error.streamSocket_connect_failed") }}</div>
				</form>
			</section>

			<section class="card-item connected">
				<img class="graph" src="@/assets/img/streamsocket_graph.png" />
			</section>
		</template>

		<section class="card-item connected" v-else>
			<TTButton alert icon="offline" class="disconnectBt"
				@click="$store.streamSocket.disconnect(true)">{{ $t("global.disconnect") }}</TTButton>

			<i18n-t scope="global" tag="span" keypath="streamsocket.next_step">
				<template #TRIGGERS>
					<a @click="openTriggers()">{{$t("params.categories.triggers")}}</a>
				</template>
			</i18n-t>

			<img class="graph" src="@/assets/img/streamsocket_graph.png" />
		</section>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
class ConnectStreamSocket extends Vue {

	public secretField:TwitchatDataTypes.ParameterData<string>	= { type:"password", value:"", labelKey:"streamsocket.secret_input", icon:"key", isPrivate:true };

	public mounted():void {
		this.secretField.value = this.$store.streamSocket.socketSecret || "";
	}

	public openTriggers():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}

}
export default toNative(ConnectStreamSocket);
</script>

<style scoped lang="less">
.connectstreamsocket{
	form {
		// max-width: 400px;
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.infos {
			margin-top: 1em;
			gap: .5em;
			display: flex;
			flex-direction: column;
			align-items: center;
			text-align: center;
		}
	}

	.error {
		white-space: pre-line;
		cursor: pointer;
	}

	.connected {
		margin: auto;
		text-align: center;

		.disconnectBt {
			margin: auto;
		}
	}

	.graph {
		margin: auto;
		margin-top: 2em;
		display: block;
		max-width:500px;
	}
}
</style>
