
<template>
	<div :class="classes">

		<div class="fill" :style="{width: (100 - roundProgressPercent)+'%'}"></div>

		<div class="head">
			<img src="@/assets/img/goldenKappa.png" alt="golden kappa" class="icon kappa" v-if="goldenKappaMode">
			<Icon name="train_boost.svg" alt="boost" class="icon" v-if="boostMode" />
			<Icon name="train" alt="train" class="icon" v-else />
			<template v-if="trainData.state == 'APPROACHING'">
				<h1 v-if="!boostMode">{{ $t("train.hype_approaching") }}</h1>
				<h1 v-else-if="goldenKappaMode">{{ $t("train.golden_approaching") }}</h1>
				<h1 v-else>{{ $t("train.boost_approaching") }}</h1>
			</template>

			<i18n-t scope="global" tag="h1" v-else-if="trainProgress"
			:keypath="boostMode?'train.boost_progress': goldenKappaMode?'train.golden_progress':'train.hype_progress'">
				<template #LEVEL>{{ trainData.level }}</template>
				<template #PERCENT><span class="percent">{{roundProgressPercent}}%</span></template>
			</i18n-t>

			<h1 v-else-if="trainData.state == 'COMPLETED'">
				<span v-if="boostMode">{{ $t("train.boost_complete") }}</span>
				<span v-else-if="goldenKappaMode">{{ $t("train.golden_complete") }}</span>
				<span v-else>{{ $t("train.hype_complete") }}</span>
				<br />
				<i18n-t scope="global" tag="span" class="subtitle"
				keypath="train.hype_complete_details">
					<template #LEVEL><strong>{{completeLevel}}</strong></template>
				</i18n-t>
			</h1>

			<template v-else-if="trainData.state == 'EXPIRED'">
				<h1 v-if="boostMode">{{ $t("train.boost_cancel") }}</h1>
				<h1 v-else-if="goldenKappaMode">{{ $t("train.golden_cancel") }}</h1>
				<h1 v-else>{{ $t("train.hype_cancel") }}</h1>
			</template>
		</div>

		<ProgressBar v-if="(trainProgress || trainData.state == 'APPROACHING') && trainData.state != 'COMPLETED'"
			class="progressBar"
			secondary
			:duration="timerDuration"
			:percent="timerPercent"
			:boostMode="boostMode"
		/>

		<div class="content conductors">
			<a @click.stop="openUserCard(conductor_subs!.user)"
			v-if="conductor_subs" class="conductor" ref="conductor_subs_holder" v-tooltip="$t('train.conductor_subs_tt')">
				<img :src="conductor_subs.user.avatarPath" class="avatar">
				<span class="userlink">{{conductor_subs.user.displayName}}</span>

				<!-- <i18n-t scope="global" tag="div" class="label" keypath="train.conductor_subs" :plural="getConductorSubCount()">
					<template #COUNT>
						<span class="count">{{ getConductorSubCount() }}</span>
					</template>
				</i18n-t> -->
			</a>

			<a @click.stop="openUserCard(conductor_bits!.user)"
			v-if="conductor_bits" class="conductor" ref="conductor_bits_holder" v-tooltip="$t('train.conductor_bits_tt')">
				<img :src="conductor_bits.user.avatarPath" class="avatar">
				<span class="userlink">{{conductor_bits.user.displayName}}</span>

				<i18n-t scope="global" tag="div" class="label" keypath="train.conductor_bits" :plural="conductor_bits.amount">
					<template #COUNT>
						<span class="count">{{ conductor_bits.amount }}</span>
					</template>
				</i18n-t>
			</a>

		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { gsap } from 'gsap/gsap-core';
import type { CSSProperties } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ProgressBar from '../ProgressBar.vue';
import Icon from '../Icon.vue';
import ApiHelper from '@/utils/ApiHelper';

@Component({
	components:{
		ProgressBar,
	}
})
class HypeTrainState extends Vue {

	public timerPercent:number = 0;
	public timerDuration:number = 0;
	public progressPercent:number = 0;
	public conductor_subs:TwitchatDataTypes.HypeTrainConductorData | null = null;
	public conductor_bits:TwitchatDataTypes.HypeTrainConductorData | null = null;

	private disposed:boolean = false;

	public get boostMode():boolean { return this.trainData.is_boost_train; }
	public get goldenKappaMode():boolean { return this.trainData.is_golden_kappa; }

	public get completeLevel():number {
		let level = this.trainData.level;
		if(this.progressPercent < 100) level --;
		return level;
	}

	public get trainProgress():boolean {
		return this.trainData.state == 'START' || this.trainData.state == 'PROGRESS' || this.trainData.state == 'LEVEL_UP';
	}

	public get trainData():TwitchatDataTypes.HypeTrainStateData {
		//This view can't exist if no hype train isn't started, it's safe to force "!"
		return this.$store.stream.hypeTrain!;
	}

	public get roundProgressPercent():number {
		return Math.max(0, Math.min(100, Math.round(this.progressPercent)));
	}

	public get classes():string[] {
		const res = ["hypetrainstate", "gameStateWindow"];
		if(this.boostMode) res.push("boost");
		if(this.goldenKappaMode) res.push("golden");
		return res;
	}

