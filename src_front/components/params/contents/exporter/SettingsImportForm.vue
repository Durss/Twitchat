<template>
	<div class="triggerimportform modal">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<h1 class="title"><Icon name="download" /> {{ $t('exporter.importForm.title') }}</h1>
				<ClearButton @click="close()" v-if="!$store.main.nonPremiumLimitExceeded" />
			</div>
			<form @submit.prevent="decrypt()" class="content" v-if="typeof importedSettings.data === 'string'">
				<p class="info"><Icon name="key" />{{ $t('exporter.importForm.dataProtected') }}</p>
				<input type="password" :placeholder="$t('exporter.importForm.dataPassword')" v-model="password" />
				<span class="card-item alert" v-if="decryptError" @click="decryptError = false"><Icon name='alert' />{{ $t('exporter.importForm.dataInvalidPassword') }}</span>
				<TTButton class="submitBt" icon="unlock" type="submit">{{ $t('global.submit') }}</TTButton>
			</form>
			<div class="content" v-else-if="importedSettings.data.version < TRIGGER_SHARED_VERSION">
				<p class="info"><Icon name="alert" />{{ $t('exporter.importForm.dataOld') }}</p>
				<TTButton class="submitBt" icon="cross" @click="close()">{{ $t('global.close') }}</TTButton>
			</div>
			<div class="content" v-else-if="importedSettings.data.autoDelete_at > 0 && importedSettings.data.autoDelete_at < Date.now()">
				<p class="info"><Icon name="alert" />{{ $t('exporter.importForm.dataExpired') }}</p>
				<TTButton class="submitBt" icon="cross" @click="close()">{{ $t('global.close') }}</TTButton>
			</div>
			<div class="content" v-else>
				<p class="info">{{ importedSettings.data.info }}</p>
				<template v-if="importedSettings.data.params.length > 0">
					<h2><Icon name="params" />{{ $t('exporter.importForm.parameters') }}</h2>
					<ul class="paramList">
						<li v-for="(param, index) in importedSettings.data.params" :key="index"
						:class="{paramItem:true, [param.valueType]:true}">
							<div class="holder">
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
								<template v-else-if="param.valueType === 'list'">
									<select :inputId="'field_' + index" v-model="param.value">
										<option :value="undefined" disabled>{{ $t('global.select_placeholder') }}</option>
										<option v-for="(item, idx) in param.listItems!" :key="idx" :value="item">{{ item }}</option>
									</select>
								</template>
							</div>
						</li>
					</ul>
				</template>
				<p class="timer" v-if="importedSettings.data.autoDelete_at > 0">
					<Icon name="info" />{{ $t('exporter.importForm.autoDelete') }}<br />
					<span class="date">{{endAt }}</span>
				</p>

				<ToggleBlock :title="$t('exporter.importForm.details')" :open="false" small>
					<p>{{ $t('exporter.importForm.details_head') }}</p>
					<ul>
						<li v-if="importedSettings.data.triggers?.length > 0" >{{ importedSettings.data.triggers.length }} {{ $t('exporter.importForm.importTypes.triggers', importedSettings.data.triggers.length) }}</li>
						<li v-if="importedSettings.data.counters?.length > 0" >{{ importedSettings.data.counters.length }} {{ $t('exporter.importForm.importTypes.counters', importedSettings.data.counters.length) }}</li>
						<li v-if="importedSettings.data.values?.length > 0" >{{ importedSettings.data.values.length }} {{ $t('exporter.importForm.importTypes.values', importedSettings.data.values.length) }}</li>
						<li v-if="importedSettings.data.labels?.length > 0" >{{ importedSettings.data.labels.length }} {{ $t('exporter.importForm.importTypes.labels', importedSettings.data.labels.length) }}</li>
						<li v-if="importedSettings.data.animatedTexts?.length > 0" >{{ importedSettings.data.animatedTexts.length }} {{ $t('exporter.importForm.importTypes.animatedTexts', importedSettings.data.animatedTexts.length) }}</li>
						<li v-if="importedSettings.data.customTrains?.length > 0" >{{ importedSettings.data.customTrains.length }} {{ $t('exporter.importForm.importTypes.customTrains', importedSettings.data.customTrains.length) }}</li>
						<li v-if="importedSettings.data.endingCreditsSlots?.length > 0" >{{ importedSettings.data.endingCreditsSlots.length }} {{ $t('exporter.importForm.importTypes.endingCreditsSlots', importedSettings.data.endingCreditsSlots.length) }}</li>
						<li v-if="importedSettings.data.timers?.length > 0" >{{ importedSettings.data.timers.length }} {{ $t('exporter.importForm.importTypes.timers', importedSettings.data.timers.length) }}</li>
					</ul>
				</ToggleBlock>
				
				<TTButton class="submitBt" icon="checkmark" @click="doImport" :disabled="!isFormValid" v-tooltip="isFormValid? '' : $t('global.mandatory_fill')" :loading="isLoading">{{ $t('global.import') }}</TTButton>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import ClearButton from '@/components/ClearButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import TTButton from '@/components/TTButton.vue';
