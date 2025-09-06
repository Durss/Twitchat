<template>
	<div class="triggerimportform modal">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<h1 class="title"><Icon name="download" /> {{ $t('triggers.importer.title') }}</h1>
				<ClearButton @click="close()" v-if="!$store.main.nonPremiumLimitExceeded" />
			</div>
			<form @submit.prevent="decrypt()" class="content" v-if="typeof triggerImportData.data === 'string'">
				<p class="info"><Icon name="key" />{{ $t('triggers.importer.dataProtected') }}</p>
				<input type="password" :placeholder="$t('triggers.importer.dataPassword')" v-model="password" />
				<span class="card-item alert" v-if="decryptError" @click="decryptError = false"><Icon name='alert' />{{ $t('triggers.importer.dataInvalidPassword') }}</span>
				<TTButton class="submitBt" icon="unlock" type="submit">{{ $t('global.submit') }}</TTButton>
			</form>
			<div class="content" v-else-if="triggerImportData.data.version < TRIGGER_SHARED_VERSION">
				<p class="info"><Icon name="alert" />{{ $t('triggers.importer.dataOld') }}</p>
				<TTButton class="submitBt" icon="cross" @click="close()">{{ $t('global.close') }}</TTButton>
			</div>
			<div class="content" v-else-if="triggerImportData.data.autoDelete_at > 0 && triggerImportData.data.autoDelete_at < Date.now()">
				<p class="info"><Icon name="alert" />{{ $t('triggers.importer.dataExpired') }}</p>
				<TTButton class="submitBt" icon="cross" @click="close()">{{ $t('global.close') }}</TTButton>
			</div>
			<div class="content" v-else>
				<p class="info">{{ triggerImportData.data.info }}</p>
				<template v-if="triggerImportData.data.params.length > 0">
					<h2><Icon name="params" />{{ $t('triggers.importer.parameters') }}</h2>
					<div class="paramList">
						<div v-for="(param, index) in triggerImportData.data.params" :key="index"
						:class="{paramItem:true, [param.valueType]:true}">
							<p class="label">
								<Icon name="alert" theme="secondary" v-tooltip="$t('global.mandatory')" v-if="isErroredField(param)" />
								<label :for="'field_' + index" v-html="param.description.replace(/(\(.*?\))/gi, '<i>$1</i>')"></label>
							</p>
							<template v-if="param.valueType === 'string'">
								<input type="text" :id="'field_' + index" v-model="param.value" />
							</template>
							<template v-else-if="param.valueType === 'number'">
								<input type="number" :id="'field_' + index" v-model="param.value" />
							</template>
							<template v-else-if="param.valueType === 'boolean'">
								<ToggleButton :inputId="'field_' + index" v-model="param.value" />
							</template>
						</div>
					</div>
				</template>
				<p class="timer" v-if="triggerImportData.data.autoDelete_at > 0">
					<Icon name="info" />{{ $t('triggers.importer.autoDelete') }}<br />
					<p>{{endAt }}</p>
				</p>
				<TTButton class="submitBt" icon="checkmark" @click="doImport" :disabled="!isFormValid" v-tooltip="isFormValid? '' : $t('global.mandatory_fill')" :loading="isLoading">{{ $t('global.import') }}</TTButton>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { TRIGGER_SHARED_VERSION, type TriggerExportData, type TriggerImportData } from '@/types/TriggerActionDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
import ToggleButton from '../ToggleButton.vue';
import TTButton from '../TTButton.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		TTButton,
		ClearButton,
		ToggleButton,
	},
	emits:[],
})
class TriggerImportForm extends Vue {

	@Prop
	public triggerImportData!:TriggerImportData;

	public password:string = "";
	public isLoading:boolean = false;
	public decryptError:boolean = false;
	public TRIGGER_SHARED_VERSION = TRIGGER_SHARED_VERSION;
	public data:TriggerExportData | null = null;

