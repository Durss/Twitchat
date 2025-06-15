<template>
	<div :class="classes" v-if="ready">
		<template v-if="bingo && bingo.enabled">
			<div class="cells" ref="cellsHolder"
			:style="{aspectRatio: bingo.cols/bingo.rows,
			fontSize:bingo.textSize+'px',
			color:bingo.textColor,
			gridTemplateColumns: 'repeat('+bingo.cols+', 1fr)'}">
				<TransitionGroup name="flip-list">
					<div v-for="(entry, index) in bingo.entries"
						ref="cell"
						:class="cellClasses(entry, index)"
						:data-cellid="entry.id"
						:key="entry.id"
						:style="{width:'100%', backgroundColor:backgroundColor}">
						<span class="label">{{ entry.label }}</span>
						<div class="check" v-show="entry.check" :ref="'check_'+entry.id">
							<Icon name="checkmark" />
						</div>
						<Icon name="sub" class="star" />
					</div>
				</TransitionGroup>
			</div>

			<div class="alerts" ref="alertsHolder"
			:style="alertStyles">
			<Icon name="sub" class="star" ref="alertsBg" />
			<template v-if="currentUserAlert">
				<div class="user" ref="userInfo">
						<img v-if="currentUserAlert!.user.avatar" :src="currentUserAlert!.user.avatar" alt="avatar" class="avatar">
						<div class="username">{{ currentUserAlert!.user.name }}</div>
					</div>
					<div class="count" ref="userCount">{{ currentUserAlert!.displayCount }}</div>
					<Icon name="sub" ref="userStars" class="stars" v-for="i in currentUserAlert!.count" :key="'bingo_'+i" />
					<img ref="speedDot"
					class="speedDot"
						v-for="i in 10"
						:key="'speed_'+i" src="@/assets/img/blured_line.png">
				</template>
			</div>

			<div class="leaderboard" ref="leaderboardHolder"
			:style="leaderboardStyles"
			v-if="leaderboard">
				<Icon name="leaderboard" class="icon" />
				<div class="scrollHolder" ref="scrollHolder">
					<div class="userlist" ref="list">
						<div v-for="entry in leaderboard.scores" class="user" :class="'pos_'+entry.pos">
							<div class="pos">#{{ entry.pos+1 }}</div>
							<img :src="entry.user_pic" alt="avatar" v-if="entry.user_pic">
							<div class="username">{{ entry.user_name }}</div>
							<div class="score">
								<Icon name="sub" class="star" />
								<span class="value">{{ entry.score }}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<Teleport :to="currentCell" v-if="currentCell">
				<div class="clouds">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 454.53 357.01"
					v-for="i in 10" ref="clouds"><path style="fill:currentColor" d="m451.87,164.84c-12.25-41.03-46.83-57.62-87.58-55.57,33.41-69.32-41.48-137.27-107.32-97.44-14.48-7.85-33.7-10.29-50.1-6.58-27.67-8.64-60.16-.57-81.64,18.51-17.09,2.98-35.97,13.92-45.18,28.92C-5.8,50.25-31.33,162.4,46.86,197.46c-15.69,37.25-2.84,84.19,33.2,104.16,19.41,63.84,92.17,72.48,135.73,26.04,15.8,7.54,33.62,12.01,51.02,8.57,13.61,2.89,27.52,4.54,41.31,6.2,36.35-.86,71.56-28.72,73.95-66.27,43.86-15.69,83.2-62.69,69.8-111.32Z"/></svg>
				</div>
			</Teleport>

			<div class="stars">
				<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="445.2px" height="426.2px" viewBox="0 0 445.2 426.2"
				v-for="i in 100"
				ref="stars"
				:key="'star_'+i"
				class="star"><path style="fill:#FFFFFF;" d="M247.5,16l47.2,95.6c4,8.2,11.8,13.9,20.9,15.2L421,142c22.7,3.3,31.8,31.3,15.4,47.3L360,263.7
					c-6.5,6.4-9.5,15.5-8,24.5l18,105c3.9,22.7-19.9,39.9-40.2,29.2l-94.3-49.6c-8.1-4.2-17.7-4.2-25.8,0l-94.3,49.6
					c-20.3,10.7-44.1-6.6-40.2-29.2l18-105c1.5-9-1.4-18.2-8-24.5L8.9,189.3c-16.5-16-7.4-44,15.4-47.3l105.4-15.3
					c9-1.3,16.8-7,20.9-15.2L197.8,16C207.9-4.7,237.3-4.7,247.5,16z"/></svg>
			</div>
		</template>

		<div v-else-if="error" class="error card-item alert"><Icon name="alert" />Bingo grid not found</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import Utils from '@/utils/Utils';
