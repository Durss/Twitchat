<template>
	<div class="paramstimer parameterContent">
		<Icon name="timer" class="icon" v-if="panelContext == false" />

		<div class="head" v-if="panelContext == false">
			<i18n-t scope="global" tag="p" keypath="timers.header">
				<template #LINK_TRIGGER>
					<a @click="openTriggers()" target="_blank">{{ $t("timers.header_link_trigger") }}</a>
				</template>
				<template #LINK_OVERLAY>
					<a @click="openOverlays()" target="_blank">{{ $t("timers.header_link_overlay") }}</a>
				</template>
			</i18n-t>
		</div>

		<section class="ctas">
			<TTButton icon="add" v-if="canCreateTimers" @click="$store.timers.createTimer(); buildParams()">{{ $t('timers.addBt') }}</TTButton>
			<div class="card-item premium premiumLimit" v-else>
				<span>{{$t("timers.premium_limit", {MAX:$config.MAX_TIMERS, MAX_PREMIUM:$config.MAX_TIMERS_PREMIUM})}}</span>
				<TTButton icon="premium" premium light @click="openPremium()">{{ $t("premium.become_premiumBt") }}</TTButton>
			</div>
			<TTButton icon="overlay" @click="openOverlays()">{{ $t('timers.overlayBt') }}</TTButton>
		</section>

		<draggable class="entryList"
		v-model="$store.timers.timerList"
		direction="vertical"
		group="timers"
		item-key="id"
		:animation="250"
		@sort="rebuildParams()">
			<template #item="{element:entry, index}:{element:TwitchatDataTypes.TimerData, index:number}">
				<ToggleBlock class="timerEntry"
				:open="false" noArrow
				:key="entry.id"
				:editableTitle="!entry.isDefault"
				v-model:title="entry.title"
				titleDefault="..."
				:titleMaxLengh="50"
				@update:title="$store.timers.saveData()">
					<template #left_actions>
						<Icon name="timer" class="timerTypeIcon" v-if="entry.type == 'timer'" />
						<Icon name="countdown" class="timerTypeIcon" v-if="entry.type == 'countdown'" />
						<div class="timerValue" :class="{paused:entry.paused}" v-if="entry.startAt_ms">{{ timer2Duration[entry.id]?.duration_str }}</div>
					</template>

					<template #right_actions>
						<div class="actions" v-if="!entry.isDefault">
							<ToggleButton v-model="entry.enabled"
								@change="$store.timers.saveData()"
								@click.stop
								v-if="entry.enabled || canCreateTimers" />
							<TTButton class="actionBt" @click.stop :copy="entry.id" icon="id" v-tooltip="$t('global.copy_id')" small />
							<TTButton class="actionBt" alert icon="trash" @click.stop="$store.timers.deleteTimer(entry.id)" />
						</div>
						<div class="actions" v-else>
							<TTButton class="actionBt" @click.stop :copy="entry.id" icon="id" v-tooltip="$t('global.copy_id')" small />
						</div>
					</template>

					<div class="content">
						<div class="info" v-if="entry.isDefault">
							<Icon name="info" />
							<i18n-t scope="global" tag="span" :keypath="entry.type == 'timer'? 'timers.panel.hint_timer' : 'timers.panel.hint_countdown'">
								<template v-if="entry.type == 'countdown'" #CMD><mark>/countdown...</mark></template>
								<template v-if="entry.type == 'timer'" #CMD><mark>/timer...</mark></template>
							</i18n-t>
						</div>

						<div class="ctas">
							<TTButton icon="play"
							v-if="!entry.startAt_ms"
							@click="$store.timers.timerStart(entry.id); refreshTimers()"
							:disabled="!entry.enabled"
							v-tooltip="entry.enabled? '' : $t('timers.form.disabled_tt')">Start</TTButton>

							<template v-else>
								<TTButton icon="pause" v-if="!entry.paused"
									@click="$store.timers.timerPause(entry.id); refreshTimers()">Pause</TTButton>
								<TTButton icon="play"  v-else
									@click="$store.timers.timerUnpause(entry.id); refreshTimers()"
									:disabled="!entry.enabled"
									v-tooltip="entry.enabled? '' : $t('timers.form.disabled_tt')">Unpause</TTButton>
								<TTButton icon="stop" @click="$store.timers.timerStop(entry.id); refreshTimers()">Stop</TTButton>
							</template>
						</div>

						<template v-if="!entry.isDefault">
							<SwitchButton v-model="entry.type"
								:icons="['timer', 'countdown']"
								:values="['timer', 'countdown']"
								:labels="[$t('timers.form.param_type_timer'), $t('timers.form.param_type_countdown')]"
								@change="$store.timers.resetTimer(entry.id); $store.timers.saveData(); checkForPlaceholderDuplicates(); refreshTimers();"
							></SwitchButton>

							<template v-if="entry.type == 'countdown'">
								<ParamItem :paramData="param_duration[entry.id]"
								v-model="param_duration[entry.id].value"
								@change="entry.duration_ms = param_duration[entry.id].value * 1000" />
							</template>

							<div class="card-item placeholder"
							:class="{error:timer2PlaceholderError[entry.id]}"
							v-tooltip="$t('timers.form.param_placeholder_tt')">
								<Icon name="placeholder"/>
								<span class="label">{{ $t("timers.form.param_placeholder") }}</span>
								<PlaceholderField class="field"
									v-model="entry.placeholderKey"
									:prefix="entry.type == 'timer'? 'TIMER_' : 'COUNTDOWN_'"
									@change="checkForPlaceholderDuplicates()" />
								<template v-if="timer2PlaceholderError[entry.id]">
									<div class="errorReason" v-if="[defaultTimerPLaceholder, defaultCountdownPLaceholder].includes(entry.placeholderKey)">{{ $t("timers.form.param_placeholder_default_conflict") }}</div>
									<div class="errorReason" v-else>{{ $t("timers.form.param_placeholder_conflict") }}</div>
								</template>
							</div>
						</template>
					</div>
				</ToggleBlock>
			</template>
		</draggable>

	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import PlaceholderField from '@/components/PlaceholderField.vue';
