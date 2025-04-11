<template>
	<div class="overlaycustomtrainrenderer" :class="{editable: editable !== false}">
		<div class="progress">
			<div class="holder back">
				<div class="level">
					<contenteditable tag="div" class="editableField"
						v-model="localLevelName"
						:class="{isEmpty: (levelName || '').trim().length === 0}"
						:contenteditable="editable !== false"
						:no-nl="true"
						:no-html="true"
						@input="onChangeLevelName()" />
					<span>{{localLevelIndex}}</span>
				</div>
				<div class="infoHolder">
					<div class="record" v-if="showIncomingRecord && !showLevelUp && !isRecord"></div>
					<contenteditable tag="div" class="title editableField"
						v-model="localTitle"
						:class="{isEmpty: (localTitle || '').trim().length === 0}"
						:contenteditable="editable !== false"
						:no-nl="true"
						:no-html="true"
						@input="onChangeTitle()" />
					<div class="progress">
						<div class="time">{{ timeLeft }}</div>
						<div class="cost">{{ formatedAmountLeft }}</div>
					</div>
					<div class="percent">{{ Math.floor(easedPercent*100) }}%</div>
				</div>
			</div>
			<div class="fillHolder">
				<div class="level">
					<contenteditable tag="div" class="editableField"
						v-model="localLevelName"
						:class="{isEmpty: (levelName || '').trim().length === 0}"
						:contenteditable="editable !== false"
						:no-nl="true"
						:no-html="true"
						@input="onChangeLevelName()" />
					<span>{{localLevelIndex}}</span>
				</div>
				<div class="fillHolder">
					<div class="fill"></div>
				</div>
			</div>
			<div class="holder">
				<div class="level">
					<contenteditable tag="div" class="editableField"
						v-model="localLevelName"
						:class="{isEmpty: (levelName || '').trim().length === 0}"
						:contenteditable="editable !== false"
						:no-nl="true"
						:no-html="true"
						@input="onChangeLevelName()" />
					<span>{{localLevelIndex}}</span>
				</div>
				<div class="infoHolder">
					<!-- <div class="title">{{ title }}</div> -->
					<contenteditable tag="div" class="title editableField"
						v-model="localTitle"
						:class="{isEmpty: (localTitle || '').trim().length === 0}"
						:contenteditable="editable !== false"
						:no-nl="true"
						:no-html="true"
						@input="onChangeTitle()" />
					<div class="progress">
						<div class="time">{{ timeLeft }}</div>
						<div class="cost">{{ formatedAmountLeft }}</div>
					</div>
					<div class="percent">{{ Math.floor(easedPercent*100) }}%</div>
				</div>
			</div>
		</div>

		<transition name="fade">
			<div class="approaching" v-if="showApproaching !== false">
				<div class="content">
					<img class="emote" @click="onClickEmote" :src="approachingEmote" alt="emote">
					<contenteditable tag="div" class="title editableField"
						v-model="localTitleApproaching"
						:class="{isEmpty: (localTitleApproaching || '').trim().length === 0}"
						:contenteditable="editable !== false"
						:no-nl="true"
						:no-html="true"
						@input="onChangeTitleApproaching()" />
					<div class="events" v-if="eventCount < 6">
						<div class="wrapper">
							<div v-for="i in eventCount" :key="i" :class="{done:i<=eventDone}">
								<Icon name="checkmark" v-if="i<=eventDone" />
							</div>
						</div>
						<div class="time">{{ timeLeft }}</div>
					</div>
					<div class="events wrap" v-else>
						<div class="wrapper">
							<div v-for="i in Math.ceil(eventCount/2)" :key="i" :class="{done:i<=eventDone}">
								<Icon name="checkmark" v-if="i<=eventDone" />
							</div>
						</div>
						<div class="wrapper">
							<div v-for="i in Math.floor(eventCount/2)" :key="i" :class="{done:(i+Math.ceil(eventCount/2))<=eventDone}">
								<Icon name="checkmark" v-if="(i+Math.ceil(eventCount/2))<=eventDone" />
							</div>
						</div>
						<div class="time">{{ timeLeft }}</div>
					</div>
				</div>
			</div>
		</transition>

		<transition name="fade">
			<div class="levelUp" v-if="showLevelUp_local !== false && !showRecord_local">
				<div class="content">
					<div class="emoteWall" ref="emoteWall">
						<img :src="levelUpEmote"
							v-for="(i, index) in emoteList"
							:key="index"
							class="emoteWallEmote"
							alt="emote"
							:width="i.size"
							:height="i.size"
							:style="{
								transform: `translate(${i.x}px, ${i.y}px) rotate(${i.angle}deg)`,
								opacity: i.alpha,
							}">
					</div>
					<contenteditable tag="div" ref="title" class="title editableField"
						v-model="localTitleLevelUp"
						:class="{isEmpty: (localTitleLevelUp || '').trim().length === 0}"
						:contenteditable="editable !== false"
						:no-nl="true"
						:no-html="true"
						@input="onChangeTitleLevelUp()" />
				</div>
				<img class="emote picker" v-if="editable !== false" @click="onClickEmote" :src="levelUpEmote" alt="emote">
			</div>
		</transition>

		<transition name="fade">
			<div class="record" v-if="showRecord_local !== false">
				<div class="content">
					<div class="emoteWall" ref="emoteWall">
						<img :src="recordEmote"
							v-for="(i, index) in emoteList"
							:key="index"
							class="emoteWallEmote"
							alt="emote"
							:width="i.size"
							:height="i.size"
							:style="{
								transform: `translate(${i.x}px, ${i.y}px) rotate(${i.angle}deg)`,
								opacity: i.alpha,
							}">
					</div>
					<contenteditable tag="div" ref="title" class="title editableField"
						v-model="localTitleRecord"
						:class="{isEmpty: (localTitleRecord || '').trim().length === 0}"
						:contenteditable="editable !== false"
						:no-nl="true"
						:no-html="true"
						@input="onChangeTitleRecord()" />
				</div>
				<img class="emote picker" v-if="editable !== false" @click="onClickEmote" :src="recordEmote" alt="emote">
			</div>
		</transition>

		<transition name="fade">
			<div class="success" v-if="showSuccess_local !== false">
				<div class="content">
					<div class="emoteWall" ref="emoteWall">
						<img :src="successEmote"
							v-for="(i, index) in emoteList"
							:key="index"
							class="emoteWallEmote"
							alt="emote"
							:width="i.size"
							:height="i.size"
							:style="{
								transform: `translate(${i.x}px, ${i.y}px) rotate(${i.angle}deg)`,
								opacity: i.alpha,
							}">
					</div>
					<contenteditable tag="div" ref="title" class="title editableField"
						v-model="localTitleSuccess"
						:class="{isEmpty: (localTitleSuccess || '').trim().length === 0}"
						:contenteditable="editable !== false"
						:no-nl="true"
						:no-html="true"
						@input="onChangeTitleSuccess()" />
				</div>
				<img class="emote picker" v-if="editable !== false" @click="onClickEmote" :src="successEmote" alt="emote">
			</div>
		</transition>

		<transition name="fade">
			<div class="fail" v-if="showFail_local !== false">
				<div class="content">
					<img class="emote" @click="onClickEmote" :src="failedEmote" alt="emote">
					<contenteditable tag="div" ref="title" class="title editableField"
						v-model="localTitleFail"
						:class="{isEmpty: (localTitleFail || '').trim().length === 0}"
						:contenteditable="editable !== false"
						:no-nl="true"
						:no-html="true"
						@input="onChangeTitleFail()" />
				</div>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
