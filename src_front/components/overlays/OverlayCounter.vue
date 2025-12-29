<template>
	<div class="overlaycounter" v-if="counter">

		<div class="userlist" id="holder" v-if="counter.perUser === true">
			<TransitionGroup name="list">
				<div class="user" ref="user" v-for="u in counter.leaderboard!" :key="u.login" :id="'user'+u.login">
					<div class="points">{{ u.points }}</div>
					<img class="avatar" v-if="u.avatar" :src="u.avatar">
					<div class="login">{{ u.login }}</div>
				</div>
			</TransitionGroup>
		</div>

		<div class="counter" id="holder" v-else-if="counter.min === false && counter.max === false">
			<span class="name" id="name">{{ counter.name }}</span>
			<span class="spacer" id="spacer"></span>
			<span class="value decimal0" id="value">{{ getFormattedValue(0) || 0 }}</span>
			<span class="value decimal1" id="value">{{ getFormattedValue(1) || 0 }}</span>
			<span class="value decimal2" id="value">{{ getFormattedValue(2) || 0 }}</span>
			<span class="value decimal3" id="value">{{ getFormattedValue(3) || 0 }}</span>
		</div>

		<div class="progressBar" id="holder" v-else>
			<div class="fill" id="fill" :style="progressStyles"></div>
			<span class="name" id="name">{{ counter.name }}</span>
			<div class="goal" id="goal">
				<span class="min" id="min">{{ counter.min || 0 }}</span>
				<span class="value decimal0" id="value">{{ getFormattedValue(0) || 0 }}</span>
				<span class="value decimal1" id="value">{{ getFormattedValue(1) || 0 }}</span>
				<span class="value decimal2" id="value">{{ getFormattedValue(2) || 0 }}</span>
				<span class="value decimal3" id="value">{{ getFormattedValue(3) || 0 }}</span>
				<span class="max" id="max">{{ counter.max || 0 }}</span>
			</div>
		</div>

	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { gsap } from 'gsap/gsap-core';
import { watch, type CSSProperties } from 'vue';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';

@Component({
	components:{}
})
class OverlayCounter extends AbstractOverlay {

	@Prop({type: Boolean, default: false})
	public embed!:boolean;

	@(Prop)
	public staticCounterData!:TwitchatDataTypes.CounterData;

	public localValue:number = 0;
	public fillWidth:number = 0;
	public progrressMode:boolean = false;
	public counter:TwitchatDataTypes.CounterData|null = null;

	private id:string = "";
	private firstRender:boolean = true;

	private counterUpdateHandler!:(e:TwitchatEvent<"COUNTER_UPDATE">) => void;

