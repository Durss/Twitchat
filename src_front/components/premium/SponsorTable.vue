<template>
	<div class="sponsortable card-item">
		<table ref="list">
			<tr>
				<th v-for="(h, index) in $tm('premium.supportTable.headers')"
				:class="'card-item '+['', 'primary', 'secondary','premium'][index as number]"
				v-tooltip="['', '', $t('params.categories.donate'), $t('premium.become_premiumBt')][index as number]"
				@click="clickHeader(index as number)">
					<Icon name="twitchat" v-if="index==1" />
					<Icon name="coin" v-if="index==2" />
					<Icon name="premium" v-if="index==3" />
					{{ (h as string).replace(/\{COUNT\}/gi, entries.length.toString()) }}
				</th>
			</tr>
			<tr v-for="(line, index) in entries" :ref="'row_'+index">
				<template v-if="line[1] == line[2]">
					<td>• {{ line[0] }}</td>
					<td colspan="2" class="half">
						<Icon name="checkmark" v-if="line[1] === 1" />
						<Icon name="cross" v-else-if="line[1] === 0" />
						<span class="tild" v-else-if="($config.getParamByKey(line[1] as string) || line[1]) === '~'">~</span>
						<template v-else>{{ $config.getParamByKey(line[1] as string) || line[1] }}</template>
					</td>
					<td class="premium">
						<Icon name="checkmark" v-if="line[3] === 1" />
						<Icon name="cross" v-else-if="line[3] === 0" />
						<span class="tild" v-else-if="($config.getParamByKey(line[3] as string) || line[3]) === '~'">~</span>
						<template v-else>{{ $config.getParamByKey(line[3] as string) || line[3] }}</template>
					</td>
				</template>
				<td v-else v-for="(item, index) in line">
					<template v-if="index==0">• </template>
					<Icon name="checkmark" v-if="item === 1" />
					<Icon name="cross" v-else-if="item === 0" />
					<span class="tild" v-else-if="($config.getParamByKey(item as string) || item) === '~'">~</span>
					<template v-else>{{ $config.getParamByKey(item as string) || item }}</template>
					<i v-if="index == 0"><br>{{ $t("premium.no_ad_info", {FOLLOWERS:adMinFollowers}) }}</i>
				</td>
			</tr>
		</table>
		<template v-if="expand === false">
			<button class="moreFeaturesBt" @click="expandRows(totalEntries-1);" v-if="!expanded">▼</button>
			<button class="moreFeaturesBt" @click="expandRows(10);" v-else>▲</button>
		</template>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { gsap } from 'gsap';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["scrollBy"]
})
class SponsorTable extends Vue {

	@Prop({default:false, type:Boolean})
	public expand!:boolean;

	public currentRowIndex:number = 0;
	public dispose:boolean = false;

	public get expanded():boolean { return this.currentRowIndex == this.entries.length-1; }
	public get adMinFollowers():number { return Config.instance.AD_MIN_FOLLOWERS_COUNT; }

	public get entries():(string|number)[][] {
		let list = this.$tm('premium.supportTable.features') as (string|number)[][];
		return list;//clone(list).splice(0, this.maxEntries);
	}

	public get totalEntries():number {
		return (this.$tm('premium.supportTable.features') as string[][]).length;
	}

	public clickHeader(index:number):void {
		if(index == 2) {
			this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.DONATE);
		}
		if(index == 3) {
			this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
		}
	}

	public mounted():void {
		this.$nextTick().then(()=> {
			this.expandRows(this.expand !== false? this.entries.length : 10, false);
		});
	}

	public beforeUnmount():void {
		this.dispose = true;
		let scrollableHolder = document.getElementById("paramContentScrollableHolder") as HTMLDivElement;
		if(scrollableHolder) gsap.killTweensOf(scrollableHolder);
		const list = this.$refs.list as HTMLTableRowElement;
		if(list) gsap.killTweensOf(list);
	}

	public expandRows(rowIndex:number, animate:boolean = true):void {
		if(this.dispose) return;

		this.currentRowIndex = Math.max(29, Math.min(this.entries.length-1, rowIndex));
		const list = this.$refs.list as HTMLTableRowElement;
		const item = (this.$refs["row_"+this.currentRowIndex] as HTMLTableRowElement[])[0];
		const boundsList = list.getBoundingClientRect();
		const boundsItem = item.getBoundingClientRect();
		const height = boundsItem.bottom - boundsList.top;
		const added = height - boundsList.height;
		//depending on the context the holder's height my not be ready.
		//try again until it is
		if(boundsList.height == 0) {
			window.setTimeout(()=>this.expandRows(rowIndex, animate), 30);
			return;
		}
		const duration = animate?Math.min(1, Math.abs(added)/400):0;
		gsap.to(list, {duration, ease:"sine.inout", height});
		this.$emit("scrollBy", added);
		if(added > 0 && animate) {
			//Dunno which parent is the scrollable one. Try 2 levels upward.
			//Too lazy to handle this on every parent integrating this component but there's the "@scrollBy"
			//event fired just in case..
			let scrollableHolder = document.getElementById("paramContentScrollableHolder") as HTMLDivElement;
			if(!scrollableHolder) scrollableHolder = (this.$el as HTMLElement).parentElement as HTMLDivElement;
			gsap.killTweensOf(scrollableHolder);
			gsap.to(scrollableHolder, {duration, scrollTop:scrollableHolder.scrollTop + added});
		}
	}

}
export default toNative(SponsorTable);
</script>

<style scoped lang="less">
.sponsortable{
	padding: 0;
	.title {
		font-size: 1.5em;
		text-align: center;
		font-weight: bold;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}
	table {
		display:block;
		height: 200px;
		width: 100%;
		min-width: 100%;
		overflow: hidden;
		tr {
			width: 100%;
			th {
				width: 100%;
				border-radius: 0;
				vertical-align: middle;
				color: var(--color-text);
				&:nth-child(2) {
					background-color: var(--color-light-fade);
				}
				&:nth-child(2) {
					background-color: var(--color-primary-fade);
				}
				&:nth-child(3) {
					cursor: pointer;
					&:hover {
						background-color: var(--color-secondary-light);
					}
				}
				&:nth-child(4) {
					cursor: pointer;
					&:hover {
						background-color: var(--color-premium-light);
					}
				}
				.icon {
					height: 1em;
					margin-bottom: .25em;
					display: block;
				}
			}

			td {
				padding: .5em;
				text-align: center;
				vertical-align: middle;
				&:nth-child(1) {
					text-align: left;
				}
				&:nth-child(2) {
					font-weight: 400;
					&:not(.half) {
						background-color: var(--color-primary-fadest);
					}
				}
				&:nth-child(3) {
					background-color: var(--color-secondary-fader);
				}
				&:nth-child(4), &.premium {
					font-weight: 400;
					background-color: var(--color-premium-fader);
				}
				&.half {
					background-image: linear-gradient(90deg, var(--color-primary-fadest) 30%, var(--color-secondary-fader) 70%);
				}
				.icon {
					height: 1em;
				}
				.tild {
					font-size: 2em;
					line-height: .5em;
				}
				i {
					line-height: 1.5em;
					font-size: .85em;
					opacity: .7;
				}
			}
			&:not(:first-child):hover {
				background-color: var(--color-text-fadest);
			}
		}
	}

	.moreFeaturesBt {
		width: 100%;
		color: var(--color-text-inverse);
		background-color: var(--color-text);
		font-weight: bold;
	}
}
</style>