	public mounted():void {
		this.dataChange();
		watch(()=>this.$store.stream.hypeTrain, ()=>this.dataChange());

		if(this.trainData.conductor_subs) {
			this.conductor_subs = this.trainData.conductor_subs;
		}
		if(this.trainData.conductor_bits) {
			this.conductor_bits = this.trainData.conductor_bits;
		}

		watch(() => this.trainData, () => {
			if(!this.trainData) return;

			try {
				if(this.conductor_subs && this.trainData.conductor_subs && JSON.stringify(this.conductor_subs) == JSON.stringify(this.trainData.conductor_subs)) return;

				if(this.conductor_subs) {
					gsap.killTweensOf(this.$refs.conductor_subs_holder as HTMLDivElement);
					gsap.to(this.$refs.conductor_subs_holder as HTMLDivElement, {
						duration:.25,
						scale:0,
						ease:"sine.in",
						onComplete:()=> {
							this.conductor_subs = this.trainData?.conductor_subs ?? null;
							if(!this.conductor_subs) return;
							this.$nextTick().then(()=>{
								gsap.to(this.$refs.conductor_subs_holder as HTMLDivElement, {
									duration:.25,
									scale:1,
									ease:"sine.out",
								});
							});
						}
					});
				}else if(this.trainData.conductor_subs){
					this.conductor_subs = this.trainData.conductor_subs;
				}else {
					this.conductor_subs = null;
				}
			}catch(error){
				console.log(error);
			}
		}, {deep:true});

		watch(() => this.trainData, () => {
			try {
				if(this.conductor_bits && this.trainData.conductor_bits && JSON.stringify(this.conductor_bits) == JSON.stringify(this.trainData.conductor_bits)) return;

				if(this.conductor_bits) {
					gsap.killTweensOf(this.$refs.conductor_bits_holder as HTMLDivElement);
					gsap.to(this.$refs.conductor_bits_holder as HTMLDivElement, {
						duration:.25,
						scale:0,
						ease:"sine.in",
						onComplete:()=> {
							this.conductor_bits = this.trainData?.conductor_bits ?? null;
							if(!this.conductor_bits) return;
							this.$nextTick().then(()=>{
								gsap.to(this.$refs.conductor_bits_holder as HTMLDivElement, {
									duration:.25,
									scale:1,
									ease:"sine.out",
								});
							});
						}
					});
				}else if(this.trainData.conductor_bits){
					this.conductor_bits = this.trainData.conductor_bits;
				}else {
					this.conductor_bits = null;
				}
			}catch(error){
				console.log(error);
			}
		}, {deep:true});

		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public dataChange():void {
		gsap.killTweensOf(this);

		const p = Math.floor(this.trainData.currentValue/this.trainData.goal * 100);
		gsap.to(this, {progressPercent:p, ease:"sine.inOut", duration:.5});
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store.users.openUserCard(user, this.trainData.channel_id);
	}

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());

		const remaining = Math.max(0, this.trainData.ends_at - Date.now());
		this.timerDuration = this.trainData.state == "APPROACHING"? remaining : 5*60*1000;
		this.timerPercent = 1 - remaining / this.timerDuration;
	}
}
export default toNative(HypeTrainState);
</script>

<style scoped lang="less">
.hypetrainstate{

	&.boost {
		@c: darken(#00f0f0, 15%);
		background-color: @c !important;
	}

	.fill {
		position: absolute;
		top: 0;
		right: 0;
		height: 100%;
		background-color: #00000018;
		transition: width .5s;
	}

	.head {
		z-index: 1;
		display: flex;
		flex-direction: row;
		gap: .5em;
		row-gap: .25em;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		text-align: center;

		h1 {
			display: flex;
			flex-direction: row;
			gap: .5em;
			row-gap: .25em;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
		}

		.subtitle {
			font-size: .9em;
			font-weight: normal;
		}

		&>.icon {
			width: 2em;
			&.kappa {
				transform: scale(1.5) rotate(-15deg);
				animation: shake 5s linear infinite;

				@keyframes shake {
					0% { transform: scale(1.5) rotate(-10deg); }
					1% { transform: scale(1.5) rotate(-15deg); }
					2% { transform: scale(1.5) rotate(-20deg); }
					3% { transform: scale(1.5) rotate(-15deg); }
					4% { transform: scale(1.5) rotate(-10deg); }
					5% { transform: scale(1.5) rotate(-15deg); }
					6% { transform: scale(1.5) rotate(-20deg); }
					7% { transform: scale(1.5) rotate(-15deg); }
					100% { transform: scale(1.5) rotate(-15deg); }
				}
			}
		}

		.percent {
			font-family: var(--font-azeret);
			font-size: .9em;
			vertical-align: middle;
			color: var(--color-primary);
			background-color: var(--color-light);
			padding: .25em;
			border-radius: var(--border-radius);
			// text-shadow: var(--text-shadow-contrast);
			letter-spacing: 1px;
		}
	}

	&.golden {
		@c: #f2b027;
		h1, .icon {
			color: black;
		}
		.head .percent {
			color: black !important;
		}
		background-image: linear-gradient(25-10deg, @c 0%, #ffe64c 100%);
	}

	.content {
		z-index: 1;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;

		&.conductors {
			margin-top: .5em;
			display: flex;
			flex-direction: row;
			gap: 1em;
			font-size: .8em;

			.conductor {
				display: flex;
				align-items: center;
				flex-direction: row;
				gap:.25em;
				background-color: var(--color-secondary);
				border-radius: var(--border-radius);
				padding: .5em;
				min-width: 6em;
				color: var(--color-light);

				.avatar {
					width: 2em;
					border-radius: 50%;
					margin: auto;
					display: block;
				}
				.label {
					.count {
						font-weight: bold;
					}
				}
			}
		}
	}
}
</style>