	public getFormattedValue(decimals:number = 0):string {
		//This fixes the javascript number
		const value = parseFloat(this.localValue.toFixed(decimals));
		return value.toLocaleString("fr-FR", {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
	}

	public get progressStyles():CSSProperties {
		let res:CSSProperties = {};
		res.width = this.fillWidth+"%";
		return res;
	}

	public beforeMount(): void {
		if(this.embed !== false) {
			if(this.staticCounterData.perUser && this.staticCounterData.leaderboard) {
				watch(()=>this.staticCounterData.leaderboard, ()=> {
					this.setCounterData(JSON.parse(JSON.stringify(this.staticCounterData)));
				}, {deep:true})
				this.setCounterData(JSON.parse(JSON.stringify(this.staticCounterData)));
			}else{
				this.setCounterData(this.staticCounterData);
			}
			this.onValueUpdate();
		}else{
			this.id = this.$route.query.cid as string ?? "";
			if(this.id) {
				this.counterUpdateHandler = (e) => this.onCounterUpdate(e);
				PublicAPI.instance.addEventListener("COUNTER_UPDATE", this.counterUpdateHandler);
			}
		}

		watch(()=>this.counter?.value, ()=> {
			this.onValueUpdate();
		});
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast("COUNTER_GET", {cid:this.id});
	}

	public beforeUnmount(): void {
		PublicAPI.instance.removeEventListener("COUNTER_UPDATE", this.counterUpdateHandler);
	}

	/**
	 * Called when API sends fresh counter data
	 */
	private async onCounterUpdate(e:TwitchatEvent<"COUNTER_UPDATE">):Promise<void> {
		if(e.data) {
			const c = e.data.counter;
			if(c.id != this.id) return;
			this.setCounterData(c);
		}
	}

	/**
	 * Called when global value of the counter is updated
	 * Interpolates the text value
	 */
	private onValueUpdate():void {
		if(!this.counter) return;

		// const duration = Math.min(5, Math.max(.25, Math.abs(this.counter.value - this.localValue) * .025));
		const duration = 1;
		gsap.to(this, {duration, localValue:this.counter?.value ||0, ease:"sine.inOut"});

		let min = Math.min(this.counter.min || 0);
		let max = Math.min(this.counter.max || 0);
		let minPrev = min;
		min = Math.min(min, max);
		max = Math.max(minPrev, max);
		const percent = (this.counter.value - min)/(max - min);
		this.fillWidth = (percent*100);
	}

	/**
	 * Set local counter data.
	 * Makes users appear if displaying a leaderboard
	 */
	private setCounterData(data:TwitchatDataTypes.CounterData):void {
		if(this.counter && this.counter.leaderboard && data.leaderboard) {
			//Diff old/new values and highlight updated items
			for (const prevUser of this.counter.leaderboard) {
				let newUser = data.leaderboard.find(v=>v.login == prevUser.login);
				if(!newUser || newUser.points == prevUser.points) continue;
				gsap.fromTo("#user"+prevUser.login, {outlineWidth:7}, {outlineWidth:0, duration:.5, ease:"sine.inOut"});
				gsap.fromTo("#user"+prevUser.login, {filter:"brightness(2)"}, {filter:"brightness(1)", duration:.5, ease:"sine.in"});
			}
		}
		this.counter = data;
		this.progrressMode = this.counter.min === false && this.counter.max === false;

		if(this.firstRender) {
			this.firstRender = false;
			this.$nextTick().then(()=>{
				const userList = this.$refs.user;
				if(userList) {
					gsap.fromTo(userList, {opacity:0, x:-200}, {opacity:1, x:0, delay:.5, duration:1, stagger:.025, ease:"elastic.out", clearProps:"all"});
				}
			})
		}
	}

	// public onEnter(el:Element, done:()=>void):void {
	// 	console.log("ENTER");
	// 	gsap.fromTo(el, {opacity:0, x:-200}, {opacity:1, x:0, duration:1, ease:"elastic.out", onComplete:()=>done()});
	// }

	// public onLeave(el:Element, done:()=>void):void {
	// 	console.log("LEAVE");
	// 	gsap.to(el, {opacity:0, x:-200, duration:1, ease:"back.in", onComplete:()=>done()});
	// }

}
export default toNative(OverlayCounter);
</script>

<style scoped lang="less">
.overlaycounter{
	font-size: 1.5em;

	.counter {
		margin: .5em;
		box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
		background-color: var(--color-light);
		padding: 1em;
		border-radius: var(--border-radius);
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		.name, .value, .spacer{
			font-size: 1.5em;
			text-shadow: 0px 0px .05em black;
			&.value {
				font-weight: bold;
				font-variant-numeric: tabular-nums;
				&.decimal1,&.decimal2,&.decimal3 {
					display: none;
				}
			}
			&.spacer {
				margin: 0 .25em;
				&::before {
					content:"|";
				}
			}
		}
	}

	.progressBar {
		margin: .5em;
		box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
		background-color: var(--color-light);
		width: 24em;
		height: 4em;
		position: relative;
		border-radius: .5em;
		overflow: hidden;
		.name {
			font-size: 1.5em;
			font-weight: bold;
			z-index: 1;
			position: absolute;
			left: 0;
			top: 50%;
			transform: translate(0, calc(-50% - .3em));
			width: 100%;
			text-align: center;
			text-shadow: 0px 0px .05em black;
		}
		.fill {
			position: absolute;
			height: 100%;
			width: 100%;
			top: 0;
			left: 0;
			background: var(--color-primary-light);
			height: 100%;
			transition: width 1s ease-in-out;
		}

		.goal {
			position: absolute;
			width: 100%;
			min-width: 100%;
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			align-items: flex-end;
			bottom: 0;
			left: 0;

			span {
				text-shadow: 0px 0px .075em black;
				border-radius: .25em;
				padding: .15em .25em;

				&.value {
					font-weight: bold;
					font-size: 1.25em;
					font-variant-numeric: tabular-nums;
					&.decimal1,&.decimal2,&.decimal3 {
						display: none;
					}
				}
			}
		}
	}

	.userlist {
		width: fit-content;
		.user {
			gap: .5em;
			margin: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
			background-color: var(--color-light);
			border-radius: 1rem;
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			overflow: hidden;
			width: fit-content;
			outline: 0px solid var(--color-secondary);
			.avatar {
				width: 2.5em;
				height: 2.5em;
				border-radius: 50%;
			}
			.login {
				font-size: 1.5em;
				padding: .5em;
				padding-left: 0;
				max-width: 10em;
				text-overflow: ellipsis;
				overflow: hidden;
			}
			.points {
				display: flex;
				align-items: center;
				justify-content: center;
				align-self: stretch;
				padding: .25em;
				min-width: 2em;
				font-weight: bold;
				background-color: var(--color-primary);
				color: var(--color-light);
				font-size: 1.5em;
			}
		}
	}

	.list-move,
	.list-enter-active,
	.list-leave-active {
		opacity: 1;
		transition: transform .5s cubic-bezier(0.680, -0.550, 0.265, 1.550), opacity .5s;
	}

	.list-enter-from,
	.list-leave-to {
		opacity: 0;
		transform: translateX(-50%);
	}
	.list-leave-active {
		position: absolute;
	}
}
</style>
