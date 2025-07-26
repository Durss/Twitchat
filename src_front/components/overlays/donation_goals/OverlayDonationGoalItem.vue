<template>
	<div :class="['overlaydonationgoalitem', skin]"
	:data-index="index"
	v-if="data.visible">
		<div ref="holder"
		:style="styles"
		:class="{
			holder:true, current:data.distanceToCurrentIndex === 0 || state == 'closing',
			active:data.distanceToCurrentIndex <= 0,
			secret:data.goalItem.secret && data.percent < 1,
			blur: data.goalItem.secret_type != 'progressive',
			progressive: data.goalItem.secret_type == 'progressive',
			questionMarks: data.percent < .1
		}">
			<div class="content" id="content" ref="content">
				<span class="amount goal" id="amount" v-if="data.distanceToCurrentIndex === 0">{{ getFormattedNumber(currentValue) }}<span class="currency" v-if="overlayParams.currency">{{ overlayParams.currency }}</span></span>
				<div class="label" id="title">
					<span class="title" v-if="data.goalItem.secret !== true || data.goalItem.secret_type !== 'progressive'">{{ data.goalItem.title }}</span>
					<TextSplitter class="title" ref="textSplitter" :message="data.goalItem.title" v-else></TextSplitter>
					<div class="mystery">???</div>
				</div>
				<span class="amount" id="amount">{{ getFormattedNumber(data.goalItem.amount) }}<span class="currency" v-if="overlayParams.currency">{{ overlayParams.currency }}</span></span>
				<div class="hideTimer" id="timer" v-if="data.hidePercent > 0" :style="{width:data.hidePercent+'%'}"></div>
				<div class="shine" ref="shines" v-for="i in 2"></div>
			</div>

			<template v-for="(p, i) in particles">
				<svg v-if="i%2==0" :key="'star_'+i" ref="particle"
				class="particle"
				id="particle"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 67.79 64.47">
					<polygon points="33.9 64.47 44.8 43.84 67.79 39.85 51.54 23.1 54.84 0 33.9 10.28 12.95 0 16.25 23.1 0 39.85 22.99 43.84 33.9 64.47"/>
				</svg>

				<svg v-if="i%2==1" :key="'heart_'+i" ref="particle"
				class="particle"
				id="particle"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 62.69 59.22">
					<path d="M44.46,0c-5.15,0-9.79,2.14-13.11,5.57-3.32-3.43-7.96-5.57-13.11-5.57C8.16,0,0,8.16,0,18.24c0,17.84,31.35,40.98,31.35,40.98,0,0,31.35-22.75,31.35-40.98C62.69,8.16,54.53,0,44.46,0Z"/>
				</svg>
			</template>
			<slot></slot>
		</div>
	</div>
</template>

<script lang="ts">
import TextSplitter from '@/components/chatform/TextSplitter.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import { watch, type ComponentPublicInstance, type CSSProperties } from 'vue';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		TextSplitter,
	},
	emits:[],
})
class OverlayDonationGoalItem extends Vue {

	@Prop()
	public overlayParams!:TwitchatDataTypes.DonationGoalOverlayConfig;

	@Prop()
	public data!:TwitchatDataTypes.DonationGoalOverlayItem;

	@Prop()
	public index!:number;

	@Prop()
	public currentValue!:number;

	@Prop()
	public skin!:string;

	@Prop()
	public colors!:{base:string, fill:string, background:string};

	public localPercent:number = 0;
	public state:""|"opened"|"opening"|"closed"|"closing" = "";
	public particles:{x:number, y:number, r:number, s:number, a:number, v:number}[] = [];

	private prngSeed:number = Math.random()*99999;

	public get color():string { return this.colors.base; }
	public get color_fill():string { return this.colors.fill; }
	public get color_background():string { return this.colors.background; }

	public get styles():CSSProperties {
		return {
			backgroundPositionX: (1 - this.localPercent)*100+"%",
		}
	}

	public getFormattedNumber(num:number):number {
		return Math.round(num*100)/100;
	}