import { CustomEase } from 'gsap/all';
import { gsap } from 'gsap/gsap-core';
import { Component, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import AbstractOverlay from './AbstractOverlay';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
export class OverlayBingoGrid extends AbstractOverlay {

	public ready:boolean = false;
	public error:boolean = false;
	public currentUserAlert:IUserBingoData | null = null;
	public currentCell:HTMLElement | null = null;
	public bingo:TwitchatDataTypes.BingoGridConfig | null = null;
	public leaderboard:Parameters<typeof this.leaderboardHandler>[0]["data"]|null = null;
	public pendingEvents:{type:"open"|"close"|"user"|"bingo"|"update", data?:IBingoUpdateData, userBingo?:IUserBingoData, bingo?:{vertical:number[], horizontal:number[], diagonal:number[]}}[] = [];

	private id:string = "";
	private width:number = 100;
	private height:number = 100;
	private starIndex:number = 0;
	private gridOpened:boolean = false;
	private canPlayWinSound:boolean = true;
	private innactivityTimeout:number = -1;
	private leaderBoardFontSize:string = "";
	private broadcastPresenceInterval:string = "";
	private bingoUpdateHandler!:(e:TwitchatEvent<IBingoUpdateData>) => void;
	private bingoViewerHandler!:(e:TwitchatEvent<IUserBingoData>) => void;
	private leaderboardHandler!:(e:TwitchatEvent<{gridId:string, scores?:{user_name:string, user_pic:string, score:number, pos:number}[]}>) => void;
	private prevCheckStates:{[key:string]:boolean} = {};
	private winSoundVolume!:HTMLAudioElement;
	private debugScale = 1;//Reduce to add margin around grid for cleaner screen capture

	public get classes():string[] {
		let res:string[] = ["overlaybingogrid"];
		if(this.bingo?.showGrid === true) res.push("border");
		return res;
	}

	public get alertStyles():{[key:string]:string} {
		return {
			aspectRatio: this.bingo!.cols+"/"+this.bingo!.rows,
			width: this.width+"px",
			height: this.height+"px",
		};
	}

	public get leaderboardStyles():{[key:string]:string} {
		return {
			...this.alertStyles,
			fontSize: this.leaderBoardFontSize,
		};
	}

	public cellClasses(entry:TwitchatDataTypes.BingoGridConfig["entries"][number], index:number):string[] {
		let res:string[] = ["cell"];
		if(entry.check === true) res.push("check");
		if(index == 0) res.push("corner", "tl");
		if(index == this.bingo!.entries.length-1) res.push("corner", "br");
		if(index == this.bingo!.cols-1) res.push("corner", "tr");
		if(index == (this.bingo!.rows-1)*this.bingo!.cols) res.push("corner", "bl");
		return res;
	}

	public get backgroundColor():string {
		const base = this.bingo!.backgroundColor || '#000000';
		const alpha = this.bingo!.backgroundAlpha || 0;
		return base+Math.round(alpha/100*0xff).toString(16).padStart(2, "0")
	}

	public beforeMount(): void {
		this.id = this.$route.query.bid as string ?? "";

		this.winSoundVolume = new Audio(this.$asset("sounds/win.mp3"));

		this.bingoUpdateHandler = (e) => this.onBingoUpdate(e);
		this.bingoViewerHandler = (e) => this.onBingoViewer(e);
		this.leaderboardHandler = (e) => this.onLeaderboard(e);
		PublicAPI.instance.addEventListener(TwitchatEvent.BINGO_GRID_PARAMETERS, this.bingoUpdateHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.BINGO_GRID_OVERLAY_VIEWER_EVENT, this.bingoViewerHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.BINGO_GRID_OVERLAY_LEADER_BOARD, this.leaderboardHandler);

		this.broadcastPresenceInterval = SetIntervalWorker.instance.create(()=>{
			this.broadcastPresence();
		}, 20000);

		this.broadcastPresence();
	}

	public beforeUnmount(): void {
		SetIntervalWorker.instance.delete(this.broadcastPresenceInterval);
		PublicAPI.instance.removeEventListener(TwitchatEvent.BINGO_GRID_PARAMETERS, this.bingoUpdateHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.BINGO_GRID_OVERLAY_VIEWER_EVENT, this.bingoViewerHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.BINGO_GRID_OVERLAY_LEADER_BOARD, this.leaderboardHandler);
	}

	/**
	 * Ask bingo info from Twitchat
	 */
	override requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_BINGO_GRID_PARAMETERS, {bid:this.id});
	}

	/**
	 * Tell Twitchat overlay exists
	 */
	public broadcastPresence():void {
		PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_OVERLAY_PRESENCE, {bid:this.id});
	}

	/**
	 * Called when clicking overlay via heat
	 */
	public onHeatClick(event:TwitchatDataTypes.HeatClickData, x:number, y:number):void {
		let element = document.elementFromPoint(x, y) as HTMLElement;
		if(element) {
			while(!element.dataset["cellid"] && element != document.body) {
				element = element.parentElement as HTMLElement;
			}
			if(element != document.body) {
				const id = element.dataset["cellid"] || "";
				PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_HEAT_CLICK, {gridId:this.bingo!.id, entryId:id, click:event});
			}
		}
	}

	/**
	 * Called when requesting to show/hide leaderboard
	 */
	private async onLeaderboard(e:Parameters<typeof this.leaderboardHandler>[0]):Promise<void> {
		if(!e.data) return;
		if(e.data.gridId != this.id) return;

		await this.openCloseGrid(true);

		const newLeaderboard = e.data.scores && e.data.scores.length > 0? e.data : null;

		if(newLeaderboard) this.leaderboard = newLeaderboard;
		else{
			//Close leaderboard
			const leaderboardHolder = this.$refs.leaderboardHolder as HTMLElement;
			gsap.to(leaderboardHolder, {opacity:0, duration:.5, onComplete:()=>{
				this.leaderboard = null;
				if(this.pendingEvents.length === 0) {
					this.openCloseGrid(false);
				}
			}});
			return;
		}

		const holder = this.$refs.cellsHolder as HTMLDivElement;
		const bounds = holder.getBoundingClientRect();
		this.width	= Math.ceil(bounds.width / this.debugScale);
		this.height = Math.ceil(bounds.height / this.debugScale);

		await this.$nextTick();
		// await Utils.promisedTimeout(1000);

		const listHolder = this.$refs.list as HTMLElement;
		const leaderboardHolder = this.$refs.leaderboardHolder as HTMLElement;
		const scrollHolder = this.$refs.scrollHolder as HTMLElement;
		const scrollHolderBounds = scrollHolder.getBoundingClientRect();
		const duration = Math.max(5,this.leaderboard.scores!.length*1.5);
		gsap.fromTo(leaderboardHolder, {opacity:0}, {opacity:1, duration:.75});

		// let vertical = this.bingo!.cols <= this.bingo!.rows;
		let fontSize = Math.min(scrollHolderBounds.height/this.debugScale/10, this.width/10)+"px";
		this.leaderBoardFontSize = "min(11vw, 11vh, "+fontSize+")";
		await this.$nextTick();

		const listBounds = listHolder.getBoundingClientRect();
		gsap.fromTo(listHolder, {y:scrollHolderBounds.height/this.debugScale}, {y:-listBounds.height/this.debugScale, duration, ease:"none", repeat:-1});
	}

	/**
	 * Called when a user wins a bingo
	 */
	private async onBingoViewer(e:Parameters<typeof this.bingoViewerHandler>[0]):Promise<void> {
		if(!e.data) return;
		if(e.data.gridId != this.id) return;
		e.data.displayCount = e.data.count;
		this.pushEvent({type:"user", userBingo:e.data});
	}

	/**
	 * Called when bingo data are changed
	 */
	private async onBingoUpdate(e:Parameters<typeof this.bingoUpdateHandler>[0]):Promise<void> {
		if(e.data) {
			const data = e.data;
			if(data.id != this.id) return;
			const animate = !this.ready;
			this.ready = true;
			if(!data.bingo) {
				this.error = true;
				return;
			}

			if(animate) {
				this.bingo = data.bingo;
				await this.$nextTick();

				//Init check states to avoid all existing checks from being
				//considered as new on next update
				data.bingo.entries.forEach(entry => {
					this.prevCheckStates[entry.id] = entry.check;
				});

				//Force display of already ticked entries
				for (let i = 0; i < this.bingo.entries.length; i++) {
					const entry = this.bingo.entries[i];
					if(entry.check) {
						const checks = this.$refs["check_"+entry.id] as HTMLDivElement[];
						if(checks) gsap.set(checks[0], {opacity:.8});
					}
				}
				this.pushEvent({type:"open"});

			}else if(data.bingo) {
				this.pushEvent({type:"update", data:data});
			}


			// FAKE USER BINGOS
			//@ts-ignore
			window.fakeUserEvents = ()=>{

				this.onBingoViewer(new TwitchatEvent("ACTION_BATCH", {
						"gridId": this.id,
						"user": {
							"name": "DurssBot",
							"id": "647389082",
							"avatar": "https://static-cdn.jtvnw.net/user-default-pictures-uv/294c98b5-e34d-42cd-a8f0-140b72fba9b0-profile_image-300x300.png"
						},
						"count": 1
					}));
				this.onBingoViewer(new TwitchatEvent("ACTION_BATCH", {
						"gridId": this.id,
						"user": {
							"name": "JohanRelpek",
							"id": "675760285",
							"avatar": "https://static-cdn.jtvnw.net/jtv_user_pictures/8877ee31-67dc-49d8-b567-f58e3b2053f6-profile_image-300x300.png"
						},
						"count": 9
					}));

				this.onBingoViewer(new TwitchatEvent("ACTION_BATCH", {
						"gridId": this.id,
						"user": {
							"name": "Durss",
							"id": "29961813",
							"avatar": "https://static-cdn.jtvnw.net/jtv_user_pictures/1835e681-7306-49b8-a1e2-2775a17424ae-profile_image-300x300.png"
						},
						"count": 3
					}));

				// this.pushEvent({type:"update", data:{"id":"78b997fc-b525-4423-a39a-2b31781b708d","bingo":{"id":"78b997fc-b525-4423-a39a-2b31781b708d","title":"PUBG🔫","textColor":"#ffffff","enabled":true,"showGrid":true,"heatClick":false,"textSize":20,"cols":3,"rows":3,"entries":[{"id":"5d554063-b4b5-46d2-a809-a06bc5b263c0","label":"accidentally killed myself","lock":false,"check":false},{"id":"99afe58e-c39d-4259-baab-b45c28645301","label":"running after blue zone","lock":false,"check":false},{"id":"7195bf1f-20be-4f3e-b494-4af2617321a3","label":"Drive over enemy","lock":false,"check":true},{"id":"b79fb5ca-26f6-44b8-843d-eb222b94dc41","label":"first blood","lock":false,"check":true},{"id":"474ce91c-8191-4423-a288-d3f910028e86","label":"TOP 1","lock":true,"check":true},{"id":"ce668ebd-fe1b-4309-b7f9-bbe8a9d3f54c","label":"I die first","lock":false,"check":false},{"id":"1e0143cb-d325-4fae-87e4-8827c36f922f","label":"game crashes","lock":false,"check":false},{"id":"fd750556-a33a-4831-9852-ad41883d3b24","check":false,"label":"erangel","lock":false},{"id":"dcbda4a2-86af-45e7-88af-e2e1085b1460","check":false,"label":"karakin","lock":false}],"backgroundAlpha":29,"backgroundColor":"#000000","chatCmdPermissions":{"all":false,"broadcaster":true,"follower":false,"follower_duration_ms":0,"mods":true,"subs":false,"vips":false,"usersAllowed":[],"usersRefused":[]},"heatClickPermissions":{"all":false,"broadcaster":true,"follower":false,"follower_duration_ms":0,"mods":true,"subs":false,"vips":false,"usersAllowed":[],"usersRefused":[]},"additionalEntries":[{"id":"5df94fe3-829a-4c2a-822c-77374183e1f7","check":false,"label":"10+ kills","lock":false},{"id":"ff5151a7-d346-42ad-ac55-dd54fe2b05a6","check":false,"label":"sanhok","lock":false},{"id":"ef5cf01d-1362-405a-9d0c-0629d126b36c","label":"Found flare gun","lock":false,"check":false}],"winSoundVolume":30},"newVerticalBingos":[],"newHorizontalBingos":[],"newDiagonalBingos":[]}});
				// this.pushEvent({type:"update", data:{"id":"78b997fc-b525-4423-a39a-2b31781b708d","bingo":{"id":"78b997fc-b525-4423-a39a-2b31781b708d","title":"PUBG🔫","textColor":"#ffffff","enabled":true,"showGrid":true,"heatClick":false,"textSize":20,"cols":3,"rows":3,"entries":[{"id":"5d554063-b4b5-46d2-a809-a06bc5b263c0","label":"accidentally killed myself","lock":false,"check":false},{"id":"99afe58e-c39d-4259-baab-b45c28645301","label":"running after blue zone","lock":false,"check":false},{"id":"7195bf1f-20be-4f3e-b494-4af2617321a3","label":"Drive over enemy","lock":false,"check":true},{"id":"b79fb5ca-26f6-44b8-843d-eb222b94dc41","label":"first blood","lock":false,"check":true},{"id":"474ce91c-8191-4423-a288-d3f910028e86","label":"TOP 1","lock":true,"check":true},{"id":"ce668ebd-fe1b-4309-b7f9-bbe8a9d3f54c","label":"I die first","lock":false,"check":true},{"id":"1e0143cb-d325-4fae-87e4-8827c36f922f","label":"game crashes","lock":false,"check":false},{"id":"fd750556-a33a-4831-9852-ad41883d3b24","check":false,"label":"erangel","lock":false},{"id":"dcbda4a2-86af-45e7-88af-e2e1085b1460","check":false,"label":"karakin","lock":false}],"backgroundAlpha":29,"backgroundColor":"#000000","chatCmdPermissions":{"all":false,"broadcaster":true,"follower":false,"follower_duration_ms":0,"mods":true,"subs":false,"vips":false,"usersAllowed":[],"usersRefused":[]},"heatClickPermissions":{"all":false,"broadcaster":true,"follower":false,"follower_duration_ms":0,"mods":true,"subs":false,"vips":false,"usersAllowed":[],"usersRefused":[]},"additionalEntries":[{"id":"5df94fe3-829a-4c2a-822c-77374183e1f7","check":false,"label":"10+ kills","lock":false},{"id":"ff5151a7-d346-42ad-ac55-dd54fe2b05a6","check":false,"label":"sanhok","lock":false},{"id":"ef5cf01d-1362-405a-9d0c-0629d126b36c","label":"Found flare gun","lock":false,"check":false}],"winSoundVolume":30},"newVerticalBingos":[],"newHorizontalBingos":[1],"newDiagonalBingos":[]}});
			}

			// FAKE LEADERBOARD
			//@ts-ignore
			window.fakeLeaderboard = ()=>{
				this.onLeaderboard(new TwitchatEvent("BINGO_GRID_OVERLAY_LEADER_BOARD",{
						gridId:this.id,
						scores:[
							{pos:0,score:8,user_name:"Cailloute",user_pic:"https://static-cdn.jtvnw.net/jtv_user_pictures/2335a3b2-7816-43ee-9c74-a4cd99a1c897-profile_image-50x50.png"},
							{pos:1,score:5,user_name:"ChezMarino",user_pic:"https://static-cdn.jtvnw.net/jtv_user_pictures/c707c1e9-242c-4a34-84eb-46653bdbacff-profile_image-50x50.png"},
							{pos:1,score:5,user_name:"Shakawah",user_pic:"https://static-cdn.jtvnw.net/jtv_user_pictures/0d1eddfc-af8e-4a40-8422-38af4f947844-profile_image-50x50.png"},
							{pos:2,score:4,user_name:"Euphoriasis",user_pic:"https://static-cdn.jtvnw.net/jtv_user_pictures/87b7b0d0-73e7-4bbd-9d50-40cdcfe0c18a-profile_image-50x50.jpeg"},
							{pos:3,score:3,user_name:"Kapacino",user_pic:"https://static-cdn.jtvnw.net/jtv_user_pictures/ea9b8b0b-d170-43c0-a2fa-2cd4fbdde5e2-profile_image-50x50.png"},
							{pos:4,score:2,user_name:"Durss",user_pic:"https://static-cdn.jtvnw.net/jtv_user_pictures/1835e681-7306-49b8-a1e2-2775a17424ae-profile_image-50x50.png"},
						]
					}));
			}
		}
	}

	/**
	 * Update current grid
	 * @param data
	 */
	public async updateGrid(data:IBingoUpdateData):Promise<void> {
		this.bingo = data.bingo;

		this.broadcastPresence();

		if(!this.gridOpened) {
			this.pushEvent({type:"open"});
		}

		const forcedCellsState:{[key:string]:boolean} = {};

		//Set initial checks alpha
		//This allows to sequentially display new checks.
		//Without this all new checks would be displayed by default, then
		//their display would be animated.
		//This makes sure new cheks are not visible before it's their turn
		//to be animated
		for (let i = 0; i < this.bingo.entries.length; i++) {
			const entry = this.bingo.entries[i];
			const checks = this.$refs["check_"+entry.id] as HTMLElement[];
			if(checks && this.prevCheckStates[entry.id] != entry.check) {
				if(entry.check) {
					gsap.set(checks[0], {opacity:0});
				}else{
					forcedCellsState[entry.id] = true;
					entry.check = true;
				}
			}
		}

		//Leave it time to hidden cells to first be displayed back
		//so hidden animation can be done later
		await this.$nextTick();

		//Animate new checks display
		for (let i = 0; i < this.bingo.entries.length; i++) {
			const entry = this.bingo.entries[i];
			const checks = this.$refs["check_"+entry.id] as HTMLElement[];
			if(!checks) continue;
			const cell = document.querySelector("[data-cellid=\""+entry.id+"\"]") as HTMLElement;
			if(this.prevCheckStates[entry.id] != entry.check || forcedCellsState[entry.id] === true) {
				if(checks?.length > 0 && checks[0].nodeName != "#comment") {
					const checkmark = checks[0];
					const angle = (Math.random()-Math.random()) * 25;
					if(entry.check && forcedCellsState[entry.id] !== true) {
						//Animate checkmark display
						gsap.killTweensOf(checks[0]);
						gsap.fromTo(checkmark, {opacity:0}, {opacity:.8, duration:.25});
						const ease = CustomEase.create("custom", "M0,0 C0,0 0.325,0.605 0.582,0.977 0.647,0.839 0.817,0.874 0.854,0.996 0.975,0.9 1,1 1,1 ");
						gsap.fromTo(checkmark, {transform:"scale(3)", rotation:"0deg"}, {transform:"scale(1)", rotation:angle+"deg", ease, duration:.25});
						await Utils.promisedTimeout(150);
						this.popClouds(cell);
						await Utils.promisedTimeout(250);

					}else {
						//Animate checkmark hide
						gsap.killTweensOf(checks[0]);
						gsap.to(checkmark,
							{transform:"scale(0)", rotation:angle+"deg", ease:"back.in", duration:.35});
						await Utils.promisedTimeout(350);
						entry.check = false;
					}
				}
			}else if(entry.check) {
				//Force display of the cell
				gsap.set(checks[0], {opacity:.8});
			}
			this.prevCheckStates[entry.id] = entry.check;
		}

		if((data.newVerticalBingos || []).length > 0
		|| (data.newHorizontalBingos || []).length > 0
		|| (data.newDiagonalBingos || []).length > 0) {
			//Schedule bingos animations if any
			this.pushEvent({
				type:"bingo",
				bingo: {vertical:data.newVerticalBingos,
						horizontal:data.newHorizontalBingos,
						diagonal:data.newDiagonalBingos}
			});
		}
	}

	/**
	 * Animate open/close of grid
	 */
	private async openCloseGrid(open:boolean):Promise<void> {
		if(!this.bingo) return Promise.resolve();
		if(open == this.gridOpened) return Promise.resolve();

		return new Promise((resolve)=>{
			const bingo = this.bingo!
			let x = 0;
			let y = 0;
			let delta = [0, -1];
			const width = bingo.cols;
			const height = bingo.rows;
			const spiralOrder: number[] = [];
			const cx = Math.ceil(bingo.cols/2)-1;
			const cy = Math.ceil(bingo.rows/2)-1;
			//Spiral algorithm from:
			//https://stackoverflow.com/a/13413224/3813220
			for (let i = Math.pow(Math.max(width, height), 2); i>0; i--) {
				if ((-width/2 < x && x <= width/2)
				&& (-height/2 < y && y <= height/2)) {
					let index = (x+cx) + (y+cy) * bingo.cols;
					spiralOrder.push(index);
				}

				if (x === y
				|| (x < 0 && x === -y)
				|| (x > 0 && x === 1-y)){
					delta = [-delta[1], delta[0]]
				}

				x += delta[0];
				y += delta[1];
			}

			const cells = this.$refs.cell as HTMLElement[];
			const scaleFrom = open? 0 : 1;
			const scaleTo = open? 1 : 0;
			gsap.fromTo([this.$refs.cellsHolder, this.$refs.gridHolder],
						{scale:scaleFrom},
						{scale:scaleTo, ease:open? "sine.out" :"sine.in",
							duration:.35,
							clearProps:open? "transform": "",
							delay:open? 0 : .55 + Math.pow(cells.length,.8)*.05,
							onComplete:()=>{
								if(!open) {
									this.gridOpened = open;
									resolve();
								}
							}});

			//Animate items from center
			cells.forEach((cell, index) => {
				let distance = spiralOrder.findIndex(v=>v===index);
				if(distance < 0) distance = spiralOrder.length;
				// console.log(data.bingo.entries[index].label, distance);
				gsap.fromTo(cell,
					{scale:scaleFrom},
					{scale:scaleTo, ease:open? "elastic.out" : "back.in",
						duration:open? 1 : .4,
						delay: .3 + Math.pow(distance,.8)*.05,
						onComplete:()=>{
							if(!this.gridOpened && open && index == cells.length-2) {
								this.gridOpened = open;
								resolve();
							}
						}
					});
			})
		});
	}

	/**
	 * Animates a new bingo
	 */
	private async animateBingos(vertical:number[], horizontal:number[], diagonal:number[]):Promise<void> {
		const bingo = this.bingo!;
		const animateCell = async (holder:HTMLElement, delay:number)=>{
			const bgStar = holder.querySelector(".star");
			//Grow background star
			gsap.fromTo(bgStar, {opacity:1, scale:0, rotate:0}, {rotate:"360deg", duration:.5, delay, ease:"none"});
			gsap.to(bgStar, {scale:6, duration:.5, delay, ease:"circ.in", onComplete:() => {
				//Pop stars
				this.popStars(holder);
				//Fadeout background star
				gsap.to(bgStar, {opacity:0, duration:.25, ease:"none",
				onComplete:()=>{
					//Reset background star
					gsap.set(bgStar, {opacity:1, scale:0, rotate:0});
				}});
			}});
		}

		let delay = .5;
		horizontal.forEach(y=>{
			for (let x = 0; x < bingo.cols; x++) {
				const cell = this.getCellByCoords(x, y);
				cell.holder.classList.add("bingo");
				delay += .05;
				animateCell(cell.holder, delay);
			}
			delay += .4;
		});

		vertical.forEach(x=>{
			for (let y = 0; y < bingo.rows; y++) {
				const cell = this.getCellByCoords(x, y);
				cell.holder.classList.add("bingo");
				delay += .05;
				animateCell(cell.holder, delay);
			}

			delay += .4;
		});

		diagonal.forEach(dir=>{
			for (let x = 0; x < bingo.cols; x++) {
				const px = dir === 0? x : bingo.rows - 1 - x;
				const y = x;
				const cell = this.getCellByCoords(px, y);
				cell.holder.classList.add("bingo");
				delay += .05;
				animateCell(cell.holder, delay);
			}
			delay += .4;
		});

		await Utils.promisedTimeout(delay * 1000 + 500);
	}

	/**
	 * Gets a cell's details from its index
	 * @param index
	 */
	private getCellByCoords(x:number, y:number):{data:TwitchatDataTypes.BingoGridConfig["entries"][number], holder:HTMLElement} {
		const bingo = this.bingo!;
		const data = bingo.entries[x + y*bingo.cols];
		const holder = document.querySelector("[data-cellid=\""+data.id+"\"]") as HTMLElement;
		return {data, holder};
	}

	/**
	 * Animates clouds when ticking a cell
	 * @param ref
	 */
	private async popClouds(ref:HTMLElement):Promise<void> {
		this.currentCell = ref;
		await this.$nextTick();
		const clouds = this.$refs.clouds as SVGElement[];
		const bounds = ref.getBoundingClientRect();
		clouds.forEach(cloud => {
			const left = bounds.width/2;
			const top = bounds.height/2;
			const angle = (Math.random()-Math.random()) * 100;
			const scaleRatio = Math.random() - Math.random();
			cloud.style.left = left+"px";
			cloud.style.top = top+"px";
			cloud.style.width = (bounds.width*(.5+scaleRatio*.25))+"px";
			cloud.style.height = (bounds.height*(.5+scaleRatio*.25))+"px";
			cloud.style.opacity = "1";
			const x = (Math.random()-Math.random()) * bounds.width;
			const y = (Math.random()-Math.random()) * bounds.height;
			gsap.killTweensOf(cloud);
			gsap.to(cloud, {opacity:0, x:"-50%", y:"-50%", rotation:angle+"deg", left:left+x, top:top+y, duration:.5, ease:"sine.out"});
		});
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
			star.style.width = (bounds.width*(.2+scaleRatio*.3))+"px";
			star.style.height = (bounds.height*(.2+scaleRatio*.3))+"px";
			star.style.opacity = "1";
			const direction = Math.PI * 2 * i/10;
			const distance = Math.random() * bounds.width * .25 + bounds.width * .75;
			gsap.killTweensOf(star);
			gsap.to(star, {opacity:0, x:"-50%", y:"-50%",
							rotation:angle+"deg",
							left:left + Math.cos(direction) * distance,
							top:top + Math.sin(direction) * distance,
							duration:Math.random(),
							ease:"sine.out"
						});
		}
	}

	/**
	 * Execute a pending event
	 */
	private async pushEvent(data:typeof this.pendingEvents[number]):Promise<void> {
		if(data.type == "user") {
			//search if that user is already pending for display
			const existingIndex = this.pendingEvents.findIndex(v=> v.type == "user" && v.userBingo!.user.id == data.userBingo?.user.id);
			//If iser already exists, is not the current one playing (>0) and
			//their new bingo count is greater than the scheduled one, replace
			if(existingIndex > 0 && this.pendingEvents[existingIndex].userBingo!.count < data.userBingo!.count) {
				this.pendingEvents[existingIndex] = data;
			}
		}else if(data.type == "update") { {
			//Remove any pending updates to keep only the new one
			for (let i = 1; i < this.pendingEvents.length; i++) {
				const event = this.pendingEvents[i];
				if(event.type == "update") {
					this.pendingEvents.splice(i, 1);
					i--;
				}
			}
		}
		}else{
			//search if an event of the same type exists, is not the currently
			//playing one (>0), and replace it if one exists
			const existingIndex = this.pendingEvents.findIndex(v=> v.type == data.type);
			if(existingIndex > 0) this.pendingEvents[existingIndex] = data;
		}
		this.pendingEvents.push(data);
		if(this.pendingEvents.length == 1) this.execNextEvent();
	}

	/**
	 * Execute a pending event
	 */
	private async execNextEvent():Promise<void> {
		const item = this.pendingEvents[0];
		clearTimeout(this.innactivityTimeout);
		switch(item.type) {
			case "open": {
				await this.openCloseGrid(true);
				break;
			}
			case "close": {
				await this.openCloseGrid(false);
				break;
			}
			case "bingo": {
				await this.openCloseGrid(true);
				await this.animateBingos(item.bingo!.vertical, item.bingo!.horizontal, item.bingo!.diagonal);
				break;
			}
			case "user": {
				await this.openCloseGrid(true);
				await this.animateViewer(item.userBingo!);
				break;
			}
			case "update": {
				await this.openCloseGrid(true);
				await this.updateGrid(item.data!);
				break;
			}
		}

		//Schedule auto close if requested
		if(item.type != "close"){
			if(this.bingo && this.bingo.autoShowHide === true) {
				this.innactivityTimeout = window.setTimeout(()=>{
					this.pushEvent({type:"close"});
				}, 5 * 1000);
			}
		}

		this.pendingEvents.shift();
		if(this.pendingEvents.length > 0) this.execNextEvent();
	}

	/**
	 * Show a viewer info
	 */
	private async animateViewer(data:IUserBingoData):Promise<void> {

		const holder = this.$refs.cellsHolder as HTMLDivElement;
		const bounds = holder.getBoundingClientRect();
		this.width	= Math.ceil(bounds.width / this.debugScale);
		this.height = Math.ceil(bounds.height / this.debugScale);

		return new Promise(async (resolve)=>{
			if(this.canPlayWinSound && this.bingo!.winSoundVolume > 0) {
				this.winSoundVolume.volume = Math.min(1, Math.max(0, (this.bingo!.winSoundVolume / 100) || .5));
				this.winSoundVolume.play();
				this.canPlayWinSound = false;
				await Utils.promisedTimeout(500);
			}

			this.currentUserAlert = data;

			await this.$nextTick();

			const cellsHolder = this.$refs.cellsHolder as HTMLElement;
			const userInfos = this.$refs.userInfo as HTMLElement;
			const userCount = this.$refs.userCount as HTMLElement;
			const userStars = this.$refs.userStars as Vue[];

			if(!cellsHolder) {
				resolve();
				return;
			}

			const boundsHolder = cellsHolder.getBoundingClientRect();

			data.displayCount = 0;

			const boundsUser = userInfos.getBoundingClientRect();

			gsap.to((this.$refs.alertsBg as Vue).$el, {rotate:"360deg", duration:1, ease:"none"});
			gsap.to((this.$refs.alertsBg as Vue).$el, {scale:10, duration:1, ease:"circ.in"});
			gsap.fromTo(userInfos,
				{top:boundsHolder.height/this.debugScale + boundsUser.height/this.debugScale/2},
				{top:-boundsUser.height/this.debugScale, duration:1.5, ease:"slow(0.5,0.8,false)", delay:.7});
			gsap.set(userCount, {scale:0});
			gsap.set(userStars.map(v=>v.$el), {scale:0});

			const dots = this.$refs.speedDot as HTMLElement[];
			let index = 0;
			dots.forEach(dot => {
				const height = ((Math.random() * boundsHolder.height) + boundsHolder.height*.1);
				dot.style.opacity = (Math.random()*.3 + .1)+"";
				dot.style.left = ((index/(dots.length-1) + (Math.random()-Math.random()) * .1)*80+10)+"%";
				dot.style.top = (boundsHolder.height/this.debugScale + Math.random()*height*5)+"px";
				dot.style.height = height+"px";
				dot.style.width = (Math.random()*10+5)+"px";

				// dot.style.zIndex = "1000";
				gsap.to(dot, {
					top:(-height)+"px",
					duration:1.5,
					delay:Math.random()*.5 + .5,
					ease:"slow(0.5,0.5,false)"
				});
				index ++;
			})

			let delay = 2.3;

			const firstStarBatch = userStars.map(v=>v.$el).slice(0, -1);
			if(firstStarBatch.length > 0) {
				let stagger = Math.min(.5, 3/data.count);
				await new Promise<void>((resolveInner) => {
					gsap.fromTo(
						firstStarBatch,
						{scale:8},
						{scale:0, duration:stagger, immediateRender:false, ease:"none", stagger, delay, onComplete:() => resolveInner()}
					);

					for (let i = 0; i < data.count; i++) {
						gsap.fromTo(userCount,
							{transform:"translate(-50%, -50%) scale("+(3 + i * .2)+")"},
							{transform:"translate(-50%, -50%) scale(0)",
								immediateRender:false,
								duration:stagger,
								delay,
								ease:"slow(0.5,0.8,false)", onStart:()=>{
									data.displayCount! ++;
								}
							});
						delay += stagger;
					}
				})
			}else{
				data.displayCount = 1;
				await Utils.promisedTimeout(delay * 1000);
			}

			const duration = 1;
			gsap.fromTo(userStars.map(v=>v.$el).pop()!,
				{scale:8},
				{scale:0, duration:duration, immediateRender:false, ease:"none"});

			gsap.fromTo(userCount, {scale:Math.min(5, 3 + data.displayCount!*.2)}, {scale:0,
				immediateRender:false,
				duration:duration*.9,
				ease:"slow(0.5,0.8,false)"
			});

			delay = duration;
			//Close background only if next event isn't a user one
			if(this.pendingEvents.length <= 1 || this.pendingEvents[1].type!="user"){
				gsap.to((this.$refs.alertsBg as Vue).$el, {delay:duration*.8, rotate:"0deg", duration:.5, ease:"none"});
				gsap.to((this.$refs.alertsBg as Vue).$el, {delay:duration*.8, scale:0, duration:.5, ease:"circ.out"});
				delay += duration * .8;
				this.canPlayWinSound = true;
			}

			window.setTimeout(() => {
				resolve();
			}, delay*1000);
		})
	}
}

