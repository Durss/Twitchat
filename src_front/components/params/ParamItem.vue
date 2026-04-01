<template>
	<div
		ref="rootEl"
		:class="classes"
		:data-type="paramData.type"
		@mouseenter="emit('mouseenter', $event, paramData)"
		@mouseleave="emit('mouseleave', $event, paramData)"
		@click="clickItem($event)"
	>
		<div class="content">
			<Icon :theme="paramData.iconTheme" :name="icon" v-if="icon" class="paramIcon" />
			<img :src="paramData.iconURL" v-if="paramData.iconURL" class="paramIcon" />

			<div v-if="paramData.type == 'custom'" class="holder custom">
				<label
					:for="'custom' + key"
					v-if="label"
					v-html="label"
					v-tooltip="{ content: tooltip, followCursor: 'horizontal' }"
				></label>
				<div><slot name="custom" :id="'custom' + key"></slot></div>
			</div>

			<div
				v-if="paramData.type == 'boolean'"
				class="holder toggle"
				:aria-label="label + ': ' + (paramData.value ? 'anabled' : 'disabled')"
			>
				<Icon
					theme="secondary"
					class="helpIcon"
					name="help"
					v-if="paramData.example"
					v-tooltip="{
						content:
							'<img src=' + getAsset('img/param_examples/' + paramData.example) + '>',
						maxWidth: 'none',
					}"
				/>

				<label
					:for="'toggle' + key"
					v-if="label"
					v-html="label"
					v-tooltip="{ content: tooltip, followCursor: 'horizontal' }"
				></label>

				<ToggleButton
					v-if="!paramData.noInput"
					class="ToggleButton.vue"
					v-model="paramData.value as boolean"
					:secondary="secondary"
					:premium="premiumOnlyLocal"
					:alert="alert || errorLocal"
					:inputId="'toggle' + key"
					:disabled="disabled !== false || paramData.disabled === true"
				/>
				<slot name="composite" />
			</div>

			<div
				v-if="paramData.type == 'number' || paramData.type == 'integer'"
				class="holder number"
			>
				<Icon
					theme="secondary"
					class="helpIcon"
					name="help"
					v-if="paramData.example"
					v-tooltip="{
						content:
							'<img src=' + getAsset('img/param_examples/' + paramData.example) + '>',
						maxWidth: 'none',
					}"
				/>

				<label
					:for="paramData.type + key"
					v-if="label"
					v-html="label"
					v-tooltip="tooltip"
				></label>

				<TTButton
					v-if="typeof paramData.value == 'string'"
					@click="
						paramData.value = 0;
						clampValue();
					"
					icon="trash"
					secondary
					>{{ paramData.value }}</TTButton
				>

				<input
					v-else-if="!paramData.noInput"
					ref="input"
					:tabindex="tabindex"
					type="number"
					v-model.number="paramData.value"
					v-autofocus="autofocus"
					:id="paramData.type + key"
					:min="paramData.min"
					:max="paramData.max"
					:step="paramData.step"
					:disabled="premiumLocked || disabled !== false || paramData.disabled === true"
					@focus="emit('focus')"
					@blur="
						clampValue();
						emit('blur');
					"
					@input="emit('input')"
				/>
				<slot name="composite" />
			</div>

			<div
				v-if="
					paramData.type == 'string' ||
					paramData.type == 'password' ||
					paramData.type == 'date' ||
					paramData.type == 'datetime' ||
					paramData.type == 'time'
				"
				:class="{ holder: true, text: true, time: paramData.type == 'time' }"
			>
				<Icon
					theme="secondary"
					class="helpIcon"
					name="help"
					v-if="paramData.example"
					v-tooltip="{
						content:
							'<img src=' + getAsset('img/param_examples/' + paramData.example) + '>',
						maxWidth: 'none',
					}"
				/>

				<label :for="'text' + key" v-if="label" v-html="label" v-tooltip="tooltip"></label>
				<div class="inputHolder" :class="{ privateField: paramData.isPrivate }">
					<Icon
						v-if="paramData.isPrivate"
						name="spoiler"
						class="privateIcon"
						v-tooltip="t('global.private_field')"
					/>
					<textarea
						ref="input"
						v-if="longText && !paramData.noInput"
						:tabindex="tabindex"
						v-model="textValue"
						rows="3"
						:id="'text' + key"
						:name="paramData.fieldName"
						:placeholder="placeholder"
						v-autofocus="autofocusLocal"
						:maxlength="paramData.maxLength ? paramData.maxLength : 524288"
						:disabled="
							premiumLocked || disabled !== false || paramData.disabled === true
						"
						@focus="emit('focus')"
						@blur="emit('blur')"
						@input="emit('input')"
					></textarea>

					<input
						ref="input"
						v-else-if="!paramData.noInput"
						:tabindex="tabindex"
						v-model="textValue"
						v-autofocus="autofocusLocal"
						:name="paramData.fieldName"
						:id="'text' + key"
						:type="paramData.type == 'datetime' ? 'datetime-local' : paramData.type"
						:step="paramData.type == 'time' ? 1 : undefined"
						:placeholder="placeholder"
						:maxlength="paramData.maxLength ? paramData.maxLength : 524288"
						:disabled="
							premiumLocked || disabled !== false || paramData.disabled === true
						"
						:autocomplete="paramData.type == 'password' ? 'off' : 'new-password'"
						@focus="emit('focus')"
						@blur="
							clampValue();
							emit('blur');
						"
						@input="emit('input')"
					/>

					<div class="maxlength" v-if="showMaxLength">
						{{ (paramData.value as string).length }}/{{ paramData.maxLength }}
					</div>
				</div>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'duration'" class="holder text duration">
				<Icon
					theme="secondary"
					class="helpIcon"
					name="help"
					v-if="paramData.example"
					v-tooltip="{
						content:
							'<img src=' + getAsset('img/param_examples/' + paramData.example) + '>',
						maxWidth: 'none',
					}"
				/>

				<label :for="'text' + key" v-if="label" v-html="label" v-tooltip="tooltip"></label>
				<DurationForm
					ref="input"
					v-if="!paramData.noInput"
					:id="'duration' + key"
					v-model="paramData.value as number"
					:allowMs="paramData.allowMs"
					:autofocus="autofocus"
					:tabindex="tabindex"
					:name="paramData.fieldName"
					:max="paramData.max"
					:min="paramData.min"
					:disabled="premiumLocked || disabled !== false || paramData.disabled === true"
					@change="emit('input')"
				/>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'color'" class="holder color">
				<Icon
					theme="secondary"
					class="helpIcon"
					name="help"
					v-if="paramData.example"
					v-tooltip="{
						content:
							'<img src=' + getAsset('img/param_examples/' + paramData.example) + '>',
						maxWidth: 'none',
					}"
				/>

				<label :for="'text' + key" v-if="label" v-html="label" v-tooltip="tooltip"></label>
				<div
					class="inputHolder input-field"
					:style="{ backgroundColor: paramData.value as string }"
				>
					<input
						ref="input"
						v-if="!paramData.noInput"
						:tabindex="tabindex"
						v-model="textValue"
						v-autofocus="autofocus"
						:disabled="
							premiumLocked || disabled !== false || paramData.disabled === true
						"
						:name="paramData.fieldName"
						:id="'text' + key"
						type="color"
					/>
				</div>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'slider'" class="holder slider">
				<Icon
					theme="secondary"
					class="helpIcon"
					name="help"
					v-if="paramData.example"
					v-tooltip="{
						content:
							'<img src=' + getAsset('img/param_examples/' + paramData.example) + '>',
						maxWidth: 'none',
					}"
				/>

				<label v-html="label" v-tooltip="tooltip"></label>
				<Slider
					:min="paramData.min"
					:max="paramData.max"
					:step="paramData.step"
					v-model="paramData.value as number"
					:secondary="secondary"
					:premium="premiumOnlyLocal"
					:disabled="premiumLocked || disabled !== false || paramData.disabled === true"
					:alert="alert || errorLocal"
				/>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'list' && paramData.multiple !== true" class="holder list">
				<Icon
					theme="secondary"
					class="helpIcon"
					name="help"
					v-if="paramData.example"
					v-tooltip="{
						content:
							'<img src=' + getAsset('img/param_examples/' + paramData.example) + '>',
						maxWidth: 'none',
					}"
				/>

				<label :for="'list' + key" v-html="label" v-tooltip="tooltip"></label>
				<select
					v-if="!paramData.noInput"
					ref="input"
					:id="'list' + key"
					v-model="paramData.value"
					v-autofocus="autofocus"
				>
					<template v-for="a in paramData.listValues" :key="a.value">
						<component
							:is="a.group ? 'optgroup' : 'option'"
							:disabled="a.disabled === true"
							:value="a.group ? null : a.value"
							:label="a.label != undefined ? a.label : t(a.labelKey!)"
						>
							<option
								v-for="b in a.group!"
								:value="b.value"
								:disabled="b.disabled === true"
							>
								<CountryFlag v-if="a.flag" :country="a.flag" size="small" />
								{{ b.label != undefined ? b.label : t(b.labelKey!) }}
							</option>
						</component>
					</template>
				</select>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'list' && paramData.multiple === true" class="holder list">
				<Icon
					theme="secondary"
					class="helpIcon"
					name="help"
					v-if="paramData.example"
					v-tooltip="{
						content:
							'<img src=' + getAsset('img/param_examples/' + paramData.example) + '>',
						maxWidth: 'none',
					}"
				/>

				<label :for="'editablelist' + key" v-html="label" v-tooltip="tooltip"></label>
				<vue-select
					class="listField"
					label="label"
					ref="vueSelect"
					:id="'editablelist' + key"
					:placeholder="placeholder"
					v-model="paramData.value"
					:calculate-position="placeDropdown"
					@option:selected="onEdit()"
					appendToBody
					:options="paramData.listValues"
					:submitSearchOnBlur="true"
					:multiple="true"
					:selectable="
						() => ((paramData.value as unknown[]) || []).length < (paramData.max || 999)
					"
					:reduce="(v: TwitchatDataTypes.ParameterDataListValue<unknown>) => v.value"
				>
					<template #no-options="{ search, searching, loading }">
						<div>{{ t("global.empty_list1") }}</div>
						<div>{{ t("global.empty_list2") }}</div>
					</template>

					<template
						v-slot:option="option: TwitchatDataTypes.ParameterDataListValue<unknown>"
					>
						<CountryFlag v-if="option.flag" :country="option.flag" size="small" />
						<span class="text">{{ option.label }}</span>
					</template>

					<template
						#selected-option="option: TwitchatDataTypes.ParameterDataListValue<unknown>"
					>
						<CountryFlag v-if="option.flag" :country="option.flag" size="small" />
						<span class="text">{{ option.label }}</span>
					</template>
				</vue-select>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'imagelist'" class="holder list">
				<Icon
					theme="secondary"
					class="helpIcon"
					name="help"
					v-if="paramData.example"
					v-tooltip="{
						content:
							'<img src=' + getAsset('img/param_examples/' + paramData.example) + '>',
						maxWidth: 'none',
					}"
				/>

				<label :for="'imagelist' + key" v-html="label" v-tooltip="tooltip"></label>
				<vue-select
					class="listField"
					label="label"
					ref="vueSelect"
					:id="'imagelist' + key"
					:placeholder="placeholder"
					v-model="paramData.value"
					:reduce="(v: TwitchatDataTypes.ParameterDataListValue<unknown>) => v.value"
					:calculate-position="placeDropdown"
					@option:selected="onEdit()"
					appendToBody
					:submitSearchOnBlur="true"
					:options="paramData.listValues"
				>
					<template
						v-slot:option="option: TwitchatDataTypes.ParameterDataListValue<unknown>"
					>
						<Icon class="image" v-if="option.icon" :name="option.icon" />
						<img class="image" v-else-if="option.image" :src="option.image" />
						<div class="image" v-else>
							{{ option.label != undefined ? option.label : t(option.labelKey!) }}
						</div>
					</template>

					<template
						#selected-option="option: TwitchatDataTypes.ParameterDataListValue<unknown>"
					>
						<Icon class="image" v-if="option.icon" :name="option.icon" />
						<img class="image" v-else-if="option.image" :src="option.image" />
						<div class="image" v-else>
							{{ option.label != undefined ? option.label : t(option.labelKey!) }}
						</div>
					</template>
				</vue-select>
				<slot name="composite" />
			</div>

			<div
				v-if="paramData.type == 'editablelist' || paramData.type == 'font'"
				class="holder list editable"
			>
				<Icon
					theme="secondary"
					class="helpIcon"
					name="help"
					v-if="paramData.example"
					v-tooltip="{
						content:
							'<img src=' + getAsset('img/param_examples/' + paramData.example) + '>',
						maxWidth: 'none',
					}"
				/>

				<label :for="'editablelist' + key" v-html="label" v-tooltip="tooltip"></label>

				<div class="listField">
					<vue-select
						class="listField"
						label="label"
						ref="vueSelect"
						:id="'editablelist' + key"
						:placeholder="placeholder"
						v-model="paramData.value"
						:calculate-position="placeDropdown"
						appendToBody
						taggable
						v-if="
							(paramData.type == 'font' && paramData.options) ||
							paramData.type != 'font'
						"
						:submitSearchOnBlur="true"
						:multiple="paramData.options === undefined"
						:noDrop="paramData.options === undefined"
						:push-tags="paramData.options != undefined"
						:options="paramData.options"
					>
						<template #no-options="{ search, searching, loading }">
							<div>{{ t("global.empty_list1") }}</div>
							<div>{{ t("global.empty_list2") }}</div>
						</template>
					</vue-select>
				</div>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'browse'" class="holder browse">
				<Icon
					theme="secondary"
					class="helpIcon"
					name="help"
					v-if="paramData.example"
					v-tooltip="{
						content:
							'<img src=' + getAsset('img/param_examples/' + paramData.example) + '>',
						maxWidth: 'none',
					}"
				/>

				<label
					:for="'browse' + key"
					v-if="label"
					v-tooltip="tooltip"
					v-html="label"
				></label>
				<input
					v-if="!paramData.noInput"
					type="text"
					class="filePath"
					v-model="paramData.value"
					:name="paramData.fieldName"
					:id="'browse' + key"
					:placeholder="placeholder"
					:disabled="premiumLocked || disabled !== false || paramData.disabled === true"
				/>
				<TTButton
					v-model:file="paramData.value as string"
					class="browseBt"
					type="file"
					:secondary="secondary"
					:premium="premium"
					:alert="alert || errorLocal"
					:accept="paramData.accept ? paramData.accept : '*'"
					icon="upload"
				/>
			</div>

			<div v-if="paramData.type == 'placeholder'" class="holder placeholder">
				<label :for="'text' + key" v-if="label" v-html="label" v-tooltip="tooltip"></label>
				<div class="inputHolder input-field">
					<PlaceholderField
						v-model="paramData.value as string"
						:maxLength="paramData.maxLength"
					/>
				</div>
			</div>

			<PlaceholderSelector
				class="placeholders"
				v-if="placeholdersAsPopout && paramData.placeholderList"
				v-model="paramData.value"
				:placeholders="paramData.placeholderList"
				:secondary="secondary"
				:premium="premiumOnlyLocal"
				:popoutMode="placeholdersAsPopout"
				:alert="alert || errorLocal"
				:target="placeholderTarget"
				@insert="insertPlaceholder"
			/>
		</div>

		<PlaceholderSelector
			class="placeholders"
			v-if="!placeholdersAsPopout && paramData.placeholderList"
			v-model="paramData.value"
			:placeholders="paramData.placeholderList"
			:secondary="secondary"
			:premium="premiumOnlyLocal"
			:popoutMode="placeholdersAsPopout"
			:alert="alert || errorLocal"
			:target="placeholderTarget"
			@insert="insertPlaceholder"
		/>

		<ParamItem
			v-for="(c, index) in children"
			class="child"
			ref="paramChild"
			:key="'child_' + index + c.id"
			:paramData="c"
			:secondary="secondary"
			:premium="premiumOnlyLocal"
			:alert="alert || errorLocal"
			noBackground
			noPremiumLock
			v-model="c.value as string | number | boolean | string[] | null | undefined"
			:autoFade="autoFade"
			:childLevel="childLevel + 1"
			@change="(prevVal, newVal) => emit('change', prevVal, newVal)"
		/>

		<transition @enter="onShowItem" @leave="onHideItem">
			<div class="child" ref="paramChild_slot" v-if="showChildren">
				<slot></slot>
				<slot name="child"></slot>
			</div>
		</transition>

		<TTButton
			class="moreFontsBt"
			icon="lock_fit"
			v-if="askForSystemFontAccess"
			@click="grantSystemFontRead()"
			>{{ t("overlay.credits.grant_fonts_access") }}</TTButton
		>

		<div
			class="card-item alert errorMessage"
			v-if="(error || paramData.error) && (errorMessage || paramData.errorMessage)"
		>
			{{ errorMessage.length > 0 ? errorMessage : paramData.errorMessage }}
		</div>

		<PremiumLockLayer v-if="premiumLocked" />
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import {
	ref,
	computed,
	watch,
	onMounted,
	nextTick,
	useSlots,
	type ComponentPublicInstance,
	useTemplateRef,
	onBeforeMount,
} from "vue";
import { useI18n } from "vue-i18n";
import { gsap } from "gsap/gsap-core";
import CountryFlag from "vue-country-flag-next";
import DurationForm from "../DurationForm.vue";
import PremiumLockLayer from "../PremiumLockLayer.vue";
import Slider from "../Slider.vue";
import TTButton from "../TTButton.vue";
import ToggleButton from "../ToggleButton.vue";
import PlaceholderSelector from "./PlaceholderSelector.vue";
import Config from "@/utils/Config";
import PlaceholderField from "../PlaceholderField.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { usePlaceDropdown } from "@/composables/usePlaceDropDown";
import { asset } from "@/composables/useAsset";

