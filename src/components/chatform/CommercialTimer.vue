<template>
	<div class="commercialtimer" data-tooltip="Commercial">
		<img src="@/assets/loader/loader_white.svg" alt="loader" class="loader">
		<div>{{timeLeft}}</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class CommercialTimer extends Vue {

	public timeLeft = 0;

	private interval!:number;

	public mounted():void {
		this.refreshTimer();
		this.interval = window.setInterval(()=> this.refreshTimer(), 200);
	}

	public beforeUnmount():void {
		clearInterval(this.interval);
	}

	public refreshTimer():void {
		this.timeLeft = Math.round((store.state.commercialEnd - Date.now())/1000);
		if(this.timeLeft < 0) {
			this.timeLeft = 0;
			store.dispatch("setCommercialEnd", 0);
		}
	}

}
</script>

<style scoped lang="less">
.commercialtimer{
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	margin-left: 5px;
	font-size: 12px;
	font-weight: bold;
	padding-top: 2px;
	width: 25px;
	height: 25px;
	border-radius: 50%;
	color: @mainColor_light;
	background-color: @mainColor_alert;
	position: relative;
	
	.loader {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
	}
}
</style>