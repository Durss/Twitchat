<template>
	<div class="overlaybitswall">
		<canvas ref="displacement"></canvas>
		<canvas ref="textures" style="opacity:1"></canvas>
	</div>
</template>

<script lang="ts">
import { Component } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import * as Matter from "matter-js";
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import cheer1 from "@/assets/img/bitswall/1.png";
import cheer1_tex from "@/assets/img/bitswall/1_tex.png";
import cheer100 from "@/assets/img/bitswall/100.png";
import cheer100_tex from "@/assets/img/bitswall/100_tex.png";
import cheer1000 from "@/assets/img/bitswall/1000.png";
import cheer1000_tex from "@/assets/img/bitswall/1000_tex.png";
import cheer5000 from "@/assets/img/bitswall/5000.png";
import cheer5000_tex from "@/assets/img/bitswall/5000_tex.png";
import cheer10000 from "@/assets/img/bitswall/10000.png";
import cheer10000_tex from "@/assets/img/bitswall/10000_tex.png";

//Do not declare this as a class prop to avoid every props from
//being reactive
let engine!:Matter.Engine;
@Component({
	components:{},
	emits:[],
})
export default class OverlayBitsWall extends AbstractOverlay {

	public engineReady:boolean = false;

	private interval:number = -1;
	private disposed:boolean = false;
	private textures:HTMLImageElement[] = [];
	private displacements:HTMLImageElement[] = [];
	private textureCtx!:CanvasRenderingContext2D;
	private bitsHandler!:(e:TwitchatEvent)=>void;

	public beforeMount():void {
		this.bitsHandler = (e:TwitchatEvent) => this.onBits(e);
		PublicAPI.instance.addEventListener(TwitchatEvent.BITS, this.bitsHandler);
	}

	public mounted():void {
		this.createEngine();
		// this.interval = setInterval(()=>{
		// 	const scales = {
		// 		1:.05,
		// 		100:.15,
		// 		1000:.25,
		// 		5000:.35,
		// 		10000:.45,
		// 	};
		// 	const bits = Utils.pickRand([1,100,1000,5000,10000]);
		// 	this.createCheermote(bits, Utils.pickRand([0,1,2,3,4,5,6,7])/7 * 2 + scales[bits || 1]);
		// }, 100);
		this.onBits(new TwitchatEvent("BITS",{
				channel:"",
				message:"",
				message_chunks:[],
				user: {
					id:"",
					login:"durss",
					displayName:"Durss",
				},
				bits:109999,
				// bits:100000,
				pinned:true,
				pinLevel:7,
			}));
		this.buildTextures();
	}

	public beforeUnmount():void {
		while(engine.world.bodies.length > 0) {
			const b = engine.world.bodies[0];
			Matter.Composite.remove(engine.world, b);
		}
		this.disposed = true;
		this.engineReady = false;
		clearInterval(this.interval);
		PublicAPI.instance.removeEventListener(TwitchatEvent.BITS, this.bitsHandler);
	}
	
	public requestInfo():void {
		
	}

	public async onBits(e:TwitchatEvent):Promise<void> {
		const data = (e.data as unknown) as {
			channel:string;
			message:string;
			message_chunks:TwitchatDataTypes.ParseMessageChunk[] | undefined;
			user: {
				id:string;
				login:string;
				displayName:string;
			},
			bits:number;
			pinned:boolean;
			pinLevel:number;
		};
		const scales = {
			1:.2,
			100:.4,
			1000:.55,
			5000:.75,
			10000:1,
		};
		const bits = data.bits;//Utils.pickRand([1,100,1000,5000,10000]);
		function decomposeNumber(number: number, values: number[]): number[] {
			values.sort((a, b) => b - a); // Sort the values in descending order

			const decomposedValues: number[] = [];

			for (const value of values) {
				while (number >= value) {
				decomposedValues.push(value);
				number -= value;
				}
			}

			return decomposedValues;
		}
		const res = Utils.shuffle(decomposeNumber(bits, [1,100,1000,5000,10000]));
		for (let i = 0; i < res.length; i++) {
			const bits = res[i]
			await Utils.promisedTimeout(100);
			if(this.disposed) return;
			// (data.pinLevel || 0)/7 * 2
			const scaleOffset = (data.pinLevel || 0)/7 + 1;
			this.createCheermote(bits, scaleOffset * scales[bits || 1]);
		}

	}

	private buildTextures():void {
		const textures = [
			cheer1_tex,
			cheer100_tex,
			cheer1000_tex,
			cheer5000_tex,
			cheer10000_tex,
		];
		const displacements = [
			cheer1,
			cheer100,
			cheer1000,
			cheer5000,
			cheer10000,
		];

		textures.forEach(v=> {
			const img = new Image();
			img.src = v;
			this.textures.push(img);
		})

		displacements.forEach(v=> {
			const img = new Image();
			img.src = v;
			this.displacements.push(img);
		})
	}