import SwitchButton from '@/components/SwitchButton.vue';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import StoreProxy from '@/store/StoreProxy';
import { rebuildPlaceholdersCache } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import ParamItem from '../ParamItem.vue';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Icon,
		TTButton,
		draggable,
		ParamItem,
		ToggleBlock,
		ToggleButton,
		SwitchButton,
		PlaceholderField,
	},
	emits:[]
})
class ParamsTimer extends Vue implements IParameterContent {

	@Prop({type:Boolean, default:false})
	public panelContext!:boolean;

	public param_duration:Record<string, TwitchatDataTypes.ParameterData<number>> = {};
	public timer2Duration:Record<string, ReturnType<typeof StoreProxy.timers.getTimerComputedValue>> = {};
	public timer2PlaceholderError:Record<string, boolean> = {};
	public defaultTimerPLaceholder = "";
	public defaultCountdownPLaceholder = "";

	private refreshInterval = -1;

	public get canCreateTimers():boolean {
		if(this.$store.auth.isPremium) return this.$store.timers.timerList.length < this.$config.MAX_TIMERS_PREMIUM;
		const count = this.$store.timers.timerList.filter(v=>v.enabled != false).length - 2;
		return count < this.$config.MAX_TIMERS;
	}

	public openTriggers():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}

	public openOverlays():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "timer");
	}

	public mounted(): void {
		this.refreshInterval = window.setInterval(()=>this.refreshTimers(), 100);
		this.defaultTimerPLaceholder = this.$store.timers.timerList.find(v=>v.type == 'timer' && v.isDefault)?.placeholderKey || '';
		this.defaultCountdownPLaceholder = this.$store.timers.timerList.find(v=>v.type == 'countdown' && v.isDefault)?.placeholderKey || '';

		this.buildParams();
	}

	public beforeUnmount(): void {
		clearInterval(this.refreshInterval);
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Opens the premium page
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Builds up local timer list
	 */
	public buildParams():void {
		for (let i = 0; i < this.$store.timers.timerList.length; i++) {
			const element = this.$store.timers.timerList[i];
			if(this.param_duration[element.id] != undefined) continue;
			this.param_duration[element.id] = {type:"duration", value:(element.duration_ms || 60000)/1000, min:0, max:Number.MAX_SAFE_INTEGER, icon:"countdown", labelKey:"timers.form.param_duration"};
			this.timer2PlaceholderError[element.id] = false;
		}
		this.checkForPlaceholderDuplicates();
	}

	/**
	 * Force rebuild of the parameters
	 */
	public rebuildParams():void {
		this.param_duration = {};
		this.timer2PlaceholderError = {};
		this.buildParams();
	}

	/**
	 * Refreshes the running timers values
	 */
	public refreshTimers():void {
		for (let i = 0; i < this.$store.timers.timerList.length; i++) {
			const element = this.$store.timers.timerList[i];
			this.timer2Duration[element.id] = this.$store.timers.getTimerComputedValue(element.id);
		}
	}

	/**
	 * Check for duplicate placeholders
	 */
	public checkForPlaceholderDuplicates() {
		this.$store.timers.timerList.forEach(t=>{
			this.timer2PlaceholderError[t.id] = false;
		});
		for (let i = 0; i < this.$store.timers.timerList.length; i++) {
			const t = this.$store.timers.timerList[i];
			if(!t.placeholderKey) continue;
			for (let j = 0; j < this.$store.timers.timerList.length; j++) {
				const t2 = this.$store.timers.timerList[j];
				if(t2.id == t.id) continue;
				if(t2.type != t.type) continue;
				if(t2.placeholderKey && t2.placeholderKey.toUpperCase() == t.placeholderKey.toUpperCase()) {
					this.timer2PlaceholderError[t.id] = true;
					break;
				}
			}
		}

		rebuildPlaceholdersCache();
	}
}
export default toNative(ParamsTimer);
</script>

