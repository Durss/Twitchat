<template>
	<div :class="classes" @click="onClick">
		<div class="instructions" v-if="shaderMode">
			<img src="@/assets/img/shader_warning.png"/>
		</div>
		<canvas class="debug" ref="debug" :style="{width:sceneWidth*2+'px', height:sceneHeight+'px'}" :width="sceneWidth*2" :height="sceneHeight"></canvas>
	</div>
</template>

<script lang="ts">
import cheer1 from "@/assets/img/bitswall/1.png";
import cheer100 from "@/assets/img/bitswall/100.png";
import cheer1000 from "@/assets/img/bitswall/1000.png";
import cheer5000 from "@/assets/img/bitswall/5000.png";
import cheer10000 from "@/assets/img/bitswall/10000.png";
import cheer10000_tex from "@/assets/img/bitswall/10000_tex.png";
import cheer1000_tex from "@/assets/img/bitswall/1000_tex.png";
import cheer100_tex from "@/assets/img/bitswall/100_tex.png";
import cheer1_tex from "@/assets/img/bitswall/1_tex.png";
import cheer5000_tex from "@/assets/img/bitswall/5000_tex.png";
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import * as Matter from "matter-js";
import * as PIXI from 'pixi.js';
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import { gsap } from "gsap/gsap-core";

//Do not declare this as a class prop to avoid every props from
//being reactive
let engine!:Matter.Engine;
let runner!:Matter.Runner;
let app!:PIXI.Application;
let textureHolder!:PIXI.Container;
let displacementHolder!:PIXI.Container;
let textureMask!:PIXI.Graphics;
let displacementMask!:PIXI.Graphics;
let displacementBackground!:PIXI.Graphics;
let floor!:Matter.Body;
let bodyId2Data:{[key:string]:CheermoteData} = {}
@Component({
	components:{},
	emits:[],
})
class OverlayBitsWall extends AbstractOverlay {

	public shaderMode:boolean = false;
	public engineReady:boolean = false;
	public sceneWidth:number = 300;
	public sceneHeight:number = 300;
	public parameters:TwitchatDataTypes.BitsWallOverlayData|null = null;

	private globalScale:number = 1;
	private globalScale_prev:number = 1;
	private interval:number = -1;
	private lastFrameTime:number = performance.now();
	private frameCount:number = 0;
	private fps:number = 0;
	private disposed:boolean = false;
	private bitsHandler!:(e:TwitchatEvent)=>void;
	private paramsDataHandler!:(e:TwitchatEvent)=>void;
	private overlayPresenceHandler!:(e:TwitchatEvent)=>void;
	private heatEventHandler!:(event:{detail:TwitchatDataTypes.HeatClickData}) => void;
	private resizeHandler!:(e:Event) => void;

	public get classes():string[] {
		const res:string[] = ["overlaybitswall"];
		if(this.shaderMode == true) res.push("shaderMode");
		return res;
	}

	public beforeMount():void {
		this.bitsHandler = (e:TwitchatEvent) => this.onBits(e);
		this.paramsDataHandler = (e:TwitchatEvent) => this.onParamsData(e);
		this.heatEventHandler = (e) => this.onHeatClick(e);
		this.resizeHandler = (e) => this.onResize(e);
		//@ts-ignore
		window.addEventListener("heat-click", this.heatEventHandler);
		window.addEventListener("resize", this.resizeHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.BITSWALL_OVERLAY_PARAMETERS, this.paramsDataHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.BITS, this.bitsHandler);
	}

