<template>
	<div :class="classes">
		<div class="img" v-html="svg" v-if="svg && !error" ref="svgHolder"></div>
		<div v-else>An error occured loading GoXLR interface</div>
	</div>
</template>

<script lang="ts">
import GoXLRSocketEvent from '@/events/GoXLRSocketEvent';
import { GoXLRTypes } from '@/types/GoXLRTypes';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["click", "change", "update:modelValue"],
})
export default class GoXLRUI extends Vue {

	@Prop({default: []})
	public modelValue!:GoXLRTypes.ButtonTypesData[];

	@Prop({type:Boolean, default:false})
	public knobMode!:boolean;

	@Prop({type:Boolean, default:false})
	public samplerMode!:boolean;

	public svg:string = "";
	public error:boolean = false;

	private allowedButtons:GoXLRTypes.ButtonTypesData[] = [];
	private selectedButtons:GoXLRTypes.ButtonTypesData[] = [];
	private rotaryTimeouts:{[key:string]:number} = {};
	private clickHandler!:(e:MouseEvent) => void;
	private goxlrHandler!:(e:GoXLRSocketEvent) => void;

	public get classes():string[] {
		const res = ["goxlrui"];
		this.selectedButtons.forEach(v=> res.push(v));
		if(this.knobMode !== false) res.push("knobMode");
		return res;
	}

	public async mounted():Promise<void> {
		this.allowedButtons = [...GoXLRTypes.ButtonTypes];
		this.selectedButtons = this.modelValue;

		if(this.knobMode !== false) {
			this.allowedButtons = ["EffectSelect1", "EffectSelect2", "EffectSelect3", "EffectSelect4", "EffectSelect5", "EffectSelect6", 
									"echo", "gender", "pitch", "reverb"];
		}

		if(this.samplerMode !== false) {
			this.allowedButtons = ["BankA", "BankB", "BankC", 
									"TopLeft", "TopRight", "BottomLeft", "BottomRight", "Clear"];
		}
		
		const imgRes = await fetch(this.$image("goxlr/goxlr.svg"));
		if(imgRes.status <200 || imgRes.status > 204) {
			this.error = true;
		}else{
			this.svg = (await imgRes.text())
			.replace(/<style[^<]*<\/ ?style>/gim, "")//Cleanup styles
			.replace(/<!--[^<]*-->/g, "")//Cleanup comments
			.replace(/<\?xml[^<]*>/g, "")//cleanup <xml> header
			.replace(/\s+/g, ' ') // Replace multiple spaces with a single space
			.replace(/>\s+</g, '><');//cleanup spaces between tags
		}

		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		this.goxlrHandler = (e:GoXLRSocketEvent) => this.onGoXLREvent(e);
		this.$el.addEventListener("click", this.clickHandler);
		GoXLRSocket.instance.addEventListener(GoXLRSocketEvent.BUTTON_PRESSED, this.goxlrHandler);
		GoXLRSocket.instance.addEventListener(GoXLRSocketEvent.BUTTON_RELEASED, this.goxlrHandler);
		
		await this.$nextTick();
		this.setButtonStates();
	}
	
	public beforeUnmout():void {
		this.$el.removeEventListener("click", this.clickHandler);
		GoXLRSocket.instance.removeEventListener(GoXLRSocketEvent.BUTTON_PRESSED, this.goxlrHandler);
		GoXLRSocket.instance.removeEventListener(GoXLRSocketEvent.BUTTON_RELEASED, this.goxlrHandler);
	}

	/**
	 * Called when using a button on GoXLR.
	 * Adds/removes "highlight" class on the given button to give a visual
	 * feedback to the user
	 * @param e 
	 */
	public onGoXLREvent(e:GoXLRSocketEvent):void {
		const holder = this.$refs.svgHolder as HTMLDivElement;
		switch(e.type) {
			//A button is pressed or release, set its highlight state accordingly
			case GoXLRSocketEvent.BUTTON_PRESSED:
			case GoXLRSocketEvent.BUTTON_RELEASED: {
				const bt = e.button!;
				const item = holder.querySelector(".area #"+bt) as HTMLElement|null;
				if(!item) return;
				if(e.type == GoXLRSocketEvent.BUTTON_PRESSED) {
					item.classList.add("highlight");
				}else{
					item.classList.remove("highlight");
				}
			}

			//Rotary button used. Highlight it and schedule an auto removal of the highlight
			case GoXLRSocketEvent.ROTARY:{
				const bt = e.rotaryId!;
				const item = holder.querySelector(".area #"+bt) as HTMLElement|null;
				if(!item) return;
				item.classList.add("highlight");
				clearTimeout(this.rotaryTimeouts[bt]);
				this.rotaryTimeouts[bt] = setTimeout(()=> {
					item.classList.remove("highlight");
				}, 500);
			}
		}
	}
	
