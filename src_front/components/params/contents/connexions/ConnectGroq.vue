<template>
	<div class="connectgroq parameterContent">
		<Icon name="groq" alt="groq icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="groq.header">
				<template #LINK>
					<a href="https://groq.com" target="_blank"><Icon name="newtab" />Groq</a>
				</template>
			</i18n-t>
			<div class="card-item secondary infos" v-if="!$store.groq.connected">
				<span>
					<Icon name="info" />
					<span>{{$t("groq.instructions")}}</span>
				</span>
				<TTButton class="installBt"
					href="https://console.groq.com/keys"
					type="link"
					icon="newtab"
					target="_blank"
					light secondary>{{ $t("groq.install") }}</TTButton>
			</div>
		</div>

		<div class="content">
	
			<TTButton class="connectBt" alert @click="disconnect()">{{ $t('global.disconnect') }}</TTButton>

			<form class="card-item" v-if="!$store.groq.connected" @submit.prevent="connect()">
				<ParamItem noBackground :paramData="param_apiKey" v-model="$store.groq.apiKey" autofocus/>

				<div class="ctas">
					<TTButton type="submit"
						:loading="connecting"
						:disabled="!canConnect">{{ $t('global.connect') }}</TTButton>
				</div>
			</form>
			<div class="card-item alert error" v-if="error" @click="error=false">{{$t("groq.invalid_api_key")}}</div>
	
			<template v-if="$store.groq.connected">
				<div class="card-item infos">
					<i18n-t scope="global" keypath="groq.usage" tag="span">
						<template #TRIGGERS>
							<a @click.prevent="openTriggers()">{{ $t("params.categories.triggers") }}</a>
						</template>
					</i18n-t>
				</div>

				<!-- <i18n-t class="card-item" scope="global" keypath="groq.credits_usage" tag="div">
					<template #LIMIT>
						<strong>{{ $store.groq.creditsTotal }}</strong>
					</template>
					<template #REMAINING>
						<strong>{{ $store.groq.creditsTotal - $store.groq.creditsUsed }}</strong>
					</template>
				</i18n-t> -->
	
				<form class="card-item modelList">
					<p class="head">{{ $t("groq.default_model") }}
						<br><i><a href="https://groq.com/pricing/" target="_blank">{{ $t("groq.models_pricing") }}</a></i>
						<span> · </span>
						<i><a href="https://console.groq.com/settings/limits/" target="_blank">{{ $t("groq.models_limits") }}</a></i>
					</p>
					<template v-for="category in modelCategories">
						<p class="categoryName">{{ category.name }}</p>
						<ul>
							<li v-for="model in category.models" :class="{selected: model.id == $store.groq.defaultModel}">
								<input type="radio"
									:id="model.id"
									:name="model.id"
									v-model="$store.groq.defaultModel"
									:value="model.id"
									@change="$store.groq.saveConfigs()" />
								<label :for="model.id">
									<span class="size">{{ Math.floor(model.context_window/1024) }}K</span>
									<span class="name">{{ model.id.replace(/-/g, ' ') }}</span>
								</label>
							</li>
						</ul>
					</template>
				</form>
			</template>
		</div>

	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import TTButton from '@/components/TTButton.vue';
import Checkbox from '@/components/Checkbox.vue';

@Component({
	components:{
		Checkbox,
		TTButton,
		ParamItem,
	},
	emits:[],
})
class ConnectElevenLabs extends Vue {

	public error = false;
	public showSuccess = false;
	public connecting = false;

	public param_apiKey:TwitchatDataTypes.ParameterData<string> = {value:"", type:"password", icon:"key", labelKey:"groq.apiKey", isPrivate:true};
		
	public get canConnect():boolean {
		return this.param_apiKey.value.length >= 30;
	}

	/**
	 * Get models sorted by owners
	 * Excluding models for speech recognition
	 */
	public get modelCategories() {
		type modesType = typeof this.$store.groq.availableModels;
		const res:{name:string, models:modesType}[] = [];
		const sorted = this.$store.groq.availableModels
						.sort((a,b)=>a.owned_by.localeCompare(b.owned_by))
						// .filter(m=>m.type == "text");
		let category:typeof res[0] = {name:sorted[0].owned_by, models:[]};
		for (let i = 0; i < sorted.length; i++) {
			const model = sorted[i];
			if(model.owned_by != category.name) {
				res.push(category);
				category = {name:model.owned_by, models:[]};
			}
			category.models.push(model);
		}
		res.push(category);
		return res.filter(c=>c.models.length > 0);
	}

	public beforeMount():void {
		
	}

	public async connect():Promise<void> {
		this.error = false;
		this.connecting = true;
		const res = await this.$store.groq.connect();
		this.error = !res;
		this.connecting = false;
	}

	public disconnect():void {
		this.$store.groq.disconnect();
	}
	
	public openTriggers():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}
}
export default toNative(ConnectElevenLabs);
</script>

<style scoped lang="less">
.connectgroq{
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
		white-space: pre-line;
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
			opacity: .8;
			font-size: .9em;
		}
		ul {
			gap: .5em;
			margin-left: 2em;
			margin-bottom: 1em;
			li {
				padding: .2em .5em;
				border: 1px solid transparent;
				border-radius: var(--border-radius);
				input {
					width: .8em;
					min-width: .8em;
					max-width: .8em;
					height: .8em;
					margin-right: .5em;
					padding: 0;
					margin-top: -.15em;
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