interface IUserBingoData {gridId:string, user: { name:string,id:string,avatar:string}, count:number, displayCount?:number};
interface IBingoUpdateData {id:string, bingo:TwitchatDataTypes.BingoGridConfig, newVerticalBingos:number[], newHorizontalBingos:number[], newDiagonalBingos:number[] }
export default toNative(OverlayBingoGrid);
</script>

<style scoped lang="less">
.overlaybingogrid{
	@borderSize: min(.75vh, .75vw);
	transform-origin: center center;
	// transform: scale(.9);//Set the same value to "debugScale" var
	.cells {
		gap: @borderSize;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		max-width: 100vw;
		max-height: 100vh;

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
			border-radius: calc(min(100vw, 100vh) / 50);

			.check {
				opacity: 0;
				position: absolute;
				top: 50%;
				left: 50%;
				width: 70%;
				height: 70%;
				color: #00cc00;
				transform-origin: center center;
				margin-left: -35%;
				margin-top: -35%;
				z-index: 100;
				filter: drop-shadow(2px 2px 5px rgba(0,0,0,.5));
				.icon {
					height: 100%;
					width: 100%;
				}
			}

			.label {
				display: block;
				width: 100%;
				// text-shadow: 5px 10px 10px rgba(0,0,0,1);
			}
			.star {
				color: var(--color-secondary);
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%) scale(0, 0);
				z-index: 101;
			}
		}
	}

	.leaderboard {
		z-index: 101;
		display: flex;
		flex-direction: column;
		position: absolute;
		overflow: hidden;
		border-radius: calc(min(100vw, 100vh) / 50);
		top: 0;
		left: 0;
		max-width: 100vw;
		max-height: 100vh;
		font-size: min(11vh, 11vw);
		background-color: #fff;
		will-change: transform;

		&>.icon {
			height: 1em;
			min-height: 1em;
			max-height: 10%;
			display: block;
			margin: .25em auto;
			color: #ffee00;
			filter: drop-shadow(0 0 .05em #00000080);
		}

		.scrollHolder {
			overflow: hidden;
			position: relative;
			height: 100%;
			flex-grow: 1;
		}
		.userlist {
			gap: .15em;
			display: flex;
			padding: 0 .25em;
			flex-direction: column;
			.user {
				gap: .25em;
				display: flex;
				flex-direction: row;
				align-items: center;
				border-radius: 1em;
				padding: .15em;
				background-color: var(--color-primary-fader);
				.pos {
					font-weight: bold;
					font-size: .4em;
				}
				&>img {
					height: 1em;
					border-radius: 50%;
					flex-shrink: 0;
				}
				.score {
					height: 1em;
					position: relative;
					flex-shrink: 0;
					.star {
						height: 100%;
						color: var(--color-secondary);
					}
					.value {
						z-index: 1;
						font-weight: bold;
						font-size: .5em;
						position: absolute;
						color: #fff;
						margin-top: .15em;
						.center();
					}
				}
				.username {
					font-weight: bold;
					flex-grow: 1;
					max-width: calc(100% - 4em);
					text-overflow: ellipsis;
					overflow: hidden;
					font-size: .6em;
					text-align: center;
					line-height: 1.25em;
				}
				&.pos_0 {
					background-color: #ffee00;
				}
				&.pos_1 {
					background-color: #e7e7e7;
				}
				&.pos_2 {
					background-color: #ffa763;
				}
			}
		}
	}

	.alerts {
		z-index: 102;
		display: block;
		position: absolute;
		overflow: hidden;
		border-radius: calc(min(100vw, 100vh) / 50);
		top: 0;
		left: 0;
		max-width: 100vw;
		max-height: 100vh;
		.star {
			color: #ffffff;
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%) scale(0, 0);
		}

		.user {
			color: #333333;
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			z-index: 1;
			display: flex;
			font-family: var(--font-inter);
			font-weight: bold;
			font-size: min(10vh, 10vw);
			gap:.25em;
			display: flex;
			flex-direction: column;
			align-items: center;
			.avatar {
				border-radius: 50%;
				width: 2em;
				height: 2em;
			}
		}
		.stars {
			position: absolute;
			color: var(--color-secondary);
			z-index: 2;
			width: min(50vh, 50vw);
			height: min(50vh, 50vw);
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
		}
		.count {
			position: absolute;
			color: #ffffff;
			z-index: 3;
			font-size: min(30vh, 30vw);
			font-family: var(--font-azeret);
			font-weight: bold;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
		}
		.speedDot {
			position: absolute;
			z-index: 0;
		}
	}

	.clouds {
		color: #eeeeee;
		svg {
			transform-origin: center center;
			transform: translate(-50%, -50%);
			position: absolute;
			top: 0;
			left: 0;
		}
	}

	.stars {
		color: #eeeeee;
		pointer-events: none;
		svg {
			transform-origin: center center;
			transform: translate(-50%, -50%);
			position: absolute;
			top: 200vw;
			left: 200vh;
		}
	}

	.flip-list-move {
		transition: transform .25s;
	}

	.error {
		.center();
		position: absolute;
		font-size: 2em;
		text-align: center;
		width: 80vw;
		left: 50vw;
		top: 50vh;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		.icon {
			height: 1.5em;
			margin-right: 1em;
		}
	}

	&.border {
		padding: @borderSize;
		.alerts, .leaderboard {
			left: @borderSize;
			top: @borderSize;
		}
		.cells {
			border-radius: 0;
			max-height: calc(100vh - @borderSize * 2);
			.cell {
				outline: currentColor @borderSize solid;
				border-radius: 0;
				&.corner {
					&.tl {
						border-top-left-radius: calc(min(100vw, 100vh) / 50);
					}
					&.tr {
						border-top-right-radius: calc(min(100vw, 100vh) / 50);
					}
					&.bl {
						border-bottom-left-radius: calc(min(100vw, 100vh) / 50);
					}
					&.br {
						border-bottom-right-radius: calc(min(100vw, 100vh) / 50);
					}
				}
			}
		}
	}
}
</style>