import gsap from 'gsap';
import { watch } from 'vue';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';
import contenteditable from 'vue-contenteditable';
import Utils from '@/utils/Utils';
import Icon from '@/components/Icon.vue';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import TrophyIcon from "@/assets/icons/sub.svg?raw"

@Component({
	components:{
		Icon,
		contenteditable,
	},
	emits:[
		"lock",
		"unlock",
		"edit",
		"close",
		"update:title",
		"update:titleApproaching",
		"update:titleSuccess",
		"update:titleFail",
		"update:levelName",
		"update:titleRecord",
		"update:titleLevelUp",
		"selectEmote",
	],
})
class OverlayCustomTrainRenderer extends Vue {

	@Prop({default: 'white'})
	public colorText!: string;

	@Prop({default: 'white'})
	public colorBg!: string;

	@Prop({default: 'white'})
	public recordColorText!: string;

	@Prop({default: 'white'})
	public recordColorBg!: string;

	@Prop({default: ''})
	public titleApproaching!: string;

	@Prop({default: false})
	public editable!:boolean

	@Prop({default: ''})
	public title!: string;

	@Prop({default: false})

	@Prop({default: ''})
	public titleLevelUp!: string;

	@Prop({default: ''})
	public titleSuccess!: string;

	@Prop({default: ''})
	public titleSuccessSummary!: string;

