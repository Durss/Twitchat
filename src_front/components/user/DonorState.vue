<template>
	<div  :class="classes">
		<div class="title" v-if="light === false">
			<p class="outline">Thank you</p>
			<p class="text">Thank you</p>
		</div>

		<div ref="heart" class="beatingHeart" @click="burstStars(true);">
			<div class="level"><span class="small" v-if="light === false">level</span><br v-if="light === false">{{donorLevel+1}}</div>
			<svg class="image" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
				viewBox="0 0 208.6 202.5" xml:space="preserve">
				<defs>
					<linearGradient :id="'header-shape-gradient-'+donorLevel" x2="0.35" y2=".8">
						<stop offset="0%" :stop-color="'var(--donor-color-'+donorLevel+'-stop)'" />
						<stop offset="30%" :stop-color="'var(--donor-color-'+donorLevel+'-stop)'" />
						<stop offset="100%" :stop-color="'var(--donor-color-'+donorLevel+'-bot)'" />
					</linearGradient>
				</defs>
				<path class="heart_st0" d="M151.6,0c-19.6,0-37,9.9-47.2,25C94,9.9,76.7,0,57.1,0C25.6,0,0,25.6,0,57.1c0,44.2,96.1,145.4,104.3,145.4
					S208.6,101.2,208.6,57.1C208.6,25.6,183.1,0,151.6,0z"/>
				<path class="heart_st1" d="M107.8,20.5l82.8,82.8c6.4-10.4,11.6-20.5,14.7-29.5l-71-71C123.8,6,114.7,12.3,107.8,20.5z"/>
				<g>
					<path class="heart_st0" d="M125.5,28c-1.1-1.1-1.1-2.2,0-3.3l9-9c1.1-1.1,2.2-1.1,3.3,0l3.4,3.4c2.1,2.1,3.2,4.3,3.3,6.6
						c0.1,2.2-0.8,4.3-2.8,6.3c-2,2-4.1,2.9-6.3,2.8c-2.2-0.1-4.4-1.2-6.6-3.3L125.5,28z M129.7,26.9l1.7,1.7c1.2,1.2,2.4,1.8,3.6,1.8
						c1.2,0,2.4-0.6,3.6-1.8c1.2-1.2,1.8-2.4,1.8-3.6c0-1.2-0.6-2.4-1.8-3.6l-1.7-1.7L129.7,26.9z"/>
					<path class="heart_st0" d="M143.3,46.1c-1.2-1.2-2.1-2.6-2.5-4.1c-0.4-1.5-0.4-2.9,0-4.4c0.4-1.5,1.3-2.8,2.5-4.1
						c1.3-1.3,2.6-2.1,4.1-2.6c1.5-0.4,2.9-0.4,4.4,0c1.5,0.4,2.8,1.2,4.1,2.5c1.2,1.2,2.1,2.6,2.5,4.1c0.4,1.5,0.4,2.9,0,4.4
						c-0.4,1.5-1.3,2.8-2.6,4.1c-1.3,1.3-2.6,2.1-4.1,2.5c-1.5,0.4-2.9,0.4-4.4,0C145.9,48.2,144.5,47.3,143.3,46.1z M146,43.4
						c0.9,0.9,1.9,1.3,3.1,1.2c1.2-0.1,2.3-0.8,3.5-1.9c1.1-1.1,1.8-2.3,1.9-3.4c0.1-1.1-0.3-2.2-1.2-3.1c-0.9-0.9-2-1.3-3.1-1.2
						c-1.2,0.1-2.3,0.8-3.4,1.9c-1.1,1.1-1.8,2.3-1.9,3.5C144.7,41.5,145,42.5,146,43.4z"/>
					<path class="heart_st0" d="M152.9,55.7c-1-1-1-2,0-3l9.5-9.5c0.5-0.5,1-0.8,1.6-0.8c0.5,0,1,0.2,1.4,0.6c0.4,0.4,0.6,0.7,0.7,1.1
						c0.1,0.3,0.1,0.8,0,1.4l-1.3,11.3l5.7-5.7c1-1,2-1,3,0c0.5,0.5,0.7,1,0.7,1.5c0,0.5-0.3,1-0.7,1.5l-9.7,9.7
						c-0.4,0.4-0.9,0.7-1.4,0.7c-0.5,0-0.9-0.2-1.3-0.5c-0.4-0.4-0.6-0.8-0.7-1.1c-0.1-0.4-0.1-0.8,0-1.4l1.3-11.3l-5.7,5.7
						C154.9,56.7,153.9,56.7,152.9,55.7z"/>
					<path class="heart_st0" d="M170.5,73.4c-1.2-1.2-2.1-2.6-2.5-4.1c-0.4-1.5-0.4-2.9,0-4.4c0.4-1.5,1.3-2.8,2.5-4.1
						c1.3-1.3,2.6-2.1,4.1-2.6c1.5-0.4,2.9-0.4,4.4,0c1.5,0.4,2.8,1.2,4.1,2.5c1.2,1.2,2.1,2.6,2.5,4.1c0.4,1.5,0.4,2.9,0,4.4
						c-0.4,1.5-1.3,2.8-2.6,4.1c-1.3,1.3-2.6,2.1-4.1,2.5c-1.5,0.4-2.9,0.4-4.4,0C173.1,75.4,171.8,74.6,170.5,73.4z M173.2,70.7
						c0.9,0.9,1.9,1.3,3.1,1.2c1.2-0.1,2.3-0.8,3.5-1.9c1.1-1.1,1.8-2.3,1.9-3.4c0.1-1.1-0.3-2.2-1.2-3.1s-2-1.3-3.1-1.2
						c-1.2,0.1-2.3,0.8-3.4,1.9c-1.1,1.1-1.8,2.3-1.9,3.5C171.9,68.7,172.3,69.8,173.2,70.7z"/>
					<path class="heart_st0" d="M180.3,83.1c-0.5-0.5-0.8-1-0.8-1.6c0-0.6,0.3-1.1,0.8-1.6l9.2-9.2c0.5-0.5,1.1-0.8,1.6-0.8
						c0.6,0,1.1,0.3,1.6,0.8l4.3,4.3c1.4,1.4,2.1,2.8,2.2,4.3c0.1,1.4-0.5,2.8-1.7,4c-0.9,0.9-1.9,1.5-3,1.6c-1.1,0.2-2.2-0.1-3.3-0.7
						c0.5,0.8,0.6,1.8,0.2,2.9l-0.7,2.4c-0.2,0.5-0.4,0.9-0.7,1.2c-0.3,0.3-0.7,0.4-1.1,0.4c-0.4,0-0.9-0.3-1.3-0.7
						c-0.5-0.5-0.7-0.9-0.8-1.4c-0.1-0.5-0.1-1,0.1-1.6l1.3-4.5c0.1-0.4,0.1-0.7,0-1.1s-0.3-0.6-0.6-0.9l-1-1l-3.1,3.1
						c-0.5,0.5-1.1,0.8-1.6,0.8C181.4,83.8,180.8,83.6,180.3,83.1z M188.9,77.7l2.1,2.1c1.3,1.3,2.4,1.4,3.4,0.4c1-1,0.8-2.1-0.4-3.4
						l-2.1-2.1L188.9,77.7z"/>
				</g>
				<g class="heart_st2">
					<path d="M123.2,25c8.5-12.6,22.1-21.6,37.8-24.2c-3.1-0.5-6.2-0.8-9.4-0.8c-14.5,0-27.8,5.4-37.8,14.3
						C99.1,27.7,116.5,37.8,123.2,25z"/>
					<path d="M18.8,57.1c0-28.3,20.7-51.8,47.7-56.3C63.5,0.3,60.3,0,57.1,0C25.6,0,0,25.6,0,57.1c0,44.2,96.1,145.4,104.3,145.4
						c1.3,0,4.6-2.4,9.4-6.7C87.5,172.6,18.8,94.5,18.8,57.1z"/>
					<path d="M107.8,20.5c3.4,22.2,40.1,58.1,75.8,93.6l7-10.9L107.8,20.5z"/>
				</g>
				<path class="heart_shine" d="M166.7,19.8c8.4,4.2,14.7,10.6,18.8,19c2.8,5.8,11.4,0.7,8.6-5c-4.8-9.8-12.7-17.8-22.4-22.6
