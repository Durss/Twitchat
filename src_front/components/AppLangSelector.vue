<template>
	<form class="applangselector">
		<div class="row" v-for="lang in enabledLocales" @click.ctrl.stop.prevent="onCtrlClick(lang)">
			<input type="radio" name="language" :id="'lang_'+lang" :value="lang" v-model="$i18n.locale">
			<label :for="'lang_'+lang">
				<CountryFlag :country="$t('global.lang_flag', lang)" class="flag" /><span class="text">{{ $t('global.lang_label', lang)}}</span>
				<Icon name="highlight" v-if="showRef !== false && langRef == lang" v-tooltip="'CTRL+click a language\nto make it the reference'" />
			</label>
		</div>
	</form>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import CountryFlag from 'vue-country-flag-next';
import StoreProxy from '@/store/StoreProxy';
import Icon from './Icon.vue';

@Component({
	components:{
		Icon,
		CountryFlag,
	},
	emits:["update:langRef"],
})
class AppLangSelector extends Vue {

	@Prop({default:false, type:Boolean})
	public allLocales!:boolean;

	@Prop({default:"en", type:String})
	public langRef!:string;

	@Prop({default:false, type:Boolean})
	public showRef!:boolean;

	public get enabledLocales():string[] {
		if(this.allLocales !== false) return this.$i18n.availableLocales;

		return this.$i18n.availableLocales.filter(v=> {
			let root:any = StoreProxy.i18n.getLocaleMessage(v);
			if(!root.global) return false;
			return root.global.lang_enabled;
		})
	}

	public mounted():void {
		watch(()=>this.$i18n.locale, ()=> {
			DataStore.set(DataStore.LANGUAGE, this.$i18n.locale);
		});
	}

	public onCtrlClick(lang:string):void {
		this.$emit("update:langRef", lang);
	}

}
export default toNative(AppLangSelector);
</script>

<style scoped lang="less">
.applangselector{
	display: flex;
	flex-direction: column;
	gap: .5em;
	width: 200px;
	.row {
		display: flex;
		position: relative;
		justify-content: center;
		flex-wrap: wrap;
		align-items: flex-start;

		.icon {
			height: 1em;
			vertical-align: top;
			margin-left: .5em;
		}

		.reference {
			width: 100%;
			font-size: .8;
			text-align: center;
			font-family: "Inter";
			transform: scaleX(1.5);
		}

		label {
			text-align: center;
			flex-grow: 1;
			padding: .5em;
			border-radius: var(--border-radius);
			margin: 0;
			color:var(--color-light);
			cursor: pointer;
			border-bottom: 1px solid rgba(0, 0, 0, .25);
			border-right: 1px solid rgba(0, 0, 0, .25);
			border-left: 1px solid rgba(0, 0, 0, .25);
			background-color: var(--color-primary);
			&::before{
				content: "◌";
				position: absolute;
				left: .5em;
			}
			.text {
				margin-left: .5em;
			}
		}
		input{
			top:0;
			left:0;
			opacity: 0;
			position: absolute;
		}
		input[type="radio"]:checked+label {
			font-weight: bold;
			background-color: var(--color-secondary);
			&::before{
				content: "●";
			}
		}
		.flag {
			margin-left: 0 !important;
		}
	}
}
</style>
