<template>
	<div class="bingogridview">
		
		<a href="/"><img src="@/assets/logo.svg" alt="logo" class="logo"></a>

		<Icon v-if="loading" name="loader" class="loader" />

		<div v-else class="grid">
			<h1>{{ title }}</h1>

			<TTButton @click.capture.prevent="generateCSRF(true)"
				v-if="!$store.public.authenticated"
				type="link"
				icon="twitch"
				class="authBt"
				:href="oAuthURL"
				:loading="generatingCSRF"
				v-tooltip="generatingCSRF? $t('login.generatingCSRF') : ''"
				bounce twitch>{{ $t("bingo_grid.state.auth_bt") }}</TTButton>
			
			<div class="ctas" v-if="!$store.public.authenticated">
				<TTButton icon="dice" @click="shuffle()" v-tooltip="$t('bingo_grid.form.shuffle_bt')" />
				<TTButton icon="refresh" @click="uncheckAll()" v-tooltip="$t('bingo_grid.state.reset_bt')"></TTButton>
			</div>

			<div class="cells"
			ref="cellsHolder"
			:style="{aspectRatio: cols/rows,
			gridTemplateColumns: 'repeat('+cols+', 1fr)'}">
				<TransitionGroup name="flip-list">
					<div v-for="entry in entries"
					:class="cellClasses(entry)"
					ref="cell"
					:key="entry.id"
					:data-cellid="entry.id"
					v-tooltip="cellClasses(entry).includes('disabled')? $t('bingo_grid.state.cell_disabled') : ''"
					@click="tickCell(entry)">
						<span class="label">{{ entry.label }}</span>
						<Icon class="check" name="checkmark" v-show="entry.check" :ref="'check_'+entry.id" />
					</div>
				</TransitionGroup>
			</div>
		</div>

		<div class="stars">
			<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="445.2px" height="426.2px" viewBox="0 0 445.2 426.2"
			v-for="i in 100"
			ref="stars"
			class="star"><path style="fill:currentColor" d="M247.5,16l47.2,95.6c4,8.2,11.8,13.9,20.9,15.2L421,142c22.7,3.3,31.8,31.3,15.4,47.3L360,263.7
				c-6.5,6.4-9.5,15.5-8,24.5l18,105c3.9,22.7-19.9,39.9-40.2,29.2l-94.3-49.6c-8.1-4.2-17.7-4.2-25.8,0l-94.3,49.6
				c-20.3,10.7-44.1-6.6-40.2-29.2l18-105c1.5-9-1.4-18.2-8-24.5L8.9,189.3c-16.5-16-7.4-44,15.4-47.3l105.4-15.3
				c9-1.3,16.8-7,20.9-15.2L197.8,16C207.9-4.7,237.3-4.7,247.5,16z"/></svg>
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import DataStoreCommon from '@/store/DataStoreCommon';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { gsap } from 'gsap/gsap-core';
import SSEEvent from '@/events/SSEEvent';
import SSEHelper from '@/utils/SSEHelper';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
		TTButton,
	},
	emits:[],
})
class BingoGridView extends Vue {

	public loading = true;
	public generatingCSRF = true;
	public cols:number = 0;
	public rows:number = 0;
	public bingoCount:number = 0;
	public checkTimeout:number = -1;
	public oAuthURL = "";
	public CSRFToken = "";
	public title:string = "";
	public entries:(TwitchatDataTypes.BingoGridConfig["entries"][number] & {enabled?:boolean})[] = [];

	private starIndex:number = 0;
	private bingoCountDebounce:number = -1;
	private prevGridStates:boolean[] = [];
	private sseConnectHandler!:(e:SSEEvent) => void;
	private sseUntickAllHandler!:(e:SSEEvent) => void;
	private sseTickCellHandler!:(e:SSEEvent<{cell:string, state:boolean}>) => void;
	private sseGridUpdateHandler!:(e:SSEEvent<{
					title:string;
					cols:number;
					rows:number;
					entries:TwitchatDataTypes.BingoGridConfig["entries"];
				}>) => void;

	public cellClasses(entry:typeof this.entries[number]):string[] {
		let res:string[] = ["cell"];
		if(entry.enabled !== true && this.$store.public.authenticated) res.push("disabled")
		return res;
	}

