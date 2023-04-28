<template>
	<div class="chatchangelog">
		
		<div class="version">{{ $t('changelog.version', {VERSION:appVersion}) }}</div>
		<!-- <div class="infos">Use <mark>/updates</mark> command to open this back</div> -->
		
		<div class="content">
			<ToggleBlock class="block new" :title="$t('changelog.major_title')" :open="false" :icons="['new']">
				<ul>
					<li v-for="e in entriesMajor">
						<img v-if="e.i" :src="$image('icons/'+e.i+'.svg')" class="icon" />

						<button v-if="e.a && e.a.param" class="testBt"
							:aria-label="e.a.a ?? ''" small
							@click.stop="openParamItem(e.a!.param!)">{{e.a.l}}</button>
							
						<button v-if="e.a && e.a.page" class="testBt"
							:aria-label="e.a.a ?? ''" small
							@click.stop="openParamPage(e.a!.page!)">{{e.a.l}}</button>

						<span v-html="e.l"></span>
					</li>
				</ul>
			</ToggleBlock>
			<ToggleBlock class="block other" :title="$t('changelog.minor_title')" :open="false" :icons="['change']">
				<ul>
					<li v-for="e in entriesMinor">
						<img v-if="e.i" :src="$image('icons/'+e.i+'.svg')" class="icon" />

						<button v-if="e.a && e.a.param" class="testBt"
							:aria-label="e.a.a ?? ''" small
							@click.stop="openParamItem(e.a!.param!)">{{e.a.l}}</button>
							
						<button v-if="e.a && e.a.page" class="testBt"
							:aria-label="e.a.a ?? ''" small
							@click.stop="openParamPage(e.a!.page!)">{{e.a.l}}</button>

						<span v-html="e.l"></span>
					</li>
				</ul>
			</ToggleBlock>
			<ToggleBlock class="block fix" :title="$t('changelog.fixes_title')" :open="false" :icons="['fix']">
				<ul>
					<li v-for="e in entriesFixes">
						<img v-if="e.i" :src="$image('icons/'+e.i+'.svg')" class="icon" />

						<button v-if="e.a && e.a.param" class="testBt"
							:aria-label="e.a.a ?? ''" small
							@click.stop="openParamItem(e.a!.param!)">{{e.a.l}}</button>
							
						<button v-if="e.a && e.a.page" class="testBt"
							:aria-label="e.a.a ?? ''" small
							@click.stop="openParamPage(e.a!.page!)">{{e.a.l}}</button>

						<span v-html="e.l"></span>
					</li>
				</ul>
			</ToggleBlock>
		</div>
		<div class="cta">
			<Button @click.stop="$emit('close')"
			:aria-label="$t('changelog.closeBt_aria')">{{ $t('changelog.closeBt') }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
	},
	emits:["close"]
})
export default class ChatChangelog extends Vue {

	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }

	public get entriesMajor():TwitchatDataTypes.ChangelogEntry[] {
		return this.$tm("changelog.major") as TwitchatDataTypes.ChangelogEntry[];
	}

	public get entriesMinor():TwitchatDataTypes.ChangelogEntry[] {
		return this.$tm("changelog.minor") as TwitchatDataTypes.ChangelogEntry[];
	}

	public get entriesFixes():TwitchatDataTypes.ChangelogEntry[] {
		return this.$tm("changelog.fixes") as TwitchatDataTypes.ChangelogEntry[];
	}

	public mounted(): void {
		//Make sure changelog entries are valid.
		//Checks for all the button actions to make sure their values
		//are correct
		const changelogs:TwitchatDataTypes.ChangelogEntry[][] = [
						this.$tm("changelog.major") as TwitchatDataTypes.ChangelogEntry[],
						this.$tm("changelog.minor") as TwitchatDataTypes.ChangelogEntry[],
						this.$tm("changelog.fix") as TwitchatDataTypes.ChangelogEntry[],
					];
		const allowedTypes = Object.values(TwitchatDataTypes.ParameterPages) as TwitchatDataTypes.ParameterPagesStringType[];
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

	public openParamItem(paramPath:string):void { this.$store("params").searchParamByPath(paramPath); }
	public openParamPage(page:TwitchatDataTypes.ParameterPagesStringType):void { this.$store("params").openParamsPage(page); }

}
</script>

<style scoped lang="less">
.chatchangelog{
	.block {
		margin-bottom: .5em;
	}

	.version {
		margin-bottom: .5em;
	}

	:deep(.header){
		color: var(--mainColor_light);
		background-color: var(--mainColor_normal);
		&:hover {
			background-color: lighten(@mainColor_normal, 5%);
		}

		.cmd {
			background-color: fade(@mainColor_normal, 15%);
			border-radius: .5em;
			padding: 0 .5em;
			font-family: 'Courier New', Courier, monospace;
		}
		
		h2 {
			padding-right: 1.5em;
		}
	}
	
	.new {
		:deep(.header){
			color: var(--mainColor_light);
			background-color: var(--mainColor_warn);
			border-bottom-color: darken(@mainColor_warn, 10%);
			&:hover {
				background-color: lighten(@mainColor_warn, 5%);
			}
		}
		:deep(.content){
			color: darken(@mainColor_warn, 5%);
			background-color: fade(@mainColor_warn_extralight, 25%);
			.testBt {
				border-color: var(--mainColor_warn);
				color: darken(@mainColor_warn, 5%) !important;
				&:hover {
					background: fade(@mainColor_warn, 10%);
				}
			}
			.icon {
				background: var(--mainColor_warn);
			}

			.cmd {
				background-color: fade(@mainColor_warn, 15%);
			}
			mark {
				border: 1px dashed darken(@mainColor_warn_light, 10%) !important;
				background-color: fade(@mainColor_warn_extralight, 25%) !important;
			}
		}
	}
	.fix {
		:deep(.header){
			color: var(--mainColor_light);
			background-color: var(--mainColor_alert);
			border-bottom-color: darken(@mainColor_alert, 10%);
			&:hover {
				background-color: lighten(@mainColor_alert, 5%);
			}
		}
		:deep(.content){
			color: var(--mainColor_alert);
			background-color: lighten(@mainColor_alert_extralight, 5%);
			.testBt {
				border-color: var(--mainColor_alert);
				color: var(--mainColor_alert) !important;
				&:hover {
					background: fade(@mainColor_alert, 10%);
				}
			}
			.icon {
				background: var(--mainColor_alert);
			}

			.cmd {
				background-color: fade(@mainColor_alert, 15%);
			}
			mark {
				border: 1px dashed darken(@mainColor_alert_light, 10%) !important;
				background-color: fade(@mainColor_alert_extralight, 25%) !important;
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

			.testBt {
				border-radius: .5em;
				background: transparent;
				border: 1px solid var(--mainColor_normal);
				padding: .16em .3em;
				margin-right: .5em;
				color: var(--mainColor_normal) !important;
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
				background: var(--mainColor_normal);
			}
			ul {
				padding-left: 2.5em;
			}
		}
	}
}
</style>