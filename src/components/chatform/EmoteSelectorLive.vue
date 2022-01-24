<template>
	<div class="emoteselectorlive">
		<div class="emote"
		v-for="(e, index) in filteredEmotes"
		:key="e.id"
		:class="selectedIndex == index? 'selected' : ''"
		@click="$emit('select', e);">
			<img
				class="image"
				loading="lazy" 
				:src="'https://static-cdn.jtvnw.net/emoticons/v2/'+e.id+'/'+e.format[e.format.length-1]+'/dark/1.0'"
				:alt="e.name"
				:data-tooltip="e.name"
				@click="$emit('select', e)">
			<div class="name">{{e.name}}</div>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { TwitchTypes } from '@/utils/TwitchUtils';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		search:String,
	},
	components:{},
	emits:["select", "close"]
})
/**
 * This component is used to select an emote by typing ":xxx" on the
 * message field.
 */
export default class EmoteSelectorLive extends Vue {
	
	public search!:string;

	public selectedIndex:number = 0;

	private keyDownHandler!:(e:KeyboardEvent) => void;

	public get filteredEmotes():TwitchTypes.Emote[] {
		let res:TwitchTypes.Emote[] = [];
		const s = this.search.toLowerCase();
		if(!s || s.length == 0) return res;

		const emotes = store.state.emotesCache;
		for (let j = 0; j < emotes.length; j++) {
			const e = emotes[j] as TwitchTypes.Emote;
			if(e.name.toLowerCase().indexOf(s) > -1) {
				res.push(e);
			}
		}
		return res;
	}

	public mounted():void {
		this.selectedIndex = 0;
		this.keyDownHandler = (e:KeyboardEvent)=> this.onkeyDown(e);
		document.addEventListener("keydown", this.keyDownHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("keydown", this.keyDownHandler);
	}

	public onkeyDown(e:KeyboardEvent):void {
		switch(e.key) {
			case "Escape":
				this.$emit("close");
				break;
			case "ArrowUp":
				this.selectedIndex --;
				e.preventDefault();
				break;
			case "ArrowDown":
				this.selectedIndex ++;
				e.preventDefault();
				break;
			case "Enter":
				this.$emit("select", this.filteredEmotes[this.selectedIndex]);
				e.preventDefault();
				break;
		}
		
		this.selectedIndex = this.selectedIndex%this.filteredEmotes.length;
		if(this.selectedIndex < 0) this.selectedIndex = this.filteredEmotes.length-1;
	}

}
</script>

<style scoped lang="less">
.emoteselectorlive{
	padding: 10px;
	background-color: @mainColor_dark;
	box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
	border-radius: 10px;
	max-width: 100%;
	display: flex;
	flex-direction: column;
	transform-origin: bottom center;
	left: auto;
	margin-left: auto;
	right: 0;
	overflow-x: hidden;
	overflow-y: auto;

	max-height: 80vh;

	.emote {
		display: flex;
		flex-direction: row;
		align-items: center;
		cursor: pointer;

		&.selected, &:hover {
			background-color: fade(@mainColor_light, 20%);
		}


		.name {
			color: #fff;
			font-size: 14px;
		}

		.image {
			height: 33px;
			width: 33px;
			padding: 3px;
			object-fit: contain;
			margin-right: 10px;
		}
	}
}
</style>