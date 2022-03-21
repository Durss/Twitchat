<template>
	<div :class="classes">
		<div class="head">
			<h1 v-if="!listMode">Activity feed</h1>
			<ActivityFeedFilters v-model="filters" class="filters" />
		</div>
		<div  v-if="messages.length > 0" class="messageList">
			<div v-for="(m,index) in messages" :key="m.tags.id">
				<ChatHighlight
					class="message"
					ref="message"
					v-if="m.type == 'highlight'"
					:messageData="m"
					:data-index="index"
					:lightMode="true" />

				<ChatPollResult
					class="message"
					ref="message"
					v-else-if="m.type == 'poll'"
					:pollData="m" />

				<ChatPredictionResult
					class="message"
					ref="message"
					v-else-if="m.type == 'prediction'"
					:predictionData="m" />
			</div>
		</div>

		<div v-if="messages.length == 0" class="noActivity">- No activity yet -</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import Store from '@/store/Store';
import { ActivityFeedData } from '@/utils/IRCEvent';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import ChatHighlight from '../messages/ChatHighlight.vue';
import ChatPollResult from '../messages/ChatPollResult.vue';
import ChatPredictionResult from '../messages/ChatPredictionResult.vue';
import ActivityFeedFilters from './ActivityFeedFilters.vue';

@Options({
	props:{
		listMode: {
			type: Boolean,
			default: false,
		},
	},
	components:{
		ChatHighlight,
		ChatPollResult,
		ChatPredictionResult,
		ActivityFeedFilters,
	}
})
export default class ActivityFeed extends Vue {

	public listMode!:boolean;

	public filters:string = "sub,follow,bits,raid,poll,prediction";
	
	private clickHandler!:(e:MouseEvent) => void;

	public get classes():string[] {
		const res = ["activityfeed"];
		if(this.listMode === true) res.push("listMode");
		return res;
	}
	
	public get messages():ActivityFeedData[] {
		const list = (store.state.activityFeed as ActivityFeedData[])
		.filter(v => v.type == "highlight" || v.type == "poll" || v.type == "prediction");

		const result:ActivityFeedData[] = [];
		
		let items = this.filters.split(",");
		const showSubs = items.indexOf("sub") > -1;
		const showFollow = items.indexOf("follow") > -1;
		const showBits = items.indexOf("bits") > -1;
		const showRaids = items.indexOf("raid") > -1;
		const showRewards = items.indexOf("rewards") > -1;
		const showPolls = items.indexOf("poll") > -1;
		const showPredictions = items.indexOf("prediction") > -1;
		
		for (let i = 0; i < list.length; i++) {
			const m = list[i];
			let type:"bits"|"sub"|"raid"|"reward"|"follow"|"poll"|"prediction"|null = null;
			if(m.type == "poll") {
				type = "poll";
			}else if(m.type == "prediction") {
				type = "prediction";
			}else if(m['msg-id'] == "follow") {
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
			if(type == "poll" && showPolls) result.unshift(m);
			if(type == "prediction" && showPredictions) result.unshift(m);
		}

		Store.set("activityFeedFilters", this.filters);
		
		// if(this.listMode) {
		// 	result.reverse();
		// }

		return result;
	}

	public beforeMount():void {
		const f = Store.get("activityFeedFilters");
		if(f) this.filters = f;
	}

	public async mounted():Promise<void> {

		await this.$nextTick();
		if(!this.listMode) {
			this.clickHandler = (e:MouseEvent) => this.onClick(e);
			document.addEventListener("mousedown", this.clickHandler);
			this.open();
		}
	}

	public beforeUnmount():void {
		if(!this.listMode) {
			document.removeEventListener("mousedown", this.clickHandler);
		}
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

	&.listMode {
		background: none;
		box-shadow: unset;
		flex-grow: 1;
		padding: 0;

		.head {
			top: 5px;
			right: 3px;
		}

		.messageList {
			max-height: unset;
			min-height: auto;
			flex-grow: 1;
			justify-self: flex-end;
		}

		.activityfeed {
			width: 100%;
		}
	}

	.head {
		position: relative;
		h1 {
			color: @mainColor_light;
			align-self: center;
			text-align: center;
			margin-bottom: 10px;
		}

		.filters {
			position: absolute;
			right: 0;
			top: 0;
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