	public mounted():void {
		if(!this.$store.public.authenticated) {
			this.generateCSRF();
		}
		this.loadGridInfo();

		this.sseConnectHandler = (e:SSEEvent) => this.onSSEConnect(e);
		this.sseTickCellHandler = (e:SSEEvent<Parameters<typeof this.sseTickCellHandler>[0]["data"]>) => this.onTickCell(e);
		this.sseUntickAllHandler = (e:SSEEvent) => this.onUntickAll();
		this.sseGridUpdateHandler = (e:SSEEvent<Parameters<typeof this.sseGridUpdateHandler>[0]["data"]>) => this.onGridUpdate(e.data);
		SSEHelper.instance.addEventListener(SSEEvent.ON_CONNECT, this.sseConnectHandler);
		SSEHelper.instance.addEventListener(SSEEvent.BINGO_GRID_UPDATE, this.sseGridUpdateHandler);
		SSEHelper.instance.addEventListener(SSEEvent.TICK_BINGO_GRID_CELL, this.sseTickCellHandler);
		SSEHelper.instance.addEventListener(SSEEvent.BINGO_GRID_UNTICK_ALL, this.sseUntickAllHandler);
	}

	public beforeUnmount():void {
		clearTimeout(this.checkTimeout);
		SSEHelper.instance.removeEventListener(SSEEvent.ON_CONNECT, this.sseConnectHandler);
		SSEHelper.instance.removeEventListener(SSEEvent.BINGO_GRID_UPDATE, this.sseGridUpdateHandler);
		SSEHelper.instance.removeEventListener(SSEEvent.TICK_BINGO_GRID_CELL, this.sseTickCellHandler);
		SSEHelper.instance.removeEventListener(SSEEvent.BINGO_GRID_UNTICK_ALL, this.sseUntickAllHandler);
	}

	/**
	 * Generates a CSRF token
	 * @param redirect 
	 */
	public async generateCSRF(redirect:boolean = false):Promise<void> {
		this.generatingCSRF = true;
		try {
			const {json} = await ApiHelper.call("auth/CSRFToken", "GET");
			this.CSRFToken = json.token;
		}catch(e) {
			this.$store.common.alert(this.$t("error.csrf_failed"));
		}
		this.oAuthURL = TwitchUtils.getOAuthURL(this.CSRFToken, [], "/public");
		if(redirect) {
			DataStoreCommon.set(DataStoreCommon.REDIRECT, this.$route.fullPath);
			document.location.href = this.oAuthURL;
		}
		this.generatingCSRF = false;
	}

	/**
	 * Load bingo infos
	 */
	private async loadGridInfo():Promise<void> {
		const uid = this.$route.params.uid as string;
		const gridid = this.$route.params.gridId as string;
		try {
			const infos = await ApiHelper.call("bingogrid", "GET", {uid, gridid});
			if(infos.json.data) {
				this.cols		= infos.json.data.cols;
				this.rows		= infos.json.data.rows;
				this.title		= infos.json.data.title;
				this.entries	= infos.json.data.entries;
				this.entries.forEach(v=>{
					v.enabled = v.check;
				});
				this.onGridUpdate(infos.json.data);
			}
		}catch(error) {

		}
		this.loading = false;
		this.animateOpen();
	}

	/**
	 * Shuffle items
	 */
	public shuffle():void {
		for (let i = this.entries.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			if(this.entries[i].lock || this.entries[j].lock) continue;
			[this.entries[i], this.entries[j]] = [this.entries[j], this.entries[i]];
		}
		this.prevGridStates = [];
		clearTimeout(this.checkTimeout);
		this.checkTimeout = setTimeout(() => {
			this.checkBingos();
		}, 250);
	}

	/**
	 * Uncheck all entries
	 */
	public uncheckAll():void {
		this.entries.forEach(v=>v.check = false);
	}

	/**
	 * Uncheck all entries
	 */
	public tickCell(entry:typeof this.entries[number]):void {
		const authenticated = this.$store.public.authenticated;
		//Do not allow to tick cell if logged in and not enabled
		if(authenticated && entry.enabled != true) return;
		entry.check = !entry.check;
		this.checkBingos();
	}

