<template>
	<div class="migration-fixer-modal modal">
		<div class="dimmer" ref="dimmer"></div>
		<div class="holder" ref="holder">
			<Icon name="broadcast" class="icon" />
			<div class="head">
				<h1 v-if="step == 'init'">{{ $t('migrationFix.title1') }}</h1>
				<h1 v-if="step == 'info'">{{ $t('migrationFix.title2') }}</h1>
				<h1 v-if="step == 'trigger'">{{ $t('migrationFix.fix', { INDEX: triggerIndex+1, TOTAL: triggers.length }) }}</h1>
				<h1 v-if="step == 'end'">{{ $t('migrationFix.title3') }}</h1>
			</div>
			<div class="content" v-if="step == 'init'">
				<span class="info" v-html="$t('migrationFix.intro')"></span>
				<TTButton class="nextBt" icon="arrowRight" @click="step = 'info'">{{ $t('migrationFix.next') }}</TTButton>
			</div>

			<div class="content" v-if="step == 'info'">
				<span class="info" v-html="$t('migrationFix.info', { COUNT: triggers.length })"></span>
				<TTButton class="nextBt" icon="arrowRight" @click="step = 'trigger'">{{ $t('migrationFix.next') }}</TTButton>
			</div>

			<Transition name="fade">
				<div class="content" v-if="step == 'trigger' && !fadeTrigger">
					<Splitter theme="secondary">{{ $t('migrationFix.splitter_triggers') }}</Splitter>
					<div class="triggers">
						<i18n-t tag="p" scope="global" keypath="migrationFix.change1">
							<template #TRIGGER_ACTION>
								<strong>{{ $t('triggers.actions.common.action_http') }}</strong>
							</template>
							<template #TRIGGER_NAME>
								<mark v-tooltip="currentTrigger!.tooltip">{{ currentTrigger!.triggerInfo?.label }}</mark>
							</template>
						</i18n-t>
						<TriggerActionEntry
							noHeaderOptions
							class="httpAction"
							:readonly="false"
							:action="currentTrigger!.action"
							:index="0"
							:obsScenes="[]"
							:obsSources="[]"
							:obsInputs="[]"
							:rewards="[]"
							:extensions="[]"
							:triggerData="currentTrigger!.trigger" />
						<span class="center"><i>{{ $t('migrationFix.expand') }}</i></span>
						<span class="gap"></span>
						<span v-html="$t('migrationFix.change2')"></span>
						<TriggerActionEntry
							noHeaderOptions
							class="jsonAction"
							:readonly="false"
							:action="currentTrigger!.jsonAction"
							:index="0"
							:obsScenes="[]"
							:obsSources="[]"
							:obsInputs="[]"
							:rewards="[]"
							:extensions="[]"
							:triggerData="currentTrigger!.trigger" />
						<span class="center"><i>{{ $t('migrationFix.expand') }}</i></span>
					</div>

					<Splitter theme="secondary">{{ $t('migrationFix.splitter_summary') }}</Splitter>
					<div class="summary">
						<ul>
							<li>{{ $t('migrationFix.summary.call') }}<mark>{{ currentTrigger!.action.url }}</mark></li>
							<li>{{ $t('migrationFix.summary.save') }}<mark>{{ currentTrigger!.action.outputPlaceholder }}</mark></li>
							<li>
								<span>{{ $t('migrationFix.summary.extract') }}<mark>{{ currentTrigger!.action.outputPlaceholder }}</mark></span>
								<ul>
									<i18n-t scope="global" keypath="migrationFix.summary.json" tag="li"
									v-for="p in currentTrigger!.jsonAction.jsonExtractData.outputPlaceholderList" :key="p.placeholder">
										<template #JSON_PATH>
											<mark>{{ p.path }}</mark>
										</template>
										<template #PLACEHOLDER>
											<mark>{{ p.placeholder }}</mark>
										</template>
									</i18n-t>
								</ul>
							</li>
						</ul>
					</div>

					<div class="ctas">
						<TTButton icon="cross" @click="nextTrigger()" alert>{{ $t('migrationFix.reject') }}</TTButton>
						<TTButton icon="checkmark" @click="acceptChanges()" primary>{{ $t('migrationFix.accept') }}</TTButton>
					</div>
				</div>
			</Transition>

			<div class="content" v-if="step == 'end'">
				<p class="info">{{ $t('migrationFix.end') }}</p>
				<TTButton class="nextBt" icon="cross" @click="close();">{{ $t('migrationFix.close') }}</TTButton>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import { TriggerSubTypeLabel, type TriggerActionHTTPCallData, type TriggerActionJSONExtractData, type TriggerData } from '@/types/TriggerActionDataTypes';
import TriggerUtils from '@/utils/TriggerUtils';
import Utils from '@/utils/Utils';
import { reactive } from 'vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import InfiniteList from '../InfiniteList.vue';
import TTButton from '../TTButton.vue';
import TriggerActionEntry from '../params/contents/triggers/TriggerActionEntry.vue';
import Splitter from '../Splitter.vue';

@Component({
	components: {
		TTButton,
		Splitter,
		InfiniteList,
		TriggerActionEntry,
	},
	emits: ["close"]
})
class MigrationFixerModal extends Vue {

	public step: "init" | "info" | "trigger" | "end" = "init";
	public triggerIndex = 0;
	public fadeTrigger = false;
	public UPDATED = "";
	public NEW = "";

	public get currentTrigger() { return this.triggers[this.triggerIndex]; }

