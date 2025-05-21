<template>
	<span :class="classes" v-html="svg" v-if="svg"></span>

	<svg class="icon" v-else-if="error" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
		width="27.9px" height="27.9px" viewBox="0 0 27.9 27.9" style="enable-background:new 0 0 27.9 27.9;" xml:space="preserve">
	<path style="fill:#CC0000;" d="M24.9,27.9H3.1c-1.7,0-3.1-1.4-3.1-3.1V3.1C0,1.4,1.4,0,3.1,0h21.8c1.7,0,3.1,1.4,3.1,3.1v21.8
		C27.9,26.5,26.5,27.9,24.9,27.9z"/>
	<polygon style="fill:#FFFFFF;" points="17.3,7.3 14,10.6 10.6,7.3 7.3,10.6 10.6,14 7.3,17.3 10.6,20.6 14,17.3 17.3,20.6
		20.6,17.3 17.3,14 20.6,10.6 "/>
	</svg>


</template>

<script lang="ts">
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
class Icon extends Vue {

	@Prop
	public name!:string;

	@Prop({type:String, default:""})
	public theme!:string;

	public svg:string = "";
	public error:boolean = false;

	public get classes():string[] {
		let res = ["icon"];
		if(this.theme == "dark") res.push("dark");
		if(this.theme == "light") res.push("light");
		if(this.theme == "primary") res.push("primary");
		if(this.theme == "secondary") res.push("secondary");
		if(this.theme == "alert") res.push("alert");
		if(this.theme == "premium") res.push("premium");
		if(this.theme == "twitch") res.push("twitch");
		return res;
	}

	public beforeMount():void {
		this.loadImage();

		watch(()=>this.name, ()=>this.loadImage());
	}

	private async loadImage():Promise<void> {
		// this.$store.common.iconCache = {};//Disable cache for debug
		let cache = this.$store.common.iconCache[this.name];
		//Icon is pending for loading, wait for it

		if(cache && typeof cache != "string") {
			await cache;
			cache = this.$store.common.iconCache[this.name];
		}

		//If icon is loaded, load it from cache
		if(cache && typeof cache == "string") {
			this.svg = cache;
			return;
		}

		//Icon not yet loaded, load it
		try {
			const url = this.$asset("icons/"+this.name+".svg");
			if(/undefined$/.test(url)) {
				throw("icon not found");
			}
			this.$store.common.iconCache[this.name] = fetch(url)
			.then(async (imgRes) => {
				if(imgRes.status <200 || imgRes.status > 204) {
					this.error = true;
				}else{
					this.svg = (await imgRes.text())
					// .replace(/<style[^<keep]*<\/ ?style>/gim, "")//Cleanup styles
					.replace(/<!--[^<]*-->/g, "")//Cleanup comments
					.replace(/<\?xml[^<]*>/g, "")//cleanup <xml> header
					.replace(/\s+/g, ' ') // Replace multiple spaces with a single space
					.replace(/>\s+</g, '><');//cleanup spaces between tags
					this.$store.common.iconCache[this.name] = this.svg;
				}
			});
		}catch(error) {
			this.error = true;
		}
	}


}
export default toNative(Icon);
</script>
<style scoped lang="less">
.icon{
	display: inline-block;
	// color: inherit;
	:deep(svg) {
		width: auto;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		object-fit: cover;
		display: block;
		* {
			fill: currentColor !important;
		}
	}
	&.light {
		color: var(--color-light) !important;
	}
	&.dark {
		color: var(--color-dark) !important;
	}
	&.primary {
		color: var(--color-primary) !important;
	}
	&.secondary {
		color: var(--color-secondary) !important;
	}
	&.alert {
		color: var(--color-alert) !important;
	}
	&.premium {
		color: var(--color-premium) !important;
	}
	&.twitch {
		color: var(--color-twitch) !important;
	}
}
</style>
