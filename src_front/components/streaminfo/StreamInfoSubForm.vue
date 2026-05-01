<template>
	<div :class="classes">
		<ParamItem
			:paramData="param_title"
			autofocus
			@change="$emit('update:title', param_title.value)"
		/>

		<AutoCompleteForm
			class="card-item category"
			:title="t('stream.form_stream_category')"
			:maxItems="1"
			:maxAutocompleteItems="50"
			@search="searchCategory"
			v-slot="{ item }"
			v-model="localCategories"
			idKey="id"
		>
			<button class="autoComplete-item">
				<img class="icon" :src="item.box_art_url" alt="" />
				<span class="label">{{ item.name }}</span>
			</button>
		</AutoCompleteForm>

		<ParamItem
			:paramData="param_tags"
			v-model="localTags"
			@change="onTagsUpdate()"
			v-show="param_tags.value!.length < 10"
		/>

		<div class="tagList" v-if="param_tags.value!.length == 10">
			<div>{{ t(param_tags.labelKey!) }}</div>
			<button
				type="button"
				class="tagItem"
				aria-label="delete tag"
				v-for="i in param_tags.value"
				@click="deleteTag(i)"
			>
				<span>{{ i }}</span>
				<Icon name="cross" theme="primary" class="icon" />
			</button>
		</div>

		<ParamItem
			:paramData="param_branded"
			v-model="param_branded.value"
			@change="$emit('update:branded', param_branded.value)"
		/>

		<div class="card-item labels">
			<div>{{ t("stream.form_labels_title") }}</div>
			<Icon class="loader" name="loader" v-if="loadingLabels" />
			<ParamItem
				class="label"
				v-for="label in param_labels"
				noBackground
				v-model="label.value"
				:paramData="label"
				@change="onLabelsUpdate()"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ITriggerPlaceholder } from "@/types/TriggerActionDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import AutoCompleteForm from "../params/AutoCompleteForm.vue";
import ParamItem from "../params/ParamItem.vue";
import Icon from "../Icon.vue";

const { t } = useI18n();

const props = withDefaults(
	defineProps<{
		title?: string;
		tags?: string[];
		category?: TwitchDataTypes.StreamCategory | null;
		branded?: boolean;
		labels?: { id: string; enabled: boolean }[];
		triggerMode?: boolean;
		//This is used by the trigger action form.
		placeholderList?: ITriggerPlaceholder<any>[];
	}>(),
	{
		title: "",
		tags: () => [],
		branded: false,
		labels: () => [],
		triggerMode: false,
		placeholderList: () => [],
	},
);

const emit = defineEmits<{
	"update:title": [value: string];
	"update:tags": [value: string[]];
	"update:category": [value: TwitchDataTypes.StreamCategory | null];
	"update:branded": [value: boolean];
	"update:labels": [value: { id: string; enabled: boolean }[]];
}>();

const param_title = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	maxLength: 140,
	labelKey: "stream.form_stream_title",
	placeholderKey: "stream.form_stream_title_placeholder",
});
const param_tags = ref<TwitchatDataTypes.ParameterData<string[]>>({
	value: [],
	type: "editablelist",
	labelKey: "stream.form_stream_tags",
	max: 10,
	maxLength: 25,
});
const param_branded = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "stream.form_branded",
});
const param_labels = ref<TwitchatDataTypes.ParameterData<boolean, unknown, unknown, string>[]>([]);

const localTags = ref<string[]>([]);
const localCategories = ref<TwitchDataTypes.StreamCategory[]>([]);
const loadingLabels = ref<boolean>(false);

const classes = computed((): string[] => {
	let res = ["streaminfosubform"];
	if (props.triggerMode !== false) res.push("embedMode");
	return res;
});

watch(
	() => props.title,
	() => {
		populate();
	},
);
watch(
	() => props.tags,
	() => {
		populate();
	},
);
watch(
	() => props.category,
	() => {
		populate();
	},
);
watch(
	() => props.labels,
	() => {
		populate();
	},
);
watch(
	() => props.branded,
	() => {
		populate();
	},
);
watch(localCategories, () => {
	const value = localCategories.value.length > 0 ? localCategories.value[0]! : null;
	emit("update:category", value);
});

