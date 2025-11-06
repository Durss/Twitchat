<template>
	<div :class="classes">
		<ParamItem :paramData="param_title" autofocus @change="$emit('update:title', param_title.value)" />

		<AutoCompleteForm class="card-item category"
		:title="$t('stream.form_stream_category')"
		:maxItems="1"
		:maxAutocompleteItems="50"
		@search="searchCategory" v-slot="{ item }"
		v-model="localCategories"
		idKey="id">
			<button class="autoComplete-item">
				<img class="icon" :src="item.box_art_url" alt="">
				<span class="label">{{ item.name }}</span>
			</button>
		</AutoCompleteForm>

		<ParamItem :paramData="param_tags"
			v-model="localTags"
			@change="onTagsUpdate()"
			v-show="param_tags.value!.length < 10" />

		<div class="tagList" v-if="param_tags.value!.length == 10">
			<div>{{ $t(param_tags.labelKey!) }}</div>
			<button type="button" class="tagItem" aria-label="delete tag"
			v-for="i in param_tags.value"
			@click="deleteTag(i)">
				<span>{{ i }}</span>
				<Icon name="cross" theme="primary" class="icon" />
			</button>
		</div>

		<ParamItem :paramData="param_branded" v-model="param_branded.value" @change="$emit('update:branded', param_branded.value)" />

		<div class="card-item labels">
			<div>{{ $t("stream.form_labels_title") }}</div>
			<Icon class="loader" name="loader" v-if="loadingLabels" />
			<ParamItem class="label" v-for="label in param_labels"
				noBackground
				v-model="label.value"
				:paramData="label"
				@change="onLabelsUpdate()" />
		</div>
	</div>
</template>

<script lang="ts">
import type { ITriggerPlaceholder } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import AutoCompleteForm from '../params/AutoCompleteForm.vue';
import ParamItem from '../params/ParamItem.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		Button: TTButton,
		ParamItem,
		AutoCompleteForm,
	},
	emits:["update:title", "update:tags", "update:category", "update:branded", "update:labels"]
})
class StreamInfoSubForm extends Vue {

	@Prop({type:String, default:""})
	public title!:string;

	@Prop({type:Object, default:[]})
	public tags!:string[];

	@Prop({ type:Object, default:{}})
	public category!:TwitchDataTypes.StreamCategory;

	@Prop({ type:Boolean, default:false})
	public branded!:boolean;

	@Prop({ type:Object, default:[]})
	public labels!:{id:string, enabled:boolean}[];

	@Prop({type:Boolean, default:false})
	public triggerMode!:boolean;

	//This is used by the trigger action form.
	@Prop({ type: Array, default:[]})
	public placeholderList!:ITriggerPlaceholder<any>[];

	public param_title:TwitchatDataTypes.ParameterData<string>	= {value:"", type:"string", maxLength:140, labelKey:"stream.form_stream_title", placeholderKey:"stream.form_stream_title_placeholder"};
	public param_tags:TwitchatDataTypes.ParameterData<string[]>	= {value:[], type:"editablelist", labelKey:"stream.form_stream_tags", max:10, maxLength:25};
	public param_branded:TwitchatDataTypes.ParameterData<boolean>	= {value:false, type:"boolean", labelKey:"stream.form_branded"};
	public param_labels:TwitchatDataTypes.ParameterData<boolean, unknown, unknown, string>[]	= [];

	public localTags:string[] = [];
	public localCategories:TwitchDataTypes.StreamCategory[] = [];
	public loadingLabels:boolean = false;

	public get classes():string[] {
		let res = ["streaminfosubform"];
		if(this.triggerMode !== false) res.push("embedMode")
		return res;
	}

	public beforeMount():void {

		watch(()=>this.title, ()=> { this.populate(); });
		watch(()=>this.tags, ()=> { this.populate(); });
		watch(()=>this.category, ()=> { this.populate(); });
		watch(()=>this.labels, ()=> { this.populate(); });
		watch(()=>this.branded, ()=> { this.populate(); });
		watch(()=>this.localCategories, ()=> {
			const value = this.localCategories.length > 0? this.localCategories[0] : null;
			this.$emit('update:category', value);
		});

		if(this.triggerMode !== false) {
			watch(()=>this.placeholderList, ()=> { this.populatePlaceholders(); });
			this.populatePlaceholders();
		}

		this.populate();
	}