	/**
	 * Check if rows/cols/diagonals are filled
	 */
	public checkBingos():void {
		const newStates = this.entries.map(v=>v.check);
		const prevStates = this.prevGridStates;
		let newVerticalBingos:number[] = [];
		let newHorizontalBingos:number[] = [];
		let newDiagonalBingos:number[] = [];
		let bingoCount = 0;

		if(prevStates) {
			let prevVerticalBingos:number[] = [];
			let prevHorizontalBingos:number[] = [];
			let prevDiagonalBingos:number[] = [];
			//Checking for vertical bingos
			for (let x = 0; x < this.cols; x++) {
				let allTicked = true;
				for (let y = 0; y < this.rows; y++) {
					allTicked &&= newStates[x + y*this.cols];
				}
				if(allTicked) newVerticalBingos.push(x);
			}
			for (let x = 0; x < this.cols; x++) {
				let allTicked = true;
				for (let y = 0; y < this.rows; y++) {
					allTicked &&= prevStates[x + y*this.cols];
				}
				if(allTicked) prevVerticalBingos.push(x);
			}
			//Checking for horizontal bingos
			for (let y = 0; y < this.rows; y++) {
				let allTicked = true;
				for (let x = 0; x < this.cols; x++) {
					allTicked &&= newStates[x + y*this.cols];
				}
				if(allTicked) newHorizontalBingos.push(y);
			}
			for (let y = 0; y < this.rows; y++) {
				let allTicked = true;
				for (let x = 0; x < this.cols; x++) {
					allTicked &&= prevStates[x + y*this.cols];
				}
				if(allTicked) prevHorizontalBingos.push(y);
			}

			//Checking for diagonal bingos
			if(this.cols == this.rows) {
				//Top left to bottom right
				let allTicked = true;
				for (let x = 0; x < this.cols; x++) {
					allTicked &&= newStates[x + x*this.cols];
				}
				if(allTicked) newDiagonalBingos.push(0);
				allTicked = true;
				for (let x = 0; x < this.cols; x++) {
					allTicked &&= prevStates[x + x*this.cols];
				}
				if(allTicked) prevDiagonalBingos.push(0);

				//Bottom left to top right
				allTicked = true;
				for (let x = 0; x < this.cols; x++) {
					allTicked &&= newStates[x + (this.cols - 1 - x)*this.cols];
				}
				if(allTicked) newDiagonalBingos.push(1);
				allTicked = true;
				for (let x = 0; x < this.cols; x++) {
					allTicked &&= prevStates[x + (this.cols - 1 - x)*this.cols];
				}
				if(allTicked) prevDiagonalBingos.push(1);
			}

			bingoCount = newVerticalBingos.length + newHorizontalBingos.length + newDiagonalBingos.length;

			//Remove previous bingo from the list
			newVerticalBingos = newVerticalBingos.filter(index => prevVerticalBingos.indexOf(index) == -1);
			newHorizontalBingos = newHorizontalBingos.filter(index => prevHorizontalBingos.indexOf(index) == -1);
			newDiagonalBingos = newDiagonalBingos.filter(index => prevDiagonalBingos.indexOf(index) == -1);

			let delay = 0;
			let animating:{[key:string]:boolean} = {};
			const animateCell = (cell:{data:TwitchatDataTypes.BingoGridConfig["entries"][number], holder:HTMLElement})=>{
				if(animating[cell.data.id] !== true) {
					gsap.killTweensOf(cell.holder);
				}
				gsap.fromTo(cell.holder, {scale:2}, {scale:1, delay, duration:.5, immediateRender:false, ease:"back.out", clearProps:"all", onStart:()=>{
					this.popStars(cell.holder);
				}});
			}

			newHorizontalBingos.forEach(y=>{
				for (let x = 0; x < this.cols; x++) {
					const cell = this.getCellByCoords(x, y);
					cell.holder.classList.add("bingo");
					delay += .05;
					animateCell(cell);
				}
				delay += .1;
			});

			newVerticalBingos.forEach(x=>{
				for (let y = 0; y < this.rows; y++) {
					const cell = this.getCellByCoords(x, y);
					cell.holder.classList.add("bingo");
					delay += .05;
					animateCell(cell);
				}

				delay += .1;
			});

			newDiagonalBingos.forEach(dir=>{
				for (let x = 0; x < this.cols; x++) {
					const px = dir === 0? x : this.rows - 1 - x;
					const y = x;
					const cell = this.getCellByCoords(px, y);
					cell.holder.classList.add("bingo");
					delay += .05;
					animateCell(cell);
				}
				delay += .1;
			});
		}

		this.prevGridStates = newStates;

		if(this.bingoCount != bingoCount && this.$store.public.authenticated) {
			this.bingoCount = bingoCount;
			const uid = this.$route.params.uid as string;
			const gridid = this.$route.params.gridId as string;
			clearTimeout(this.bingoCountDebounce);
			this.bingoCountDebounce = setTimeout(() => {
				ApiHelper.call("bingogrid/bingo", "POST", {count:bingoCount, gridid, uid});
			}, 1000);
		}
	}

