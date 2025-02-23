<template>
	<div class="paramstimer parameterContent">
		<Icon name="timer" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="p" keypath="timers.header">
				<template #LINK_TRIGGER>
					<a @click="openTriggers()" target="_blank">{{ $t("timers.header_link_trigger") }}</a>
				</template>
				<template #LINK_OVERLAY>
					<a @click="openOverlays()" target="_blank">{{ $t("timers.header_link_overlay") }}</a>
				</template>
			</i18n-t>
		</div>

		<section>
			<TTButton icon="add" v-if="canCreateTimers" @click="$store.timers.createTimer(); buildParams()">{{ $t('timers.addBt') }}</TTButton>
			<div class="card-item premium premiumLimit" v-else>
				<span>{{$t("timers.premium_limit", {MAX:$config.MAX_TIMERS, MAX_PREMIUM:$config.MAX_TIMERS_PREMIUM})}}</span>
				<TTButton icon="premium" premium light @click="openPremium()">{{ $t("premium.become_premiumBt") }}</TTButton>
			</div>
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
				v-if="!entry.isDefault"
				:open="false" noArrow
				:key="entry.id"
				:editableTitle="!entry.isDefault"
				v-model:title="entry.title"
				titleDefault="..."
				:titleMaxLengh="50"
				@update:title="$store.timers.saveData()">

					<template #left_actions>
						<Icon name="timer" v-if="entry.type == 'timer'" />
						<Icon name="countdown" v-if="entry.type == 'countdown'" />
					</template>
					<template #right_actions>
						<div class="actions" v-if="!entry.isDefault">
							<ToggleButton v-model="entry.enabled"
							@change="console.log(entry.enabled);$store.timers.saveData()"
							@click.stop />
							<TTButton class="actionBt" alert icon="trash" @click.stop="$store.timers.deleteTimer(entry.id)" />
						</div>
					</template>

					<div class="content">
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

						<template v-else>

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

						<div class="timerValue" v-if="entry.startAt_ms">{{ (Math.round(timer2Duration[entry.id]?.duration_ms/100)/10).toFixed(1) }}</div>

						<div class="ctas">
							<TTButton icon="play" v-if="!entry.startAt_ms" @click="$store.timers.timerStart(entry.id); refreshTimers()">Start</TTButton>

							<template v-else>
								<TTButton icon="pause" @click="$store.timers.timerPause(entry.id); refreshTimers()" v-if="!entry.paused">Pause</TTButton>
								<TTButton icon="play" @click="$store.timers.timerUnpause(entry.id); refreshTimers()" v-else>Unpause</TTButton>
								<TTButton icon="stop" @click="$store.timers.timerStop(entry.id); refreshTimers()">Stop</TTButton>
							</template>
						</div>
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
import { Component, toNative, Vue } from 'vue-facing-decorator';
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

	public param_duration:Record<string, TwitchatDataTypes.ParameterData<number>> = {};
	public timer2Duration:Record<string, ReturnType<typeof StoreProxy.timers.getTimerComputedValue>> = {};
	public timer2PlaceholderError:Record<string, boolean> = {};
	public defaultTimerPLaceholder = "";
	public defaultCountdownPLaceholder = "";

	private refreshInterval = -1;

	public get canCreateTimers():boolean {
		if(this.$store.auth.isPremium) return true;
		const count = this.$store.timers.timerList.filter(v=>v.enabled != false).length;
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

		// watch(()=> this.param_placeholder.value, ()=> {
		// 	if(!this.param_placeholder.value) {
		// 		this.param_placeholder.error = false;
		// 		return;
		// 	}
		// 	//Check if a placeholder with the same name already exists
		// 	const timers = this.$store.timers.timerList;
		// 	const placeholder = this.param_placeholder.value.toLowerCase();
		// 	let exists = false;
		// 	for (let i = 0; i < timers.length; i++) {
		// 		const t = timers[i];
		// 		if(t.id == this.editedTimer?.id) continue;
		// 		if(t.placeholderKey && t.placeholderKey.toLowerCase() === placeholder) {
		// 			exists = true;
		// 			continue;
		// 		}
		// 	}
		// 	this.param_placeholder.error = exists;
		// 	this.param_placeholder.errorMessage = exists? this.$t("timers.placholder_conflict") : '';
		// })

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

	.entryList {
		gap: .5em;
		display: flex;
		flex-direction: column;

		// width: 100%;
		width: calc(100% - 2em);
		margin: auto;
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
			.timerValue {
				text-align: center;
				font-variant-numeric: tabular-nums;
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