if (props.triggerMode !== false) {
	watch(
		() => props.placeholderList,
		() => {
			populatePlaceholders();
		},
	);
	populatePlaceholders();
}

populate();

/**
 * Search for a category
 * @param search
 * @param callback
 */
async function searchCategory(search: string, callback: (data: unknown[]) => {}): Promise<void> {
	callback(await TwitchUtils.searchCategory(search));
}

/**
 * Delete a tag.
 * Used by the custom tags list once the maximum count is reached
 * NOT called when deleting a tag from the <vue-select> instance
 * @param tag
 */
function deleteTag(tag: string): void {
	if (!param_tags.value.value) param_tags.value.value = [];
	param_tags.value.value = param_tags.value.value.filter((v) => v != tag);
	localTags.value = param_tags.value.value;
	emit("update:tags", localTags.value);
}

/**
 * Called when a tag is added
 */
function onTagsUpdate(): void {
	for (let i = 0; i < localTags.value.length; i++) {
		localTags.value[i] = sanitizeTag(localTags.value[i]!);
	}
	console.log(">", localTags.value);
	emit(
		"update:tags",
		localTags.value.filter((v) => v.trim().length > 0),
	);
}

/**
 * Called when a label is un/selected
 */
function onLabelsUpdate(): void {
	const labels: { id: string; enabled: boolean }[] = [];
	for (let i = 0; i < param_labels.value.length; i++) {
		labels.push({
			id: param_labels.value[i]!.storage!,
			enabled: param_labels.value[i]!.value === true,
		});
	}
	emit("update:labels", labels);
}

/**
 * Makes sure a tag is valid
 */
function sanitizeTag(value: string): string {
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

async function populate(): Promise<void> {
	if (loadingLabels.value) return;

	param_title.value.value = param_title.value.value = props.title;
	param_branded.value.value = props.branded === true;
	const newTags = props.tags ?? [];
	const tagsSame =
		localTags.value.length === newTags.length &&
		localTags.value.every((t, i) => t === newTags[i]);
	if (!tagsSame) {
		localTags.value = param_tags.value.value = newTags;
	}
	localCategories.value = props.category ? [props.category] : [];
	const labels = props.labels ? props.labels : [];

	if (param_labels.value.length === 0) {
		loadingLabels.value = true;
		//Load classification labels from Twitch
		const res = await TwitchUtils.getContentClassificationLabels();
		for (const label of res) {
			//This label is automatically set from game selection, no need to make it selectable
			if (label.id == "MatureGame") continue;
			param_labels.value.push({
				value: false,
				type: "boolean",
				storage: label.id,
				label: label.name,
				tooltip: label.description,
			});
		}
	}

	//Set classification label states
	for (const label of param_labels.value) {
		if (labels.find((v) => v.id === label.storage!)?.enabled === true) {
			label.value = true;
		}
	}

	loadingLabels.value = false;
}

function populatePlaceholders(): void {
	param_tags.value.placeholderList = props.placeholderList;
	param_title.value.placeholderList = props.placeholderList;
}
</script>

<style scoped lang="less">
.streaminfosubform {
	gap: 0.5em;
	display: flex;
	flex-direction: column;

	:deep(.autocomplete) {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		.autoComplete-item {
			font-size: 0.8em;
			.icon {
				height: 30px;
			}
		}
	}

	.autoComplete-item {
		padding: 0;
		gap: 0.5em;
		margin: auto;
		display: flex;
		overflow: hidden;
		align-items: center;
		flex-direction: row;
		border-radius: var(--border-radius);
		background-color: var(--color-secondary);
		.label {
			padding: 0.5em;
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
			margin-right: 0.5em;
			background-repeat: no-repeat;
			background-position: center;
			transition: 0.25s all;
			background-size: contain;
		}
	}

	&.embedMode {
		gap: 0.25em;
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
			padding: 0.25em;
			border-radius: 4px;
			transition: all 0.25s;

			.icon {
				height: 0.7em;
				margin-left: 0.25em;
			}
			&:hover {
				background: var(--color-light-dark);
			}
		}
	}

	.labels {
		gap: 0.5em;
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
