<template>
	<div class="tooltip">
		<div class="holder"
		:style="styles"
		:class="upsideDown? 'upsideDown' : ''" ref="holder"
		v-show="opened"
		key="tooltip">
			<div ref="content" v-html="message"></div>
			<div class="tip"></div>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{}
})
export default class Tooltip extends Vue {

    public upsideDown:boolean = false;
    public message:string = "";
	
    private opened:boolean = false;
    private position:{x:number, y:number} = {x:0, y:0};
    private mouseMoveHandler!:(e:MouseEvent) => void;
    private mouseUpHandler!:(e:MouseEvent) => void;
    private currentTarget!:HTMLElement|null;
    private lastMouseEvent!:MouseEvent;
	
    public get styles():unknown {
		return {
			left: this.position.x + "px",
			top: this.position.y + "px",
		}
	}

	public mounted():void {
		this.mouseMoveHandler = (e:MouseEvent) => this.onMouseMove(e);
		this.mouseUpHandler = () => this.onMouseUp();
		document.addEventListener('mousemove', this.mouseMoveHandler);
		document.addEventListener('mouseup', this.mouseUpHandler);
		
		watch(() => store.state.tooltip, (val:string) => {
			let data = val;
			if(data) {
				this.show(data);
			}else{
				this.hide();
			}
		});
	}

	public beforeUnmount():void {
		document.removeEventListener('mousemove', this.mouseMoveHandler);
		document.removeEventListener('mouseup', this.mouseUpHandler);
	}


	/**
	 * Opens the tooltip
	 * @param content
	 */
	public async show(content:string):Promise<void> {
		if(this.message == content && this.opened) return;
		this.opened = true;
		this.message = content;
		
		await this.$nextTick();

		gsap.killTweensOf(this.$el);
		gsap.to(this.$el, {duration:.2, opacity:1});

		//check if there are image tags on the tootlip's content.
		//If so, listen for their load complete event to replace
		//the tooltip once they're loaded.
		const images = (this.$refs.content as HTMLDivElement).querySelectorAll("img");
		images.forEach((img:HTMLImageElement) => {
			img.onload = () => {
				this.onMouseMove(this.lastMouseEvent, false);
			};
		});
		
		if(this.lastMouseEvent) {
			this.$nextTick().then(()=> {
				this.onMouseMove(this.lastMouseEvent, false);
			});
		}
	}

	/**
	 * Hides the tooltip
	 */
	public hide():boolean {
		if(!this.opened) return false;
		this.opened = false;
		this.message = "";
		gsap.killTweensOf(this.$el);
		gsap.to(this.$el, {duration:.2, opacity:0, onComplete:()=>{
			this.opened = false;
		}});
		return true;
	}

	/**
	 * Close the tooltip on mouse up
	 * @param e
	 */
	private onMouseUp():void {
		if(this.opened) store.dispatch("closeTooltip");
	}

	/**
	 * Moves the tooltip
	 * @param e
	 */
	private onMouseMove(e:MouseEvent, checkTarget:boolean = true):void {
		this.lastMouseEvent = e;
		if(checkTarget) {
			let target:HTMLDivElement = e.target as HTMLDivElement;
			while(target && target != document.body) {
				if(target.dataset && target.dataset.tooltip) break;
				target = target.parentNode as HTMLDivElement;
			}
			//Target can be null if pressing mouse inside window and moving
			//outside browser while keeping mouse pressed (at least on chrome)
			if(target && target != document.body) {
				let mess = target.dataset.tooltip;
				if(mess && mess != this.message) {
					store.dispatch("openTooltip", mess);
				}
			}else if(this.opened) {
				store.dispatch("closeTooltip");
			}
		}

		if(!this.opened) return;

		let holder = this.$refs.holder as HTMLDivElement;
		let px:number = (e.clientX - holder.clientWidth * .5);
		let py:number = (e.clientY - holder.clientHeight - 20);
		px = Math.max(0, Math.min(window.innerWidth - holder.clientWidth, px))
		py = Math.max(0, Math.min(window.innerHeight - holder.clientHeight, py))
		if(py < 50) {
			py = e.clientY + 30;
			this.upsideDown = true;
		}else{
			this.upsideDown = false;
		}
		this.position.x = px;
		this.position.y = py;

		//Deep check if current hover item is still on DOM
		//Vue can remove/recreate items anytime, in this case
		//"mouseout" event is not fired which blocks the tooltip
		if(this.currentTarget) {
			let t:HTMLElement = this.currentTarget;
			while(t.parentNode && t.parentNode != document.body){
				t = t.parentNode as HTMLElement;
			}
			if(!t || !t.parentNode) {
				this.currentTarget = null;
				store.dispatch("closeTooltip");
			}
		}
	}

}
</script>

<style scoped lang="less">
.tooltip{
	opacity: 0;
	&>.holder {
		pointer-events: none;
		z-index: 100;
		position: fixed;
		display: inline;
		color: #fff;
		padding: 4px;
		border-radius: 5px;
		background-color: @mainColor_highlight;
		// max-width: 300px;
		text-align: center;
		font-size: 14px;

		.tip {
			border-left: 6px solid transparent;
			border-right: 6px solid transparent;
			border-top: 8px solid @mainColor_highlight;
			bottom: -8px;
			position: absolute;
			width: 0;
			left:50%;
			transform: translate(-50%, 0);
		}

		&.upsideDown {
			.tip {
				border-left: 6px solid transparent;
				border-right: 6px solid transparent;
				border-top: none;
				border-bottom: 8px solid @mainColor_highlight;
				top: -8px;
				bottom: auto;
				position: absolute;
				width: 0;
				left:50%;
				transform: translate(-50%, 0);
			}
		}
	}
}

//Hide on mobile
@media only screen and (max-width: 500px) {
	.tooltip{
		//Actuallly, on OBS the page is so small it would think it's mobile...
		// display: none;
	}
}
</style>