C166,8.3,161,16.9,166.7,19.8L166.7,19.8z"/>

				<path class="heart_shine" d="M64.8,19.2c8.9,2.9,16.1,8.4,21.4,16.1c3.6,5.3,11.4-1,7.8-6.3c-6.1-9-15.1-15.7-25.5-19.1
C62.5,8,58.7,17.2,64.8,19.2L64.8,19.2z"/>
			</svg>
		</div>
	
		<div class="stars" v-if="light === false">
			<img src="@/assets/icons/follow.svg" alt="heart" class="star" v-for="s in stars" :style="getStarStyles(s)">
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import gsap from 'gsap';
import { watch, type StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		light:{
			type:Boolean,
			default:false,
		},
		level:{
			type:Number,
			default:-1,
		}
	},
	components:{}
})
export default class DonorState extends Vue {

	public light!:boolean;
	public level!:number;

	public disposed = false;
	public stars:StarData[] = [];
	public donorLevel:number = 0;
	
	private prevTs = 0;
	
	public get classes():string[] {
		const res:string[] = ["donorstate"];
		res.push(' lvl_'+this.donorLevel);
		if(this.light !== false) res.push("light");
		return res;
	}
	
	public getStarStyles(s:StarData):StyleValue {
		return {
			opacity: s.a.toString(),
			transform: "translate("+s.x+"px, "+s.y+"px) rotate("+s.r+"deg) scale("+s.s+")",
		}
	}

