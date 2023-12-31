<template>
	<div class="overlaybitswall" @click="onClick">
		<canvas ref="displacement"></canvas>
		<canvas ref="textures" style="opacity:1"></canvas>
	</div>
</template>

<script lang="ts">
import cheer1 from "@/assets/img/bitswall/1.png";
import cheer100 from "@/assets/img/bitswall/100.png";
import cheer1000 from "@/assets/img/bitswall/1000.png";
import cheer10000 from "@/assets/img/bitswall/10000.png";
import cheer10000_tex from "@/assets/img/bitswall/10000_tex.png";
import cheer1000_tex from "@/assets/img/bitswall/1000_tex.png";
import cheer100_tex from "@/assets/img/bitswall/100_tex.png";
import cheer1_tex from "@/assets/img/bitswall/1_tex.png";
import cheer5000 from "@/assets/img/bitswall/5000.png";
import cheer5000_tex from "@/assets/img/bitswall/5000_tex.png";
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import * as Matter from "matter-js";
import { Component } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import gsap from "gsap";
import OBSWebsocket from "@/utils/OBSWebsocket";

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
		this.onBits(new TwitchatEvent("BITS",{
				channel:"",
				message:"",
				message_chunks:[],
				user: {
					id:"",
					login:"durss",
					displayName:"Durss",
				},
				bits:10001,
				// bits:100000,
				pinned:true,
				pinLevel:Math.floor(Math.random()*8),
			}));
		this.preloadTextures();

		// OBSWebsocket.instance.socket.call("GetInputSettings", {inputName: "VLC"}).then(res => {
		// 	console.log(res);
		// });
		// OBSWebsocket.instance.socket.call("PressInputPropertiesButton", {inputName:"VLC", propertyName:"obs_source_media_next"});
		// OBSWebsocket.instance.socket.call("PressInputPropertiesButton", {inputName:entry.source.inputName, propertyName:"refreshnocache"});
		OBSWebsocket.instance.socket.call('TriggerMediaInputAction',{'inputName':"VLC",'mediaAction':'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT'});
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

	/**
	 * Called when bits are received
	 */
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
		const bits = data.bits;
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
		const scales = [.2, .25, .35, .45, .6]
		const res = Utils.shuffle(decomposeNumber(bits, [1,100,1000,5000,10000]));
		for (let i = 0; i < res.length; i++) {
			const bits = res[i] as keyof typeof scales;
			await Utils.promisedTimeout(100);
			if(this.disposed) return;
			const scaleOffset = (data.pinLevel || 0) / 7 * 2 + 1;
			const index = {"1":0, "100":1, "1000":2, "5000":3, "10000":4}[bits.toString()] || 0;
			const scale = scaleOffset * scales[index];
			this.createCheermote({index, scale, scale_prev:scale, uid:data.user.id});
		}
	}

	public onClick(e:MouseEvent):void {
		this.hitPoint(e.clientX, e.clientY);
	}

	private hitPoint(x:number, y:number):void {
		const p1 = {x:x, y:y};
		const p2 = {x:x+1, y:y+1};
		var bodies = Matter.Composite.allBodies(engine.world);
		const res = Matter.Query.ray(bodies, p1, p2);
		res.forEach(v=> {
			const body = v.bodyA;
			const data = body.plugin as CheermoteData;
			const cheerIndex = data.index;
			Matter.Composite.remove(engine.world, body.parent, true);
			if(cheerIndex > 0) {
				let count = 0;
				let bits = 0;
				switch(cheerIndex) {
					case 4: {
						count = 10;
						bits = 3;
						data.scale *= .85;
						break;
					}
					case 3: {
						count = 5;
						bits = 2;
						data.scale *= .75;
						break;
					}
					case 2: {
						count = 10;
						bits = 1;
						data.scale *= .7;
						break;
					}
					case 1: {
						count = 100;
						bits = 0;
						data.scale *= .65;
						break;
					}
				}
				for (let i = 0; i < count; i++) {
					setTimeout(()=> {
						this.createCheermote({index:bits, scale:data.scale, uid:data.uid, scale_prev:data.scale}, body.position);
					}, 30 * i);
				}
			}
		})
	}

	/**
	 * Preload image textures
	 */
	private preloadTextures():void {
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

		textures.forEach(v => {
			const img = new Image();
			this.textures.push(img);
			img.src = v;
		})

		displacements.forEach(v => {
			const img = new Image();
			this.displacements.push(img);
			img.src = v;
		})
	}

	/**
	 * Creates a cheermote instance
	 * 
	 * @param bits 
	 * @param scale 
	 */
	private createCheermote(data:CheermoteData, pos?:{x:number, y:number}):void {

		const vertices_1 = [[{x:0, y:128}, {x:157, y:128}, {x:79, y:0}]];
		const vertices_100 = [[{x:0, y:89}, {x:50, y:128}, {x:101, y:90}, {x:50, y:0}]];
		const vertices_1000 = [[{x:64, y:0}, {x:0, y:62}, {x:32, y:128}, {x:95, y:128}, {x:128, y:62}]];
		const vertices_5000 = [[{x:56, y:0}, {x:0, y:45}, {x:0, y:82}, {x:56, y:128}, {x:112, y:82}, {x:112, y:45}]];
		const vertices_10000 = [
			[{x:108.75, y:0}, {x:0, y:64}, {x:108.75, y:128}],
			[{x:36.25, y:0}, {x:36.25, y:128}, {x:145, y:64}],
		];
		
		const index = data.index;
		const density = [.001, .002, .003, .004, .005][index];
		const frictionAir = [.05, .01, .01, .001, .0][index];
		const velocity = [5, 30, 20, 35, 50][index];
		const path = [vertices_1, vertices_100, vertices_1000, vertices_5000, vertices_10000][index || 0];
		const margin = document.body.clientWidth / 10;
		const px = Math.random() * (document.body.clientWidth/2 - margin * 2) + margin;
		const body = Matter.Bodies.fromVertices(px, -200 - Math.random() * 200, path, {
													label:"cheermote",
													plugin:data,
													restitution:.35,
													render:{
														visible:false,
													},
													// density,
													// mass:(density*10000),
													// inverseMass:1/(density*10000),
													// frictionAir,
													frictionAir:0,
												});
		Matter.Body.scale(body, data.scale, data.scale);
		Matter.Body.setVelocity(body, {x:0, y:velocity - Math.random()*5});
		Matter.Body.setAngle(body, Math.random() * Math.PI * 2);
		Matter.Composite.add(engine.world, body);
		if(pos) {
			Matter.Body.setPosition(body, pos);
		}
		gsap.to(data, {delay:10 * (index + 1), scale:0, duration:.5, ease:"back.in(10)", onUpdate:(a)=>{
			if(data.scale <= 0) {
				Matter.Composite.remove(engine.world, body);
			}else{
				const factor = data.scale / data.scale_prev;
				data.scale_prev = data.scale;
				body.plugin = data;
				Matter.Body.scale(body, factor, factor);
			}
		}})
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

		// engine.gravity.y = 2;
		// engine.positionIterations = 12;
		// engine.velocityIterations = 8;
		engine.render = renderer;
		this.engineReady = true;

		//create floor
		let floor = Matter.Bodies.rectangle(document.body.clientWidth/4,
											document.body.clientHeight+25+1,
											document.body.clientWidth/2, 50,
											{ isStatic: true, label:"fix", render:{visible:false} });
		Matter.Composite.add(engine.world, [floor]);

		// this.renderFrame();
		Matter.Runner.run(engine)
		Matter.Render.run(renderer);
		Matter.Events.on(engine.render, 'afterRender', () => this.renderFrame());
	}

	/**
	 * Render the game
	 */
	private renderFrame():void {
		if(this.disposed) return;

		const vph = document.body.clientHeight;
		const vpw = document.body.clientWidth;
		const ctx = engine.render.context;

		/* Draw bounding boxes
		var bodies = Matter.Composite.allBodies(engine.world);
		ctx.beginPath();

		for (var i = 0; i < bodies.length; i += 1) {
			var vertices = bodies[i].vertices;

			ctx.moveTo(vertices[0].x, vertices[0].y);

			for (var j = 1; j < vertices.length; j += 1) {
				ctx.lineTo(vertices[j].x, vertices[j].y);
			}

			ctx.lineTo(vertices[0].x, vertices[0].y);
		}

		ctx.lineWidth = 1;
		ctx.strokeStyle = '#ff0000';
		ctx.stroke();
		//*/
		// return;

		//I haven't figured out exactly why, but I need to offset images positions
		//so they match the body position. This defines by how much they need to
		//be offset for a scale of 1.
		const offsets = [22, 9, 9, 0, 0];

		this.textureCtx.clearRect(0,0,vpw, vph);

		for (let i = 1; i < engine.world.bodies.length; i++) {
			const body = engine.world.bodies[i];
			if(body.label  == "cheermote") {
				const data = body.plugin as CheermoteData;
				if(body.position.y > vph + 50) {
					Matter.Composite.remove(engine.world, body);
					i--;
					continue;
				}
				
				// Draw displacement map
				const scale = data.scale;
				const index = data.index;

				let image = this.displacements[index];
				const w = image.width * scale;
				const h = image.height * scale;
				const angle = body.angle - Math.PI/2;
				const offset = offsets[index] * scale;
				ctx.translate(body.position.x + Math.cos(angle)*offset, body.position.y + Math.sin(angle)*offset);
				ctx.rotate(body.angle);
				ctx.drawImage(image, -w / 2, -h / 2, w, h);
				ctx.resetTransform();
				
				// Draw texture
				image = this.textures[index];
				this.textureCtx.translate(body.position.x + Math.cos(angle)*offset, body.position.y + Math.sin(angle)*offset);
				this.textureCtx.rotate(body.angle);
				this.textureCtx.drawImage(image, -w / 2, -h / 2, w, h);
				this.textureCtx.resetTransform();
			}
		}
	}
}

interface CheermoteData {
	index:number;
	uid:string;
	scale:number;
	scale_prev:number;
}
</script>

<style scoped lang="less">
.overlaybitswall {
	background: linear-gradient(90deg, #808000ff 50%, #80800000 50%);
	width: 100vw;
	height: 100vh;
	// canvas {
	// 	top: 0;
	// 	left: 0;
	// 	position: absolute;
	// }
}
</style>