defineOptions({ name: "ParamItem" }); //This is needed so recursion works properly

const props = withDefaults(
	defineProps<{
		paramData: TwitchatDataTypes.ParameterData<any, any, any>;
		error?: boolean;
		errorMessage?: string;
		disabled?: boolean;
		autofocus?: boolean;
		childLevel?: number;
		modelValue?: string | boolean | number | string[] | null;
		secondary?: boolean;
		alert?: boolean;

		premium?: boolean;
		noPremiumLock?: boolean;
		noBackground?: boolean;
		autoFade?: boolean;
		inverseChildrenCondition?: boolean;
		tabindex?: number;
		placeholdersAsPopout?: boolean;
		forceChildDisplay?: boolean;
	}>(),
	{
		errorMessage: "",
		childLevel: 0,
		tabindex: 0,
		modelValue: null,
	},
);

const emit = defineEmits<{
	change: [prevValue: string | boolean | number | string[] | null, newValue: unknown];
	"update:modelValue": [value: unknown];
	mouseenter: [
		event: MouseEvent,
		paramData: TwitchatDataTypes.ParameterData<unknown, unknown, unknown>,
	];
	mouseleave: [
		event: MouseEvent,
		paramData: TwitchatDataTypes.ParameterData<unknown, unknown, unknown>,
	];
	input: [];
	focus: [];
	blur: [];
}>();

