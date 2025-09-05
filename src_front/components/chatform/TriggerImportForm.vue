<template>
	<div class="triggerimportform modal">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<h1 class="title"><Icon name="download" /> {{ $t('triggers.importer.title') }}</h1>
				<ClearButton @click="close()" v-if="!$store.main.nonPremiumLimitExceeded" />
			</div>
			<div class="content" v-if="triggerImportData.version < TRIGGER_SHARED_VERSION">
				<p class="info"><Icon name="alert" /> {{ $t('triggers.importer.dataOld') }}</p>
				<TTButton class="submitBt" icon="cross" @click="close()">{{ $t('global.close') }}</TTButton>
			</div>
			<div class="content" v-else-if="triggerImportData.autoDelete_at > 0 && triggerImportData.autoDelete_at < Date.now()">
				<p class="info"><Icon name="alert" /> {{ $t('triggers.importer.dataExpired') }}</p>
				<TTButton class="submitBt" icon="cross" @click="close()">{{ $t('global.close') }}</TTButton>
			</div>
			<div class="content" v-else>
				<p class="info">{{ triggerImportData.info }}</p>
				<p class="timer" v-if="triggerImportData.autoDelete_at > 0">
					<Icon name="info" /> {{ $t('triggers.importer.autoDelete') }}<br />
					<strong>{{endAt }}</strong>
				</p>
				<template v-if="triggerImportData.params.length > 0">
					<h2><Icon name="params" /> {{ $t('triggers.importer.parameters') }}</h2>
					<div class="paramList">
						<div v-for="(param, index) in triggerImportData.params" :key="index"
						:class="{paramItem:true, [param.valueType]:true}">
							<label :for="'field_' + index">{{ param.description }}</label>
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
				<TTButton class="submitBt" icon="checkmark" @click="doImport" :disabled="!isFormValid" :loading="isLoading">{{ $t('global.import') }}</TTButton>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { TRIGGER_SHARED_VERSION, type TriggerExportData } from '@/types/TriggerActionDataTypes';
import { gsap } from 'gsap/gsap-core';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
import ToggleButton from '../ToggleButton.vue';
import TTButton from '../TTButton.vue';
import Utils from '@/utils/Utils';

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
	public triggerImportData!:TriggerExportData;

	public isLoading:boolean = false;
	public TRIGGER_SHARED_VERSION = TRIGGER_SHARED_VERSION

	public get endAt():string {
		if(this.triggerImportData.autoDelete_at <= 0) return "";
		const d = new Date(this.triggerImportData.autoDelete_at);
		return Utils.formatDate(d, true, false, false);
	}

	public get isFormValid():boolean {
		if(!this.triggerImportData) return false;
		if(this.triggerImportData.params.length === 0) return true;
		for(const p of this.triggerImportData.params) {
			if(p.valueType === "string" && (typeof p.value !== "string" || p.value.trim().length === 0)) return false;
			if(p.valueType === "number" && (typeof p.value !== "number" || isNaN(p.value))) return false;
		}
		return true;
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

	public async doImport():Promise<void> {
		if(this.isLoading) return;
		this.isLoading = true;
		await this.$store.triggers.importTriggerData(this.triggerImportData)
		await Utils.promisedTimeout(250);
		this.isLoading = false;
		this.close();
	}

}
export default toNative(TriggerImportForm);
</script>

<style scoped lang="less">
.triggerimportform{
	.holder {
		width: auto;
	}

	.head {
		h1 {
			margin-right: 1em;
		}
	}

	.info {
		line-height: 1.25em;
	}
	
	.content {
		gap: .25em;
		display: flex;
		flex-direction: column;
		.icon {
			height: 1em;
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
		line-height: 1.2em;
		strong {
			margin-left: 1.25em;
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
				font-weight: bold;
				cursor: pointer;
				position: relative;

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