	@Prop({default: false})

	@Prop({default: ''})
	public titleFail!: string;

	@Prop({default: ''})
	public titleRecord!: string;

	@Prop({default: 'LVL'})
	public levelName!: string;

	@Prop({default: false})

	@Prop({default: 25})
	public size!: number;

	@Prop({default: "Inter"})
	public fontFamily!: string;

	@Prop({default: 3})
	public eventCount!: number;

	@Prop({default: 1})
	public eventDone!: number;

	@Prop({default: 1})
	public level!: number;

	@Prop({default: .2})
	public percent!: number;

	@Prop({default: 42})
	public amountLeft!: number;

	@Prop({default: false})
	public showApproaching!:boolean;

	@Prop({default: false})
	public showLevelUp!:boolean;

	@Prop({default: false})
	public showSuccess!:boolean;

	@Prop({default: false})
	public showFail!:boolean;

	@Prop({default: false})
	public showRecord!:boolean;

	@Prop({default: "{AMOUNT}€"})
	public amountLeftFormat!:string;

	@Prop({default: ""})
	public approachingEmote!:string;

	@Prop({default: ""})
	public successEmote!:string;

	@Prop({default: ""})
	public failedEmote!:string;

	@Prop({default: ""})
	public levelUpEmote!:string;

	@Prop({default: ""})
	public recordEmote!:string;

	@Prop({default: false})
	public isRecord!:boolean;

	@Prop({default: 0})
	public expiresAt!:number;

	@Prop({default: -1})
	public recordPercent!:number;

	@Prop({default: -1})
	public recordLevel!:number;

	public showLevelUp_local:boolean = false;
	public showRecord_local:boolean = false;
	public showSuccess_local:boolean = false;
	public showFail_local:boolean = false;
	public percent_local:number = 0;
	public forcedAmount_local:number|null = null;
	public easedPercent:number = 0;
	public localTitle:string = "";
	public localTitleApproaching:string = "";
	public localTitleSuccess:string = "";
	public localTitleFail:string = "";
	public localTitleRecord:string = "";
	public localLevelName:string = "";
	public localLevelIndex:number = 0;
	public localTitleLevelUp:string = "";
	public timeLeft:string = "";
	public trophyIcon:string = "";
	public emoteList:{x:number, y:number, size:number, angle:number, alpha:number}[] = [];

	private timerTO:string = "";

	public get cssFontSize(){ return this.size + 'px'; }

	public get cssColorTextGeneric(){ return (this.isRecord? this.recordColorText : this.colorText); }

	public get cssColorBgGeneric(){ return (this.isRecord? this.recordColorBg : this.colorBg); }

	public get cssColorRecordFade(){ return this.recordColorText+"40"; }

	public get cssColorTextFade(){ return this.cssColorTextGeneric+"80"; }