	public beforeMount():void {
		this.localPercent = this.data.percent;
		if(this.data.percent >= 1) {
			this.data.visible = false;
		}

		watch(()=>this.data.percent, async () => this.onPercentUpdate());
		watch(()=>this.data.goalItem.title, async () => this.onPercentUpdate());
		watch(()=>this.data.goalItem.secret, async () => this.onPercentUpdate());
		watch(()=>this.data.goalItem.secret_type, async () => this.onPercentUpdate());
		watch(()=>this.data.distanceToCurrentIndex, ()=> this.onRender());
		watch(()=>this.overlayParams.limitEntryCount, ()=> this.onRender());
		watch(()=>this.overlayParams.maxDisplayedEntries, ()=> this.onRender());
		watch(()=>this.overlayParams.hideDone, ()=> this.onRender());

		this.initParticles();
	}

	public mounted():void {
		// this.open();
		this.data.visible = false;
		this.state = "closed";
		this.onRender();
		this.onPercentUpdate();
	}

	/**
	 * Initializes particles
	 */
	private initParticles():void {
		for (let i = 0; i < 20; i++) {
			this.particles.push({
				a:Math.random() * Math.PI * 2,
				r:Math.random() * Math.PI * 2,
				v:Math.random() * .5 + .25,
				s:(Math.random()-Math.random())*.5 + 1,
				x:0,
				y:0,
			})
		}
	}

	/**
	 * Makes opening animation
	 */
	private async open():Promise<void> {
		this.stopParticles();
		if(this.state == "opened") return Promise.resolve();
		if(this.state == "opening") return Promise.resolve();

		this.state = "opening";
		this.data.visible = true;
		await this.$nextTick();
		return new Promise<void>((resolve)=>{
			const content = this.$refs.content as HTMLDivElement;
			this.data.hidePercent = 0;
			this.onPercentUpdate();
			gsap.killTweensOf(this.data);
			gsap.killTweensOf(content);
			gsap.from(this.$refs.holder as HTMLElement, {delay:this.index*.03, borderBottom:0, duration:.25, ease:"quad.out", clearProps:"padding,borderBottom"});
			gsap.from(content, {padding:0, scaleY:0, height:0, delay:this.index*.03, duration:.25, ease:"quad.out", clearProps:"scaleY,height", onComplete:()=>{
				this.state = "opened";
				resolve();
			}});
		})
	}

	/**
	 * Close the item when complete
	 */
	private async close():Promise<void> {
		const hideDelay = this.overlayParams.hideDelay ?? 10;

		//First show item if hidden in case it's goal is filled
		//Necessary if next items are hidden and we get a donation that
		//validates multiple goals at once
		if(hideDelay && this.localPercent === 0 && this.data.percent >= 1) {
			await this.open();
		}

		const content = this.$refs.content as HTMLDivElement
		if(!content) return;
		if(this.state == "closed") return;
		if(this.state == "closing") return;
		gsap.killTweensOf(this.data);
		gsap.killTweensOf(content);

		if(this.data.percent >= 1 && this.overlayParams.hideDone === true) {
			this.state = "closing";
			if(hideDelay > 0) {
				//if goal reached burst particles and show autohide timer if requested
				await new Promise<void>((resolve)=>{
					this.burstParticles();
					this.data.hidePercent = 0;
					//Show hide timer
						gsap.fromTo(this.data, {hidePercent:100}, {hidePercent:0, duration:hideDelay, ease:"none", onComplete:() => {
							this.state = "closed";
							this.stopParticles();
							resolve();
						}});
				});

			// }else{
			// 	this.data.visible = false;
			// 	this.state = "closed";
			// 	this.stopParticles();
			}
			gsap.to(this.$refs.holder as HTMLElement, {delay:this.index*.03, borderBottom:0, duration:.25, ease:"quad.out", clearProps:"padding,borderBottom"});
			gsap.to(content, {scaleY:0, height:0, padding:0, duration:.25, ease:"quad.in", clearProps:"scaleY,height,padding", onComplete:()=>{
				this.data.visible = false;
				this.state = "closed";
			}});
		}else{
			gsap.to(this.$refs.holder as HTMLElement, {delay:this.index*.03, borderBottom:0, duration:.25, ease:"quad.out", clearProps:"padding,borderBottom"});
			gsap.to(content, {scaleY:0, height:0, padding:0, duration:.25, ease:"quad.in", clearProps:"scaleY,height,padding", onComplete:()=>{
				this.data.visible = false;
				this.state = "closed";
			}});
		}
	}

