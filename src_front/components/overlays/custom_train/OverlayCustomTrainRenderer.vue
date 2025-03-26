<template>
	<div class="overlaycustomtrainrenderer" :class="{editable: editable !== false}">
		<div class="progress">
			<div class="holder back">
				<div class="level">{{levelName}}{{level}}</div>
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
					<div class="percent">{{ Math.round(percent*100) }}%</div>
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
					<div class="percent">{{ Math.round(percent*100) }}%</div>
				</div>
			</div>
		</div>

		<div class="levelUp" v-if="showLevelUp !== false">
			<div class="content">
				<div class="emoteWall" ref="emoteWall"></div>
				<div class="label">100%</div>
			</div>
			<img class="emote picker" @click="onClickEmote" :src="levelUpEmote" alt="emote">
		</div>

		<div class="approaching" v-if="showApproaching !== false">
			<div class="content">
				<img class="emote" @click="onClickEmote" :src="approachingEmote" alt="emote">
				<contenteditable tag="div" class="title editableField"
					v-model="localTitleApproaching"
					:class="{isEmpty: (localTitleApproaching || '').trim().length === 0}"
					:contenteditable="editable !== false"
					:no-nl="true"
					:no-html="true"
					@input="onChangeTitle()" />
				<div class="events">
					<div v-for="i in eventCount" :key="i" :class="{done:i<=eventDone}"></div>
				</div>
			</div>
		</div>

		<div class="success" v-if="showSuccess !== false">
			<div class="content">
				<div class="emoteWall" ref="emoteWall"></div>
				<contenteditable tag="div" class="title editableField"
					v-model="localTitleSuccess"
					:class="{isEmpty: (localTitleSuccess || '').trim().length === 0}"
					:contenteditable="editable !== false"
					:no-nl="true"
					:no-html="true"
					@input="onChangeTitle()" />
			</div>
			<img class="emote picker" @click="onClickEmote" :src="successEmote" alt="emote">
		</div>

		<div class="fail" v-if="showFail !== false">
			<div class="content">
				<img class="emote" @click="onClickEmote" :src="failedEmote" alt="emote">
				<contenteditable tag="div" class="title editableField"
					v-model="localTitleFail"
					:class="{isEmpty: (localTitleFail || '').trim().length === 0}"
					:contenteditable="editable !== false"
					:no-nl="true"
					:no-html="true"
					@input="onChangeTitle()" />
			</div>
		</div>
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
	emits:["edit", "update:title", "update:titleApproaching", "update:titleSuccess", "update:titleFail", "update:levelName", "selectEmote"],
})
class OverlayCustomTrainRenderer extends Vue {

	@Prop({default: 'blue'})
	public colorText!: string;

	@Prop({default: 'white'})
	public colorBg!: string;

	@Prop({default: ''})
	public titleApproaching!: string;

	@Prop({default: false})
	public editable!:boolean

	@Prop({default: ''})
	public title!: string;

	@Prop({default: false})

	@Prop({default: ''})
	public titleSuccess!: string;

	@Prop({default: false})

	@Prop({default: ''})
	public titleFail!: string;

	@Prop({default: false})

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

	public easedPercent:number = 0;
	public localTitle:string = "";
	public localTitleApproaching:string = "";
	public localTitleSuccess:string = "";
	public localTitleFail:string = "";
	public localLevelName:string = "";

	private _raf:number = 0;
	private imageList:HTMLImageElement[] = [];

	public get cssSize(){ return this.size + 'px'; }

	public get colorTextFade(){ return this.colorText+"80"; }

	public get colorBgFade(){ return this.colorBg+"80"; }

	public get width():string { return (this.easedPercent*100)+'%'; }

	public get formatedAmountLeft():string {
		return Utils.formatCurrency(this.amountLeft, this.currencyPattern);
	}

	public mounted(){
		this.easedPercent = this.percent;
		watch(() => this.percent,  () => {
			gsap.to(this, {easedPercent: this.percent, duration: 1})
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

		this.createEmoteWall();
	}

	public beforeUnmount(){
		this.imageList.forEach(img => {
			gsap.killTweensOf(img);
			img.remove()
		});
		this.imageList = [];
		cancelAnimationFrame(this._raf);
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

	public onChangeLevelName():void {
		this.$emit("update:levelName", this.localLevelName);
		this.$emit("edit");
	}

	public onClickEmote(e:MouseEvent):void {
		this.$emit("selectEmote", e);
	}

	public createEmoteWall():void {
		// if(!this.successEmote) return;
		const holder = this.$refs.emoteWall as HTMLElement;
		if(!holder) return;

		const filePath = this.successEmote || this.levelUpEmote || this.failedEmote || this.approachingEmote;

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
	--colorBg: v-bind(colorBg);
	--colorText: v-bind(colorText);

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
	}

	.progress{
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
					width: calc(1.5em + var(--maskWidth));
					height: 100%;
					position: absolute;
					left: -1.5em;
					background-color: var(--colorText);
				}
			}
		}

		.level {
			border-radius: 10em;
			font-size: .65em;
			padding: .4em 1em;
			margin: .5em;
			font-weight: normal;
			color: var(--colorText);
			background-color: var(--colorBg);
			white-space: nowrap;
			display: flex;
			flex-direction: row;
			pointer-events: all;
			align-items: center;
		}

		.infoHolder {
			gap: .2em;
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
						border-color: var(--colorBg);
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
				font-size: 1.5em;
				font-weight: bold;
				padding: .15em .25em;
			}
		}
	}

	.approaching, .success, .fail, .levelUp {
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
			gap: 1em;
			align-items: center;
			justify-content: center;
			.emote {
				margin-left: .25em;
				height: 2em;
			}

			.label {
				font-weight: bold;
				font-size: 1.5em;
			}

			.title {
				flex: 1;
				text-align: center;
			}

			.events {
				gap: .2em;
				display: flex;
				flex-direction: row;
				margin-right: .5em;
				div {
					width: 1em;
					height: 1em;
					background-color: var(--colorBg);
					border-radius: 50%;
					opacity: .5;
					transition: opacity .2s;

					&.done {
						opacity: 1;
					}
				}
			}
		}

		&.approaching > .content,
		&.fail > .content {
			background-color: var(--colorBg);
			color: var(--colorText);
		}

		&:not(.approaching) > .content > .title {
			margin-right: 1em;
		}
	}

	&.editable {
		.editableField, .emote {
			border: 1px dashed v-bind(colorTextFade);
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
				background-color: var(--colorBg);
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
}
</style>
