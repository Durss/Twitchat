<template>
	<div class="triggerslogs sidePanel">
		<div class="head">
			<h1 class="title">{{ $t("triggers.logs.title") }}</h1>
			<div class="subtitle">{{ $t("triggers.logs.subtitle") }}</div>
			<CloseButton @click="close" />
		</div>
		
		<div class="ctas">
			<Button @click="refreshList()" icon="refresh" :loading="reloading">{{ $t("global.refresh") }}</Button>
			<Button @click="clearList()" icon="trash" alert>{{ $t("global.clear") }}</Button>
		</div>
		
		<div class="content empty" v-if="logs.length == 0 && !reloading">{{ $t("triggers.logs.empty") }}</div>
		
		<div class="content empty" v-else-if="reloading">
			<Icon class="loader" name="loader" />
		</div>
		
		<div class="content entries" v-else-if="!reloading">
			<div v-for="item in logs" :key="item.id" :class="getTriggerClasses(item)">
				<div class="head" @click="idToExpandState[item.id] = !idToExpandState[item.id]">
					<img class="icon" :src="$image('icons/'+getTriggerInfo(item.trigger)?.icon+'.svg')">
					<div class="status" v-tooltip="'error'" v-if="item.error"><img src="@/assets/icons/cross.svg"></div>
					<div class="status" v-tooltip="'critical error'" v-if="item.criticalError"><img src="@/assets/icons/alert.svg"></div>
					<div class="status" v-tooltip="'complete'" v-if="item.complete"><img src="@/assets/icons/checkmark.svg"></div>
					<div class="status" v-tooltip="'skipped'" v-else-if="item.skipped"><img src="@/assets/icons/skip.svg"></div>
					<div class="status" v-tooltip="'pending'" v-else><Icon name="loader" theme="light" /></div>
					<div class="status" v-tooltip="'started from<br>Test button'" v-if="item.testMode"><img src="@/assets/icons/test.svg"></div>
					<div class="date">{{ getFormatedDime(item.date) }}</div>
					<div class="title" v-if="getTriggerInfo(item.trigger).event?.labelKey">{{ $t(getTriggerInfo(item.trigger).event?.labelKey as string) }}</div>
					<div class="subtitle" v-if="getTriggerInfo(item.trigger)?.label != $t(getTriggerInfo(item.trigger).event?.labelKey as string)">{{ getTriggerInfo(item.trigger)!.label }}</div>
				</div>
				<div class="messages" v-if="idToExpandState[item.id] == true">
					<ul class="messages">
						<li v-for="mess in item.messages">
							<span class="date">{{ getFormatedDime(mess.date) }}</span>
							<span>{{ mess.value }}</span>
						</li>
					</ul>
				</div>
				<div class="steps" v-if="idToExpandState[item.id] == true">
					<div v-for="step in item.steps" class="step">
						<div class="head" @click="idToExpandState[step.id] = !idToExpandState[step.id]">
							<span class="date">{{ getFormatedDime(step.date) }}</span>
							<span>{{ step.data.type }}</span>
						</div>
						<ul class="messages" v-if="idToExpandState[step.id]">
							<li v-for="mess in step.messages">
								<span class="date">{{ getFormatedDime(mess.date) }}</span>
								<span>{{ mess.value }}</span>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TriggerData, TriggerLog } from '@/types/TriggerActionDataTypes';
import Utils from '@/utils/Utils';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		Button,
		CloseButton,
	},
	emits:["close"]
})
export default class TriggersLogs extends AbstractSidePanel {

	public reloading:boolean = false;

	public idToExpandState:{[key:string]:boolean} = {};

	public get logs():TriggerLog[] {
		return TriggerActionHandler.instance.logHistory;
	}

	public getTriggerClasses(log:TriggerLog):string[] {
		const res = ["entry"];
		if(log.error) res.push("secondary");
		if(log.criticalError) res.push("alert");
		return res;
	}

	public getTriggerInfo(trigger:TriggerData) {
		return Utils.getTriggerDisplayInfo(trigger);
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
		setTimeout(()=>{
			this.reloading = false;
		}, 500)
	}

	public clearList():void {
		TriggerActionHandler.instance.logHistory.splice(0);
		this.refreshList();
	}

}
</script>

<style scoped lang="less">
.triggerslogs{
	.head {
		flex-shrink: 1;
	}
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
			align-items: center;
			gap: .5em;
			background: var(--color-primary);
			padding: .2em .5em;
			border-radius: .5em;
			color: var(--color-button);
			cursor:pointer;

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

		.date {
			font-size: .7em;
		}

		.steps {
			padding-left: 1.5em;
			display: flex;
			flex-direction: column;
			gap: .5em;
			.step {
				display: flex;
				flex-direction: column;
				gap: .25em;
				.head {
					align-self: flex-start;
					background-color: var(--color-secondary);
				}
			}
		}
		.messages {
			padding-left: .5em;
			font-size: .9em;
			list-style-position: inside;
			li {
				.date {
					margin-right: .5em;
				}
			}
		}

		&.secondary {
			.head {
				background: var(--color-secondary);
			}
		}
		&.alert {
			.head {
				background: var(--color-alert);
			}
		}

	}
}
</style>