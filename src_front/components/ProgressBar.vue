<template>
	<div :class="classes">
		<div class="fill" :style="barStyles"></div>
		<div class="timer" ref="timer" :style="timerStyles" v-if="percent<1 && duration != undefined">{{timeLeft}}</div>
	</div>
</template>

<script lang="ts">
import Utils from '@/utils/Utils';
import type { CSSProperties } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{}
})
class ProgressBar extends Vue {

	@Prop({type:Number,default:0})
	public percent!:number;

	@Prop({ type:Number, default:1})
	public duration!:number;//In ms

	@Prop({type:Boolean, default:false})
	public boostMode!:boolean;

	@Prop({type:Boolean, default: false})
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public premium!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	public get timeLeft():string { return Utils.formatDuration(this.duration * Math.max(0, Math.min(1, (1-this.percent)))) }

	public get elapsedPercent():number { return Math.max(0, Math.min(1, (1-this.percent))); }

	public get classes():string[] {
		const list = ["progressbar"];
		if(this.boostMode !== false) list.push('boostMode');
		if(this.secondary !== false) list.push("secondary");
		if(this.premium !== false) list.push("premium");
		if(this.alert !== false) list.push("alert");
		return list;
	}

	public get barStyles():CSSProperties {
		return {
			transform: `scaleX(${this.elapsedPercent*100}%)`,
		}
	}

	public get timerStyles():CSSProperties {
		if(this.$refs.timer) {
			let parent = (this.$el as HTMLElement).getBoundingClientRect();
			let bounds = (this.$refs.timer as HTMLElement).getBoundingClientRect();
			let barSize = this.elapsedPercent * parent.width;
			let px = barSize - bounds.width;
			let offset = -px / bounds.width;
			if(px < 0) px -= barSize - bounds.width;
			return {
				right:"auto",
				transform: "translateX("+px+"px)",
				backgroundPositionX: offset > 0? (offset*100)+"%" : "0%"
			}
		}else{
			return {
				right: (this.percent*100)+"%",
			}
		}
	}
}
export default toNative(ProgressBar);
</script>

<style scoped lang="less">
.progressbar{
	height: 5px;
	width: 100%;
	@bg: #555;
	@bg: var(--grayout);
	background: @bg;
	position: relative;
	@shadow: 0 4px 4px rgba(0, 0, 0, .5);

	.fill {
		box-shadow: @shadow;
		height: 4px;
		width: 100%;
		background-color: var(--color-primary);
		transform-origin: left;
		will-change: transform;
		position: absolute;
	}

	.timer {
		position: absolute;
		font-family: var(--font-roboto);
		background-color: var(--color-primary);
		color: var(--color-light);
		top: 0;
		font-size: 15px;
		padding: 2px 5px;
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		box-shadow: @shadow;
		transform: translateX(0);
		will-change: transform;
		@c:var(--color-primary);
		background-color: @c;
		background: linear-gradient(90deg, @c 0%, @c 50%, @bg 50%, @bg 100%);
		background-size: 200% 100%;
	}

	&.secondary {
		@c: var(--color-secondary);
		.fill {
			background-color: @c;
		}
		.timer {
			background-color: @c;
			background: linear-gradient(90deg, @c 0%, @c 50%, @bg 50%, @bg 100%);
			background-size: 200% 100%;
		}
	}

	&.alert {
		@c: var(--color-alert);
		.fill {
			background-color: @c;
		}
		.timer {
			background-color: @c;
			background: linear-gradient(90deg, @c 0%, @c 50%, @bg 50%, @bg 100%);
			background-size: 200% 100%;
		}
	}

	&.boostMode {
		@c: darken(#00f0f0, 15%);
		.fill {
			background-color: @c;
		}
		.timer {
			background-color: @c;
			background: linear-gradient(90deg, @c 0%, @c 50%, @bg 50%, @bg 100%);
			background-size: 200% 100%;
		}
	}

	&.premium {
		@c: var(--color-premium);
		.fill {
			background-color: @c;
		}
		.timer {
			background-color: @c;
			background: linear-gradient(90deg, @c 0%, @c 50%, @bg 50%, @bg 100%);
			background-size: 200% 100%;
		}
	}
}
</style>