	/**
	 * Search for a category
	 * @param search 
	 * @param callback 
	 */
	public async searchCategory(search:string, callback:(data:unknown[])=>{}):Promise<void> {
		callback( await TwitchUtils.searchCategory(search) );
	}

	/**
	 * Delete a tag.
	 * Used by the custom tags list once the maximum count is reached
	 * NOT called when deleting a tag from the <vue-select> instance
	 * @param t 
	 */
	public deleteTag(t:string):void {
		if(!this.param_tags.value) this.param_tags.value = [];
		this.param_tags.value = this.param_tags.value.filter(v=> v != t);
		this.localTags = this.param_tags.value;
		this.$emit('update:tags', this.localTags);
	}

	/**
	 * Called when a tag is added
	 */
	public onTagsUpdate():void {
		for (let i = 0; i < this.localTags.length; i++) {
			this.localTags[i] = this.sanitizeTag(this.localTags[i]);
		}
		console.log(">", this.localTags);
		this.$emit('update:tags', this.localTags.filter(v=>v.trim().length > 0))
	}

	/**
	 * Called when a label is un/selected
	 */
	public onLabelsUpdate():void {
		const labels:{id:string, enabled:boolean}[] = [];
		for (let i = 0; i < this.param_labels.length; i++) {
			labels.push( {id:this.param_labels[i].storage!, enabled:this.param_labels[i].value === true});
		}
		this.$emit('update:labels', labels);
	}

	/**
	 * Makes sure a tag is valid
	 */
	private sanitizeTag(value:string):string {
		return value.substring(0, 25);
		/*
		const allowedChars = "AＡÀÁÂẦẤẪẨÃĀĂẰẮẴẲȦǠÄǞẢÅǺǍȀȂẠẬẶḀĄȺⱯꜲÆǼǢꜴꜶꜸꜺꜼBＢḂḄḆɃƂƁCＣĆĈĊČÇḈƇȻꜾἒBDＤḊĎḌḐḒḎĐƋƊƉꝹÐǱǄǲǅEＥÈÉÊỀẾỄỂẼĒḔḖĔĖËẺĚȄȆẸỆȨḜĘḘḚƐƎFＦḞƑꝻGＧǴĜḠĞĠǦĢǤƓꞠꝽꝾHＨĤḢḦȞḤḨḪĦⱧⱵꞍIＩÌÍÎĨĪĬİÏḮỈǏȈȊỊĮḬƗJＪĴɈKＫḰǨḲĶḴƘⱩꝀꝂꝄꞢLＬĿĹĽḶḸĻḼḺŁȽⱢⱠꝈꝆꞀǇǈMＭḾṀṂⱮƜNＮǸŃÑṄŇṆŅṊṈȠƝꞐꞤǊǋOＯÒÓÔỒỐỖỔÕṌȬṎŌṐṒŎȮȰÖȪỎŐǑȌȎƠỜỚỠỞỢỌỘǪǬØǾƆƟꝊꝌƢꝎȢŒœPＰṔṖƤⱣꝐꝒꝔQＱꝖꝘɊRＲŔṘŘȐȒṚṜŖṞɌⱤꝚꞦꞂSＳẞŚṤŜṠŠṦṢṨȘŞⱾꞨꞄTＴṪŤṬȚŢṰṮŦƬƮȾꞆꜨUＵÙÚÛŨṸŪṺŬÜǛǗǕǙỦŮŰǓȔȖƯỪỨỮỬỰỤṲŲṶṴɄVＶṼṾƲꝞɅꝠWＷẀẂŴẆẄẈⱲXＸẊẌYＹỲÝŶỸȲẎŸỶỴƳɎỾZＺŹẐŻŽẒẔƵȤⱿⱫꝢaａẚàáâầấẫẩãāăằắẵẳȧǡäǟảåǻǎȁȃạậặḁąⱥɐꜳæǽǣꜵꜷꜹꜻꜽbｂḃḅḇƀƃɓcｃćĉċčçḉƈȼꜿↄdｄḋďḍḑḓḏđƌɖɗꝺǳǆeｅèéêềếễểẽēḕḗĕėëẻěȅȇẹệȩḝęḙḛɇɛǝfｆḟƒꝼgｇǵĝḡğġǧģǥɠꞡᵹꝿhｈĥḣḧȟḥḩḫẖħⱨⱶɥƕiｉìíîĩīĭïḯỉǐȉȋịįḭɨıjｊĵǰɉkｋḱǩḳķḵƙⱪꝁꝃꝅꞣlｌŀĺľḷḹļḽḻſłƚɫⱡꝉꞁꝇǉmｍḿṁṃɱɯnｎǹńñṅňṇņṋṉƞɲŉꞑꞥǌoｏòóôồốỗổõṍȭṏōṑṓŏȯȱöȫỏőǒȍȏơờớỡởợọộǫǭøǿɔꝋꝍɵƣȣꝏpｐṕṗƥᵽꝑꝓꝕqｑɋꝗꝙrｒŕṙřȑȓṛṝŗṟɍɽꝛꞧꞃsｓßśṥŝṡšṧṣṩșşȿꞩꞅẛtｔṫẗťṭțţṱṯŧƭʈⱦꞇꜩuｕùúûũṹūṻŭüǜǘǖǚủůűǔȕȗưừứữửựụṳųṷṵʉvｖṽṿʋꝟʌꝡwｗẁẃŵẇẅẘẉⱳxｘẋẍyｙỳýŷỹȳẏÿỷẙỵƴɏỿzｚźẑżžẓẕƶȥɀⱬꝣ";
		if(this.triggerMode !== false) {
			//Allow curly brackets and underscores so we can use placeholders as tags
			return value.replace(new RegExp("[^"+allowedChars+"{}_]", "g"), "").substring(0, 25);
		}
		return value.replace(new RegExp("[^"+allowedChars+"-]", "g"), "").substring(0, 25);
		*/
	}