	private async onRender():Promise<void> {
		const maxDist = this.overlayParams.limitEntryCount? this.overlayParams.maxDisplayedEntries || 0 : 999999;

		let showAll = !this.overlayParams.limitEntryCount;
		let shouldHide = this.overlayParams.hideDone && this.data.percent >= 1;
		let isWithinRange = showAll || (Math.abs(this.data.distanceToCurrentIndex) <= maxDist && this.data.distanceToCurrentIndex >= 0);

		let newState:typeof this.state = "";
		// if(shouldHide) newState = "closed";
		// else if(showAll || isWithinRange) newState = "opened";

		if(isWithinRange || this.localPercent < this.data.percent) newState = "opened";
		if(!isWithinRange || shouldHide) newState = "closed";

		// console.log(this.data.goalItem.amount, "=>", newState);
		switch(newState) {
			case "opened": {
				this.open();
				break;
			}
			case "closed": {
				this.close();
				break;
			}
		}
	}

	/**
	 * Burst particles
	 */
	public async stopParticles():Promise<void> {
		await this.$nextTick();
		for (let i = 0; i < this.particles.length; i++) {
			const index = i%this.particles.length;
			const particle = (this.$refs.particle as HTMLOrSVGElement[])[index];
			gsap.killTweensOf(particle);
			gsap.set(particle, {opacity:0});
		}
	}

	/**
	 * Burst particles
	 */
	public burstParticles():void {
		const holder = this.$el;
		if(!holder || !holder.getBoundingClientRect) return;
		const bounds = holder.getBoundingClientRect();
		const hideDelay = this.overlayParams.hideDelay ?? 10;

		const shines = this.$refs.shines as HTMLDivElement[];
		for (let i = 0; i < shines.length; i++) {
			const shine = shines[i];
			gsap.fromTo(shine, {opacity:Math.random()*.5+.5, left:-(Math.random()*100 + 100)+"%"}, {left:"100%", duration:.5 + Math.random()*.8, ease:"sine.inOut", delay:.5})
		}

		gsap.killTweensOf(holder);
		gsap.fromTo(holder, {scaleX:1.15}, {scaleX:1, ease:"elastic.out", duration:1, clearProps:"scaleX"});
		gsap.fromTo(holder, {scaleY:1.25}, {scaleY:1, ease:"elastic.out", duration:1, clearProps:"scaleY", delay:.07});

		for (let i = 0; i < this.particles.length; i++) {
			const index = i%this.particles.length;
			const percent = i/this.particles.length;
			const params = this.particles[index];
			const particle = (this.$refs.particle as HTMLOrSVGElement[])[index];
			gsap.killTweensOf(particle);

			// params.a = percent*Math.PI*2;
			// params.x = bounds.width * .5 + Math.cos(params.a) * bounds.width * .25 * Math.random();
			// params.y = bounds.height * .5 + Math.sin(params.a) * bounds.height * .25 * Math.random();

			// const endX = params.x + Math.cos(params.a) * params.v * bounds.width * .75;
			// const endY = params.y + Math.sin(params.a) * params.v * bounds.height;
			// const endR = params.r + (Math.random()-Math.random()) * Math.PI;
			// const delay = Math.random() * .1;
			// const duration = Math.random() * .5 + .75;

			params.a = percent*Math.PI*2;
			params.x = -bounds.width * .25;
			params.y = (Math.random()-Math.random()) * bounds.height + bounds.height*.5;

			// const endX = params.x + Math.cos(params.a) * params.v * bounds.width * .75;
			// const endY = params.y + Math.sin(params.a) * params.v * bounds.height;
			const endX = params.x + bounds.width * 2;
			const endY = (Math.random()-Math.random()) * bounds.height + bounds.height*.5;
			const endR = params.r + (Math.random()-Math.random()) * Math.PI;
			const duration = Math.random()*2 + 1;
			const delay = i/this.particles.length * 5;
			const opacity = Math.random()*.8 + .2;


			gsap.fromTo(particle,
						{left:params.x, top:params.y, scale:params.s, opacity},
						{left:endX, top:endY, ease:"none", duration, delay, repeat:Math.max(2, hideDelay)});

			gsap.fromTo(particle,
						{rotate:params.r+"rad"},
						{rotate:endR+"rad", ease:"none", duration, delay, repeat:Math.max(2, hideDelay)});
		}
	}