	public get triggers() {
		const triggerList = this.$store.triggers.triggerList;
		return this.$store.main.httpMigrationFixData.map(v=> {
			const trigger = JSON.parse(JSON.stringify(triggerList.find(t => t.id == v.triggerId))) as TriggerData;
			const action = trigger?.actions.find(t => t.id == v.httpActionId) as TriggerActionHTTPCallData;
			const triggerInfo = trigger ? TriggerUtils.getTriggerDisplayInfo(trigger) : undefined;
			action.enabled = true;
			action.outputPlaceholder = "HTTP_RESULT";
			const jsonAction:TriggerActionJSONExtractData = {
				id: Utils.getUUID(),
				type: "json_extract",
				enabled:true,
				jsonExtractData:{
					sourcePlaceholder: action.outputPlaceholder,
					outputPlaceholderList: v.jsonPlaceholders,
				}
			}
			return reactive({
				oldTrigger:v.oldTriggerData,
				oldTriggerAction:v.oldTriggerAction,
				trigger,
				originalAction: trigger?.actions.find(t=>t.id == v.httpActionId),
				triggerInfo,
				actionId: v.httpActionId,
				action,
				placeholders: v.jsonPlaceholders,
				jsonAction,
				tooltip: triggerInfo && triggerInfo.descriptionKey ? this.$t(triggerInfo.descriptionKey, {SUB_ITEM_NAME: TriggerSubTypeLabel(trigger)}) : ""
			})
		}).filter(v => v.trigger && v.oldTriggerAction);
	}

	public beforeMount():void {
		this.UPDATED = `"${this.$t("migrationFix.updated")}"`;
		this.NEW = `"${this.$t("migrationFix.new")}"`;
	}

	public acceptChanges():void {
		const triggerList = this.$store.triggers.triggerList;
		const entry = this.$store.main.httpMigrationFixData[this.triggerIndex]!;

		const trigger = triggerList.find(t => t.id == entry.triggerId);
		if(trigger) {
			const action = trigger.actions.find(t => t.id == entry.httpActionId) as TriggerActionHTTPCallData;
			action.outputPlaceholder = "HTTP_RESULT";
			trigger.actions.splice(trigger.actions.indexOf(action)+1, 0, this.triggers[this.triggerIndex]!.jsonAction);
			this.$store.triggers.saveTriggers();
			DataStore.save(true);
		}

		this.nextTrigger();
	}

	public async nextTrigger():Promise<void> {
		if(this.triggerIndex == this.triggers.length-1) {
			this.step = "end";
			return;
		}
		this.fadeTrigger = true
		await Utils.promisedTimeout(200);
		this.triggerIndex ++;
		await this.$nextTick();
		this.fadeTrigger = false
	}

	public close():void {
		DataStore.emergencyBackupStorage(true);
		this.$emit('close');
	}
}
export default toNative(MigrationFixerModal);
</script>

<style lang="less" scoped>
.migration-fixer-modal {
	.highlightField(@content: v-bind(UPDATED)) {
		position: relative;
		outline: 2px solid var(--color-secondary);
		background-color: var(--color-secondary-fadest);

		&::before {
			position: absolute;
			content: @content;
			background-color: var(--color-secondary);
			top: 0;
			left: 0;
			color: var(--color-light);
			padding: .25em .5em;
			font-size: .8em;
			font-weight: bold;
			z-index: 1;
			border-top-left-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);
		}
	}

	.nextBt {
		flex-direction: row-reverse;
		margin: auto;
		margin-top: 1em;
	}
	.holder {
		max-width: 600px;
		line-height: 1.2em;

		.head {
			gap: .25em;
			flex-direction: column;
			h1{
				margin: auto;
			}
			.triggerName {
				// margin: auto;
				margin-top: .5em;
				text-align: center;
			}
		}

		&>.icon {
			margin: auto;
			width: 3em;
			height: 3em;
		}

		.content {
			gap: .5em;
			display: flex;
			flex-direction: column;

			.triggers, .summary {
				width: 90%;
				margin: auto;
			}
			.triggers {
				gap: .5em;
				display: flex;
				flex-direction: column;
				margin-bottom: 1em;
			}
			
			h1 {
				margin-bottom: .5em;
			}

			.info {
				white-space: pre-line;
			}
			.gap {
				margin-top: 1em;
			}
			.center {
				text-align: center;
				margin-top: -.5em;
				opacity: .7;
				font-size: .8em;
			}

			mark {
				cursor: default;
			}

			.ctas {
				gap: 1em;
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: center;
				margin-top: 1em;
			}

			.httpAction:deep([data-type="placeholder"]):not(:hover) {
				.highlightField();
			}

			.jsonAction:deep([data-type="list"]):not(:hover) {
				.highlightField("ON_NEW");
			}

			.jsonAction:deep([data-type="list"]):not(:hover),
			.jsonAction:deep(.item):not(:hover) {
				.highlightField(v-bind(NEW));
			}

			mark {
				font-size: .8em;
				word-break: break-all;
			}

			ul {
				list-style-position: inside;
				display: flex;
				flex-direction: column;
				gap: .35em;
				ul {
					padding-left: 1em;
					margin-top: .35em;
				}
			}
		}
	}

	.fade-enter-active {
		transition: all 0.2s;
	}

	.fade-leave-active {
		transition: all 0.2s;
	}

	.fade-enter-from,
	.fade-leave-to {
		opacity: 0;
	}
}
</style>