const { t } = useI18n();
const slots = useSlots();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const { place: placeDropdown } = usePlaceDropdown();
const { getAsset } = asset();

const rootElRef = useTemplateRef("rootEl");
const inputRef = useTemplateRef("input");
const vueSelectRef = useTemplateRef("vueSelect");
const paramChildrenRef = useTemplateRef<ComponentPublicInstance[]>("paramChild");

const key = Math.random().toString();
const children = ref<TwitchatDataTypes.ParameterData<unknown, unknown, unknown>[]>([]);
const placeholderTarget = ref<HTMLTextAreaElement | HTMLInputElement | null>(null);
const errorLocal = ref(false);
const premiumOnlyLocal = ref(false);
const autofocusLocal = ref(false);
const askForSystemFontAccess = ref(false);
const isMissingScope = ref(false);

let isLocalUpdate = false;
let childrenExpanded = false;

const textValue = computed({
	get(): string {
		if (props.paramData.type == "time") {
			//Convert number value in milliseconds to "hh:mm:ss" string
			const value = (props.paramData.value as number) || 0;
			const h_ms = 3600;
			const m_ms = 60;
			const h = Math.floor(value / h_ms);
			const m = Math.floor((value - h * h_ms) / m_ms);
			const s = Math.floor(value - h * h_ms - m * m_ms);
			return Utils.toDigits(h) + ":" + Utils.toDigits(m) + ":" + Utils.toDigits(s);
		} else {
			return props.paramData.value as string;
		}
	},
	set(value: string) {
		if (props.paramData.allowedCharsRegex) {
			const prevValue = value;
			//Only keep allowed chars if a list is defined
			value = value.replace(
				new RegExp("[^" + props.paramData.allowedCharsRegex + "]", "gi"),
				"",
			);
			if (value != prevValue) {
				//set to a new value so a change is detected by vue when modifying it aftewards
				props.paramData.value =
					"_____this_is_a_fake_value_you_SHOULD_R3aLLY_N0T_use_hehehehehe_____";
			}
		}
		if (props.paramData.type == "time") {
			//Convert string input value "hh:mm:ss" to a number value in milliseconds
			if (!/[0-9]{2}:[0-9]{2}:[0-9]{2}/gi.test(value)) {
				//This line forces the component to rerun the "textValue" getter which parses the duration back
				//to string even if the number hasn't changed. For exemple if field is set to "00:00:00" and user
				//pressed the DEL key on any of the 3 components, the parsed number value will remain "0" which
				//wouldn't trigger the "textValue" getter again and field would be like "00:--:00" instead
				//if "00:00:00". Forcing change of the field here to an invalid value will make sure that
				//setting the value back to the proper value will trigger appropriate watchers
				props.paramData.value = "";
				value = "00:00:00";
			}
			const [h, m, s] = value.split(":").map((v) => parseInt(v));
			props.paramData.value = h! * 3600 + m! * 60 + s! || 0;
		} else {
			props.paramData.value = value;

			const inputEl = inputRef.value as HTMLInputElement;
			let selectStart = inputEl.selectionStart || value.length;
			let selectEnd = inputEl.selectionEnd;

			nextTick().then(() => {
				const newInput = inputRef.value as HTMLInputElement;
				if (newInput == inputEl) return;
				//In case there was a switch between a <input> and a <textarea>, set the carret
				//to the same place it was before the switch
				newInput.selectionStart = selectStart;
				newInput.selectionEnd = selectEnd;
			});
		}
	},
});

