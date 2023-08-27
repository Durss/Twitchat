<template>
	<div class="sponsortable card-item">
		<table ref="list">
			<tr>
				<th v-for="(h, index) in $tm('premium.supportTable.headers')"
				:class="'card-item '+['', 'primary', 'secondary','premium'][index as number]"
				v-tooltip="['', '', $t('params.categories.donate'), $t('premium.become_premiumBt')][index as number]"
				@click="clickHeader(index as number)">
					<Icon name="twitchat" v-if="index==1" />
					<Icon name="coin" theme="light" v-if="index==2" />
					<Icon name="premium" theme="light" v-if="index==3" />
					{{ h }}
				</th>
			</tr>
			<tr v-for="(line, index) in entries" :ref="'row_'+index">
				<td v-for="(item, index) in line">
					<template v-if="index==0">• </template>
					<Icon name="checkmark" v-if="item === 1" />
					<Icon name="cross" v-else-if="item === 0" />
					<template v-else>{{ $config.getParamByKey(item as string) || item }}</template>
				</td>
			</tr>
		</table>
		<button class="moreFeaturesBt" @click="expand(totalEntries-1); expanded = true" v-if="!expanded">▼</button>
		<button class="moreFeaturesBt" @click="expand(10); expanded = false" v-else>▲</button>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { gsap } from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';


@Component({
	components:{},
	emits:["scrollBy"]
})
export default class SponsorTable extends Vue {

	public expanded:boolean = false;

	public get entries():(string|number)[][] {
		let list = this.$tm('premium.supportTable.features') as (string|number)[][];
		return list;//clone(list).splice(0, this.maxEntries);
	}

	public get totalEntries():number {
		return (this.$tm('premium.supportTable.features') as string[][]).length;
	}

	public clickHeader(index:number):void {
		if(index == 2) {
			this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.DONATE);
		}
		if(index == 3) {
			this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
		}
	}

	public mounted():void {
		this.$nextTick().then(()=> {
			this.expand(10, false);
		});
	}

	public expand(rowIndex:number, animate:boolean = true):void {
		const list = this.$refs.list as HTMLTableRowElement;
		const item = (this.$refs["row_"+rowIndex] as HTMLTableRowElement[])[0];
		const boundsList = list.getBoundingClientRect();
		const boundsItem = item.getBoundingClientRect();
		const height = boundsItem.bottom - boundsList.top;
		const added = height - boundsList.height;
		//depending on the context the holder's height my not be ready.
		//try again until it is
		if(boundsList.height == 0) {
			setTimeout(()=>this.expand(rowIndex, animate), 30);
			return;
		}
		gsap.to(list, {duration:animate? 1: 0, ease:"sine.inout", height});
		this.$emit("scrollBy", added);
		if(added > 0 && animate) {
			//Dunno which parent is the scrollable one. Try 2 levels upward.
			//Too lazy to handle this on every parent integrating this component but there's the "@scrollBy"
			//event fired just in case..
			gsap.to((this.$el as HTMLElement).parentElement, {duration:animate?1:0, scrollTop:"+"+added});
			gsap.to(((this.$el as HTMLElement).parentElement as HTMLElement).parentElement, {duration:animate?1:0, scrollTop:"+"+added});
		}
	}

}
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
		// border-radius: 0;
		tr {
			width: 100%;
			th {
				width: 100%;
				border-radius: 0;
				vertical-align: middle;
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
				&:nth-child(1) {
					text-align: left;
				}
				&:nth-child(2) {
					background-color: var(--color-primary-fadest);
				}
				&:nth-child(3) {
					background-color: var(--color-secondary-fader);
				}
				&:nth-child(4) {
					background-color: var(--color-premium-fader);
				}
				.icon {
					height: 1em;
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