	public get cssColorBgFade(){ return this.cssColorBgGeneric+"80"; }

	public get cssFillPercent():string { return (this.easedPercent*100)+'%'; }

	public get cssRecordPercent():string { return (this.recordPercent*100)+'%'; }

	public get showIncomingRecord():boolean {
		return this.localLevelIndex == this.recordLevel && this.recordPercent > -1;
	}

	public get formatedAmountLeft():string {
		const amount = this.forcedAmount_local ?? this.amountLeft;
		return Utils.formatCurrency(amount, this.amountLeftFormat);
	}

	public mounted(){
		this.easedPercent = this.percent;
		this.percent_local = this.percent;
		this.showLevelUp_local = this.showLevelUp != false;
		this.showRecord_local = this.showRecord != false;
		this.localLevelIndex = this.level;
		this.localTitleRecord = this.titleRecord;
		this.showSuccess_local = this.showSuccess != false;
		this.showFail_local = this.showFail != false;

		const parser = new DOMParser();
		const svgDoc = parser.parseFromString(TrophyIcon, "image/svg+xml");
		const svgElement = svgDoc.documentElement;
		svgElement.setAttribute("class", "trophyIcon");
		svgElement.querySelectorAll("path").forEach(v=> {
			v.setAttribute("style", "fill: "+this.recordColorText+";")
		})
		let [x,y,w,h] = svgElement.getAttribute("viewBox")?.split(" ").map(v=>parseFloat(v)) || [0,0,0,0];
		w *= 1.25;
		// h *= 1.5;
		svgElement.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);

		this.trophyIcon = `url(data:image/svg+xml;base64,${btoa(svgElement.outerHTML)})`;

		// const url = this.$asset("icons/leaderboard.svg");
		watch(() => this.percent,  async (newPercent, oldPercent) => {
			if(this.showApproaching) return;
			if(this.showSuccess_local) return;
			if(this.showFail_local) return;
			// This is necessary to avoid conflicting animations if reaching a new
			// record while leveling up
			if(this.recordPercent > -1 && newPercent > this.recordPercent) {
				this.recordAnimation();
				return
			}
			if(this.showLevelUp_local) return;
			if(this.showRecord_local) return;
			if(!this.showLevelUp && oldPercent > newPercent) {
				this.levelUpAnimation();
				return;
			}
			this.percent_local = newPercent;
			this.localLevelIndex = this.level;
			gsap.killTweensOf(this);
			gsap.to(this, {easedPercent: this.percent_local, duration: 1})
		});

		watch(() => this.title,  () => {
			this.localTitle = this.title;
		}, {immediate:true});

		watch(() => this.titleApproaching,  () => {
			this.localTitleApproaching = this.titleApproaching;
		}, {immediate:true});

		watch(() => this.titleSuccess,  () => {
			this.localTitleSuccess = this.titleSuccess;
		}, {immediate:true});

		watch(() => this.titleFail,  () => {
			this.localTitleFail = this.titleFail;
		}, {immediate:true});

		watch(() => this.titleRecord,  () => {
			this.localTitleRecord = this.titleRecord;
		}, {immediate:true});

		watch(() => this.titleLevelUp,  () => {
			this.localTitleLevelUp = this.titleLevelUp;
		}, {immediate:true});

		watch(() => this.levelName,  () => {
			this.localLevelName = this.levelName;
		}, {immediate:true});

		watch(() => this.size,  () => {
			this.createEmoteWall();
		}, {immediate:true});

		watch(() => this.isRecord,  () => {
			if(this.isRecord && this.showRecord === false) {
				this.recordAnimation();
			}
		}, {immediate:true});

		watch(() => this.showLevelUp_local,  () => {
			if(this.showLevelUp_local) {
				this.$nextTick().then(()=> {
					this.createEmoteWall();
				});
			}
			else this.clearEmoteWall();
		});

