<template>
	<div class="triggerslogs sidePanel">
		<div class="head">
			<h1 class="title"><Icon name="broadcast" />{{ $t("triggers.logs.title") }}</h1>
			<div class="subtitle">{{ $t("triggers.logs.subtitle") }}</div>
			<ClearButton @click="close" />
		</div>

		<div class="ctas">
			<TTButton @click="refreshList()" icon="refresh" :loading="reloading">{{ $t("global.refresh") }}</TTButton>
			<TTButton @click="clearList()" icon="trash" alert>{{ $t("global.clear") }}</TTButton>
		</div>

		<div class="content empty" v-if="logs.length == 0 && !reloading">{{ $t("triggers.logs.empty") }}</div>

		<div class="content empty" v-else-if="reloading">
			<Icon class="loader" name="loader" />
		</div>

		<div class="content entries" v-else-if="!reloading">
			<div v-for="item in logs" :key="item.id" :class="getTriggerClasses(item)">
				<div class="head" @click="idToExpandState[item.id] = !idToExpandState[item.id]">
					<div class="infos">
						<img class="icon" :src="$asset('icons/'+getTriggerInfo(item.trigger)?.icon+'.svg')">
						<div class="status" v-tooltip="'error'" v-if="item.error"><img src="@/assets/icons/cross.svg"></div>
						<div class="status" v-tooltip="'critical error'" v-else-if="item.criticalError"><img src="@/assets/icons/alert.svg"></div>
						<div class="status" v-tooltip="'complete'" v-else-if="item.complete"><img src="@/assets/icons/checkmark.svg"></div>
						<div class="status" v-tooltip="'skipped'" v-else-if="item.skipped"><img src="@/assets/icons/skip.svg"></div>
						<div class="status" v-tooltip="'pending'" v-else><Icon name="loader" theme="light" /></div>
						<div class="status" v-tooltip="'started from<br>Test button'" v-if="item.testMode"><img src="@/assets/icons/test.svg"></div>
						<div class="date">{{ getFormatedDime(item.date) }}</div>
						<div class="title" v-if="getTriggerInfo(item.trigger).event?.labelKey">{{ $t(getTriggerInfo(item.trigger).event?.labelKey as string) }}</div>
						<div class="subtitle" v-if="getTriggerInfo(item.trigger)?.label != $t(getTriggerInfo(item.trigger).event?.labelKey as string)">{{ getTriggerInfo(item.trigger)!.label }}</div>
					</div>
					<Icon name="arrowRight" class="arrow" />
				</div>
				<div class="messages" v-if="idToExpandState[item.id] == true">
					<ul class="messages">
						<li v-for="entry in item.entries">
							<template v-if="entry.type == 'message'">
								<span class="date">{{ getFormatedDime(entry.date) }}</span>
								<span>{{ entry.value }}</span>
							</template>
							<template v-else>
								<div :class="getStepClasses(entry)">
									<div :class="getHeadClasses(entry)" @click="idToExpandState[entry.id] = !idToExpandState[entry.id]">
										<span class="date">{{ getFormatedDime(entry.date) }}</span>
										<span>{{ entry.data.type }}</span>
										<Icon name="arrowRight" />
									</div>
									<ul class="messages" v-if="idToExpandState[entry.id]">
										<li v-for="mess in entry.messages">
											<span class="date">{{ getFormatedDime(mess.date) }}</span>
											<span>{{ mess.value }}</span>
										</li>
									</ul>
								</div>
							</template>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TriggerData } from '@/types/TriggerActionDataTypes';
import Logger, { type LogTrigger, type LogTriggerStep } from '@/utils/Logger';
import TriggerUtils from '@/utils/TriggerUtils';
import Utils from '@/utils/Utils';
import { Component, toNative } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
	},
	emits:["close"]
})
class TriggersLogs extends AbstractSidePanel {

	public reloading:boolean = false;

	public idToExpandState:{[key:string]:boolean} = {};

