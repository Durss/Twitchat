<template>
	<div class="shoutoutlist blured-background-window">
		<draggable class="list"
		v-model="$store.users.pendingShoutouts[channelId]"
		direction="vertical"
		group="users"
		item-key="id"
		:animation="250"
		@end="onMoveItem">
			<template #item="{element, index}:{element:TwitchatDataTypes.ShoutoutHistoryItem, index:number}">
				<div class="item">
					<img src="@/assets/icons/dragZone.svg" class="drag" v-if="$store.users.pendingShoutouts[channelId]!.length > 1" >
					<Button class="deleteBt" icon="cross" small alert @click="deleteItem(element)" />
					<img v-if="element.user.avatarPath && getDelay(element.executeIn) > 0" :src="element.user.avatarPath" class="avatar">
					<Icon name="loader" v-if="getDelay(element.executeIn) <= 0" class="loader" />
					<div class="infos">
						<span class="user">{{ element.user.displayName }}</span>
						<span class="delay"><img src="@/assets/icons/timer.svg" class="icon"> {{ getFormattedDuration(element.executeIn) }}s</span>
					</div>
				</div>
			</template>
		</draggable>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import TTButton from '../TTButton.vue';
import { watch } from 'vue';

@Component({
	components:{
		Button: TTButton,
		draggable,
	},
	emits:["close"],
})
class ShoutoutList extends Vue {

	public channelId:string = "";
	public timerOffset:number = 0;

	private refreshInterval:number = -1;
	private clickHandler!:(e:MouseEvent) => void;

	public getDelay(duration:number) { return Math.floor(duration - (this.timerOffset * 1000)); }

	public getFormattedDuration(duration:number):string {
		return Utils.formatDuration(Math.max(0, Math.floor(duration - (this.timerOffset * 1000))));
	}

	public beforeMount():void {
		this.channelId = this.$store.stream.currentChatChannel.id;
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.open();

		//This interval updates a local timer used to keep updating
		//times even if source data are not actually updated.
		//The source data are updated, as of today, every 5s as defined
		//by the SchedulerHelper that executes only every 5s.
		//This local timer offset is here to get the view updating every
		//seconds even though the data entries are updated every 5s.
		this.refreshInterval = window.setInterval(()=> {
			this.timerOffset ++;
		}, 1000);

		//Watch for any change on the list and reset the local timer
		watch(()=>this.$store.users.pendingShoutouts[this.channelId], ()=> {
			this.timerOffset = 0;
		}, {deep:true});
	}


	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
		clearTimeout(this.refreshInterval);
	}

	public onMoveItem():void {
		//Forces timers refresh
		this.$store.users.executePendingShoutouts();
	}

	public deleteItem(item:TwitchatDataTypes.ShoutoutHistoryItem):void {
		const list = this.$store.users.pendingShoutouts[this.channelId]!;
		const index = list.findIndex(v=>v.id == item.id);
		list.splice(index, 1);
		if(list.length === 0) this.close();
	}

	private open():void {
		const element = this.$el as HTMLDivElement;
		gsap.killTweensOf(element);
		gsap.from(element, {duration:.2, scaleX:0, delay:.1, clearProps:"scaleX", ease:"back.out"});
		gsap.from(element, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
	}

	private close():void {
		const element = this.$el as HTMLDivElement;
		gsap.killTweensOf(element);
		gsap.to(element, {duration:.3, scaleX:0, ease:"back.in"});
		gsap.to(element, {duration:.2, scaleY:0, delay:.1, clearProps:"scaleY, scaleX", ease:"back.in", onComplete:() => {
			this.$emit("close");
		}});
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			//Close if clicking out of the holder
			this.close();
		}
	}

}
export default toNative(ShoutoutList);
</script>

<style scoped lang="less">
.shoutoutlist{
	width: fit-content;
	left: auto;
	right: 0;
	margin-left: auto;
	transform-origin: bottom right;
	color:var(--color-light);

	.list {
		display: flex;
		flex-direction: column;
		gap: 1em;

		.item {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: .5em;
			user-select: none;
			cursor: grab;
			&:active {
				cursor: grabbing;
			}
			&:hover {
				background-color: var(--color-light-fadest);
			}
			&:has(.loader) {
				pointer-events: none;
			}
			.drag {
				height: .7em;
			}
			.avatar, .loader {
				height: 2em;
				border-radius: 50%;
			}
			.infos {
				flex-grow: 1;
				display: flex;
				flex-direction: column;
				gap: .25em;
				.delay {
					display: flex;
					flex-direction: row;
					gap: .25em;
					font-size: .8em;
					font-family: var(--font-roboto);
					.icon {
						height: 1em;
					}
				}
			}

			.deleteBt {
				flex-shrink: 0;
			}
		}
	}

}
</style>