		watch(() => this.showSuccess_local,  () => {
			if(this.showSuccess_local) {
				this.$nextTick().then(()=> {
					this.createEmoteWall();
				});
			}
			else this.clearEmoteWall();
		});

		watch(() => this.showRecord_local,  () => {
			if(this.showRecord_local) {
				this.$nextTick().then(()=> {
					this.createEmoteWall();
				});
			}
			else this.clearEmoteWall();
		});

		this.$nextTick().then(()=> {
			this.createEmoteWall();
		})

		if(this.editable === false) {
			if(this.timerTO) SetIntervalWorker.instance.delete(this.timerTO);
			this.timerTO = SetIntervalWorker.instance.create(() => {
				if(this.expiresAt > 0) {
					const timeLeft = Math.max(0, this.expiresAt - Date.now());
					this.timeLeft = Utils.formatDuration(timeLeft, true);
					if(timeLeft <= 0) {
						if(this.level > 1) {
							this.successAnimation();
						}else{
							this.failAnimation();
						}
						SetIntervalWorker.instance.delete(this.timerTO);
					}
				}
			}, 200);
		}else{
			const timeLeft = Math.max(0, this.expiresAt - Date.now() + 1000);
			this.timeLeft = Utils.formatDuration(timeLeft, true);
		}
	}

	public beforeUnmount(){
		// this.clearEmoteWall()
		SetIntervalWorker.instance.delete(this.timerTO)
	}

	public onChangeTitle():void {
		this.$emit("update:title", this.localTitle);
		this.$emit("edit");
	}

	public onChangeTitleApproaching():void {
		this.$emit("update:titleApproaching", this.localTitleApproaching);
		this.$emit("edit");
	}

	public onChangeTitleSuccess():void {
		this.$emit("update:titleSuccess", this.localTitleSuccess);
		this.$emit("edit");
	}

	public onChangeTitleFail():void {
		this.$emit("update:titleFail", this.localTitleFail);
		this.$emit("edit");
	}

	public onChangeTitleRecord():void {
		this.$emit("update:titleRecord", this.localTitleRecord);
		this.$emit("edit");
	}

	public onChangeTitleLevelUp():void {
		this.$emit("update:titleLevelUp", this.localTitleLevelUp);
		this.$emit("edit");
	}

	public onChangeLevelName():void {
		this.$emit("update:levelName", this.localLevelName);
		this.$emit("edit");
	}

	public onClickEmote(e:MouseEvent):void {
		this.$emit("selectEmote", e);
	}

	public async levelUpAnimation():Promise<void> {
		// Level UP
		const currentLevel = this.localLevelIndex;
		if(currentLevel === 0) return;

		this.forcedAmount_local = 0;

		gsap.to(this, {easedPercent: 1, duration: .5})
		await Utils.promisedTimeout(300);
		this.showLevelUp_local = !this.showRecord_local;
		await this.$nextTick();
		if(!this.showLevelUp_local) return; //This flag can be set back to false when reaching new record
		const labelHolder = (this.$refs.title as typeof contenteditable).$el as HTMLElement;
		this.localTitleLevelUp = "100%"
		labelHolder.classList.add("big");
		await this.animateLabelSlowmo(labelHolder);
		if(!this.showLevelUp_local) return; //This flag can be set back to false when reaching new record
		labelHolder.classList.remove("big");
		this.localTitleLevelUp	= this.titleLevelUp.replace('{X}', currentLevel.toString());
		await this.animateLabelSlowmo(labelHolder);
		if(!this.showLevelUp_local) return; //This flag can be set back to false when reaching new record
		this.percent_local		=
		this.easedPercent		= this.percent;
		this.forcedAmount_local	= null;
		this.localLevelIndex	= this.level;
		this.showLevelUp_local	= false;
	}

	public async recordAnimation():Promise<void> {
		console.log("Show record")
		this.showLevelUp_local = false;
		gsap.to(this, {easedPercent: this.percent, duration: .5})
		await Utils.promisedTimeout(500);
		this.showRecord_local = true;
		await this.$nextTick();
		const labelHolder = (this.$refs.title as typeof contenteditable).$el as HTMLElement;
		await this.animateLabelPaused(labelHolder);
		this.percent_local		=
		this.easedPercent		= this.percent;
		this.forcedAmount_local	= null;
		this.localLevelIndex	= this.level;
		this.showRecord_local	= false;
	}

	public async successAnimation():Promise<void> {
		this.$emit("lock")
		this.showSuccess_local = true;
		this.showRecord_local = false;
		this.showLevelUp_local = false;
		await this.$nextTick();
		const labelHolder = (this.$refs.title as typeof contenteditable).$el as HTMLElement;
		this.localTitleSuccess = this.titleSuccess;
		await this.animateLabelSlowmo(labelHolder);
		this.localTitleSuccess = this.titleSuccessSummary.replace('{LEVEL}', this.localLevelIndex.toString()).replace('{PERCENT}', Math.floor(this.percent_local*100).toString());
		await this.animateLabelPaused(labelHolder, true, 10000);
		this.$emit("close");
		this.$emit("unlock")
	}

	public async failAnimation():Promise<void> {
		this.$emit("lock")
		this.showFail_local = true;
		this.showRecord_local = false;
		this.showLevelUp_local = false;
		await this.$nextTick();
		const labelHolder = (this.$refs.title as typeof contenteditable).$el as HTMLElement;
		this.localTitleSuccess = this.titleFail;
		await this.animateLabelPaused(labelHolder, false, 10000);
		this.$emit("close");
		this.$emit("unlock")
	}

	private async animateLabelSlowmo(labelHolder:HTMLElement):Promise<void> {
		gsap.fromTo(labelHolder, {x:"20%"}, {x:"-20%", duration: 2, ease:"slow(0.5,0.8,false)"});
		gsap.fromTo(labelHolder, {opacity:0}, {opacity:1, duration: .25, ease:"sine.out"});
		gsap.to(labelHolder, {opacity:0, duration: .25, delay:1.75, ease:"sine.in"});
		await Utils.promisedTimeout(2000);
	}

	private async animateLabelPaused(labelHolder:HTMLElement, bounce:boolean = true, pauseDuration:number = 4000):Promise<void> {
		gsap.fromTo(labelHolder, {x:"20%", opacity:0}, {x:"0", opacity:1, duration: .5, ease:"back.out", delay:.5});
		if(bounce) {
			const loops = (pauseDuration/1000 - .5)/.25;
			const loopsRot = (pauseDuration/1000 - .5)/1;
			gsap.to(labelHolder, {scaleY:1.2, duration: .25, ease:"sine.inOut", repeat:loops, yoyo:true});
			gsap.to(labelHolder, {scaleX:1.1, duration: .25, ease:"sine.inOut", repeat:loops, yoyo:true, delay: .15});
			gsap.fromTo(labelHolder, {rotate:"1deg"}, {rotate:"-1deg", duration: 1, ease:"sine.inOut", repeat:loopsRot, yoyo:true, delay: .15});
		}
		gsap.to(labelHolder, {x:"-20%", opacity:0, duration: .5, ease:"back.in", delay:pauseDuration/1000 - .5});
		await Utils.promisedTimeout(pauseDuration);
	}

	private clearEmoteWall():void {
		this.emoteList = [];
	}

	private createEmoteWall():void {
		const holder = this.$refs.emoteWall as HTMLElement;
		if(!holder) return;

		const bounds = this.$el.getBoundingClientRect();
		if(bounds.height === 0) {
			// This is mostly a workaround a live reload issue.
			// On live reload, a new component is built and the parent
			// makes a 250ms animation from scaleY:0 to scaleY:1.
			// This makes it so the height isn't ready before 250ms
			setTimeout(() => {
				this.createEmoteWall();
			}, 250);
			return;
		}

		const imgSize = bounds.height / 1.5;
		const paddingScale = 5;
		const paddingW = bounds.height / 2 * paddingScale;
		const paddingH = -bounds.height / 5 * 1/paddingScale;
		const rows = Math.ceil(bounds.height / (imgSize + paddingH)) + 2;
		const cols = Math.ceil(bounds.width / (imgSize + paddingW));
		if(this.emoteList.length > 0) this.clearEmoteWall();
		this.emoteList = [];

		const props:{alpha:number, angle:number}[] = []

		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				let y = row * (imgSize + paddingH);
				if(y < -imgSize) y += rows * (imgSize + paddingH);
				let x = col * (imgSize + paddingW);
				if(row%2 == 0) x += (imgSize+paddingW) / 2

				const index = (row*col)%((rows-2)*col);
				if(!props[index]) {
					props[index] = {
						alpha: Math.random() * .7 + .2,
						angle: Math.random() * 360,
					}
				}

				this.emoteList.push({
					x,
					y,
					size: imgSize,
					angle: props[index].angle,
					alpha: props[index].alpha,
				});
			}
		}
	}

}
export default toNative(OverlayCustomTrainRenderer);
</script>

