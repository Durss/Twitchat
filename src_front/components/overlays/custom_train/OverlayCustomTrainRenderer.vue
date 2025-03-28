<template>
	<div class="overlaycustomtrainrenderer" :class="{editable: editable !== false}" @click="levelUpAnimation">
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
					<span>{{level}}</span>
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
						<div class="time">03:12</div>
						<div class="cost">{{ formatedAmountLeft }}</div>
					</div>
					<div class="percent">{{ Math.round(percent_local*100) }}%</div>
				</div>
			</div>
			<div class="fillHolder">
				<div class="levelHolder">
					<div class="level">{{levelName}}{{level}}</div>
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
					<span>{{level}}</span>
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
						<div class="time">03:12</div>
						<div class="cost">{{ formatedAmountLeft }}</div>
					</div>
					<div class="percent">{{ Math.round(percent_local*100) }}%</div>
				</div>
			</div>
		</div>

		<transition name="fade">
			<div class="levelUp" v-if="showLevelUp_local !== false">
				<div class="content">
					<div class="emoteWall" ref="emoteWall"></div>
					<div class="title" ref="title">{{ levelUpLabel }}</div>
				</div>
				<img class="emote picker" v-if="editable !== false" @click="onClickEmote" :src="levelUpEmote" alt="emote">
			</div>
		</transition>

		<transition name="fade">
			<div class="record" v-if="showRecord_local !== false">
				<div class="content">
					<div class="emoteWall" ref="emoteWall"></div>
					<contenteditable tag="div" class="title editableField"
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
					<div class="events">
						<div v-for="i in eventCount" :key="i" :class="{done:i<=eventDone}"></div>
					</div>
				</div>
			</div>
		</transition>

		<transition name="fade">
			<div class="success" v-if="showSuccess !== false">
				<div class="content">
					<div class="emoteWall" ref="emoteWall"></div>
					<contenteditable tag="div" class="title editableField"
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
			<div class="fail" v-if="showFail !== false">
				<div class="content">
					<img class="emote" @click="onClickEmote" :src="failedEmote" alt="emote">
					<contenteditable tag="div" class="title editableField"
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

@Component({
	components:{
		contenteditable,
	},
	emits:["edit", "update:title", "update:titleApproaching", "update:titleSuccess", "update:titleFail", "update:levelName", ":update:titleRecord", "selectEmote"],
})
class OverlayCustomTrainRenderer extends Vue {

	@Prop({default: 'blue'})
	public colorText!: string;

	@Prop({default: 'white'})
	public colorBg!: string;

	@Prop({default: 'blue'})
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
	public currencyPattern!:string;

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

	public levelUpLabel:string = "100%";
	public showLevelUp_local:boolean = false;
	public showRecord_local:boolean = false;
	public percent_local:number = 0;
	public easedPercent:number = 0;
	public localTitle:string = "";
	public localTitleApproaching:string = "";
	public localTitleSuccess:string = "";
	public localTitleFail:string = "";
	public localTitleRecord:string = "";
	public localLevelName:string = "";

	private _raf:number = 0;
	private imageList:HTMLImageElement[] = [];

	public get cssSize(){ return this.size + 'px'; }

	public get colorTextGeneric(){ return (this.isRecord? this.recordColorText : this.colorText); }

	public get colorBgGeneric(){ return (this.isRecord? this.recordColorBg : this.colorBg); }

	public get colorTextFade(){ return this.colorTextGeneric+"80"; }

	public get colorBgFade(){ return this.colorBgGeneric+"80"; }

	public get width():string { return (this.easedPercent*100)+'%'; }

	public get formatedAmountLeft():string {
		return Utils.formatCurrency(this.amountLeft, this.currencyPattern);
	}

