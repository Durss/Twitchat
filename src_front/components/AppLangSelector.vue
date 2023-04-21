<template>
	<form class="applangselector">
		<div class="row">
			<input type="radio" name="language" id="lang_fr" value="fr" v-model="$i18n.locale">
			<label for="lang_fr">
				<CountryFlag iso="fr" mode="squared" class="flag" />Français
			</label>
		</div>
		<div class="row">
			<input type="radio" name="language" id="lang_en" value="en" v-model="$i18n.locale">
			<label for="lang_en">
				<CountryFlag iso="us" mode="squared" class="flag" />English
			</label>
		</div>
	</form>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import CountryFlag from 'vue3-country-flag-icon';
import 'vue3-country-flag-icon/dist/CountryFlag.css';

@Component({
	components:{
		CountryFlag,
	}
})
export default class AppLangSelector extends Vue {

	public mounted():void {
		watch(()=>this.$i18n.locale, ()=> {
			DataStore.set(DataStore.LANGUAGE, this.$i18n.locale);
		});
	}

}
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
		
		label {
			text-align: center;
			flex-grow: 1;
			padding: .5em;
			border-radius: var(--border-radius);
			margin: 0;
			color:var(--mainColor_normal);
			cursor: pointer;
			border-bottom: 1px solid rgba(0, 0, 0, .25);
			border-right: 1px solid rgba(0, 0, 0, .25);
			border-left: 1px solid rgba(0, 0, 0, .25);
			background-color: fade(#000000, 5%);
			&::before{
				content: "◌";
				position: absolute;
				left: .5em;
			}
			.flag {
				margin-right: .5em;
				transform: scaleX(1.25);
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
			background-color: var(--mainColor_light);
			color:var(--mainColor_normal);
			&::before{
				content: "●";
			}
		}
	}
}
</style>