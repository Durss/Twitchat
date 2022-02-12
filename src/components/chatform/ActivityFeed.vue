<template>
	<div class="activityfeed">
		<div class="head">
			<h1>Activity feed</h1>
			<ActivityFeedFilters v-model="filters" class="filters" />
		</div>
		<div  v-if="messages.length > 0" class="messageList">
			<ChatHighlight
				v-for="(m,index) in messages" :key="m.tags.id"
				class="message"
				ref="message"
				:messageData="m"
				:data-index="index"
				:lightMode="true" />
		</div>

		<div v-if="messages.length == 0" class="noActivity">- No activity yet -</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import Store from '@/store/Store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import ChatHighlight from '../messages/ChatHighlight.vue';
import ActivityFeedFilters from './ActivityFeedFilters.vue';

@Options({
	props:{},
	components:{
		ChatHighlight,
		ActivityFeedFilters,
	}
})
export default class ActivityFeed extends Vue {

	public filters:string = "sub,follow,bits,raid";
	
	private clickHandler!:(e:MouseEvent) => void;
	
	public get messages():IRCEventDataList.Highlight[] {
		const list = (store.state.chatHighlights as IRCEventDataList.Highlight[])
		.filter(v => v.type == "highlight");

		const result:IRCEventDataList.Highlight[] = [];
		
		let items = this.filters.split(",");
		const showSubs = items.indexOf("sub") > -1;
		const showFollow = items.indexOf("follow") > -1;
		const showBits = items.indexOf("bits") > -1;
		const showRaids = items.indexOf("raid") > -1;
		const showRewards = items.indexOf("rewards") > -1;
		
		for (let i = 0; i < list.length; i++) {
			const m = list[i];
			let type:"bits"|"sub"|"raid"|"reward"|"follow"|null = null;
			if(m['msg-id'] == "follow") {
				type = "follow";
			}else if(m.tags.bits) {
				type = "bits";
			}else if(m.methods?.prime) {
				type = "sub";
			}else if(m.methods?.plan) {
				type = "sub";
			}else if(m.recipient) {
				type = "sub";
			}else if(m.tags['message-type'] == "giftpaidupgrade") {
				type = "sub";
			}else if(m.viewers != undefined) {
				type = "raid";
			}else if(m.reward) {
				type = "reward";
			}
			if(type == "sub" && showSubs) result.unshift(m);
			if(type == "reward" && showRewards) result.unshift(m);
			if(type == "raid" && showRaids) result.unshift(m);
			if(type == "bits" && showBits) result.unshift(m);
			if(type == "follow" && showFollow) result.unshift(m);
		}

		Store.set("activityFeedFilters", this.filters);

		return result;
	}

	public beforeMount():void {
		const f = Store.get("activityFeedFilters");
		console.log("MOUTNED", f);
		if(f) this.filters = f;
	}

	public async mounted():Promise<void> {

		await this.$nextTick();
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.open();
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private open():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.2, scaleX:0, delay:.1, clearProps:"scaleX", ease:"back.out"});
		gsap.from(ref, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
	}

	private close():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.3, scaleX:0, ease:"back.in"});
		gsap.to(ref, {duration:.2, scaleY:0, delay:.1, clearProps:"scaleY, scaleX", ease:"back.in", onComplete:() => {
			this.$emit("close");
		}});
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.close();
		}
	}
}
</script>

<style scoped lang="less">
.activityfeed{
	.window();
	// width: min-content;
	right: 0;
	left: auto;
	margin-left: auto;
	transform-origin: bottom center;

	.head {
		position: relative;
		h1 {
			flex-grow: 1;
			color: @mainColor_light;
			align-self: center;
			text-align: center;
			margin-bottom: 10px;
		}

		.filters {
			position: absolute;
			right: 0;
			top: 0;
			z-index: 1;
		}
	}

	.noActivity {
		font-style: italic;
		color: @mainColor_light;
		font-size: 12px;
		text-align: center;
		margin: 15px 0;
		opacity: .5;
	}

	.messageList{
		font-size: 12px;
		max-height: 50vh;
		min-height: 30px;
		overflow-y: auto;
		.message{
			margin: 2px 0;

			:deep(.time) {
				color: fade(#ffffff, 75%);
				margin-right: 5px;
				vertical-align: middle;
			}
		}
	}
}
</style>