	public mounted():void {
		this.donorLevel = this.level != -1? this.level : StoreProxy.auth.twitch.user.donor.level;

		watch(()=>this.level, ()=> {
			this.donorLevel = this.level
		})

		if(this.light !== false) return;
		
		const heart = this.$refs.heart as HTMLDivElement;
		gsap.fromTo(heart, {scale:1.2}, {duration:.35, scale:1, ease:"back.out", repeat:-1, repeatDelay:1.5, onRepeat:()=>{
			this.burstStars();
		}});
		gsap.fromTo(heart, {scale:1.15}, {duration:.35, delay:.2, scale:1, ease:"back.out", repeat:-1, repeatDelay:1.5, onRepeat:()=>{
			this.burstStars();
		}});
		
		this.prevTs = Date.now();
		this.renderStars(this.prevTs);
	}

	public beforeUnmount():void {
		this.disposed = true;
		if(this.light !== false) return;
		const heart = this.$refs.heart as HTMLDivElement;
		gsap.killTweensOf(heart);
	}

	public burstStars(clickOrigin:boolean = false):void {
		const heart = this.$refs.heart as HTMLDivElement;
		const donorHolder = this.$el as HTMLDivElement;
		
		if(clickOrigin) {
			gsap.fromTo(heart, {scale:1.2}, {duration:.25, scale:1, ease:"back.out"});
		}
		
		const bounds = heart.getBoundingClientRect();
		// console.log(bounds);
		for (let i = 0; i < 10; i++) {
			const s:StarData = { x:0, vx:0, y:0, vy:0, iy:0, r:0, vr:0, a:1, va:0, s:0};
			const cx = (donorHolder.offsetWidth)/2;
			const cy = (donorHolder.offsetHeight)/2;
			s.x = cx + (Math.random()-Math.random()) * bounds.width/2;
			s.y = cy + (Math.random()-Math.random()) * bounds.height/2;

			const a = Math.atan2(s.y - cy, s.x - cx);

			s.r = Math.random() * 360;
			s.vx = Math.cos(a)*5;
			s.vy = Math.sin(a)*3;
			s.iy = -Math.random()*.1-.05;
			s.vr = (Math.random() - Math.random()) * 30;
			s.va = Math.random()*.025+.01;
			s.s = Math.random()*1+.5;
			this.stars.push(s);
		}
	}

	private renderStars(ts:number):void {
		if(this.disposed) return;
		requestAnimationFrame((ts:number)=>this.renderStars(ts));

		const timeScale = (60/1000) * (ts - this.prevTs);
		this.prevTs = ts;

		for (let i = 0; i < this.stars.length; i++) {
			const s = this.stars[i];
			s.x += s.vx;//Do not multiply by timescale. If perfs are low the hearts run out of screen
			s.y += s.vy * timeScale;
			s.r += s.vr * timeScale;
			s.vx *= .94;//Do not multiply by timescale. If perfs are low the hearts run out of screen
			s.vy += s.iy * timeScale;
			s.a -= s.va * timeScale;
			if(s.a < .01) {
				this.stars.splice(i, 1);
				i--;
			}
		}
	}
}

interface StarData {
	x:number;
	y:number;
	vx:number;
	vy:number;
	iy:number;
	r:number;
	vr:number;
	a:number;
	va:number;
	s:number;
}
</script>

