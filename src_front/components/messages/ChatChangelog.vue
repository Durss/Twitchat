<template>
	<div class="chatchangelog">
		
		<div class="version">{{ $t('changelog.version', {VERSION:appVersion}) }}</div>
		
		<div class="content">
			<ToggleBlock class="block new" :title="$t('changelog.major_title')" :open="false" :icons="['new']">
				<ul>
					<li v-for="e in entriesMajor">
						<img v-if="e.i" :src="$image('icons/'+e.i+'.svg')" class="icon" />

						<Button v-if="e.a && e.a.param"
							:aria-label="e.a.a ?? ''" small
							:title="e.a.l"
							@click.stop="$emit('openParamItem', e.a!.param!)" />
							
						<Button v-if="e.a && e.a.page"
							:aria-label="e.a.a ?? ''" small
							:title="e.a.l"
							@click.stop="$emit('openParam', e.a!.page!)" />

						<span v-html="e.l"></span>
					</li>
				</ul>
			</ToggleBlock>
			<ToggleBlock class="block other" :title="$t('changelog.minor_title')" :open="false" :icons="['change']">
				<ul>
					<li v-for="e in entriesMinor">
						<img v-if="e.i" :src="$image('icons/'+e.i+'.svg')" class="icon" />

						<Button v-if="e.a && e.a.param"
							:aria-label="e.a.a ?? ''" small
							:title="e.a.l"
							@click.stop="$emit('openParamItem', e.a!.param!)" />
							
						<Button v-if="e.a && e.a.page"
							:aria-label="e.a.a ?? ''" small
							:title="e.a.l"
							@click.stop="$emit('openParam', e.a!.page!)" />

						<span v-html="e.l"></span>
					</li>
				</ul>
			</ToggleBlock>
			<ToggleBlock class="block fix" :title="$t('changelog.fixes_title')" :open="false" :icons="['fix']">
				<ul>
					<li v-for="e in entriesFixes">
						<img v-if="e.i" :src="$image('icons/'+e.i+'.svg')" class="icon" />

						<Button v-if="e.a && e.a.param"
							:aria-label="e.a.a ?? ''" small
							:title="e.a.l"
							@click.stop="$emit('openParamItem', e.a!.param!)" />
							
						<Button v-if="e.a && e.a.page"
							:aria-label="e.a.a ?? ''" small
							:title="e.a.l"
							@click.stop="$emit('openParam', e.a!.page!)" />

						<span v-html="e.l"></span>
					</li>
				</ul>
			</ToggleBlock>
		</div>
		<div class="cta">
			<Button @click.stop="$emit('close')"
			:aria-label="$t('changelog.closeBt_aria')"
			:title="$t('changelog.closeBt')" />
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleBlock from '../ToggleBlock.vue';
import type { ChangelogEntry } from './ChatAd.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
	},
	emits:["openParamItem", "openParam", "close"]
})
export default class ChatChangelog extends Vue {

	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }

	public get entriesMajor():ChangelogEntry[] {
		return this.$tm("changelog.major") as ChangelogEntry[];
	}

	public get entriesMinor():ChangelogEntry[] {
		return this.$tm("changelog.minor") as ChangelogEntry[];
	}

	public get entriesFixes():ChangelogEntry[] {
		return this.$tm("changelog.fixes") as ChangelogEntry[];
	}

	public mounted(): void {
		//Make sure changelog entrues are valid.
		//Checks for all the button actions to make sure their values
		//are correct
		const changelogs:ChangelogEntry[][] = [
						this.$tm("changelog.major") as ChangelogEntry[],
						this.$tm("changelog.minor") as ChangelogEntry[],
						this.$tm("changelog.fix") as ChangelogEntry[],
					];
		const allowedTypes = Object.values(TwitchatDataTypes.ParamsCategories) as TwitchatDataTypes.ParamsContentStringType[];
		const sParams = this.$store("params");
		let allowedParams:string[] = [];
		allowedParams = allowedParams.concat(Object.keys(this.$store("params").features));
		allowedParams = allowedParams.concat(Object.keys(this.$store("params").appearance));
		changelogs.forEach(v=> {
			if(!Array.isArray(v))return;
			v.forEach(v=>{
				if(v.a && v.a.page && !allowedTypes.includes(v.a.page)) {
					this.$store("main").alert("Invalid parameter page \""+v.a.page+"\" for changelog entry \""+v.l+"\"");
				}
				if(v.a && v.a.param) {
					const chunks:string[] = v.a.param.split(".");
					//@ts-ignore
					if(!sParams[chunks[0]]?.[chunks[1]]) {
						this.$store("main").alert("Invalid parameter value \""+v.a.param+"\" for changelog entry \""+v.l+"\"");
					}
				}
			})
		})
	}

}
</script>

<style scoped lang="less">
.chatchangelog{
	.block {
		margin-bottom: .5em;
	}

	:deep(.header){
		color: @mainColor_light;
		background-color: @mainColor_normal;
		&:hover {
			background-color: lighten(@mainColor_normal, 5%);
		}

		.cmd {
			background-color: fade(@mainColor_normal, 15%);
			border-radius: .5em;
			padding: 0 .5em;
			font-family: 'Courier New', Courier, monospace;
		}
	}
	
	.new {
		:deep(.header){
			color: @mainColor_light;
			background-color: @mainColor_warn;
			border-bottom-color: darken(@mainColor_warn, 10%);
			&:hover {
				background-color: lighten(@mainColor_warn, 5%);
			}
		}
		:deep(.content){
			color: @mainColor_warn;
			background-color: fade(@mainColor_warn_extralight, 25%);
			.button {
				border-color: @mainColor_warn;
				color: @mainColor_warn !important;
				&:hover {
					background: fade(@mainColor_warn, 10%);
				}
			}
			.icon {
				background: @mainColor_warn;
			}

			.cmd {
				background-color: fade(@mainColor_warn, 15%);
			}
			mark {
				border: 1px dashed darken(@mainColor_warn_light, 10%);
				background-color: fade(@mainColor_warn_extralight, 50%);
			}
		}
	}
	.fix {
		:deep(.header){
			color: @mainColor_light;
			background-color: @mainColor_alert;
			border-bottom-color: darken(@mainColor_alert, 10%);
			&:hover {
				background-color: lighten(@mainColor_alert, 5%);
			}
		}
		:deep(.content){
			color: @mainColor_alert;
			background-color: lighten(@mainColor_alert_extralight, 5%);
			.button {
				border-color: @mainColor_alert;
				color: @mainColor_alert !important;
				&:hover {
					background: fade(@mainColor_alert, 10%);
				}
			}
			.icon {
				background: @mainColor_alert;
			}

			.cmd {
				background-color: fade(@mainColor_alert, 15%);
			}
		}
	}
	
	ul {
		text-align: left;
		margin-left: 2em;
		:deep(li) {
			&:not(:last-child) {
				margin-bottom:.5em;
			}

			.button {
				background: transparent;
				border: 1px solid @mainColor_normal;
				padding: .16em .3em;
				margin-right: .5em;
				color: @mainColor_normal !important;
				&:hover {
					background: fade(@mainColor_normal, 10%);
				}
			}
			.icon {
				border-radius: .5em;
				height: 2em;
				width: 2em;
				padding: .25em;
				display: inline;
				margin-right: .5em;
				vertical-align: bottom;
				background: @mainColor_normal;
			}
			ul {
				padding-left: 2.5em;
			}
		}
	}
}
</style>