	public get endAt():string {
		if(typeof this.triggerImportData.data === "string") return "";
		if(this.triggerImportData.data.autoDelete_at <= 0) return "";
		const d = new Date(this.triggerImportData.data.autoDelete_at);
		return Utils.formatDate(d, true, false, false);
	}

	public get isFormValid():boolean {
		if(!this.triggerImportData) return false;
		if(typeof this.triggerImportData.data === "string") return false;
		if(this.triggerImportData.data.params.length === 0) return true;
		for(const p of this.triggerImportData.data.params) {
			if(p.valueType === "string" && (typeof p.value !== "string" || p.value.trim().length === 0)) return false;
			if(p.valueType === "number" && (typeof p.value !== "number" || isNaN(p.value))) return false;
		}
		return true;
	}

	public isErroredField(param:TriggerExportData["params"][number]):boolean {
		return param.valueType === "string" && (typeof param.value !== "string" || param.value.trim().length === 0);
	}

	public mounted():void {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		//Don't close if there still are limits exceed
		if(this.$store.main.nonPremiumLimitExceeded) return;

		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public async decrypt():Promise<void> {
		this.decryptError = false;
		Utils.decryptMessage(this.triggerImportData.data as string, this.password).then(decrypted => {
			try {
				const data = JSON.parse(decrypted);
				if(data && typeof data === "object" && Array.isArray(data.triggers) && Array.isArray(data.params)) {
					this.triggerImportData.data = data;
				} else {
					this.decryptError = true;
				}
			} catch (e) {
				this.decryptError = true;
			}
		}).catch(err => {
			console.error("Error decrypting trigger data:", err);
			this.decryptError = true;
		});
		if(!this.decryptError) {
			this.doImport();
		}
	}

	public async doImport():Promise<void> {
		if(this.isLoading) return;
		if(typeof this.triggerImportData.data === "string") return;
		this.isLoading = true;
		await this.$store.triggers.importTriggerData(this.triggerImportData.data);
		await Utils.promisedTimeout(250);
		this.isLoading = false;
		this.close();
	}

}
export default toNative(TriggerImportForm);
</script>

<style scoped lang="less">
.triggerimportform{
	line-height: 1.2em;
	.holder {
		width: auto;
	}

	.head {
		h1 {
			margin-right: 1em;
		}
	}
	
	.content {
		gap: .5em;
		display: flex;
		flex-direction: column;
		.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: bottom;
		}

		.submitBt {
			margin-top: .5em;
			align-self: center;
		}
	}

	h2 {
		font-size: 1.25em;
		align-self: flex-start;
		margin-top: 1em;
	}

	.timer {
		font-size: .9em;
		color: var(--color-text-fade);
		margin-top: .25em;
		font-style: italic;
		p {
			margin-left: 1.5em;
		}
	}

	.paramList{
		display:flex;
		flex-direction:column;
		gap:1em;
		max-height:400px;
		padding-right:5px;
		margin-top:.5em;
		width: calc(100% - 2em);
		align-self: center;

		.paramItem {
			display:flex;
			flex-direction:column;
			gap: .25em;
			margin-left: .5em;
			position: relative;

			&::before {
				content: "•";
				display: inline;
				position: absolute;
				left: -1em;
			}

			label {
				cursor: pointer;
				position: relative;
				white-space: pre-line;

				:deep(i) {
					font-size: .85em;
				}

				&:hover::before {
					content: "";
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					position: absolute;
					filter: blur(5px);
					pointer-events: none;
					background-color: var(--background-color-fadest);
					background: linear-gradient(170deg, var(--background-color-fadest) 0%, transparent 100%);
				}
			}

			&.string input[type="text"]{
				width:100%;
			}

			&.number input[type="number"]{
				width:150px;
			}

			&.boolean, &.number{
				gap: 1em;
				flex-direction: row;
				label {
					flex:1;
				}
			}
		}
	}
}
</style>