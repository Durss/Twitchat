<template>
	<div class="shoutoutlist">
		<draggable class="list"
		v-model="$store('users').shoutoutHistory[channelId]" 
		direction="vertical"
		group="users"
		item-key="id"
		:animation="250">
			<template #item="{element, index}:{element:TwitchatDataTypes.ShoutoutHistoryItem, index:number}">
				<div class="item" v-if="element.done === false">
					<img src="@/assets/icons/dragZone.svg" class="drag" v-if="$store('users').shoutoutHistory[channelId]!.length > 1" >
					<img v-if="element.user.avatarPath" :src="element.user.avatarPath" class="avatar">
					<div class="infos">
						<span class="user">{{ element.user.displayName }}</span>
						<span class="delay"><img src="@/assets/icons/timer.svg" class="icon"> {{ idToCooldown[element.id] }}s</span>
					</div>
					<Button :icon="$image('icons/cross_white.svg')" highlight small @click="deleteItem(element)" />
				</div>
			</template>
		</draggable>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import Button from '../Button.vue';

@Component({
	components:{
		Button,
		draggable,
	},
	emits:["close"],
})
export default class ShoutoutList extends Vue {

	public channelId:string = "";
	public idToCooldown:{[key:string]:string} = {};

	private refreshInterval:number = -1;
	private clickHandler!:(e:MouseEvent) => void;

	public beforeMount():void {
		this.channelId = this.$store("auth").twitch.user.id;
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.open();
		this.computeCooldowns();
		this.refreshInterval = setInterval(()=> {
			this.computeCooldowns();
		}, 1000);

		watch(()=>this.$store("users").shoutoutHistory, ()=> {
			this.computeCooldowns();
		}, {deep:true});
		
		console.log(this.$store("users").shoutoutHistory[this.channelId]);
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
		clearTimeout(this.refreshInterval);
	}

	public computeCooldowns():void {
		const list = this.$store("users").shoutoutHistory[this.channelId];
		if(!list) return;
		const lastSODoneIndex = list.filter(v=>v.done === true).findLastIndex(v=>v.done === true);
		const lastSODone = list[lastSODoneIndex];
		let dateOffset = lastSODone? lastSODone.user.channelInfo[this.channelId].lastShoutout as number : 0;
		this.idToCooldown = {};
		let cooldownOffset = 1000;
		let userDone:{[key:string]:boolean} = {};
		console.log(dateOffset);
		for (let i = lastSODoneIndex+1; i < list.length; i++) {
			const item = list[i];
			const userLastSODate = item.user.channelInfo[this.channelId]?.lastShoutout || 0;
			let userCooldown = userLastSODate &&  lastSODone.fake !== false? 60 * 60 * 1000 : 2 * 60 * 1000; //1h cooldown for a user that got a SO, 2min if this user got no SO yet
			if(userDone[item.user.id] === true) {
				userCooldown = 60 * 60 * 1000;
			}
			let cooldown = Math.max(0, userCooldown + cooldownOffset - (Date.now() - dateOffset));
			this.idToCooldown[item.id] = Utils.formatDuration(cooldown);
			cooldownOffset += userCooldown + 1000;
			userDone[item.user.id] = true;
		}
	}

	public deleteItem(item:TwitchatDataTypes.ShoutoutHistoryItem):void {
		const index = this.$store("users").shoutoutHistory[this.channelId]!.findIndex(v=>v.id == item.id);
		this.$store("users").shoutoutHistory[this.channelId]!.splice(index, 1);
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
</script>

<style scoped lang="less">
.shoutoutlist{
	.window();
	width: min-content;
	left: auto;
	right: 0;
	margin-left: auto;
	transform-origin: bottom right;

	.list {
		display: flex;
		flex-direction: column;
		gap: 1em;
	
		.item {
			color:var(--mainColor_light);
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
				background-color: var(--mainColor_dark_light);
			}
			.drag {
				height: .7em;
			}
			.avatar {
				height: 2em;
				border-radius: 50%;
				border: 2px solid var(--mainColor_light);
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
		}
	}
	
}
</style>