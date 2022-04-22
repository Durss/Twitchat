<template>
	<div class="activityfeedfilters">
		<Button @click="opened = !opened" :icon="require('@/assets/icons/filters.svg')" small />
		<div class="list" v-if="opened">
			<div class="row">
				<label for="AF_subs" @click="showSubs = !showSubs">Subs</label>
				<ToggleButton id="AF_subs" small clear v-model="showSubs" @change="onChange()" />
			</div>
			<div class="row">
				<label for="AF_follows" @click="showFollow = !showFollow; onChange();">Follows</label>
				<ToggleButton id="AF_follow" small clear v-model="showFollow" @change="onChange()" />
			</div>
			<div class="row">
				<label for="AF_bits" @click="showBits = !showBits; onChange();">Bits</label>
				<ToggleButton id="AF_bits" small clear v-model="showBits" @change="onChange()" />
			</div>
			<div class="row">
				<label for="AF_raids" @click="showRaids = !showRaids; onChange();">Raids</label>
				<ToggleButton id="AF_raids" small clear v-model="showRaids" @change="onChange()" />
			</div>
			<div class="row">
				<label for="AF_rewards" @click="showRewards = !showRewards; onChange();">Rewards</label>
				<ToggleButton id="AF_rewards" small clear v-model="showRewards" @change="onChange()" />
			</div>
			<div class="row">
				<label for="AF_polls" @click="showPolls = !showPolls; onChange();">Polls</label>
				<ToggleButton id="AF_polls" small clear v-model="showPolls" @change="onChange()" />
			</div>
			<div class="row">
				<label for="AF_prediction" @click="showPredictions = !showPredictions; onChange();">Predictions</label>
				<ToggleButton id="AF_prediction" small clear v-model="showPredictions" @change="onChange()" />
			</div>
			<div class="row">
				<label for="AF_bingo" @click="showBingos = !showBingos; onChange();">Bingos</label>
				<ToggleButton id="AF_bingo" small clear v-model="showBingos" @change="onChange()" />
			</div>
			<div class="row">
				<label for="AF_raffle" @click="showRaffles = !showRaffles; onChange();">Raffles</label>
				<ToggleButton id="AF_raffle" small clear v-model="showRaffles" @change="onChange()" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleButton from '../ToggleButton.vue';

@Options({
	props:{
		modelValue:{type:String, default: ""},
	},
	components:{
		Button,
		ToggleButton,
	},
	emits: ['update:modelValue'],
})
export default class ActivityFeedFilters extends Vue {
	
	public modelValue!:string;

	public opened:boolean = false;

	public showSubs:boolean = true;
	public showFollow:boolean = true;
	public showBits:boolean = true;
	public showRaids:boolean = true;
	public showRewards:boolean = true;
	public showPolls:boolean = true;
	public showPredictions:boolean = true;
	public showBingos:boolean = true;
	public showRaffles:boolean = true;

	private clickHandler!:(e:MouseEvent) => void;

	public mounted():void {
		let items = this.modelValue.split(",");
		this.showSubs = items.indexOf("sub") > -1;
		this.showFollow = items.indexOf("follow") > -1;
		this.showBits = items.indexOf("bits") > -1;
		this.showRaids = items.indexOf("raid") > -1;
		this.showRewards = items.indexOf("rewards") > -1;
		this.showPolls = items.indexOf("poll") > -1;
		this.showPredictions = items.indexOf("prediction") > -1;
		this.showBingos = items.indexOf("bingo") > -1;
		this.showRaffles = items.indexOf("raffle") > -1;
		
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	public onChange():void {
		const data:string[] = [];
		if(this.showSubs) data.push("sub");
		if(this.showFollow) data.push("follow");
		if(this.showBits) data.push("bits");
		if(this.showRaids) data.push("raid");
		if(this.showRewards) data.push("rewards");
		if(this.showPolls) data.push("poll");
		if(this.showPredictions) data.push("prediction");
		if(this.showBingos) data.push("bingo");
		if(this.showRaffles) data.push("raffle");
		
		this.$emit("update:modelValue", data.join(","));
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.opened = false
		}
	}

}
</script>

<style scoped lang="less">
.activityfeedfilters{
	display: flex;
	flex-direction: column;
	position: relative;

	.list {
		right: 0;
		padding: 5px;
		border-radius: 5px;
		position: absolute;
		background-color: @mainColor_dark_light;
		box-shadow: 0px 0px 10px 0px rgba(0,0,0,1);

		.row {
			display: flex;
			flex-direction: row;
			align-items: center;
			vertical-align: middle;
			margin-bottom: 3px;
			label {
				font-size: 14px;
				color: @mainColor_light;
				flex-grow: 1;
				margin: 0;
				margin-right: 5px;
				cursor: pointer;
			}
		}
	}
	
}
</style>