	public get logs():LogTrigger[] {
		return Logger.instance.getLogs("triggers").concat().reverse();
	}

	public getTriggerClasses(log:LogTrigger):string[] {
		const res = ["entry"];
		if(log.error) res.push("secondary");
		if(log.criticalError) res.push("alert");
		if(this.idToExpandState[log.id]) res.push("open");
		return res;
	}

	public getHeadClasses(step:LogTriggerStep):string[] {
		const res = ["head"];
		if(this.idToExpandState[step.id]) res.push("open");
		if(step.error) res.push("secondary");
		return res;
	}

	public getStepClasses(step:LogTriggerStep):string[] {
		const res = ["step"];
		if(step.error) res.push("secondary");
		return res;
	}

	public getTriggerInfo(trigger:TriggerData) {
		return TriggerUtils.getTriggerDisplayInfo(trigger);
	}

	public getFormatedDime(date:number):string {
		const d = new Date(date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes())+":"+Utils.toDigits(d.getSeconds())+"."+Utils.toDigits(d.getMilliseconds(),3);
	}

	public async mounted():Promise<void> {
		this.open();
	}

	public refreshList():void {
		this.reloading = true;
		window.setTimeout(()=>{
			this.reloading = false;
		}, 500)
	}

	public clearList():void {
		Logger.instance.clear("triggers");
		this.refreshList();
	}

}
export default toNative(TriggersLogs);
</script>

<style scoped lang="less">
.triggerslogs{
	.ctas {
		margin-top: 1em;
		gap: .5em;
		display: flex;
		flex-direction: row;
		justify-content: center;
	}

	.entries {
		display: flex;
		flex-direction: column;
		gap: 1em;
	}

	.loader {
		height: 2em;
	}

	.empty {
		text-align: center;
		font-style: italic;
	}

	.entry {
		display: flex;
		flex-direction: column;
		gap: .25em;
		.head {
			display: flex;
			flex-direction: row;
			background-color: var(--color-primary);
			padding: .2em .5em;
			border-radius: .5em;
			color: var(--color-light);
			transition: background-color.25s;
			cursor:pointer;
			.arrow {
				height: 1em;
				justify-self: flex-end;
			}

			.infos {
				gap: .5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				flex-grow: 1;
				.icon {
					height: 1em;
				}
				.status {
					height: 1em;
					img {
						height: 100%;
					}
				}

				.subtitle {
					font-size: .8em;
					background: var(--color-light);
					color: var(--color-primary);
					padding: 1.5px 5px;
					border-radius: 5px;
				}
			}
			&:hover {
				background-color: var(--color-primary-light);
			}
		}

		&.open {
			.head > .arrow {
				transform: rotate(90deg);
			}
		}

		.date {
			font-size: .7em;
		}

		.messages {
			padding-left: .5em;
			font-size: .9em;
			list-style-position: inside;
			display: flex;
			flex-direction: column;
			gap: .5em;

			li {
				.date {
					margin-right: .5em;
				}
				.step {
					display: inline-flex;
					flex-direction: column;
					gap: .25em;
					max-width: 90%;
					.head {
						gap: .5em;
						display: flex;
						flex-direction: row;
						align-items: center;
						align-self: flex-start;
						background-color: var(--color-primary-dark);
						transition: background-color.25s;
						&:hover {
							background-color: var(--color-primary);
						}
						.icon {
							height: 1em;
						}
						&.open {
							.icon {
								transform: rotate(90deg);
							}
						}
						&.secondary {
							background-color: var(--color-secondary-dark);
							&:hover {
								background-color: var(--color-secondary);
							}
						}
					}
				}
			}
		}

		&.secondary {
			.head {
				background-color: var(--color-secondary);
				&:hover {
					background-color: var(--color-secondary-light);
				}
			}
		}
		&.alert {
			.head {
				background-color: var(--color-alert);
				&:hover {
					background-color: var(--color-alert-light);
				}
			}
		}

	}
}
</style>