const longText = computed((): boolean => {
	return (
		props.paramData?.longText === true ||
		(textValue.value?.length > 40 &&
			props.paramData.longText !== false &&
			props.paramData.type != "password")
	);
});

const showChildren = computed((): boolean => {
	if (props.forceChildDisplay !== false) return true;
	let state =
		(props.paramData.type == "boolean" && props.paramData.value === true) ||
		(props.paramData.type == "string" && props.paramData.value != "") ||
		!!props.paramData.value;
	if (props.inverseChildrenCondition) state = !state;

	return (slots.default != undefined || slots.child != undefined) && state;
});

const premiumLocked = computed((): boolean => {
	return (
		premiumOnlyLocal.value !== false && !storeAuth.isPremium && props.noPremiumLock === false
	);
});

const icon = computed((): string => {
	let defaultIcon = "";
	if (props.paramData.type == "placeholder") defaultIcon = "placeholder";
	return props.paramData.icon ?? defaultIcon ?? "";
});

const classes = computed((): string[] => {
	const res = ["paramitem"];
	if (props.noBackground === false) {
		res.push("card-item");
	}
	if (props.paramData.type == "boolean" && props.paramData.value !== true) res.push("unselected");
	if (props.paramData.type == "string" && props.paramData.value !== "") res.push("unselected");
	if (errorLocal.value !== false) res.push("error");
	else if (isMissingScope.value) res.push("error");
	if (longText.value) res.push("longText");
	if (label.value == "") res.push("noLabel");
	if (props.autoFade !== false) res.push("autoFade");
	if (props.childLevel > 0) res.push("child");
	if (icon.value) res.push("hasIcon");
	if (props.paramData.maxLength) res.push("maxLength");
	if (props.paramData.disabled || props.disabled == true) res.push("disabled");
	if (premiumLocked.value) res.push("cantUse");
	if (props.paramData.type == "time") res.push("time");
	if (props.paramData.type == "font") res.push("font");
	if (showMaxLength.value) res.push("withMaxLength");
	if (props.placeholdersAsPopout !== false) res.push("popoutMode");
	if (premiumOnlyLocal.value !== false && props.noBackground === false) res.push("premium");
	res.push("level_" + props.childLevel);
	return res;
});