	/**
	 * Animate tiles
	 */
	private async animateOpen():Promise<void> {
		await this.$nextTick();

		return new Promise((resolve)=> {
			const spiralOrder: number[] = [];
	
			let x = 0;
			let y = 0;
			let delta = [0, -1];
			const width = this.cols;
			const height = this.rows;
			const cx = Math.ceil(this.cols/2)-1;
			const cy = Math.ceil(this.rows/2)-1;
	
			//Spiral algorithm from:
			//https://stackoverflow.com/a/13413224/3813220
			for (let i = Math.pow(Math.max(width, height), 2); i>0; i--) {
				if ((-width/2 < x && x <= width/2) 
				&& (-height/2 < y && y <= height/2)) {
					let index = (x+cx) + (y+cy) * this.cols;
					spiralOrder.push(index);
				}	
	
				if (x === y 
				|| (x < 0 && x === -y) 
				|| (x > 0 && x === 1-y)){
					// change direction
					delta = [-delta[1], delta[0]]            
				}
	
				x += delta[0];
				y += delta[1];        
			}
	
			const cells = this.$refs.cell as HTMLElement[];
			gsap.from(this.$refs.cellsHolder as HTMLElement, {scale:0, ease:"sine.out", duration:.35, clearProps:"transform"});
			//Animate items from center
			cells.forEach((cell, index) => {
				let distance = spiralOrder.findIndex(v=>v===index);
				gsap.fromTo(cell, {scale:0}, {scale:1, ease:"elastic.out", duration:1.3, delay: .3 + distance*.05, clearProps:"all",
					onComplete:()=>{
						if(distance == Math.max(0,cells.length-10)) {
							this.checkBingos();
						}
					}
				});
			});
		});
	}

	/**
	 * Gets a cell's details from its index
	 * @param index
	 */
	private getCellByCoords(x:number, y:number):{data:TwitchatDataTypes.BingoGridConfig["entries"][number], holder:HTMLElement} {
		const data = this.entries[x + y*this.cols];
		const holder = document.querySelector("[data-cellid=\""+data.id+"\"]") as HTMLElement;
		return {data, holder};
	}

	/**
	 * Pop stars over the given cell
	 * @param ref
	 */
	private async popStars(ref:HTMLElement):Promise<void> {
		const stars = this.$refs.stars as SVGElement[];
		const bounds = ref.getBoundingClientRect();
		for (let i = 0; i < 10; i++) {
			const star = stars[(this.starIndex++)%stars.length]
			const left = bounds.x + bounds.width/2;
			const top = bounds.y + bounds.height/2;
			const angle = (Math.random()-Math.random()) * 250;
			const scaleRatio = Math.random();
			star.style.left = left+"px";
			star.style.top = top+"px";
			star.style.width = (bounds.width*(.1+scaleRatio*.15))+"px";
			star.style.height = (bounds.height*(.1+scaleRatio*.15))+"px";
			star.style.opacity = "1";
			const x = (Math.random()-Math.random()) * bounds.width;
			const y = (Math.random()-Math.random()) * bounds.height;
			gsap.killTweensOf(star);
			gsap.to(star, {opacity:0, x:"-50%", y:"-50%", rotation:angle+"deg", left:left+x, top:top+y, duration:Math.random(), ease:"sine.out"});
		}
	}