<style scoped lang="less">
.overlaycustomtrainrenderer {
	position: relative;
	border-radius: 10em;
	font-size: v-bind(cssFontSize);
	font-family: v-bind(fontFamily);
	color: var(--colorText);
	background-color: var(--colorBg);
	width: 100%;
	--maskWidth: ~"max(0em, v-bind(cssFillPercent))";
	--colorBg: v-bind(cssColorBgGeneric);
	--colorText: v-bind(cssColorTextGeneric);

	&.editable {
		font-size: calc(v-bind(cssFontSize) / 2);
	}

	.title {
		flex-grow: 1;
		font-weight: 500;
		position: relative;
		pointer-events: all;
		padding: 0 .5em;
		text-align: center;
		font-weight: bold;
	}

	&>.progress{
		overflow: hidden;
		border-radius: 20em;
		position: relative;
		.fillHolder {
			pointer-events: none;
			position: absolute;
			top: 0;
			left: 0;;
			display: flex;
			flex-direction: row;
			height: 100%;
			width: 100%;

			.level {
				flex-shrink: 0;
				border-radius: 2em;
				background-color: var(--colorText);
			}

			.fillHolder {
				position: relative;
				height: 100%;
				flex-grow: 1;
				width: 100%;
				.fill {
					border-top-right-radius: 10em;
					border-bottom-right-radius: 10em;
					width: ~"min(200%, calc(10em + var(--maskWidth)))";
					height: 100%;
					position: absolute;
					left: -10em;
					background-color: var(--colorText);
				}
			}
		}

		.level {
			border-radius: 10em;
			font-size: .5em;
			font-weight: bold;
			padding: .8em 1.5em;
			margin: .5em;
			color: var(--colorText);
			background-color: var(--colorBg);
			white-space: nowrap;
			display: flex;
			flex-direction: row;
			pointer-events: all;
			align-items: center;
		}

		.infoHolder {
			gap: .5em;
			display: flex;
			flex-direction: row;
			justify-content: center;
			align-items: center;
			flex-grow: 1;

			.record {
				position: absolute;
				top: 0;
				left: v-bind(cssRecordPercent);
				z-index: 0;
				border-left: 2px dashed v-bind(recordColorText);
				background-color: v-bind(cssColorRecordFade);
				&::before {
					content: "";
					background-image: v-bind(trophyIcon);
					background-size: 1em;
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					opacity: .25;
					animation: scrollBackground .2s linear infinite;

					@keyframes scrollBackground {
						from {
							background-position: 0 .4em;
						}
						to {
							background-position: 1em .4em;
						}
					}
				}
			}
		}

		.holder {
			display: flex;
			align-items: center;
			padding: 0;
			width: 100%;
			border-radius: 10em;
			overflow: hidden;
			pointer-events: none;

			&:not(.back) {
				position: absolute;
				top: 0;
				left: 0;
				z-index: 1;
				.infoHolder {
					clip-path: inset(0 calc(100% - var(--maskWidth)) 0 0 round 10em);
					color: var(--colorBg);

					.editableField {
						outline-color: v-bind(cssColorBgFade)
					}
				}
			}

			.progress {
				gap: .3em;
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
				font-size: .45em;
				font-weight: bold;
				z-index: 1;
				font-variant-numeric: tabular-nums;
			}

			.percent {
				z-index: 1;
				font-size: 1.25em;
				font-weight: bold;
				margin-right: .5em;
				font-variant-numeric: tabular-nums;
			}
		}
	}

	.approaching, .success, .fail, .levelUp, .record {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 10;
		width: 100%;
		height: 100%;
		.content {
			position: absolute;
			width: 100%;
			height: 100%;
			z-index: 0;
			border-radius: 20em;
			overflow: hidden;
			background-color: var(--colorText);
			color: var(--colorBg);
			top: 0;
			left: 0;
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			.emote {
				margin-left: .25em;
				height: 1.6em;
			}

			.title {
				flex: 1;
				text-align: center;
				margin: 0 .25em;
			}

			.events {
				margin-right: .5em;
				.wrapper {
					gap: .2em;
					row-gap: 0;
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					div {
						width: 1em;
						height: 1em;
						background-color: var(--colorText);
						border-radius: 50%;
						opacity: .5;
						transition: opacity .2s;
						display: flex;
						justify-content: center;
						align-items: center;

						&.done {
							opacity: 1;
						}
						.icon {
							color: var(--colorBg);
							width: 80%;
						}
					}
					&:nth-child(even) {
						margin-left: .5em;
					}
				}
				.time {
					font-size: .45em;
					font-weight: bold;
					text-align: center;
					margin-top: .5em;
					z-index: 1;
					font-variant-numeric: tabular-nums;
				}
				&.wrap {
					position: relative;
					.wrapper {
						div {
							width: .8em;
							height: .8em;
						}
					}
					.time {
						position: absolute;
						top: 50%;
						left: 50%;
						margin: 0;
						transform: translate(-50%, -50%);
						background-color: var(--colorBg);
						padding: .25em .5em;
						border-radius: 1em;
					}
				}
			}

		}

		&.levelUp,
		&.record {
			.content {
				.title.big {
					font-size: 1.5em;
				}
			}
		}

		&.fail {
			.title {
				font-weight: normal;
				font-size: .9em;
			}
		}
		&.fail > .content,
		&.approaching > .content {
			background-color: var(--colorBg);
			color: var(--colorText);
		}

	}

	&.editable {
		.editableField, .emote {
			outline: 1px dashed v-bind(cssColorTextFade);
			border-radius: .5em;
			padding: 0 2px;
			&.isEmpty {
				min-width: 2em;
			}
		}
		.emote {
			height: 1.8em;
			padding: .1em;
			overflow: visible;
			border-radius: 50%;
			cursor: pointer;

			&.picker {
				position: absolute;
				top: 0;
				right: 0;
				height: 1.5rem;
				transform: translate(25%, -50%);
				background-color: #ffffff;
			}
		}
		.record, .success, .levelUp {
			.editableField, .emote {
				outline-color: v-bind(cssColorBgFade);
			}
		}
	}

	.emoteWall {
		position: absolute;
		z-index: -1;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		animation: scrollUp .35s linear infinite;

		.emoteWallEmote {
			position: absolute;
		}

		@keyframes scrollUp {
			0% {
				transform: translateY(0%);
			}
			100% {
				transform: translateY(-125%);
			}
		}
	}

	.fade-enter-active {
		transition: all 0.2s;
	}

	.fade-leave-active {
		transition: all 0.2s;
	}

	.fade-enter-from,
	.fade-leave-to {
		opacity: 0;
	}
}
</style>