const label = computed((): string => {
	if (!props.paramData) return "";
	let txt = props.paramData.label ?? "";

	let count = 0;
	let v = props.paramData.value as number | string;
	if (
		props.paramData.type == "number" ||
		props.paramData.type == "integer" ||
		props.paramData.type == "slider"
	) {
		count = parseFloat(props.paramData.value as string) ?? 0;
		if (isNaN(count)) count = 0;
		v = count.toString();
	} else if (props.paramData.type == "time" || props.paramData.type == "duration") {
		v = Utils.formatDuration(parseFloat(v.toString()) * 1000);
	}
	if (props.paramData.labelKey) {
		txt += t(props.paramData.labelKey, { VALUE: v }, count);
	} else {
		txt = txt.replace(/\{VALUE\}/gi, (v || 0).toString());
	}
	if (!txt) return "";
	//Puts anything that's between parenthesis inside <span> elements
	return txt.replace(/((\(|\{)[^)]+(\)|\}))/gi, "<span class='smallText'>$1</span>");
});

const placeholder = computed((): string => {
	if (!props.paramData) return "";
	let txt = props.paramData.placeholder ?? "";
	if (props.paramData.placeholderKey) {
		txt = t(props.paramData.placeholderKey);
	}
	return txt;
});

const tooltip = computed((): string => {
	if (props.paramData.tooltip) return props.paramData.tooltip;
	if (props.paramData.tooltipKey) return t(props.paramData.tooltipKey);
	return "";
});

const showMaxLength = computed((): boolean => {
	return (
		!!props.paramData.value &&
		!!props.paramData.maxLength &&
		((props.paramData.value as string).length / props.paramData.maxLength > 0.8 ||
			props.paramData.maxLength < 50)
	);
});

/**
 * Called when item is clicked.
 * If parameter requires a specific scope that's not granted, the
 * clicke event is blocked and user is asked to grant permission.
 * @param event
 */
function clickItem(event: MouseEvent): void {
	if (props.paramData.twitch_scopes) {
		if (TwitchUtils.hasScopes(props.paramData.twitch_scopes)) return;
		props.paramData.value = false;
		setErrorState(false);
		event.stopPropagation();
		storeAuth.requestTwitchScopes(props.paramData.twitch_scopes);
	}
}

/**
 * Called when value changes
 */
function onEdit(): void {
	if (premiumLocked.value) return;

	updateSelectedListValue();

	if (isLocalUpdate) return;

	isLocalUpdate = true;
	if (Array.isArray(props.paramData.value) && props.paramData.type == "editablelist") {
		//Limite items sizes
		const maxLength = props.paramData.maxLength || 300;
		const list = props.paramData.value as string[];
		list.forEach((v, i) => (list[i] = v.substring(0, maxLength)));

		//Limit number of items of the editablelist
		const maxItem = props.paramData.max ?? 999;
		if (list.length > maxItem) {
			props.paramData.value.splice(0, Math.max(0, list.length - maxItem));
		}
	}

	if (props.paramData.type == "editablelist") {
		const list = vueSelectRef.value as any;
		if (props.paramData.options && list.pushedTags) {
			//If there's a list of options, cleanup any custom options added that
			//is not the currently selected one
			for (let i = 0; i < list.pushedTags.length; i++) {
				const opt = list.pushedTags[i];
				if (opt == (props.paramData.value as string)) continue;
				if (props.paramData.options.includes(opt)) continue;
				list.pushedTags.splice(i, 1);
			}
		}

		if (list.dropdownOpen) {
			list.closeSearchOptions();
		}
	} else if (props.paramData.type == "imagelist") {
		if (props.paramData.value === null) props.paramData.value = "";
	}

	if (
		(props.paramData.type != "number" && props.paramData.type != "integer") ||
		props.paramData.value !== ""
	) {
		const prevValue = props.modelValue;
		emit("update:modelValue", props.paramData.value);
		emit("change", prevValue, props.paramData.value);
		if (props.paramData.editCallback) {
			props.paramData.editCallback(props.paramData);
		}
	}

	buildChildren();

	nextTick().then(() => {
		isLocalUpdate = false;
	});
}

