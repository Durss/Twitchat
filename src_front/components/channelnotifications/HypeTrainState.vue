
<template>
	<div :class="classes">
		<div class="sharedUsers" v-if="sharedUserList.length > 0">
			<a v-for="user in sharedUserList" :key="user.id" :href="'https://twitch.tv/'+user.login" @click.prevent="openUserCard(user)" target="_blank" v-tooltip="user.displayName">
				<img :src="user.avatarPath?.replace('300x300', '50x50')" class="avatar hide" onload="this.classList.remove('hide')">
			</a>
		</div>

		<div class="fill" :style="{width: (100 - roundProgressPercent)+'%'}"></div>
		
		<div class="head" v-stickyTopShadow>
			<template v-if="trainData.state == 'APPROACHING'">
				<h1 v-if="trainData.type == 'treasure'"><HypeTrainStateIcon />{{ $t("train.treasure_approaching") }}</h1>
				<h1 v-else-if="trainData.type == 'golden_kappa'"><HypeTrainStateIcon />{{ $t("train.golden_approaching") }}</h1>
				<h1 v-else><HypeTrainStateIcon />{{ $t("train.hype_approaching") }}</h1>
			</template>

			<h1 v-else-if="trainProgress">
				<HypeTrainStateIcon />
				<i18n-t scope="global"
				:keypath="trainData.type == 'treasure'?'train.treasure_progress': trainData.type == 'golden_kappa'?'train.golden_progress':'train.hype_progress'">
					<template #LEVEL>{{ trainData.level }}</template>
					<template #PERCENT><span class="percent">{{roundProgressPercent}}%</span></template>
				</i18n-t>
			</h1>

			<h1 v-else-if="trainData.state == 'COMPLETED'">
				<HypeTrainStateIcon />
				<span v-if="trainData.type == 'treasure'">{{ $t("train.treasure_complete") }}</span>
				<span v-else-if="trainData.type == 'golden_kappa'">{{ $t("train.golden_complete") }}</span>
				<span v-else>{{ $t("train.hype_complete") }}</span>
				<br />
				<i18n-t scope="global" tag="span" class="subtitle"
				keypath="train.hype_complete_details">
					<template #LEVEL><strong>{{completeLevel}}</strong></template>
				</i18n-t>
			</h1>

			<template v-else-if="trainData.state == 'EXPIRED'">
				<HypeTrainStateIcon />
				<h1 v-if="trainData.type == 'treasure'">{{ $t("train.treasure_cancel") }}</h1>
				<h1 v-else-if="trainData.type == 'golden_kappa'">{{ $t("train.golden_cancel") }}</h1>
				<h1 v-else>{{ $t("train.hype_cancel") }}</h1>
			</template>
			
			<ProgressBar v-if="(trainProgress || trainData.state == 'APPROACHING') && trainData.state != 'COMPLETED'"
				class="progressBar"
				secondary
				:duration="timerDuration"
				:percent="timerPercent"
			/>
			<slot />
		</div>

		<div class="body">
			<div v-if="trainData.isAllTimeRecord" class="record"><Icon name="leaderboard" />{{ $t("train.all_time_record") }}</div>
	
			<div class="content conductors">
				<a @click.stop="openUserCard(conductor_subs!.user)"
				v-if="conductor_subs" class="conductor" ref="conductor_subs_holder" v-tooltip="$t('train.conductor_subs_tt')">
					<Icon name="sub" class="icon" />
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
					<Icon name="bits" class="icon" />
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
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from '@vue/runtime-core';
import { gsap } from 'gsap/gsap-core';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import ProgressBar from '../ProgressBar.vue';
import HypeTrainStateIcon from './HypeTrainStateIcon.vue';

@Component({
	components:{
		ProgressBar,
		HypeTrainStateIcon,
	}
})
class HypeTrainState extends Vue {

	public timerPercent:number = 0;
	public timerDuration:number = 0;
	public progressPercent:number = 0;
	public sharedUserList:TwitchatDataTypes.TwitchatUser[] = [];
	public conductor_subs:TwitchatDataTypes.HypeTrainConductorData | null = null;
	public conductor_bits:TwitchatDataTypes.HypeTrainConductorData | null = null;

	private disposed:boolean = false;

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
		res.push(this.trainData.type);
		return res;
	}

	public mounted():void {
		if(this.trainData.conductor_subs) {
			this.conductor_subs = this.trainData.conductor_subs;
		}
		if(this.trainData.conductor_bits) {
			this.conductor_bits = this.trainData.conductor_bits;
		}

		watch(() => this.trainData, () => {
			this.dataChange();

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

		this.renderFrame();
		this.dataChange();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public dataChange():void {
		gsap.killTweensOf(this);

		const p = Math.floor(this.trainData.currentValue/this.trainData.goal * 100);
		gsap.to(this, {progressPercent:p, ease:"sine.inOut", duration:.5});

		const me = this.$store.auth.twitch.user
		const uids = Object.keys(this.trainData.sharedStates || {});
		if(uids.length > 0) {
			uids.push(me.id);
		}
		uids.forEach((uid) => {
			if(!this.sharedUserList.find(u => u.id == uid)) {
				this.$store.users.getUserFrom("twitch", me.id, uid, undefined, undefined, (user) => {
					this.sharedUserList.push(user);
				});
			}
		});
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
	.sharedUsers {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 2;
		a {
			width: 30px;
			height: 30px;
			img {
				width: 30px;
				height: 30px;
				border-radius: 50%;
				background-color: var(--color-primary);
				border: 2px solid var(--color-primary);
			}
		}
	}

	.fill {
		position: absolute;
		top: 0;
		right: 0;
		height: 100%;
		background-color: #00000020;
		transition: width .5s;
		pointer-events: none;
	}

	.head {
		z-index: 2;

		.subtitle {
			font-size: .9em;
			font-weight: normal;
		}

		&>.icon {
			max-width: 1.5em;
			height: 1.5em;
			margin-right: .5em;
			&.kappa,
			&.coin {
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

	.body {
		z-index: 1;
	}

	&.golden_kappa {
		@c: #f2b027;
		h1, .icon {
			color: black;
		}
		.head .percent {
			color: black !important;
		}
		background-image: linear-gradient(25-10deg, @c 0%, #ffe64c 100%);
	}

	&.treasure {
		@c: #f29d27;
		h1, .icon {
			color: black;
		}
		.head .percent {
			color: black !important;
		}
		background-image: linear-gradient(25-10deg, @c 0%, #e7ff4c 100%);
	}

	.record {
		display: flex;
		align-items: center;
		gap: .5em;
		font-weight: bold;
		color: #dd9400;
		padding: .5em;
		background-color: #ffeecd;
		border-radius: var(--border-radius);
		.icon {
			height: 1em;
		}
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

				.icon {
					height: 2em;
					width: 2em;
					padding: .25em;
					object-fit: fill;
				}

				.avatar {
					width: 2em;
					border-radius: 50%;
					margin: auto;
					display: block;
					&.hide {
						display: none;
					}
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