	public mounted(){
		this.easedPercent = this.percent;
		this.percent_local = this.percent;
		this.showLevelUp_local = this.showLevelUp === true;
		this.showRecord_local = this.showRecord === true;
		watch(() => this.percent,  async (newPercent, oldPercent) => {
			if(this.showLevelUp_local) return;
			if(!this.showLevelUp && oldPercent > newPercent) {
				await this.levelUpAnimation();
			}
			this.percent_local = newPercent;
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

		watch(() => this.levelName,  () => {
			this.localLevelName = this.levelName;
		}, {immediate:true});

		watch(() => this.successEmote,  () => {
			this.imageList.forEach(img => {
				img.src = this.successEmote;
			});
		});

		watch(() => this.levelUpEmote,  () => {
			this.imageList.forEach(img => {
				img.src = this.levelUpEmote;
			});
		});

		watch(() => this.approachingEmote,  () => {
			this.imageList.forEach(img => {
				img.src = this.approachingEmote;
			});
		});

		watch(() => this.showLevelUp_local,  () => {
			if(this.showLevelUp_local) this.createEmoteWall();
			else this.clearEmoteWall();
		});

		watch(() => this.showSuccess,  () => {
			if(this.showSuccess) this.createEmoteWall();
			else this.clearEmoteWall();
		});

		watch(() => this.showRecord_local,  () => {
			if(this.showRecord_local) this.createEmoteWall();
			else this.clearEmoteWall();
		});

		this.$nextTick().then(()=> {
			this.createEmoteWall();
		})
	}

	public beforeUnmount(){
		this.clearEmoteWall()
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

	public onChangeLevelName():void {
		this.$emit("update:levelName", this.localLevelName);
		this.$emit("edit");
	}

	public onClickEmote(e:MouseEvent):void {
		this.$emit("selectEmote", e);
	}

	public async levelUpAnimation():Promise<void> {
		// Level UP
		const currentLevel = this.level-1;
		if(currentLevel === 0) return;
		gsap.to(this, {easedPercent: 1, duration: .5})
		await Utils.promisedTimeout(300);
		this.showLevelUp_local = true;
		await this.$nextTick();
		const labelHolder = this.$refs.title as HTMLElement;
		this.levelUpLabel = "100%"
		const animateTitle = async()=> {
			gsap.fromTo(labelHolder, {x:300}, {x:-300, duration: 2, ease:"slow(0.5,0.8,false)", delay:.1});
			gsap.fromTo(labelHolder, {opacity:0}, {opacity:1, duration: .25});
			gsap.to(labelHolder, {opacity:0, duration: .25, delay:1.85});
			await Utils.promisedTimeout(2100);
		}
		this.createEmoteWall();
		await animateTitle();
		labelHolder.classList.add("small");
		this.levelUpLabel	= this.titleLevelUp.replace('{INDEX}', currentLevel.toString());
		await animateTitle();
		labelHolder.classList.remove("small");
		this.showLevelUp_local = false;
		this.percent_local	=
		this.easedPercent	= this.percent;
	}

	private clearEmoteWall():void {
		this.imageList.forEach(img => {
			gsap.killTweensOf(img);
			img.remove()
		});
		this.imageList = [];
		cancelAnimationFrame(this._raf);
	}

	private createEmoteWall():void {
		// if(!this.successEmote) return;
		const holder = this.$refs.emoteWall as HTMLElement;
		if(!holder) return;

		let filePath = "";
		if(this.showLevelUp_local) {
			filePath = this.levelUpEmote;
		}else if(this.showApproaching) {
			filePath = this.approachingEmote;
		}else if(this.showFail) {
			filePath = this.failedEmote;
		}else if(this.showSuccess) {
			filePath = this.successEmote;
		}else if(this.showRecord_local) {
			filePath = this.recordEmote;
		}
		if(!filePath) return;

		const bounds = this.$el.getBoundingClientRect();
		const imgSize = bounds.height / 1.5;
		const paddingScale = 4;
		const paddingW = bounds.height / 2 * paddingScale;
		const paddingH = -bounds.height / 5 * 1/paddingScale;
		const rows = Math.ceil(bounds.height / (imgSize + paddingH)) + 2;
		const cols = Math.ceil(bounds.width / (imgSize + paddingW));
		this.imageList = [];

		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				const img = document.createElement('img');
				img.src = filePath;
				img.style.position = 'absolute';
				img.style.width = `${imgSize}px`;
				img.style.height = `${imgSize}px`;
				img.style.opacity = `${Math.random()*.75}`;
				img.style.transform = 'rotate('+(Math.random()-Math.random())*90+'deg)';
				this.imageList.push(img);
				holder.appendChild(img);
				gsap.fromTo(img, {scale:.8}, {scale:1.25, delay: Math.random() * 2, repeat:-1, yoyo:true, duration: 1});
			}
		}

		let offset = 0;
		const animate = ()=>{
			this._raf = requestAnimationFrame(animate);
			for (let i = 0; i < this.imageList.length; i++) {
				const img = this.imageList[i];
				const col = i % cols;
				const row = Math.floor(i / cols);
				let x = col * (imgSize + paddingW) + (row % 2 === 0 ? 0 : (imgSize+paddingW) / 2)
				let y = row * (imgSize + paddingH) + offset;
				if(y < -imgSize) {
					y += rows * (imgSize + paddingH);
				}
				if(offset < -4*(imgSize+paddingH)) {
					offset = 0;
				}
				img.style.left = `${x}px`;
				img.style.top = `${y}px`;
				offset -=.1;
			}
		}
		animate();

	}

}
export default toNative(OverlayCustomTrainRenderer);
</script>

<style scoped lang="less">
.overlaycustomtrainrenderer {
	position: relative;
	border-radius: 10em;
	font-size: v-bind(cssSize);
	font-family: v-bind(fontFamily);
	color: var(--colorText);
	background-color: var(--colorBg);
	width: 100%;
	--maskWidth: ~"max(0em, v-bind(width))";
	--colorBg: v-bind(colorBgGeneric);
	--colorText: v-bind(colorTextGeneric);

	&.editable {
		font-size: calc(v-bind(cssSize) / 1.5);
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

			.levelHolder {
				flex-shrink: 0;
				background-color: var(--colorText);
				border-radius: 2em;
				.level {
					visibility: hidden;
					flex-shrink: 0;
				}
			}

			.fillHolder {
				position: relative;
				height: 100%;
				flex-grow: 1;
				width: 100%;
				.fill {
					border-top-right-radius: 10em;
					border-bottom-right-radius: 10em;
					width: ~"min(200%, calc(1.5em + var(--maskWidth)))";
					height: 100%;
					position: absolute;
					left: -1.5em;
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
						outline-color: v-bind(colorBgFade)
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
			}

			.percent {
				font-size: 1.25em;
				font-weight: bold;
				margin-right: .5em;
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
				height: 2em;
			}

			.title {
				flex: 1;
				text-align: center;
				margin: 0 .25em;
			}

			.events {
				gap: .2em;
				display: flex;
				flex-direction: row;
				margin-right: .5em;
				div {
					width: 1em;
					height: 1em;
					background-color: var(--colorText);
					border-radius: 50%;
					opacity: .5;
					transition: opacity .2s;

					&.done {
						opacity: 1;
					}
				}
			}

		}
		&.levelUp .title {
			pointer-events: none;
		}

		&.levelUp,
		&.record {
			.content {
				.title:not(.small) {
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
			outline: 1px dashed v-bind(colorTextFade);
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
		.record, .success {
			.editableField, .emote {
				outline-color: v-bind(colorBgFade);
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