	/**
	 * Called when clicking a button on the interface
	 * @param e 
	 */
	public onClick(e:MouseEvent):void {
		let target = e.target as HTMLElement;
		let id:GoXLRTypes.ButtonTypesData|null = null;
		//Get button ID
		while(target != this.$el
		&& this.allowedButtons.indexOf(target.id as GoXLRTypes.ButtonTypesData) === -1) {
			target = target.parentElement as HTMLElement;
		}
		if(target.id){
			// ids.push(target.id);
	
			if(target.id != "GoXLR") id = target.id as GoXLRTypes.ButtonTypesData;

			if(id != null) {

				//Unselect any previously selected FX preset if in knobMode
				if(this.knobMode !== false && id?.indexOf("EffectSelect") === 0) {
					this.selectedButtons = this.selectedButtons.filter(v=>v.indexOf("EffectSelect") || v == id);
				}

				//Unselect any previously selected bank  if in knobMode
				if(this.samplerMode !== false && id?.indexOf("Bank") === 0) {
					this.selectedButtons = this.selectedButtons.filter(v=>v.indexOf("Bank") || v == id);
				}

				// const fullID = ids.join("_") as GoXLRTypes.ButtonTypesData;
				const index = this.selectedButtons.indexOf(id);
				if(index == -1) {
					this.selectedButtons.push(id);
				}else{
					this.selectedButtons.splice(index, 1);
				}
		
				this.$emit("change");
				this.$emit("update:modelValue", this.selectedButtons);
				this.setButtonStates();
			}
		}
	}

	/**
	 * Refreshes the states of all the buttons
	 */
	private setButtonStates():void {
		const holder = this.$refs.svgHolder as HTMLDivElement;
		
		//Set "disabled" class to buttons not on the "allowedButtons" list
		for (let i = 0; i < GoXLRTypes.ButtonTypes.length; i++) {
			const bt = GoXLRTypes.ButtonTypes[i];
			const item = holder.querySelector(".area #"+bt) as HTMLElement|null;
			if(!item) continue;
			if(this.allowedButtons.indexOf(bt) == -1) {
				item.classList.add("disabled");
			}else{
				item.classList.remove("disabled");
			}
		}

		//Unselect everything
		for (let i = 0; i < GoXLRTypes.ButtonTypes.length; i++) {
			const t = GoXLRTypes.ButtonTypes[i];
			let item = holder.querySelector(".selection #"+t) as HTMLElement|null;
			if(item) {
				item.style.display = "none";
			}

			item = holder.querySelector(".area #"+t) as HTMLElement|null;
			if(item) {
				item.classList.remove("selected");
			}
		}

		//Select requested parts
		for (let i = 0; i < this.selectedButtons.length; i++) {
			const bt = this.selectedButtons[i];
			let item = holder.querySelector(".selection #"+bt) as HTMLElement|null;
			if(item) {
				item.style.display = "block";
			}

			item = holder.querySelector(".area #"+bt) as HTMLElement|null;
			if(item) {
				item.classList.add("selected");
			}
		}
	}
}
</script>

<style scoped lang="less">
.goxlrui{
	.img {
		width: 100%;
		:deep(svg) {
			user-select: none;
			pointer-events: none;
			color: var(--color-primary-light);
			width: 100%;
			height: auto;
			.selection {
				.presets {
					#EffectSelect1, #EffectSelect2, #EffectSelect3, #EffectSelect4, #EffectSelect5, #EffectSelect6 {
						display: none;
					}
				}
				.sampler {
					#BankA, #BankB, #BankC {
						display: none;
					}
				}
				#Cough {
					display: none;
				}
				.channels {
					#Fader1Mute, #Fader2Mute, #Fader3Mute, #Fader4Mute {
						display: none;
					}
				}
			}

			.area {
				#gender, #echo, #pitch, #reverb,
				#Cough, #Bleep,
				#BottomRight, #BottomLeft, #TopLeft, #TopRight, #Clear,
				#BankA, #BankB, #BankC,
				#Fader1Mute, #Fader2Mute, #Fader3Mute, #Fader4Mute,
				#EffectSelect1, #EffectSelect2, #EffectSelect3, #EffectSelect4, #EffectSelect5, #EffectSelect6,
				#Megaphone, #Robot, #HardTune, #FX {
					cursor: pointer;
					pointer-events: all;
					&:hover {
						fill: #333;
					}

					&.selected {
						color:var(--color-light);
						fill:var(--color-secondary);
						background-color:var(--color-secondary);
						&#gender, &#echo, &#pitch, &#reverb {
							color:var(--color-secondary);;
						}
						&:hover {
							fill:var(--color-secondary-light);
						}
					}
					&.highlight {
						color: var(--color-light) !important;
					}
				}
				.disabled, .mixer .display, .mixer .level {
					pointer-events: none !important;
					filter: grayscale();
				}
			}
		}
	}
}
</style>