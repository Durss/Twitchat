<template>
	<div class="messagetranslation quote primary" v-if="messageData.translation">
		<!-- <CountryFlag v-if="messageData.translation.flagISO" :country="messageData.translation.flagISO" class="flag" v-tooltip="messageData.translation.languageName" /> -->
		<Icon name="translate" class="flagIcon" v-tooltip="$t('global.translation')" />
		<span class="text">{{ messageData.translation.translation }}</span>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import CountryFlag from 'vue-country-flag-next';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		CountryFlag,
	},
	emits:[],
})
class MessageTranslation extends Vue {

	@Prop
	public messageData!:TwitchatDataTypes.TranslatableMessage;

	private supportedCodes:string[] = ["aa","ab","af","ak","al","dz","as","ad","ao","ai","aq","ag","ar","am","aw","au","at","az","bs","bh","bd","bb","by","be","bz","bj","bm","bt","bo","bq","ba","bw","bv","br","vg","io","bn","bg","bf","bi","kh","cm","ca","cv","ky","cf","td","cl","cn","hk","mo","cx","cc","co","km","cg","cd","ck","cr","ci","hr","cu","cw","cy","cz","dk","dj","dm","do","ec","eg","sv","gq","er","ee","et","fk","fo","fj","fi","fr","gf","pf","tf","ga","gm","ge","de","gh","gi","gr","gl","gd","gp","gu","gt","gg","gn","gw","gy","ht","hm","va","hn","hu","is","in","id","ir","iq","ie","im","il","it","jm","jp","je","jo","kz","ke","ki","kp","kr","kw","kg","la","lv","lb","ls","lr","ly","li","lt","lu","mk","mg","mw","my","mv","ml","mt","mh","mq","mr","mu","yt","mx","fm","md","mc","mn","me","ms","ma","mz","mm","na","nr","np","nl","nc","nz","ni","ne","ng","nu","nf","mp","no","om","pk","pw","ps","pa","pg","py","pe","ph","pn","pl","pt","pr","qa","re","ro","ru","rw","bl","sh","kn","lc","mf","pm","vc","ws","sm","st","sa","sn","rs","sc","sl","sg","sx","sk","si","sb","so","za","gs","ss","su","es","lk","sd","sr","sj","sz","se","ch","sy","tw","tj","tz","th","tl","tg","tk","to","tt","tn","tr","tm","tc","tv","ug","ua","ae","gb","us","um","uy","uz","vu","ve","vn","vi","wf","eh","ye","zm","zw"];

	public get iso():string {
		const iso = this.messageData.translation!.languageCode;
		if(iso == "en") return "us";
		if(!this.supportedCodes.includes(iso)) return "";
		return iso;
	}
}
export default toNative(MessageTranslation);
</script>

<style scoped lang="less">
.messagetranslation{
	font-size: 1em;
	margin-top: .25em;
	.flagIcon {
		margin-right: .5em;
		height: 1.2em;
	}
}
</style>