	public async mounted():Promise<void> {
		this.shaderMode = new URL(document.location.href).searchParams.get("mode") === "shader";
		this.createEngine();

		this.sceneWidth = document.body.clientWidth;
		this.sceneHeight = document.body.clientHeight;

		await this.preloadTextures();

		/*
		this.onBits(new TwitchatEvent("BITS",{
				channel:"",
				message:"",
				message_chunks:[],
				user: {
					id:"",
					login:"durss",
					displayName:"Durss",
				},
				// bits:1000,
				bits:18712,
				// bits:10000,
				pinned:false,
				pinLevel:8,
			}));
		//*/

		PublicAPI.instance.broadcast(TwitchatEvent.BITSWALL_OVERLAY_PRESENCE);
		
		this.overlayPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.BITSWALL_OVERLAY_PRESENCE); }
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_BITSWALL_OVERLAY_PRESENCE, this.overlayPresenceHandler);


		//@ts-ignore
		window.addEventListener("heat-click", async (event:{detail:{x:number, y:number, scaleX:number, scaleY:number, uid:string, shift:boolean, alt:boolean, ctrl:boolean, testMode:boolean, login:string, page:string}}):Promise<void> => {
			const hash = await Utils.sha256(document.location.href)
			
			if(event.detail.page != hash) return;
			
			const vw = document.body.clientWidth;
			const vh = document.body.clientHeight;
			const offsetX = this.shaderMode? -vw / 2 : 0;
			this.hitPoint(event.detail.x * vw + offsetX, event.detail.y * vh, event.detail.uid);
		});
	}

	public async beforeUnmount():Promise<void> {
		try {
			await PIXI.Assets.unloadBundle("textures");
			(this.$el as HTMLDivElement).removeChild(app.view as HTMLCanvasElement);
			app.stop();
			app.stage.destroy(true);
			app.renderer.destroy(true);
			app.destroy(true);
			//@ts-ignore
			app = null;
			// app.destroy(true, true);
		}catch(error) {
			console.error(error);
		}

		while(engine.world.bodies.length > 0) {
			const b = engine.world.bodies[0];
			Matter.Composite.remove(engine.world, b);
		}
		this.disposed = true;
		this.engineReady = false;
		clearInterval(this.interval);
		//@ts-ignore
		window.removeEventListener("heat-click", this.heatEventHandler);
		window.removeEventListener("resize", this.resizeHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.BITS, this.bitsHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_BITSWALL_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}
	
	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_BITS_WALL_OVERLAY_PARAMETERS);
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
		const scales = [.5, 1.25, 1.7, 2.2, 3]
		const res = Utils.shuffle(decomposeNumber(bits, [1,100,1000,5000,10000]));
		for (let i = 0; i < res.length; i++) {
			const bits = res[i] as keyof typeof scales;
			await Utils.promisedTimeout(100);
			if(this.disposed) return;
			const scaleOffset = data.pinned? ((data.pinLevel || -1) + 1) / 8 + 1 : 1;
			const index = {"1":0, "100":1, "1000":2, "5000":3, "10000":4}[bits.toString()] || 0;
			const scale = scales[index] * scaleOffset;
			
			this.createCheermote({guid: Utils.getUUID(),index, scale, scaleOriginal:scale, scale_prev:scale, uid:data.user.id, destroyed:false});
		}
	}

	/**
	 * Called when clicking on overlay
	 * @param e 
	 */
	public onClick(e:MouseEvent):void {
		this.hitPoint(e.clientX, e.clientY);
	}
	
	/**
	 * Called when clicking via heat
	 * @param event 
	 */
	private async onHeatClick(event:{detail:TwitchatDataTypes.HeatClickData}):Promise<void> {
		const overlayID = Utils.getQueryParameterByName("twitchat_overlay_id") || "";

		//Check if the heat event is for the current page, first check via overlay ID, then via URL hash
		const hash = await Utils.sha256(document.location.href);
		if(event.detail.twitchatOverlayID != overlayID && event.detail.page != hash) return;

		const x = event.detail.x * document.body.clientWidth;
		const y = event.detail.y * document.body.clientHeight;
		this.hitPoint(x, y, event.detail.uid);
	}

	/**
	 * Called on window's resize
	 */
	public onResize(e?:Event):void {
		const vw = document.body.clientWidth;
		const vh = document.body.clientHeight;
		this.sceneWidth = this.shaderMode? vw/2 : vw;
		this.sceneHeight = vh;
		if(this.shaderMode) {
			displacementMask.clear();
			displacementMask.beginFill(0xffffff);
			displacementMask.drawRect(0,0,vw/2, vh);
			displacementMask.endFill();
			
			textureMask.clear();
			textureMask.beginFill(0xffffff);
			textureMask.drawRect(vw/2,0,vw/2, vh);
			textureMask.endFill();

			displacementBackground.clear();
			displacementBackground.beginFill(0x808000);
			displacementBackground.drawRect(0, 0, vw/2, vh);
			textureHolder.position.set(vw/2, 0);
		}else{
			textureHolder.position.set(0, 0);
		}

		const w = floor.bounds.max.x - floor.bounds.min.x;
		Matter.Body.scale(floor, this.sceneWidth / w, 1);
		Matter.Body.setPosition(floor, {x:this.sceneWidth/2, y:this.sceneHeight + (floor.bounds.max.y - floor.bounds.min.y)/2})
	}

	/**
	 * Called when API sends fresh overlay parameters
	 */
	private async onParamsData(e:TwitchatEvent):Promise<void> {
		if(e.data) {
			this.parameters = (e.data as unknown) as TwitchatDataTypes.BitsWallOverlayData;
			if(this.shaderMode) {
				this.sceneWidth = document.body.clientWidth/2;
			}else{
				this.sceneWidth = document.body.clientWidth;
			}
			this.globalScale = (this.parameters?.size || 25)/200 + .5;
			engine.render.bounds.max = {x:this.sceneWidth, y:document.body.clientHeight};
			(textureHolder.filters![0] as PIXI.AlphaFilter).alpha = (this.parameters.opacity ?? 75) / 100;
			this.onResize();
		}
	}

	/**
	 * Call this with click coordinate to break any
	 * cheermote under that point
	 * @param x 
	 * @param y 
	 */
	private hitPoint(x:number, y:number, uid:string = ""):void {
		if(!this.parameters?.break) return;
		const p1 = {x:x, y:y};
		const p2 = {x:x+1, y:y+1};
		var bodies = Matter.Composite.allBodies(engine.world);
		const res = Matter.Query.ray(bodies, p1, p2);
		res.forEach(v=> {
			const body = v.bodyA;
			const data = bodyId2Data[body.parent.id] as CheermoteData;
			const cheerIndex = data.index;
			
			//If only senders can break their own cheermotes, don't break
			//it unless it belongs the user that clicked
			if(this.parameters?.break_senderOnly
			&& uid != data.uid) return;
			
			this.breakCheermote(body.parent, true);
			const pos = {x:body.position.x, y:body.position.y};
			if(cheerIndex > 0) {
				let count = 0;
				let bits = 0;
				let scale = data.scaleOriginal;
				switch(cheerIndex) {
					case 4: {
						count = 10;
						bits = 3;
						scale *= .85;
						break;
					}
					case 3: {
						count = 5;
						bits = 2;
						scale *= .75;
						break;
					}
					case 2: {
						count = 10;
						bits = 1;
						scale *= .7;
						break;
					}
					case 1: {
						count = 100;
						bits = 0;
						scale *= .65;
						break;
					}
				}
				for (let i = 0; i < count; i++) {
					window.setTimeout(()=> {
						this.createCheermote({guid: Utils.getUUID(),index:bits, scaleOriginal:scale, scale, uid:data.uid, scale_prev:scale, destroyed:false}, pos);
					}, 30 * i);
				}
			}
		})
	}

	/**
	 * Preload image textures
	 */
	private async preloadTextures():Promise<void> {
		PIXI.Assets.addBundle("textures", {
			t0:cheer1_tex,
			t1:cheer100_tex,
			t2:cheer1000_tex,
			t3:cheer5000_tex,
			t4:cheer10000_tex,
			d0:cheer1,
			d1:cheer100,
			d2:cheer1000,
			d3:cheer5000,
			d4:cheer10000,
		})

		await PIXI.Assets.loadBundle("textures");
	}

	/**
	 * Creates a cheermote instance
	 * 
	 * @param bits 
	 * @param scale 
	 */
	private createCheermote(data:CheermoteData, pos?:{x:number, y:number}):void {
		const index = data.index;
		const s1 = new PIXI.Sprite(PIXI.Assets.cache.get("textures-t"+index));
		s1.anchor.set(.5,.5);
		data.spriteTexture = s1;
		textureHolder.addChild(s1);

		if(this.shaderMode) {
			const s2 = new PIXI.Sprite(PIXI.Assets.cache.get("textures-d"+index));
			s2.anchor.set(.5,.5);
			data.spriteDisplace = s2;
			displacementHolder.addChild(s2);
		}

		const vertices_1 = [[{x:0, y:128}, {x:157, y:128}, {x:79, y:0}]];
		const vertices_100 = [[{x:0, y:89}, {x:50, y:128}, {x:101, y:90}, {x:50, y:0}]];
		const vertices_1000 = [[{x:64, y:0}, {x:0, y:62}, {x:32, y:128}, {x:95, y:128}, {x:128, y:62}]];
		const vertices_5000 = [[{x:56, y:0}, {x:0, y:45}, {x:0, y:82}, {x:56, y:128}, {x:112, y:82}, {x:112, y:45}]];
		const vertices_10000 = [
			[{x:108.75, y:0}, {x:0, y:64}, {x:108.75, y:128}],
			[{x:36.25, y:0}, {x:36.25, y:128}, {x:145, y:64}],
		];
		
		const density = [.001, .002, .003, .004, .005][index];
		const frictionAir = [.05, .01, .01, .001, .0][index];
		const velocity = [10, 20, 30, 40, 50][index];
		const restitution = [.25, .15, .1, .05, .01][index];
		const path = [vertices_1, vertices_100, vertices_1000, vertices_5000, vertices_10000][index || 0];
		const margin = document.body.clientWidth / 10;
		const px = Math.random() * (this.sceneWidth - margin * 2) + margin;
		const body = Matter.Bodies.fromVertices(px, -200 - Math.random() * 200, path, {
													label:"cheermote",
													restitution,
													render:{
														visible:false,
													},
													// density,
													// mass:(density*10000),
													// inverseMass:1/(density*10000),
													// frictionAir,
													frictionAir:0,
													friction:.5
												});
		bodyId2Data[body.id] = data;
		Matter.Body.scale(body, data.scale, data.scale);
		Matter.Body.setVelocity(body, {x:0, y:(velocity - Math.random()*5) * 2});
		Matter.Body.setAngle(body, Math.random() * Math.PI * 2);
		Matter.Body.setAngularVelocity(body, (Math.random() - Math.random()) * Math.PI * .05);
		Matter.Composite.add(engine.world, body);
		if(pos) {
			Matter.Body.setPosition(body, pos);
		}

		let duration = 10000 * (index + 1);
		const key = ["1", "100", "1000", "5000", "10000"][index || 0] as keyof TwitchatDataTypes.BitsWallOverlayData["break_durations"];
		if(this.parameters?.break_durations) {
			duration = (this.parameters!.break_durations![key] || 10) * 1000;
		}
		window.setTimeout(()=>this.breakCheermote(body), duration);
	}

	/**
	 * Crates the game engine
	 */
	private async createEngine():Promise<void> {
		const vh = document.body.clientHeight;

		engine = Matter.Engine.create({enableSleeping: false});
		let renderer = Matter.Render.create({
			bounds:{
				min:{x:0, y:0},
				max:{x:this.sceneWidth, y:vh},
			},
			engine: engine,
			options: {
				background:"transparent",
				wireframeBackground:"transparent",
				width:this.sceneWidth,
				height:vh,
				wireframes:true,
			},
		});
		
		// add mouse control
		const mouse = Matter.Mouse.create(this.$el);
		const mouseConstraint = Matter.MouseConstraint.create(engine, {
			mouse: mouse,
			constraint: {
                stiffness: 0.2,
				render: {
					visible: false
				}
			}
		});

		Matter.Composite.add(engine.world, mouseConstraint);
		renderer.mouse = mouse;

		// engine.gravity.y = 2;
		// engine.positionIterations = 12;
		// engine.velocityIterations = 8;
		engine.render = renderer;
		this.engineReady = true;

		//create floor
		floor = Matter.Bodies.rectangle(this.sceneWidth/2,
											vh+25+1,
											this.sceneWidth,
											150,
											{ isStatic: true, label:"fix", render:{visible:false} });
		let wallR = Matter.Bodies.rectangle(this.sceneWidth,
											vh/2,
											10,
											vh,
											{ isStatic: true, label:"fix", render:{visible:false} });
		let wallL = Matter.Bodies.rectangle(0,
											vh/2,
											10,
											vh,
											{ isStatic: true, label:"fix", render:{visible:false} });
		Matter.Composite.add(engine.world, [floor]);
		// Matter.Composite.add(engine.world, [wallL, wallR]);

		// this.renderFrame();
		runner = Matter.Runner.create({isFixed:true, delta:1000/60});
		Matter.Runner.run(runner, engine);
		Matter.Render.run(renderer);
		Matter.Events.on(engine.render, 'afterRender', () => this.renderFrame());

		app = new PIXI.Application({background:"#000000", backgroundAlpha:0, resizeTo:document.body});

		if(this.shaderMode) {
			displacementMask = new PIXI.Graphics();
			displacementMask.beginFill(0xffffff);
			displacementMask.drawRect(0,0,this.sceneWidth,vh);
			displacementMask.endFill();
	
			textureMask = new PIXI.Graphics();
			textureMask.beginFill(0xffffff);
			textureMask.drawRect(this.sceneWidth,0,this.sceneWidth, vh);
			textureMask.endFill();
	
			displacementHolder = new PIXI.Container();
			displacementHolder.mask = displacementMask;
	
			displacementBackground = new PIXI.Graphics();
			displacementBackground.beginFill(0x808000);
			displacementBackground.drawRect(0, 0, this.sceneWidth, vh);
	
			//only add after 10s.
			//An instructions message is displayed on the left part of the viewport to
			//tell the user they want ot hide it out of screen.
			//It shouldn't be an issue to keep it this way, but in case some OBS chromium
			//apply dirty anti alias that would have an effect on the shader, we add a
			//#808000 background over it after 10s
			window.setTimeout(() => {
				app.stage.addChildAt(displacementBackground, 0);
			}, 10000)
			app.stage.addChild(displacementHolder);
		}

		textureHolder = new PIXI.Container();
		if(textureMask) textureHolder.mask = textureMask;
		textureHolder.position.set(this.sceneWidth, 0);
		textureHolder.filters = [new PIXI.AlphaFilter(1)];
		app.stage.addChild(textureHolder);

		(this.$el as HTMLDivElement).appendChild(app.view as HTMLCanvasElement);
	}

	/**
	 * Render the game
	 */
	private renderFrame():void {
		if(this.disposed) return;
		
		const now = performance.now();
		this.frameCount++;

		const delta = now - this.lastFrameTime;
		if (delta >= 1000) {
			this.fps = (this.frameCount / delta) * 1000;
			this.frameCount = 0;
			this.lastFrameTime = now;
		}
		
		const physicsRatio = 30/this.fps;
		runner.delta = 1000/this.fps;
		const vph = document.body.clientHeight;
		const vpw = document.body.clientWidth;
		// Matter.Runner.tick(, engine, physicsRatio);

		/* Draw bounding boxes
		var bodies = Matter.Composite.allBodies(engine.world);
		const cnv = this.$refs.debug as HTMLCanvasElement;
		const ctx = cnv.getContext("2d")!;
		ctx.clearRect(0,0,cnv.width, cnv.height);
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

		//I haven't figured out exactly why, but I need to offset images positions
		//so they match the body position. This defines by how much they need to
		//be offset for a scale of 1.
		const offsets = [22, 9, 9, 0, 0];

		const rescale = this.globalScale != this.globalScale_prev;

		for (let i = 1; i < engine.world.bodies.length; i++) {
			const body = engine.world.bodies[i];

			if(body.label  == "cheermote") {
				const data = bodyId2Data[body.id];
				
				const w = body.bounds.max.x - body.bounds.min.x;
				if(body.position.y > vph + 800
				|| body.position.x < -w/2
				|| body.position.x > this.sceneWidth + w/2) {
					data.destroyed = true;
					this.unmountCheermote(body);
					continue;
				}

				if(rescale) {
					const factor = (data.scale * this.globalScale) / data.scale_prev;
					data.scale_prev = (data.scale * this.globalScale);
					Matter.Body.scale(body, factor, factor);
				}

				if(data.spriteTexture) {
					const scale = data.scale * this.globalScale;
					const index = data.index;
					const angle = body.angle - Math.PI/2;
					const offset = offsets[index] * scale;
					data.spriteTexture.scale.set(scale, scale);
					data.spriteTexture.position.set(body.position.x + Math.cos(angle)*offset, body.position.y + Math.sin(angle)*offset);
					data.spriteTexture.rotation = body.angle;
				}
				if(data.spriteDisplace) {
					const scale = data.scale * this.globalScale;
					const index = data.index;
					const angle = body.angle - Math.PI/2;
					const offset = offsets[index] * scale;
					data.spriteDisplace.scale.set(scale, scale);
					data.spriteDisplace.position.set(body.position.x + Math.cos(angle)*offset, body.position.y + Math.sin(angle)*offset);
					data.spriteDisplace.rotation = body.angle;
				}
			}
		}
	}

	private breakCheermote(body:Matter.Body, userOrigin:boolean = false):void {
		const data = bodyId2Data[body.id] as CheermoteData;
		if(!data || data.destroyed) return;
		gsap.killTweensOf(data);
		data.destroyed = true;

		gsap.to(data, {scale:0, duration:userOrigin? .15 : .5, ease:userOrigin? "none" : "back.in(10)", onUpdate:(a)=>{
			const factor = (data.scale * this.globalScale) / data.scale_prev;
			data.scale_prev = (data.scale * this.globalScale);
			Matter.Body.scale(body, factor, factor);
		}, onComplete:()=>{
			this.unmountCheermote(body);
		}})
	}

	private unmountCheermote(body:Matter.Body):void {
		const data = bodyId2Data[body.id] as CheermoteData;
		gsap.killTweensOf(data);
		data.destroyed = true;
		delete bodyId2Data[body.id];
		Matter.Composite.remove(engine.world, body, true);
		if(data.spriteTexture) {
			textureHolder.removeChild(data.spriteTexture);
			data.spriteTexture.destroy();
		}
		if(data.spriteDisplace) {
			displacementHolder.removeChild(data.spriteDisplace);
			data.spriteDisplace.destroy();
		}
	}
}

interface CheermoteData {
	index:number;
	uid:string;
	scale:number;
	scaleOriginal:number;
	spriteTexture?:PIXI.Sprite;
	spriteDisplace?:PIXI.Sprite;
	scale_prev:number;
	destroyed:boolean;
	guid:string;
}
export default toNative(OverlayBitsWall);
</script>

<style scoped lang="less">
.overlaybitswall {
	width: 100vw;
	height: 100vh;

	.debug {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1;
	}

	.instructions {
		position: fixed;
		top: 50%;
		left: 25%;
		transform: translate(-50%, -50%);
		font-size: 10em;
		font-weight: bold;
		text-transform: uppercase;
		color: #808000;
		font-family: Impact, Inter;
		width: 50vw;
		height: 100vh;
		border: 50px solid #808000;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		z-index: -1;
		font-smooth: never;
		img {
			max-width: 40vw;
		}
	}
}
</style>