/**
 * Create children
 */
async function buildChildren(): Promise<void> {
	if (props.paramData.value === false) {
		//Collapse children
		childrenExpanded = false;
		if (children.value.length > 0) {
			//Hide transition
			const childrenItems = paramChildrenRef.value;
			if (childrenItems) {
				let divs: HTMLDivElement[] = childrenItems.map((v) => v.$el as HTMLDivElement);
				gsap.killTweensOf(divs);
				gsap.to(divs, {
					overflow: "hidden",
					height: 0,
					paddingTop: 0,
					marginTop: 0,
					paddingBottom: 0,
					marginBottom: 0,
					duration: 0.25,
					stagger: 0.025,
					onComplete: () => {
						children.value = [];
					},
				});
			}
		}
		return;
	}

	const list = storeParams.$state;
	let childList: TwitchatDataTypes.ParameterData<unknown, unknown, unknown>[] = [];
	for (const key in list) {
		const typedKey = key as keyof typeof list;
		if (typedKey != "appearance" && typedKey != "features") continue;
		const params = list[typedKey];
		for (const key2 in params) {
			const typedKey = key2 as TwitchatDataTypes.ParameterSubCategory;
			const param = params[
				typedKey as keyof typeof params
			] as TwitchatDataTypes.ParameterData<unknown>;
			if (param && param.parent != undefined && param.parent == props.paramData.id) {
				childList.push(param);
			}
		}
	}

	if (props.paramData.children) {
		childList = childList.concat(props.paramData.children);
	}

	if (children.value == childList) return;

	children.value = childList;
	await nextTick();

	if (childList.length > 0 && !childrenExpanded && paramChildrenRef.value) {
		//Show transitions
		let divs = paramChildrenRef.value.map((v) => v.$el as HTMLDivElement);
		gsap.killTweensOf(divs);
		gsap.from(divs, {
			overflow: "hidden",
			height: 0,
			paddingTop: 0,
			marginTop: 0,
			paddingBottom: 0,
			marginBottom: 0,
			duration: 0.25,
			stagger: 0.025,
			clearProps: "all",
		});
	}
	childrenExpanded = true;
}

function clampValue(): void {
	if (
		props.paramData.value === "" &&
		(props.paramData.type == "number" || props.paramData.type == "integer")
	) {
		props.paramData.value = 0;
	}

	if (props.paramData.type == "integer") {
		props.paramData.value = Math.round(props.paramData.value as number);
	}

	if (props.paramData.max != undefined && (props.paramData.value as number) > props.paramData.max)
		props.paramData.value = props.paramData.max;
	if (props.paramData.min != undefined && (props.paramData.value as number) < props.paramData.min)
		props.paramData.value = props.paramData.min;

	// clampValue();
}

function insertPlaceholder(tag: string): void {
	if (props.paramData.type == "editablelist") {
		(props.paramData.value as string[]).push(tag);
	} else if (props.paramData.type == "number" || props.paramData.type == "integer") {
		props.paramData.value = tag;
	} else {
		// console.log(textValue.value, tag)
		// textValue.value += tag;
	}
	onEdit();
}

function setErrorState(state: boolean) {
	if (props.paramData.twitch_scopes && !TwitchUtils.hasScopes(props.paramData.twitch_scopes)) {
		errorLocal.value = true;
	} else {
		errorLocal.value = state;
	}
}

function onShowItem(el: Element, done: () => void): void {
	gsap.from(el, {
		overflow: "hidden",
		height: 0,
		duration: 0.2,
		marginTop: 0,
		ease: "sine.out",
		clearProps: "all",
		onComplete: () => {
			done();
		},
	});
}

function onHideItem(el: Element, done: () => void): void {
	gsap.to(el, {
		overflow: "hidden",
		height: 0,
		duration: 0.2,
		marginTop: 0,
		ease: "sine.out",
		onComplete: () => {
			done();
		},
	});
}

function updateSelectedListValue(): void {
	if (
		(props.paramData.type == "list" || props.paramData.type == "imagelist") &&
		props.paramData.listValues
	) {
		props.paramData.selectedListValue = props.paramData.listValues.find(
			(v) => v.value == props.paramData.value,
		);
	}
}

/**
 * Get local fonts
 */
async function getLocalFonts(): Promise<void> {
	Utils.listAvailableFonts().then((result) => {
		props.paramData.options = result.fonts.concat();
		if (props.paramData.options.indexOf(props.paramData.value as string) == -1) {
			props.paramData.options.push(props.paramData.value as string);
		}
		props.paramData.options = props.paramData.options.sort();
	});
}

/**
 * Grant access to system fonts
 */
async function grantSystemFontRead(): Promise<void> {
	Utils.listAvailableFonts(true).then((result) => {
		props.paramData.options = result.fonts.sort();
		askForSystemFontAccess.value = result?.systemGranted !== true;
		if (!props.paramData.value) {
			props.paramData.value = "Inter";
		}
	});
}