<style scoped lang="less">
.paramstimer{

	.premiumLimit {
		white-space: pre-line;
		.button {
			display: flex;
			margin: auto;
			margin-top: .5em;
		}
	}

	.ctas {
		align-items: center;
	}

	.entryList {
		gap: .5em;
		display: flex;
		flex-direction: column;
		// width: 100%;
		width: calc(100% - 2em);
		margin: auto;

		.info{
			text-align: center;
			font-size: .8em;
			margin-bottom: .25em;
			.icon {
				height: 1em;
				margin-right: .5em;
			}
		}

		.actions {
			gap: .25em;
			display: flex;
			flex-direction: row;
			align-items: center;
			margin: calc(-.5em - 1px);
			align-self: stretch;
			.actionBt {
				width: 1.5em;
				min-width: 1.5em;
				border-radius: 0;
				align-self: stretch;
				&:last-child {
					margin-left: -.25em;//avoid gap between buttons without putting them in a dedicated container
				}
			}
		}

		.timerTypeIcon {
			width: 1em;
			z-index: 1;
		}

		.timerValue {
			display: flex;
			text-align: center;
			font-variant-numeric: tabular-nums;
			background-color: var(--color-primary-fade);
			border-radius: 0;
			align-self: stretch;
			align-items: center;
			margin: calc(-.5em - 1px) 0;
			margin-left: -2em;
			padding: 0 .5em;
			padding-left: 2em;

			&.paused {
				background-color: var(--color-secondary-fader);
			}
		}

		.content {
			display: flex;
			flex-direction: column;
			gap: .25em;

			.placeholder {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				row-gap: .25em;
				.icon {
					width: 1em;
					height: 1em;
					margin-right: .5em;
				}
				.label {
					flex-grow: 1;
					justify-self: flex-start;
				}

				&.error {
					background-color: var(--color-alert-fader);

					.errorReason {
						background-color: var(--color-alert);
						margin: -.5em;
						margin-top: 0;
						padding: .25em;
						width: calc(100% + 1em);
						text-align: center;
					}
				}
			}
			.ctas {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				gap: .25em;
				justify-content: center;
			}
		}
	}
}
</style>
