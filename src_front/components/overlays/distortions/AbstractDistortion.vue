<script lang="ts">
import * as THREE from 'three';
import { ComponentBase, Vue } from 'vue-facing-decorator';

/**
 * Following vars are declared here instead as class props
 * because of a vue VS threejs incompatibility.
 * @see https://stackoverflow.com/questions/65693108/threejs-component-working-in-vuejs-2-but-not-3#comment116149963_65693108
 */
let scene!:THREE.Scene;
let camera!:THREE.OrthographicCamera;
let renderer!:THREE.WebGLRenderer;
let instancedMesh!:THREE.InstancedMesh;
let uvOffsetAttribute!:THREE.InstancedBufferAttribute;

@ComponentBase({
    name: "AbstractDistortion",
})
export default class AbstractDistortion extends Vue {
	
	private maxInstances = 50000;
	private items:IDistortItem[] = [];
	private uvOffsets:number[] = [];
	private shCols = 8;
	private shRows = 8;
	private uvScaleX = 1;
	private uvScaleY = 1;
	private frames = 100;

	protected initialize(spritesheet:{cols:number, rows:number, uvScaleX:number, uvScaleY:number, frames:number, texture:string}):void{
		this.shCols = spritesheet.cols;
		this.shRows = spritesheet.rows;
		
		this.uvScaleX = spritesheet.uvScaleX;
		this.uvScaleY = spritesheet.uvScaleY;

		// Create a scene
		scene = new THREE.Scene();

		// Create a camera
		const aspect = window.innerWidth / window.innerHeight;
		const frustumSize = 10;
		camera = new THREE.OrthographicCamera(
			frustumSize * aspect / -2, 
			frustumSize * aspect / 2, 
			frustumSize / 2, 
			frustumSize / -2, 
			1, 
			100
		);
		camera.position.z = 10;

		const canvas = document.createElement("canvas");
		canvas.style.position = "fixed";
		canvas.style.top = "0px";
		canvas.style.left = "0px";
		document.body.appendChild(canvas);

		// Create a renderer
		renderer = new THREE.WebGLRenderer({canvas});
		renderer.setClearColor(new THREE.Color(0x808000), 1);
		renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(renderer.domElement);
		
		// Load the texture
		const textureLoader = new THREE.TextureLoader();
		const texture = textureLoader.load( spritesheet.texture );
		// const texture = textureLoader.load('hearts_sh.png');
		// const texture = textureLoader.load('test.png');

		// Create a geometry (for example, a cube)
		const geometry = new THREE.PlaneGeometry(.5, .5);

		// Create material
		const material = new THREE.ShaderMaterial({
			transparent: true,
			// blending: THREE.AdditiveBlending,
			uniforms: {
				texture1: { value: texture },
			},
			vertexShader: `
				precision highp float;
				attribute vec2 uvOffset;
				varying vec2 vUv;

				void main() {
					vUv = uv * vec2(${this.uvScaleX}, ${this.uvScaleY}) + uvOffset;
					vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
					gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
				}
			`,
			fragmentShader: `
				uniform sampler2D texture1;
				varying vec2 vUv;

				void main() {
					gl_FragColor = texture2D(texture1, vUv);
				}
			`
		});

		// Create an InstancedMesh
		instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxInstances);
		instancedMesh.count = 0;

		for (let i = 0; i < this.maxInstances; i++) {
			this.uvOffsets.push(1 - this.uvScaleX, 1-this.uvScaleY);
		}

		uvOffsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(this.uvOffsets), 2);
		instancedMesh.geometry.setAttribute('uvOffset', uvOffsetAttribute);
		scene.add(instancedMesh);

		// Set random positions, scales, and rotations for instances
		// for (let i = 0; i < 10; i++) {
			// addItem();
		// }
		this.addItem(this.buildItem());
		this.renderFrame();
	}

	public renderFrame():void {

		var rotationMatrix = new THREE.Matrix4();
		requestAnimationFrame(this.renderFrame);

		let offsetUvY = 1 - (this.uvScaleY * this.shRows);
		
		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i];
			item.scaleSpeed *= .995;
			item.scale += item.scaleSpeed;
			item.frame += item.alphaSpeed;
			const frame = Math.max(0, Math.floor(item.frame));
			// item.angle += Math.PI/200;
			// rotationMatrix.makeRotationZ(item.angle);
			
			if(frame <= 0 && item.alphaSpeed < 0) {
				item.alphaSpeed = -item.alphaSpeed*.5;
			}
			
			const matrix = new THREE.Matrix4();
			instancedMesh.getMatrixAt(i, matrix );
			matrix.makeTranslation(item.x, item.y, 0);
			matrix.multiply(rotationMatrix);
			matrix.scale(new THREE.Vector3(item.scale, item.scale, 1));

			instancedMesh.geometry.attributes.uvOffset.setXY(i, (frame%this.shCols)*this.uvScaleX, 1-offsetUvY - this.uvScaleY - Math.floor(frame/this.shCols)*this.uvScaleY);

			instancedMesh.setMatrixAt(i, matrix);
			if(item.frame >= this.shCols*this.shRows && item.alphaSpeed > 0) {
				instancedMesh.count --;
				this.items.splice(i, 1);
				i--;
			}
		}
		
		instancedMesh.instanceMatrix.needsUpdate = true;
		instancedMesh.geometry.attributes.uvOffset.needsUpdate = true;

		// Render the scene
		renderer.render(scene, camera);
	}

	protected buildItem(px?:number, py?:number):IDistortItem {
		const vec3 = this.screenToWorld(window.innerWidth, window.innerHeight);
		return {
			x:px || Math.random() * vec3.x - vec3.x/2,
			y:py || Math.random() * vec3.y - vec3.y/2,
			scale:0,
			frame:this.frames,
			alphaSpeed:-(Math.random()*.5)-1,
			scaleSpeed:Math.random() * 0.05 + .05,
			// scaleSpeed:Math.random() * 0.05 + .01,
			angle:0,
		};
	}

	protected addItem(data:IDistortItem) {
		instancedMesh.count ++;
		this.items.push(data);
		instancedMesh.geometry.attributes.uvOffset.setXY(this.items.length-1, 0, 0);
		instancedMesh.setMatrixAt(this.items.length-1, new THREE.Matrix4());
	}

	protected screenToWorld(px:number, py:number):THREE.Vector3 {
		return new THREE.Vector3(
			(px / window.innerWidth) * 2 - 1,
			-(py / window.innerHeight) * 2 + 1,
			0.5
		).unproject( camera );
	}
}

export interface IDistortItem {
	x:number,
	y:number,
	scale:number,
	frame:number,
	alphaSpeed:number,
	scaleSpeed:number,
	angle:number,
}
</script>