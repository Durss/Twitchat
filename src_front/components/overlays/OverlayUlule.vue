<template>
	<div class="overlayulule">
		<div class="progressbar" id="holder">
			<div class="fill" id="fill" :style="fillStyle"></div>
			<div class="infos" id="infos">
				<div class="title" id="title">{{ title }}</div>
				<div class="values" id="values">
					<div class="value" id="value">{{ value }}{{ currency }}</div>
					<div class="percent" id="percent">{{ Math.round(percent) }}%</div>
					<div class="goal" id="goal" >{{ currentGoal }}{{ currency }}</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import ApiHelper from '@/utils/ApiHelper';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
class OverlayUlule extends Vue {

	public title:string = "";
	public currentGoal:number = 0;
	public mainGoal:number = 0;
	public percent:number = 0;
	public value:number = 0;
	public currency:string = "$";

	private timeout:number = -1;

	public get fillStyle() {
		let res:{[key:string]:string} = {};
		res.width = this.percent + "%";
		return res;
	}

	public beforeMount():void {
		this.refreshData();
	}

	public async refreshData():Promise<void> {
		let project = Utils.getQueryParameterByName("project");
		if(!project) return;
		let goals = Utils.getQueryParameterByName("goals");
		this.currency = Utils.getQueryParameterByName("currency") || "$";

		try {
			const apiRes = await ApiHelper.call("ulule/project", "GET", {project});
			if(apiRes.status == 200) {
				const projectData = apiRes.json;
				this.title = Utils.getQueryParameterByName("title") || projectData.name_en || projectData.name_fr || projectData.name_ca || projectData.name_de || projectData.name_es || projectData.name_it || projectData.name_pt || projectData.name_nl;
				this.mainGoal = projectData.goal;
				this.currentGoal = this.mainGoal;
				// this.value = Utils.pickRand([27562,95545,130015,101258]);
				this.value = projectData.amount_raised;

				if(goals) {
					let customGoals = goals.split(/[^a-z0-9_]+/gi).map(v=> parseInt(v)).filter(v=> !isNaN(v)).sort((a,b)=>a-b);
					for (let i = 1; i < customGoals.length; i++) {
						const g = customGoals[i]!;
						const gP = customGoals[i-1]!;
						if(gP <= this.value && g > this.value) {
							this.currentGoal = g;
							break;
						}
					}
				}

				gsap.to(this, {percent:Math.round(this.value / this.currentGoal * 100), duration:.5, ease:"sine.out"});
			}
		}catch(error){
			//ignore
			console.log(error);
		}

		this.timeout = window.setTimeout(()=>{
			this.refreshData();
		}, 3000);
	}

	public beforeUnmount():void {
		clearTimeout(this.timeout);
	}
}
export default toNative(OverlayUlule);
</script>

<style scoped lang="less">
.overlayulule{
	padding: 1em;
	width: 100%;
	height: 100%;
	@maxHeight: ~"min(100vh, 25vw)";
	@minFontSize: calc(@maxHeight/3);
	.progressbar {
		width: 100%;
		height: 100%;
		position: relative;
		background-color: var(--color-primary-fadest);
		border-radius: var(--border-radius);
		box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
		overflow: hidden;
		.fill {
			top: 0;
			left: 0;
			height: 100%;
			position: absolute;
			background-color: var(--color-primary);
		}
		.infos {
			padding: .2em;
			font-size: ~"min(@{minFontSize}, 50vh)";
			position: relative;
			z-index: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-direction: column;
			height: 100%;
			.title {
				flex-grow: 1;
				text-align: center;
				align-self: center;
				justify-self: center;
				display: flex;
				align-items: center;
				font-weight: bold;
			}
			.values {
				display: flex;
				width: 100%;
				flex-direction: row;
				justify-content: space-between;
				font-size: .7em;
			}
		}
	}
}
</style>
