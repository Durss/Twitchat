<template>
	<div :class="classes">
		<div class="img" v-html="svg" v-if="svg && !error" ref="svgHolder"></div>
		<div v-else>An error occured loading GoXLR interface</div>
	</div>
</template>

<script lang="ts">
import { GoXLRTypes } from '@/types/GoXLRTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["click", "change", "update:modelValue"],
})
export default class GoXLRUI extends Vue {

	@Prop({default: []})
	public modelValue!:GoXLRTypes.ButtonTypesData[];

	public svg:string = "";
	public error:boolean = false;

	private selectedButtons:GoXLRTypes.ButtonTypesData[] = [];
	private clickHandler!:(e:MouseEvent) => void;

	public get classes():string[] {
		const res = ["goxlrui"];
		this.selectedButtons.forEach(v=> res.push(v));
		return res;
	}

	public async mounted():Promise<void> {
		this.selectedButtons = this.modelValue;
		
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
		this.$el.addEventListener("click", this.clickHandler);
		
		await this.$nextTick();
		this.setSelectionStates();
	}
	
	public beforeUnmout():void {
		this.$el.removeEventListener("click", this.clickHandler);
	}
	
	public onClick(e:MouseEvent):void {
		let target = e.target as HTMLElement;
		let id:GoXLRTypes.ButtonTypesData|null = null;
		//Get button ID
		while(!target.getAttribute("id") && target != this.$el) {
			target = target.parentElement as HTMLElement;
		}
		if(target.id){
			// ids.push(target.id);
	
			if(target.id != "GoXLR"){
				id = target.id as GoXLRTypes.ButtonTypesData;
			}

			if(id != null) {
				// const fullID = ids.join("_") as GoXLRTypes.ButtonTypesData;
				const index = this.selectedButtons.indexOf(id);
				if(index == -1) {
					this.selectedButtons.push(id);
				}else{
					this.selectedButtons.splice(index, 1);
				}
		
				this.$emit("change");
				this.$emit("update:modelValue", this.selectedButtons);
				this.setSelectionStates();
			}
		}
	}

	private setSelectionStates():void {
		const holder = this.$refs.svgHolder as HTMLDivElement;

		//Unselect everything
		for (let i = 0; i < GoXLRTypes.ButtonTypes.length; i++) {
			const t = GoXLRTypes.ButtonTypes[i];
			let item = holder.querySelector(".selection #"+t) as HTMLElement|null;
			if(item) {
				item.style.display = "none";
			}

			item = holder.querySelector(".area #"+t) as HTMLElement|null;
			if(item) {
				item.style.fill = "initial"
				item.style.color = "inherit"
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
				item.style.fill = "var(--color-secondary)";
				item.style.color = "var(--color-light)";
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
				}
			}
		}
	}
}
</style>