	private async onPercentUpdate():Promise<void> {
		gsap.to(this, {localPercent:this.data.percent, duration:.5, ease:"sine.inOut", onComplete:()=>{
			if(this.data.percent >= 1 && !this.overlayParams.hideDone) {
				this.burstParticles();
			}
		}});

		//Unblur mystery goals if needed
		if(this.data.visible && this.data.goalItem.secret && this.data.goalItem.secret_type == "progressive") {
			await this.$nextTick();

			const prng = Utils.seededRandom(this.prngSeed);
			let letters = [...(this.$refs.textSplitter as ComponentPublicInstance).$el.querySelectorAll(".letter")];
			for (let i = letters.length - 1; i > 0; i--) {
				const j = Math.floor(prng() * (i + 1));
				[letters[i], letters[j]] = [letters[j], letters[i]];
			}

			const revealedCount = Math.floor(this.data.percent * letters.length);
			for (let i = 0; i < letters.length; i++) {
				const node = letters[i];
				if(i < revealedCount) {
					node.classList.remove("blur");
				}else{
					node.classList.add("blur");
				}
			}
		}
	}

}
export default toNative(OverlayDonationGoalItem);
</script>

<style scoped lang="less">
.overlaydonationgoalitem{
	.holder {
		color: v-bind(color);
		background-color: v-bind(color_background);
		background-image: linear-gradient(90deg, v-bind(color_fill) 50%, transparent 50%);
		background-position-x: 100%;
		background-size: 200%;
		border-radius: .5em;
		border-bottom: .3em solid v-bind(color);
		width: 100vw;
		max-width: 33em;
		position: relative;
		overflow: hidden;
		opacity: .6;
		transition: opacity .5s, transform .5s, margin .5s;
		will-change: transform;
		transform: scale(.8);
		margin: -.5em 0;
		.content {
			gap: 1em;
			display: flex;
			flex-direction: row;
			align-items: center;
			position: relative;
			z-index: 1;
			padding: .5em;

			.amount {
				font-weight: bold;
				font-size: 2.5em;
				// flex-basis: 2em;
				flex-shrink: 0;
				.currency {
					font-size: .6em;
					font-weight: normal;
				}
				&.goal {
					font-size: 1.1em;
				}
			}
			.label {
				position: relative;
				text-align: center;
				flex-grow: 1;
				margin-right: 1.25em;

				.title {
					white-space: pre-line;
					font-size: 1.5em;
					font-weight: bold;
					transition: filter 2s, background-color 2s;
				}

				.mystery {
					position: absolute;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					font-weight: bold;
					font-size: 3em;
					z-index: 2;
					opacity: 0;
					transition: opacity 1s;
				}
			}

			.hideTimer {
				position: absolute;
				bottom: 0;
				left: 0;
				height: .2em;
				background: v-bind(color);
				opacity: .5;
				width: 50%;
			}

			.shine {
				position: absolute;
				top: 0;
				left: -100%;
				width: 100%;
				height: 100%;
				z-index: 3;
				// background-color: red;
				background-image: linear-gradient(120deg, transparent 0, transparent 17%, #ffffffA0 20%, #ffffffA0 30%, transparent 100%);
			}
		}

		&.secret {
			.label {
				.title {
					display: inline;
					:deep(.letter) {
						transition: filter 1s;
						&.blur {
							transition: filter 0s;
							filter: blur(.25em);
						}
					}
				}
				.mystery {
					opacity: 1;
				}
			}
			&.progressive {
				&:not(.questionMarks) {
					.mystery{
						opacity: 0;
					}
				}
			}
			&.blur {
				.label {
					.title {
						filter: blur(.25em);
					}
				}
			}
		}

		&.active {
			opacity: 1;
			// overflow: visible;
		}

		&.current {
			opacity: 1;
			transform: scale(1);
			margin: 0;
			// overflow: visible;
		}
	}

	.particle {
		top: 200%;
		left: 200%;
		width: 2em;
		height: 2em;
		position: absolute;
		color: v-bind(color);
		transform-origin: center;
		transform: translate(-50%, -50%);
		&:nth-child(odd) {
			filter: brightness(2);
			// color: v-bind(color_background);
		}
		path, polygon {
			fill:currentColor;
		}
	}

	&.etc {
		.holder{
			color: white;
			border: 2px solid #92ffff;
			background-color: #020617;
			&.active {
				background-image: linear-gradient(90deg, #92ffff50 50%, transparent 50%);
			}
			.amount {
				font-size: 1.5em;
			}

			.hideTimer {
				background: #92ffff;
			}
			.particle {
				color: #a26cf3;

				&:nth-child(odd) {
					color: white;
				}
				path, polygon {
					fill: currentColor;
				}
			}
		}
	}
}
</style>