<style scoped lang="less">
.donorstate{

	// background-color: @mainColor_alert;
	color: @mainColor_light;
	padding: 1.5em;
	padding-bottom: 3em;
	border-radius: 1em;
	position: relative;
	// border-radius: 2em;
	// border-bottom-left-radius: 10em;
	// border-bottom-right-radius: 10em;
	background: url('@/assets/icons/follow_alert.svg');
	background-repeat: no-repeat;
	background-position: center center;
	height: 10em;
	user-select: none;
	filter: drop-shadow(0 0 .5em rgba(0,0,0,.25));

	&.light {
		filter: unset;
		height: min-content;
		padding: 0;
		background: unset;
		.beatingHeart {
			height: 3em;
			pointer-events: none;
			position: relative;
			top:0;
			left:0;
			transform: unset;
			.image {
				height: 100%;
				cursor: pointer;
				filter: drop-shadow(0 0 .2em rgba(0,0,0,.25));
			}

			.level {
				font-size: 1.5em;
				top:55%;
			}
		}
	}
	
	.title {
		.center();
		position: absolute;
		pointer-events: none;
		font-family: "Nunito";
		font-size: 3em;
		text-align: center;
		margin: auto;
		margin-top: -2em;
		position: relative;
		z-index: 1;
		width: 180px;
		height: 40px;
		line-height: 2.5em;
		
		.outline {
			position: absolute;
			-webkit-text-stroke: .4em @mainColor_alert;
		}
		.text {
			position: absolute;
			z-index: 1;
			top: 0;
			left: 0;
		}
	}
	
	.subtitle {
		font-size: 1em;
		text-align: center;
	}

	.beatingHeart {
		.center();
		position: absolute;
		z-index: 2;
		will-change: transform;
		height: 5em;
		transition: height .25s;

		&:hover {
			height: 6em;
			.level {
				font-size: 2.75em;
				top:40%;
			}
		}

		.level {
			.center();
			font-family: "Nunito";
			position: absolute;
			// color: @mainColor_alert;
			color:rgba(0, 0, 0, .4);
			font-size: 2em;
			z-index: 1;
			pointer-events: none;
			transition: font-size .25s, top .25s;
			line-height: .6em;
			text-align: center;
			top:40%;
			will-change: font-size, top;
			.small {
				font-size: .4em;
			}
		}

		.image {
			height: 100%;
			cursor: pointer;
			filter: drop-shadow(0 0 .5em rgba(0,0,0,.25));

			.heart_shine{fill:rgba(255, 255, 255, .75);}
			.heart_st0{fill:#FFFFFF;}
			.heart_st1{fill:#BB3C3C;}
			.heart_st2{opacity:0.2;}
		}
	}

	.stars {
		position: absolute;
		top:0;
		left:0;
		z-index: 1;

		.star {
			position: fixed;
			pointer-events: none;
			width: 15px;
			height: 15px;
		}
	}
	
	#header-shape-gradient-2 {
		--donor-color-2-bot: #fff8d3;
		--donor-color-2-stop: #ffd900;
	}
	#header-shape-gradient-4 {
		--donor-color-4-bot: #ffd900;
		--donor-color-4-stop: #07ffc9;
	}
	#header-shape-gradient-5 {
		--donor-color-5-bot: #07ffc9;
		--donor-color-5-stop: #01d9ff;
	}
	#header-shape-gradient-6 {
		--donor-color-6-bot: #01d9ff;
		--donor-color-6-stop: #ff9900;
	}
	#header-shape-gradient-7 {
		--donor-color-7-bot: #ff9900;
		--donor-color-7-stop: #d400ff;
	}
	#header-shape-gradient-8 {
		--donor-color-8-stop: #fa0060;
		--donor-color-8-bot: #d400ff;
	}
	#header-shape-gradient-9 {
		--donor-color-9-bot: #fa0060;
		--donor-color-9-stop: #fadc34;
	}

	&.lvl_1 {
		.beatingHeart>.image>.heart_st0{fill:#fff8b4;}
	}
	&.lvl_2 {
		.beatingHeart>.image>.heart_st0{
			fill: url(#header-shape-gradient-2) #ffd900;
		}
	}
	&.lvl_3 {
		.beatingHeart>.image>.heart_st0{fill:#ffd900;}
	}
	&.lvl_4 {
		.beatingHeart>.image>.heart_st0{
			fill: url(#header-shape-gradient-4) #ffd900;
		}
	}
	&.lvl_5 {
		.beatingHeart>.image>.heart_st0{
			fill: url(#header-shape-gradient-5) #ffd900;
		}
	}
	&.lvl_6 {
		.beatingHeart>.image>.heart_st0{
			fill: url(#header-shape-gradient-6) #ffd900;
		}
		.beatingHeart>.level {
			color: rgba(0, 0, 0, .7);
		}
	}
	&.lvl_7 {
		.beatingHeart>.image>.heart_st0{
			fill: url(#header-shape-gradient-7) #ffd900;
		}
		.beatingHeart>.level {
			color: @mainColor_light;
		}
	}
	&.lvl_8 {
		.beatingHeart>.image>.heart_st0{
			fill: url(#header-shape-gradient-8) #ffd900;
		}
		.beatingHeart>.level {
			color: @mainColor_light;
		}
	}
	&.lvl_9 {
		.beatingHeart>.image>.heart_st0{
			fill: url(#header-shape-gradient-9) #fff;
		}
		.beatingHeart>.level {
			color: @mainColor_light;
		}
	}
}
</style>