import { TRIGGER_SHARED_VERSION, type SettingsExportData, type TriggerImportData } from '@/types/TriggerActionDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		ClearButton,
		ToggleBlock,
		ToggleButton,
	},
	emits:[],
})
class TriggerImportForm extends Vue {

	@Prop
	public importedSettings!:TriggerImportData;

	public password:string = "";
	public isLoading:boolean = false;
	public decryptError:boolean = false;
	public TRIGGER_SHARED_VERSION = TRIGGER_SHARED_VERSION;
	public data:SettingsExportData | null = null;

	public get endAt():string {
		if(typeof this.importedSettings.data === "string") return "";
		if(this.importedSettings.data.autoDelete_at <= 0) return "";
		const d = new Date(this.importedSettings.data.autoDelete_at);
		return Utils.formatDate(d, true, false, false);
	}

	public get isFormValid():boolean {
		if(!this.importedSettings) return false;
		if(typeof this.importedSettings.data === "string") return false;
		if(this.importedSettings.data.params.length === 0) return true;
		for(const p of this.importedSettings.data.params) {
			if(p.valueType === "string" && (typeof p.value !== "string" || p.value.trim().length === 0)) return false;
			if(p.valueType === "number" && (typeof p.value !== "number" || isNaN(p.value))) return false;
			if(p.valueType === "list" && !p.value) return false;
		}
		return true;
	}

	public isErroredField(param:SettingsExportData["params"][number]):boolean {
		if(param.valueType === "string" && (typeof param.value !== "string" || param.value.trim().length === 0)) return true;
		if(param.valueType === "list" && !param.value) return true;
		return false;
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
		Utils.decryptMessage(this.importedSettings.data as string, this.password)
		.then(decrypted => {
			try {
				const data = JSON.parse(decrypted);
				if(data && typeof data === "object" && Array.isArray(data.triggers) && Array.isArray(data.params)) {
					this.importedSettings.data = data;
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
		if(typeof this.importedSettings.data === "string") return;
		this.isLoading = true;
		await this.$store.exporter.importSettings(this.importedSettings.data);
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
		.date {
			margin-left: 1.5em;
		}
	}

	.paramList{
		display:flex;
		flex-direction:column;
		gap:1em;
		max-height:400px;
		counter-reset:index;

		.paramItem {
			list-style-type: none;
			display: flex;
			flex-direction: row;
			padding-right: 1.25em;
			&:before {  
				color: var(--color-text-inverse);
				background-color: var(--color-text);
				border-radius: var(--border-radius);
				font-family: "Azeret";
				align-items: center;
				justify-content: center;
				margin-right: 5px;
				padding: 0 5px;
				counter-increment:index;
				content: counter(index);
			}
			.holder {
				display:inline-flex;
				flex-direction:column;
				gap: .25em;
				margin-left: .5em;
				flex: 1;
	
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
			}

			&.string input[type="text"]{
				width:100%;
			}

			&.number input[type="number"]{
				width:150px;
			}

			&.boolean, &.number, &.list {
				.holder { 
					gap: 1em;
					flex-direction: row;
					.label {
						flex:1;
					}
					select {
						flex-basis: 30%;
					}
				}
			}
		}
	}
	ul {
		margin-left: 1.5em;
		list-style-type: disc;
	}
}
</style>