	/**
	 * Regenerates serverside cache after SSE reconnects in case
	 * disconnect was due to a server reboot
	 * @param e 
	 */
	private async onSSEConnect(e:SSEEvent):Promise<void> {
		if(this.entries.length === 0) return;

		const gridid = this.$route.params.gridId as string;
		const entries:TwitchatDataTypes.BingoGridConfig["entries"][number][] = this.entries.map(e => {
			return  {
				id:e.id,
				lock:e.lock,
				label:e.label,
				check:e.enabled === true,
			}
		})
		const grid = {
			cols:this.cols,
			rows:this.rows,
			title:this.title,
			entries,
		};
		await ApiHelper.call("bingogrid", "POST", {gridid, grid});
	}

	/**
	 * Called when streamer updates grid params and on first loading
	 * @param e 
	 */
	private async onUntickAll():Promise<void> {
		this.entries.forEach(cell => cell.enabled = cell.check = false);
		this.checkBingos();
	}

	/**
	 * Called when streamer updates grid params and on first loading
	 * @param e 
	 */
	private async onGridUpdate(data:Parameters<typeof this.sseGridUpdateHandler>[0]["data"]):Promise<void> {
		if(!data) return;
		this.rows = data.rows;
		this.cols = data.cols;
		this.title = data.title;
		this.entries = data.entries;
		this.entries.forEach(v=>{
			v.enabled = v.check;
		});
	}

	/**
	 * Called when streamer un/ticks a cell
	 * @param e 
	 */
	private async onTickCell(e:SSEEvent<Parameters<typeof this.sseTickCellHandler>[0]["data"]>):Promise<void> {
		if(!e.data) return;
		const cell = this.entries.find(cell => cell.id == e.data!.cell);
		if(cell) {
			cell.enabled = e.data.state;
			if(!cell.enabled) cell.check = false;
			this.checkBingos();
		}
	}
}
export default toNative(BingoGridView);
</script>

<style scoped lang="less">
.bingogridview{
	color: var(--color-text);
	min-width: 100vw;
	min-height: 100vh;
	gap: 1em;
	display: flex;
	flex-direction: column;
	align-items: center;

	.logo {
		height: 5em;
		margin: 2em auto 0 auto;
		display: block;
		max-height: 10vh;
	}

	.loader {
		height: 4em;
		margin: auto;
		display: block;
	}

	.grid {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-grow: 1;

		.ctas {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
		}

		.cells {
			display: grid;
			grid-template-columns: repeat(5, 1fr);
			max-width: 100vw;
			max-height: 70vh;
			// overflow: hidden;
			.cell {
				padding: 5px;
				display: flex;
				align-items: center;
				justify-content: center;
				overflow: hidden;
				font-weight: bold;
				white-space: pre-line;
				text-align: center;
				word-wrap: break-word;
				position: relative;
				aspect-ratio: 1;
				cursor: pointer;
				box-shadow:0 0 0 1px currentColor;
				border-radius: var(--border-radius);
				background-color: var(--background-color-fadest);
				min-width: 70px;
				// transition: background-color .25s,  box-shadow .25s, transform .25s;
				&:not(.disabled):hover {
					background-color: var(--background-color-fader);
					z-index: 1;
					// font-size: 1.1em;
					box-shadow:0 0 0 5px currentColor;
				}

				&.disabled {
					opacity: .25;
					cursor: default;
				}

				.check {
					pointer-events: none;
					position: absolute;
					top: 50%;
					left: 50%;
					width: 70%;
					color: #00cc00;
					pointer-events: none;
					transform-origin: center center;
					margin-left: -35%;
					margin-top: -35%;
					z-index: 101;
					filter: drop-shadow(2px 2px 5px rgba(0,0,0,.5));
				}

				.label {
					display: block;
					width: 100%;
				}
			}
		}
	}

	.stars {
		color: var(--color-text);
		pointer-events: none;
		svg {
			transform-origin: center center;
			transform: translate(-50%, -50%);
			position: fixed;
			top: 200vw;
			left: 200vh;
		}
	}

	.flip-list-move {
		transition: transform .25s;
	}

	.authBt {
		background-color: red;
	}
}
</style>
