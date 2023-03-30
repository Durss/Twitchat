<template>
	<div class="triggerslogs">
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Triggers logs</span>
				<Button :aria-label="$t('stream.closeBt_aria')" :icon="$image('icons/cross.svg')" @click="close()" class="close" bounce/>
			</div>
			
			<Button class="refreshBt" title="Refresh" @click="refreshList()" :loading="reloading" bounce/>
			
			<div class="content empty" v-if="logs.length == 0 && !reloading">
				- No history -
			</div>
			
			<div class="content entries" v-else-if="!reloading">
				<div v-for="item in logs" :key="item.id" class="entry">
					<div class="head" @click="idToExpandState[item.id] = !idToExpandState[item.id]">
						<img class="icon" :src="$image('icons/'+getTriggerInfo(item.trigger)?.icon+'.svg')">
						<div class="status" data-tooltip="complete" v-if="item.complete"><img src="@/assets/icons/checkmark_white.svg"></div>
						<div class="status" data-tooltip="skipped" v-else-if="item.skipped"><img src="@/assets/icons/skip.svg"></div>
						<div class="status" data-tooltip="pending" v-else><img src="@/assets/loader/loader_white.svg"></div>
						<div class="status" data-tooltip="started from<br>'Test' button" v-if="item.testMode"><img src="@/assets/icons/test.svg"></div>
						<div class="date">{{ getFormatedDime(item.date) }}</div>
						<div class="title">{{ $t(getTriggerInfo(item.trigger).event?.labelKey as string) }}</div>
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
	</div>
</template>

<script lang="ts">
import type { TriggerData, TriggerLog } from '@/types/TriggerActionDataTypes';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';

@Component({
	components:{
		Button,
	},
	emits:["close"]
})
export default class TriggersLogs extends Vue {

	public reloading:boolean = false;

	public idToExpandState:{[key:string]:boolean} = {};

	public get logs():TriggerLog[] {
		return TriggerActionHandler.instance.logHistory;
	}

	public getTriggerInfo(trigger:TriggerData) {
		return Utils.getTriggerDisplayInfo(trigger);
	}

	public getFormatedDime(date:number):string {
		const d = new Date(date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes())+":"+Utils.toDigits(d.getSeconds())+"."+Utils.toDigits(d.getMilliseconds(),3);
	}

	public async mounted():Promise<void> {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public refreshList():void {
		this.reloading = true;
		setTimeout(()=>{
			this.reloading = false;
		}, 500)
	}

}
</script>

<style scoped lang="less">
.triggerslogs{
	.modal();
	
	.refreshBt {
		margin: 1em auto 0 auto;
	}

	.entries {
		display: flex;
		flex-direction: column;
		gap: 1em;
	}

	.empty {
		text-align: center;
		font-style: italic;
	}

	.entry {
		display: flex;
		flex-direction: column;
		font-size: .8em;
		gap: .25em;
		.head {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: .5em;
			background: @mainColor_normal;
			padding: .25em .5em;
			border-radius: .5em;
			color:@mainColor_light;
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
				background: @mainColor_light;
				color: @mainColor_normal;
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
					background-color: @mainColor_normal_light;
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

	}
}
</style>