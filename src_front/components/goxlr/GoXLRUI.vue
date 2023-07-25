<template>
	<div :class="classes">
		<div class="img" v-html="svg" v-if="svg && !error" ref="svgHolder"></div>
		<div v-else>An error occured loading interface</div>
	</div>
</template>

<script lang="ts">
import { GoXLRTypes } from '@/types/GoXLRTypes';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["click"],
})
export default class GoXLRUI extends Vue {

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
	}
	
	public beforeUnmout():void {
		this.$el.removeEventListener("click", this.clickHandler);
	}
	
	public onClick(e:MouseEvent):void {
		let target = e.target as HTMLElement;
		const ids:string[] = [];
		//Get button ID
		while(!target.getAttribute("id") && target != this.$el) {
			target = target.parentElement as HTMLElement;
		}
		if(target.id){
			ids.push(target.id);
	
			//Get category ID if any
			if(target != this.$el) {
				target = target.parentElement as HTMLElement
				while(!target.getAttribute("id") && target != this.$el) {
					target = target.parentElement as HTMLElement;
				}
			}
			if(target.id != "GoXLR"){
				ids.unshift(target.id);
			}

			const fullID = ids.join("_") as GoXLRTypes.ButtonTypesData;
			const index = this.selectedButtons.indexOf(fullID);
			if(index == -1) {
				this.selectedButtons.push(fullID);
			}else{
				this.selectedButtons.splice(index, 1);
			}
	
			this.setSelectionStates();
		}
	}

	private setSelectionStates():void {
		const holder = this.$refs.svgHolder as HTMLDivElement;

		for (let i = 0; i < GoXLRTypes.ButtonTypes.length; i++) {
			const t = GoXLRTypes.ButtonTypes[i];
			let item = holder.querySelector(".selection #"+t.split("_")[0]) as HTMLElement|null;
			if(item) {
				item.style.display = "none";
			}

			item = holder.querySelector(".area"+t.split("_").map(v=> " #"+v).join("")) as HTMLElement|null;
			if(item) {
				item.style.fill = "initial"
			}
		}

		for (let i = 0; i < this.selectedButtons.length; i++) {
			const bt = this.selectedButtons[i];
			let item = holder.querySelector(".selection #"+bt.split("_")[0]) as HTMLElement|null;
			if(item) {
				item.style.display = "block";
			}

			item = holder.querySelector(".area"+bt.split("_").map(v=> " #"+v).join("")) as HTMLElement|null;
			if(item) {
				item.style.fill = "var(--color-secondary)";
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
			color: white;
			width: 100%;
			height: auto;
			.selection {
				.presets {
					#Preset1, #Preset2, #Preset3, #Preset4, #Preset5, #Preset6 {
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
					#Channel1, #Channel2, #Channel3, #Channel4 {
						display: none;
					}
				}
			}

			.area {
				#Mute, #Bleep,
				#BottomRight, #BottomLeft, #TopLeft, #TopRight, #Clear,
				#BankA, #BankB, #BankC,
				#Preset1, #Preset2, #Preset3, #Preset4, #Preset5, #Preset6,
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