// beforeMount logic
onBeforeMount(() => {
	autofocusLocal.value = props.autofocus;
	premiumOnlyLocal.value = props.premium !== false || props.paramData.premiumOnly === true;
	setErrorState(props.error || props.paramData.error === true);

	if (props.modelValue !== null && props.modelValue !== undefined) {
		props.paramData.value = props.modelValue;
	}

	//If it's a boolean and modelValue is undefined, force it to false
	if (props.paramData.type == "boolean" && props.modelValue == undefined) {
		console.warn(
			"PROBABLY AN ISSUE TO FIX WITH A PARAM ITEM:",
			props.modelValue,
			props.paramData.labelKey,
			props.paramData,
		);
		props.paramData.value = false;
		emit("update:modelValue", false);
	}

	//Makes sure value is non-empty and within min/max.
	//For a while some users emptied the field because i didn't block that
	//this kinda fixes these old bad behaviors.
	//also if min/max values are changed this will make sure the value
	//respects the new limits.
	if (props.paramData.type == "number" || props.paramData.type == "integer") {
		if (typeof props.paramData.value == "number") {
			clampValue();
		}
	}

	if (props.paramData.type == "font") {
		props.paramData.value = props.modelValue;
		if ("queryLocalFonts" in window) {
			askForSystemFontAccess.value = false;
			try {
				navigator.permissions
					.query(
						//@ts-ignore
						{ name: "local-fonts" },
					)
					.then((granted) => {
						if (granted.state == "prompt") {
							// Ask for font access if not running in OBS as they doesn't support Font API
							askForSystemFontAccess.value = !Config.instance.OBS_DOCK_CONTEXT;
						} else if (granted.state == "granted") {
							grantSystemFontRead();
						}
						if (granted.state != "granted") {
							getLocalFonts();
						}
					})
					.catch((error) => {
						console.log("FONT FAILLURE");
						console.log(error);
					});
			} catch (error) {
				console.log("FONT FAILLURE2");
				console.log(error);
			}
		} else {
			getLocalFonts();
		}
	}
});

watch(
	() => storeAuth.twitch.scopes,
	() => {
		isMissingScope.value =
			props.paramData.twitch_scopes !== undefined &&
			props.paramData.twitch_scopes.length > 0 &&
			!TwitchUtils.hasScopes(props.paramData.twitch_scopes);
		setErrorState(props.error || isMissingScope.value);
	},
	{ immediate: true },
);

onMounted(() => {
	if (props.paramData.type == "number" || props.paramData.type == "integer") {
		watch(
			() => props.paramData.max,
			() => clampValue(),
		);
		watch(
			() => props.paramData.min,
			() => clampValue(),
		);
	}

	buildChildren();

	if (
		props.paramData.listValues &&
		props.paramData.listValues.length > 0 &&
		props.paramData.multiple !== true
	) {
		//Check if the value is on the listValues.
		//If not, fallback to the first value.
		let found;
		for (const entry of props.paramData.listValues) {
			if (entry.group) {
				const v = entry.group.find((v) => v.value === props.paramData.value);
				if (v) {
					found = v;
					break;
				}
			} else if (entry.value === props.paramData.value) {
				found = entry;
				break;
			}
		}
		if (!found) {
			props.paramData.value = props.paramData.listValues[0]!.value;
		}
		updateSelectedListValue();
	}

	if (props.paramData.placeholderList && props.paramData.placeholderList.length > 0) {
		if (props.paramData.type == "string") {
			placeholderTarget.value = rootElRef.value!.querySelector("textarea,input");
			// }else{
			// throw new Error("For \"placeholderList\" to work, \"paramData\" type must be \"text\". Current type is \""+props.paramData.type+"\"");
		}
	}

	//Set this to true so we keep focus on the text field when it switches
	//between <input> and <textarea> depending on the text length
	//This won't affect first rendering, only subsequent ones
	autofocusLocal.value = true;

	//Force a model value update.
	//This is necessary for default values to be applied to the
	//v-model value on first render.
	if (props.modelValue != null && props.modelValue != props.paramData.value) onEdit();
});

watch(
	() => props.modelValue,
	(value: string | number | boolean | string[] | null | undefined) => {
		if (value !== null && value !== undefined) {
			props.paramData.value = value;
		}
	},
);

watch(
	() => props.paramData.value,
	() => onEdit(),
	{ deep: true },
);

watch(
	() => props.paramData.error,
	() => setErrorState(props.paramData.error === true),
);

watch(
	() => props.paramData.listValues,
	() => updateSelectedListValue(),
);

watch(
	() => props.paramData.children,
	() => buildChildren(),
);

watch(
	() => props.error,
	() => setErrorState(props.error === true),
);
</script>