	/**
	 * Creates a cheermote instance
	 * 
	 * @param bits 
	 * @param scale 
	 */
	private createCheermote(bits:number, scale:number):void {

		const vertices_1 = [[{x:0, y:128}, {x:157, y:128}, {x:79, y:0}]];
		const vertices_100 = [[{x:0, y:89}, {x:50, y:128}, {x:101, y:90}, {x:50, y:0}]];
		const vertices_1000 = [[{x:64, y:0}, {x:0, y:62}, {x:32, y:128}, {x:95, y:128}, {x:128, y:62}]];
		const vertices_5000 = [[{x:56, y:0}, {x:0, y:45}, {x:0, y:82}, {x:56, y:128}, {x:112, y:82}, {x:112, y:45}]];
		const vertices_10000 = [
			[{x:110, y:0}, {x:74, y:22}, {x:38, y:85}, {x:37, y:128}, {x:74, y:105}, {x:110, y:43}],
			[{x:0, y:64}, {x:38, y:85}, {x:110, y:85}, {x:147, y:64}, {x:110, y:43}, {x:38, y:43}],
			[{x:110, y:128}, {x:110, y:85}, {x:74, y:22}, {x:37, y:0}, {x:38, y:43}, {x:74, y:105}],
		];
		
		const density = {"1":.001, "100":.005, "1000":.025, "5000":.05, "10000":.1}[bits.toString()] as number;
		const frictionAir = {"1":.05, "100":.01, "1000":.01, "5000":.001, "10000":.0}[bits.toString()] as number;
		const index = {"1":0, "100":1, "1000":2, "5000":3, "10000":4}[bits.toString()] as number;
		const path = [vertices_1, vertices_100, vertices_1000, vertices_5000, vertices_10000][index || 0];

		path.forEach(p => {
			p.forEach(v=> {
				v.x *= scale;
				v.y *= scale;
			})
		});
		const displace = Matter.Bodies.fromVertices(document.body.clientWidth*.25, -200, path, {
													label:"cheermote,"+index+","+scale, 
													restitution:.35,
													render:{
														visible:false,
													},
													// density,
													// frictionAir,
												});
		Matter.Composite.add(engine.world, displace);
	}

	/**
	 * Crates the game engine
	 */
	private async createEngine():Promise<void> {
		const textureCnv = this.$refs.textures as HTMLCanvasElement;
		this.textureCtx = textureCnv.getContext("2d")!;

		engine = Matter.Engine.create({enableSleeping: false});
		const canvas = this.$refs.displacement as HTMLCanvasElement;
		canvas.width = textureCnv.width = document.body.clientWidth/2;
		canvas.height = textureCnv.height = document.body.clientHeight;
		
		let renderer = Matter.Render.create({
			canvas,
			bounds:{
				max:{x:document.body.clientWidth/2, y:document.body.clientHeight},
				min:{x:0, y:0},
			},
			engine: engine,
			options: {
				background:"transparent",
				wireframeBackground:"transparent",
				width:document.body.clientWidth/2,
				height:document.body.clientHeight,
				wireframes:true,
			},
		});

		engine.world.gravity.y = 2;
		engine.render = renderer;
		this.engineReady = true;
		Matter.Render.run(renderer);

		//create floor
		let floor = Matter.Bodies.rectangle(document.body.clientWidth/4,
											document.body.clientHeight+25+1,
											document.body.clientWidth/2, 50,
											{ isStatic: true, label:"fix", render:{visible:false} });
		Matter.Composite.add(engine.world, [floor]);

		this.renderFrame();
	}

	/**
	 * Render the game
	 */
	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(_=> this.renderFrame());

		Matter.Engine.update(engine, 1000 / 60);

		const vph = document.body.clientHeight;
		const vpw = document.body.clientWidth;
		const ctx = engine.render.context;

		this.textureCtx.clearRect(0,0,vpw, vph);

		for (let i = 0; i < engine.world.bodies.length; i++) {
			const body = engine.world.bodies[i];
			const chunks = body.label.split(",");
			if(chunks[0]  == "cheermote") {
				if(body.position.y > vph + 50) {
					Matter.Composite.remove(engine.world, body);
					i--;
					continue;
				}
				
				// Translate and rotate the context to the desired position and rotation
				ctx.translate(body.position.x, body.position.y);
				ctx.rotate(body.angle);
				// Draw the image at the translated and rotated position
				const scale = parseFloat(chunks[2]);
				let image = this.displacements[parseInt(chunks[1])];
				const w = image.width * scale;
				const h = image.height * scale;
				ctx.drawImage(image, -w / 2, -h / 2, w, h);
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				
				// Translate and rotate the context to the desired position and rotation
				this.textureCtx.translate(body.position.x, body.position.y);
				this.textureCtx.rotate(body.angle);
	
				// Draw the image at the translated and rotated position
				image = this.textures[parseInt(chunks[1])];
				this.textureCtx.drawImage(image, -w / 2, -h / 2, w, h);
				this.textureCtx.setTransform(1, 0, 0, 1, 0, 0);
			}
		}
	}
}
</script>

<style scoped lang="less">
.overlaybitswall {
	background: linear-gradient(90deg, #808000ff 50%, #80800000 50%);
}
</style>