	private async populate():Promise<void> {
		if(this.loadingLabels) return;

		this.param_title.value	= this.param_title.value = this.title;
		this.param_branded.value= this.branded === true;
		this.localTags			= this.param_tags.value = this.tags;
		this.localCategories 	= this.category? [this.category] : [];
		const labels	 		= this.labels? this.labels : [];

		if(this.param_labels.length === 0) {
			this.loadingLabels = true;
			//Load classification labels from Twitch
			const res = await TwitchUtils.getContentClassificationLabels();
			for (let i = 0; i < res.length; i++) {
				const label = res[i];
				//This label is automatically set from game selection, no need to make it selectable
				if(label.id == "MatureGame") continue;
				this.param_labels.push({value:false, type:"boolean", storage:label.id, label:label.name, tooltip:label.description})
			}
		}

		//Set classification label states
		for (let i = 0; i < this.param_labels.length; i++) {
			if(labels.find(v=>v.id === this.param_labels[i].storage!)?.enabled === true) {
				this.param_labels[i].value = true;
			}
		}

		this.loadingLabels = false;
	}

	private populatePlaceholders():void {
		this.param_tags.placeholderList = this.placeholderList;
		this.param_title.placeholderList = this.placeholderList;
	}

}
export default toNative(StreamInfoSubForm);
</script>

<style scoped lang="less">
.streaminfosubform{
	gap: .5em;
	display: flex;
	flex-direction: column;

	:deep(.autocomplete) {
		gap: .5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		.autoComplete-item {
			font-size: .8em;
			.icon {
				height: 30px;
			}
		}
	}

	.autoComplete-item {
		padding: 0;
		gap: .5em;
		margin: auto;
		display: flex;
		overflow: hidden;
		align-items: center;
		flex-direction: row;
		border-radius: var(--border-radius);
		background-color: var(--color-secondary);
		.label {
			padding: .5em;
			color: var(--color-light);
			white-space: break-spaces;
		}
		.icon {
			height: 60px;
		}

		&:hover {
			&:after {
				width: 1.25em;
				height: 1.25em;
			}
		}
	
		&:after {
			content: "";
			background-image: url("../../assets/icons/trash.svg");
			width: 1em;
			height: 1em;
			margin-right: .5em;
			background-repeat: no-repeat;
			background-position: center;
			transition: .25s all;
			background-size: contain;
		}
	}

	&.embedMode {
		gap: .25em;
	}

	.tagList {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 5px;
		align-items: center;
		.tagItem {
			display: inline;
			background-color: rgb(240, 240, 240);
			color: var(--color-primary);
			font-size: 1em;
			padding: .25em;
			border-radius: 4px;
			transition: all .25s;

			.icon {
				height: .7em;
				margin-left: .25em;
			}
			&:hover {
				background: var(--color-light-dark);
			}
		}
	}

	.labels {
		gap: .5em;
		display: flex;
		flex-direction: column;
		.label {
			margin-left: 1em;
		}

		.loader {
			margin: auto;
		}
	}
}
</style>