<style scoped lang="less">
.paramitem {
	overflow: unset;
	position: relative;
	transition:
		padding 0.25s,
		opacity 0.2s;
	display: flex;
	flex-direction: column;
	justify-content: center;

	label {
		white-space: pre-line;
	}

	&:not(.disabled) > .content:hover::before {
		opacity: 1;
	}
	&:not(.disabled) > .content::before {
		content: "";
		opacity: 0;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		position: absolute;
		filter: blur(5px);
		pointer-events: none;
		background-color: var(--background-color-fadest);
		background: linear-gradient(170deg, var(--background-color-fadest) 0%, transparent 100%);
	}

	&.longText {
		.content {
			width: 100%;
			.holder.text {
				flex-grow: 1;
				display: flex;
				flex-direction: column;
				align-items: flex-start;
				.inputHolder {
					width: 100%;
					flex-basis: unset;
					.maxlength {
						right: 10px;
					}
				}
				label {
					flex-basis: unset;
				}
			}
		}
	}

	&.noLabel {
		label {
			display: none;
		}
		input,
		select,
		textarea {
			width: 100%;
			flex-basis: unset !important;
		}
	}

	&.disabled:not(.error) {
		filter: saturate(30%);
		cursor: unset;
		@c1: var(--background-color-fadest);
		@c2: transparent;
		background-color: @c1;
		background-image: repeating-linear-gradient(-45deg, @c1, @c1 7px, @c2 7px, @c2 15px);
		.toggleButton,
		input,
		textarea,
		label {
			pointer-events: none;
		}
		label,
		.icon {
			opacity: 0.75;
		}
	}

	&.error {
		cursor: not-allowed;
		background-color: var(--color-alert-fader) !important;
		.errorMessage {
			font-size: 0.9em;
			margin-top: 0.5em;
			text-align: center;
		}
		label {
			cursor: unset !important;
		}
	}

	&.unselected.autoFade {
		.content {
			opacity: 0.5;
		}
	}

	&.withMaxLength.maxLength {
		.content {
			.text {
				input {
					padding-right: 3em;
				}
			}
		}
	}

	.content {
		display: flex;
		flex-direction: row;
		align-items: baseline;
		transition: background-color 0.1s;
		position: relative;

		textarea {
			width: 100%;
		}

		.holder {
			flex-grow: 1;
			display: flex;
			flex-direction: row;
			align-items: center;
			row-gap: 0.25em;
			&:has(input) {
				flex-wrap: wrap;
			}
		}

		.icon {
			width: 1em;
			height: 1em;
			align-self: flex-start;
			margin-right: 0.5em;
			flex-shrink: 0;
		}

		.helpIcon {
			width: 20px;
			margin-right: 0.25em;
		}

		.toggleButton {
			align-self: flex-start;
		}

		.toggle,
		.number,
		.text,
		.list,
		.browse,
		.color,
		.placeholder {
			flex-grow: 1;
			display: flex;
			flex-direction: row;
			label {
				flex-grow: 1;
				flex-basis: min-content;
				align-self: stretch;
				margin: 0;
				padding-right: 1em;
				line-height: 1.25em;
				cursor: pointer;
			}
			&.number,
			&.text {
				.inputHolder {
					position: relative;
					flex-grow: 1;
					overflow: hidden;
					border-radius: var(--border-radius);
					.maxlength {
						font-size: 0.7em;
						position: absolute;
						right: 0;
						bottom: 0;
						transform: unset;
						pointer-events: none;
						background-color: var(--grayout);
						padding: 0.25em;
						border-radius: 4px;
					}
					input {
						width: 100%;
						max-width: unset;
					}

					&.privateField {
						input {
							padding-left: 1.75em;
						}
						.privateIcon {
							width: 1.5em;
							height: 100%;
							background-color: var(--color-text);
							color: var(--grayout);
							position: absolute;
							left: 0;
							padding: 0.25em;
						}
					}
				}
			}
			&.number {
				input {
					flex-basis: 80px;
				}

				label {
					margin-top: 0.4em;
				}
			}

			&.duration {
				input {
					flex-basis: 100px;
				}
			}
		}

		.toggle {
			flex-grow: 1;
		}

		:deep(.smallText) {
			font-size: 0.75em;
			font-style: italic;
		}
		.slider {
			flex-grow: 1;
			display: flex;
			align-items: flex-start;
			flex-direction: column;
			input {
				flex-basis: unset;
				appearance: none;
				width: 100%;
				height: 1em;
				background: transparent;
				background: linear-gradient(
					90deg,
					var(--color-dark-light) 50%,
					var(--color-dark-fadest) 50%
				);
				&::-webkit-slider-thumb {
					.emboss();
					appearance: none;
					width: 1em;
					height: 1em;
					border-radius: 50%;
					background: var(--color-primary);
					cursor: pointer;
				}
				&::-moz-range-thumb {
					width: 1em;
					height: 1em;
					background: #04aa6d;
					cursor: pointer;
				}
			}
		}

		.color {
			.inputHolder {
				flex-basis: 50px;
				background-color: white;
				height: 1.25em;
				cursor: pointer;
				position: relative;
				outline: 1px solid var(--color-text);
				input {
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					opacity: 0;
					height: 100%;
					cursor: pointer;
				}
			}
		}

		input {
			width: 100%;
		}

		.browse {
			.filePath {
				width: auto;
				max-width: unset;
				text-align: left;
			}
			.browseBt {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
		}

		input,
		select,
		textarea,
		.listField {
			transition: background-color 0.25s;
			flex-basis: 300px;
			text-overflow: ellipsis;
			width: 100%;
		}

		&:has(.list, .number, .time) .paramIcon {
			margin-top: 0.4em;
		}

		img.paramIcon {
			height: 1em;
			margin-right: 0.5em;
			vertical-align: middle;
		}

		.list {
			label {
				margin-top: 0.4em;
				flex-basis: unset;
			}

			.listField {
				:deep(.vs__dropdown-toggle) {
					width: 100%;
					.vs__actions {
						flex-basis: 45px;
						justify-content: flex-end;
					}
				}
			}

			&.editable {
				flex-direction: column;
				label {
					align-self: flex-start;
				}
				.listField {
					flex-basis: unset;
				}
			}
		}

		textarea {
			resize: vertical;
			min-height: 2em;
		}
	}

	&.time {
		.content > .holder {
			.inputHolder {
				flex-basis: 100px;
				flex-grow: unset;
				input::-webkit-datetime-edit-ampm-field {
					display: none;
				}
			}
			label {
				margin-top: 0.4em;
			}
		}
	}

	&.child,
	:deep(.parameter-child) {
		margin-left: auto;
		margin-right: 0;
		margin-top: 5px;
		@padding: 1.5em;
		width: calc(100% - @padding);
		position: relative;
		.holder {
			// font-size: .9em;
			&::before {
				position: absolute;
				left: -1em;
				top: 0.1em;
				font-size: 1em;
				content: "⤷";
				display: block;
			}
		}
		&:empty {
			display: none;
		}
	}

	&.hasIcon {
		& > .placeholders {
			margin-left: 1.5em;
		}
	}

	&.popoutMode {
		position: relative;
		.placeholders {
			position: absolute;
			right: 0;
			// top: 2px;
			top: calc(50%);
			transform: translateY(-50%);
			height: calc(100% - 4px);
		}
		input,
		.button {
			padding-right: 1.5em;
		}
		.maxlength {
			margin-right: 2.15em !important;
			right: 0 !important;
		}
	}

	&.premium {
		color: var(--color-text);
		background-color: var(--color-premium-fadest);
		&.cantUse {
			.content {
				opacity: 0.5;
				* {
					pointer-events: none;
				}
			}
		}
	}

	.custom {
		justify-content: space-between;
	}
	.moreFontsBt {
		display: flex;
		margin: 0.5em auto 0 auto;
	}

	&.font {
		.holder.list.editable {
			flex-direction: row;
			.listField {
				flex-basis: 300px;
			}
		}
	}
}
</style>
