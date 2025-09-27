<template>
	<div :class="classes"
	:data-type="paramData.type"
	@mouseenter="$emit('mouseenter', $event, paramData)"
	@mouseleave="$emit('mouseleave', $event, paramData)"
	@click="clickItem($event)">
		<div class="content">
			<Icon :theme="paramData.iconTheme" :name="icon" v-if="icon" class="paramIcon" />
			<img :src="paramData.iconURL" v-if="paramData.iconURL" class="paramIcon">

			<div v-if="paramData.type == 'custom'" class="holder custom">

			<label :for="'custom'+key"
				v-if="label"
				v-html="label"
				v-tooltip="{content:tooltip, followCursor:'horizontal'}"></label>
				<div><slot name="custom" :id="'custom'+key"></slot></div>
			</div>

			<div v-if="paramData.type == 'boolean'" class="holder toggle"
			:aria-label="label+': '+(paramData.value? 'anabled' : 'disabled')"
			>
				<Icon theme="secondary" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$asset('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'toggle'+key"
					v-if="label"
					v-html="label"
					v-tooltip="{content:tooltip, followCursor:'horizontal'}"></label>

				<ToggleButton v-if="!paramData.noInput" class="ToggleButton.vue"
					v-model="paramData.value"
					:secondary="secondary"
					:premium="premiumOnlyLocal"
					:alert="alert || errorLocal"
					:inputId="'toggle'+key"
					:disabled="disabled !== false || paramData.disabled === true" />
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'number' || paramData.type == 'integer'" class="holder number">
				<Icon theme="secondary" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$asset('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="paramData.type+key" v-if="label" v-html="label" v-tooltip="tooltip"></label>

				<TTButton v-if="typeof paramData.value == 'string'" @click="paramData.value = 0; clampValue();" icon="trash" secondary>{{ paramData.value }}</TTButton>

				<input v-else-if="!paramData.noInput" ref="input"
					:tabindex="tabindex"
					type="number"
					v-model.number="paramData.value"
					v-autofocus="autofocus"
					:id="paramData.type+key"
					:min="paramData.min"
					:max="paramData.max"
					:step="paramData.step"
					:disabled="premiumLocked || disabled !== false || paramData.disabled === true"
					@focus="$emit('focus')"
					@blur="clampValue(); $emit('blur')"
					@input="$emit('input')">
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'string' || paramData.type == 'password' || paramData.type == 'date' || paramData.type == 'datetime' || paramData.type == 'time'"
			:class="{holder:true, text:true, time:paramData.type == 'time'}">
				<Icon theme="secondary" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$asset('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'text'+key" v-if="label" v-html="label" v-tooltip="tooltip"></label>
				<div class="inputHolder" :class="{privateField:paramData.isPrivate}">
					<Icon v-if="paramData.isPrivate" name="spoiler" class="privateIcon" v-tooltip="$t('global.private_field')" />
					<textarea ref="input" v-if="longText && !paramData.noInput"
						:tabindex="tabindex"
						v-model="textValue"
						rows="3"
						:id="'text'+key"
						:name="paramData.fieldName"
						:placeholder="placeholder"
						v-autofocus="autofocusLocal"
						:maxlength="paramData.maxLength? paramData.maxLength : 524288"
						:disabled="premiumLocked || disabled !== false || paramData.disabled === true"
						@focus="$emit('focus')"
						@blur="$emit('blur')"
						@input="$emit('input')"></textarea>

					<input ref="input" v-else-if="!paramData.noInput"
						:tabindex="tabindex"
						v-model="textValue"
						v-autofocus="autofocusLocal"
						:name="paramData.fieldName"
						:id="'text'+key"
						:type="paramData.type == 'datetime'? 'datetime-local' : paramData.type"
						:step="paramData.type == 'time'? 1 : undefined"
						:placeholder="placeholder"
						:maxlength="paramData.maxLength? paramData.maxLength : 524288"
						:disabled="premiumLocked || disabled !== false || paramData.disabled === true"
						:autocomplete="paramData.type == 'password'? 'off' : 'new-password'"
						@focus="$emit('focus')"
						@blur="clampValue(); $emit('blur')"
						@input="$emit('input')">

					<div class="maxlength" v-if="showMaxLength">{{(paramData.value as string).length}}/{{paramData.maxLength}}</div>
				</div>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'duration'" class="holder text duration">
				<Icon theme="secondary" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$asset('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'text'+key" v-if="label" v-html="label" v-tooltip="tooltip"></label>
				<DurationForm ref="input" v-if="!paramData.noInput"
					:id="'duration'+key"
					v-model="paramData.value"
					:allowMs="paramData.allowMs"
					:autofocus="autofocus"
					:tabindex="tabindex"
					:name="paramData.fieldName"
					:max="paramData.max"
					:min="paramData.min"
					:disabled="premiumLocked || disabled !== false || paramData.disabled === true"
					@change="$emit('input')" />
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'color'" class="holder color">
				<Icon theme="secondary" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$asset('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'text'+key" v-if="label" v-html="label" v-tooltip="tooltip"></label>
				<div class="inputHolder input-field" :style="{backgroundColor: paramData.value as string }">
					<input ref="input" v-if="!paramData.noInput"
						:tabindex="tabindex"
						v-model="textValue"
						v-autofocus="autofocus"
						:disabled="premiumLocked || disabled !== false || paramData.disabled === true"
						:name="paramData.fieldName"
						:id="'text'+key"
						type="color">
				</div>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'slider'" class="holder slider">
				<Icon theme="secondary" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$asset('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label v-html="label" v-tooltip="tooltip"></label>
				<Slider :min="paramData.min" :max="paramData.max" :step="paramData.step" v-model="paramData.value"
				:secondary="secondary"
				:premium="premiumOnlyLocal"
				:disabled="premiumLocked || disabled !== false || paramData.disabled === true"
				:alert="alert || errorLocal" />
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'list' && paramData.multiple !== true" class="holder list">
				<Icon theme="secondary" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$asset('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'list'+key" v-html="label" v-tooltip="tooltip"></label>
				<select v-if="!paramData.noInput" ref="input"
					:id="'list'+key"
					v-model="paramData.value"
					v-autofocus="autofocus">
					<template v-for="a in paramData.listValues" :key="a.value">
						<component :is="a.group? 'optgroup' : 'option'"
						:disabled="a.disabled === true"
						:value="a.group? null : a.value"
						:label="a.label != undefined? a.label : $t(a.labelKey!)">
							<option v-for="b in a.group!"
							:value="b.value"
							:disabled="b.disabled === true">
								<CountryFlag v-if="a.flag" :country="a.flag" size="small" />
								{{b.label != undefined? b.label : $t(b.labelKey!)}}
							</option>
						</component>
					</template>
				</select>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'list' && paramData.multiple === true" class="holder list">
				<Icon theme="secondary" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$asset('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'editablelist'+key" v-html="label" v-tooltip="tooltip"></label>
				<vue-select class="listField"
					label="label"
					ref="vueSelect"
					:id="'editablelist'+key"
					:placeholder="placeholder"
					v-model="paramData.value"
					:calculate-position="$placeDropdown"
					@option:selected="onEdit()"
					appendToBody
					:options="paramData.listValues"
					:submitSearchOnBlur="true"
					:multiple="true"
					:selectable="() => (paramData.value as unknown[] || []).length < (paramData.max || 999)"
					:reduce="(v:TwitchatDataTypes.ParameterDataListValue<unknown>) => v.value"
				>
					<template #no-options="{ search, searching, loading }">
						<div>{{ $t("global.empty_list1") }}</div>
						<div>{{ $t("global.empty_list2") }}</div>
					</template>

					<template v-slot:option="option:TwitchatDataTypes.ParameterDataListValue<unknown>">
						<CountryFlag v-if="option.flag" :country="option.flag" size="small" />
						<span class="text">{{option.label}}</span>
					</template>

					<template #selected-option="option:TwitchatDataTypes.ParameterDataListValue<unknown>">
						<CountryFlag v-if="option.flag" :country="option.flag" size="small" />
						<span class="text">{{option.label}}</span>
					</template>
				</vue-select>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'imagelist'" class="holder list">
				<Icon theme="secondary" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$asset('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'imagelist'+key" v-html="label" v-tooltip="tooltip"></label>
				<vue-select class="listField"
					label="label"
					ref="vueSelect"
					:id="'imagelist'+key"
					:placeholder="placeholder"
					v-model="paramData.value"
					:reduce="(v:TwitchatDataTypes.ParameterDataListValue<unknown>) => v.value"
					:calculate-position="$placeDropdown"
					@option:selected="onEdit()"
					appendToBody
					:submitSearchOnBlur="true"
					:options="paramData.listValues"
				>
					<template v-slot:option="option:TwitchatDataTypes.ParameterDataListValue<unknown>">
						<Icon class="image" v-if="option.icon" :name="option.icon" />
						<img class="image" v-else-if="option.image" :src="option.image">
						<div class="image" v-else>{{option.label != undefined? option.label : $t(option.labelKey!)}}</div>
					</template>

					<template #selected-option="option:TwitchatDataTypes.ParameterDataListValue<unknown>">
						<Icon class="image" v-if="option.icon" :name="option.icon" />
						<img class="image" v-else-if="option.image" :src="option.image">
						<div class="image" v-else>{{option.label != undefined? option.label : $t(option.labelKey!)}}</div>
					</template>
				</vue-select>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'editablelist' || paramData.type == 'font'" class="holder list editable">
				<Icon theme="secondary" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$asset('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'editablelist'+key" v-html="label" v-tooltip="tooltip"></label>

				<div class="listField">
					<vue-select class="listField"
						label="label"
						ref="vueSelect"
						:id="'editablelist'+key"
						:placeholder="placeholder"
						v-model="paramData.value"
						:calculate-position="$placeDropdown"
						appendToBody
						taggable
						v-if="(paramData.type == 'font' && paramData.options) || paramData.type != 'font'"
						:submitSearchOnBlur="true"
						:multiple="paramData.options === undefined"
						:noDrop="paramData.options === undefined"
						:push-tags="paramData.options != undefined"
						:options="paramData.options"
					>
						<template #no-options="{ search, searching, loading }">
							<div>{{ $t("global.empty_list1") }}</div>
							<div>{{ $t("global.empty_list2") }}</div>
						</template>
					</vue-select>
				</div>
				<slot name="composite" />
			</div>

			<div v-if="paramData.type == 'browse'" class="holder browse">
				<Icon theme="secondary" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$asset('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'browse'+key" v-if="label" v-tooltip="tooltip" v-html="label"></label>
				<input v-if="!paramData.noInput" type="text"
					class="filePath"
					v-model="paramData.value"
					:name="paramData.fieldName"
					:id="'browse'+key"
					:placeholder="placeholder"
					:disabled="premiumLocked || disabled !== false || paramData.disabled === true">
				<TTButton v-model:file="paramData.value"
					class="browseBt"
					type="file"
					:secondary="secondary"
					:premium="premium"
					:alert="alert || errorLocal"
					:accept="paramData.accept?paramData.accept:'*'"
					icon="upload"
				/>
			</div>

			<div v-if="paramData.type == 'placeholder'" class="holder placeholder">
				<label :for="'text'+key" v-if="label" v-html="label" v-tooltip="tooltip"></label>
				<div class="inputHolder input-field">
					<PlaceholderField v-model="paramData.value" :maxLength="paramData.maxLength" />
				</div>
			</div>
		</div>

		<PlaceholderSelector class="placeholders" v-if="paramData.placeholderList"
			v-model="paramData.value"
			:placeholders="paramData.placeholderList"
			:secondary="secondary"
			:premium="premiumOnlyLocal"
			:popoutMode="placeholdersAsPopout"
			:alert="alert || errorLocal"
			:target="placeholderTarget"
			@insert="insertPlaceholder"
		/>

		<ParamItem v-for="(c, index) in children"
			class="child"
			ref="param_child"
			:key="'child_'+index+c.id"
			:paramData="c"
			:secondary="secondary"
			:premium="premiumOnlyLocal"
			:alert="alert || errorLocal"
			noBackground
			noPremiumLock
			v-model="c.value"
			:autoFade="autoFade"
			:childLevel="childLevel+1"
			@change="$emit('change')" />

		<transition
		@enter="onShowItem"
		@leave="onHideItem">
			<div class="child" ref="param_child_slot" v-if="showChildren">
				<slot></slot>
				<slot name="child"></slot>
			</div>
		</transition>

		<TTButton class="moreFontsBt" icon="lock_fit" v-if="askForSystemFontAccess" @click="grantSystemFontRead()">{{$t("overlay.credits.grant_fonts_access")}}</TTButton>

		<div class="card-item alert errorMessage" v-if="(error || paramData.error) && (errorMessage || paramData.errorMessage)">{{ errorMessage.length > 0? errorMessage : paramData.errorMessage }}</div>

		<PremiumLockLayer v-if="premiumLocked" />
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch, type ComponentPublicInstance } from '@vue/runtime-core';
import { gsap } from 'gsap/gsap-core';
import CountryFlag from 'vue-country-flag-next';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import DurationForm from '../DurationForm.vue';
import PremiumLockLayer from '../PremiumLockLayer.vue';
import Slider from '../Slider.vue';
import TTButton from '../TTButton.vue';
import ToggleButton from '../ToggleButton.vue';
import PlaceholderSelector from './PlaceholderSelector.vue';
import Config from '@/utils/Config';
import PlaceholderField from '../PlaceholderField.vue';

@Component({
	name:"ParamItem",//This is needed so recursion works properly
	components:{
		TTButton,
		Slider,
		CountryFlag,
		DurationForm,
		ToggleButton,
		PremiumLockLayer,
		PlaceholderField,
		PlaceholderSelector,
	},
	emits: ["change", "update:modelValue", "mouseenter", "mouseleave", "input", "focus", "blur"]
})
export class ParamItem extends Vue {

	@Prop
	public paramData!:TwitchatDataTypes.ParameterData<unknown, unknown, unknown>;

	@Prop({type:Boolean, default:false})
	public error!:boolean;

	@Prop({type:String, default:""})
	public errorMessage!:string;

	@Prop({type:Boolean, default:false})
	public disabled!:boolean;

	@Prop({type:Boolean, default:false})
	public autofocus!:boolean;

	@Prop({type:Number, default:0})
	public childLevel!:number;

	@Prop({type:[String, Number, Boolean, Object, Array], default: null})
	public modelValue!:string|boolean|number|string[];

	@Prop({type:Boolean, default: false})
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	@Prop({type:Boolean, default: false})
	public premium!:boolean;

	@Prop({type:Boolean, default: false})
	public noPremiumLock!:boolean;

	@Prop({type:Boolean, default: false})
	public noBackground!:boolean;

	@Prop({type:Boolean, default: false})
	public autoFade!:boolean;

	@Prop({type:Boolean, default: false})
	public inverseChildrenCondition!:boolean;

	@Prop({type:Number, default: 0})
	public tabindex!:number;

	@Prop({type:Boolean, default: false})
	public placeholdersAsPopout!:boolean;

	@Prop({type:Boolean, default: false})
	public forceChildDisplay!:boolean;

	public key:string = Math.random().toString();
	public children:TwitchatDataTypes.ParameterData<unknown, unknown, unknown>[] = [];
	public placeholderTarget:HTMLTextAreaElement|HTMLInputElement|null = null;
	public errorLocal:boolean = false;
	public premiumOnlyLocal:boolean = false;
	public autofocusLocal:boolean = false;
	public askForSystemFontAccess:boolean = false;
	public isMissingScope:boolean = false;

	private isLocalUpdate:boolean = false;
	private childrenExpanded:boolean = false;

	public get longText():boolean { return this.paramData?.longText === true || (this.textValue?.length > 40 && this.paramData.longText !== false && this.paramData.type != "password"); }

	public get showChildren():boolean {
		if(this.forceChildDisplay !== false) return true;
		let state = (this.paramData.type == 'boolean' && this.paramData.value === true)
				|| (this.paramData.type == 'string' && this.paramData.value != "")
				|| !!this.paramData.value;
		if(this.inverseChildrenCondition) state = !state;

		return (this.$slots.default != undefined || this.$slots.child != undefined) && state;
	}

	public get premiumLocked():boolean { return this.premiumOnlyLocal !== false && !this.$store.auth.isPremium && this.noPremiumLock === false; }

	public get icon():string {
		let defaultIcon = "";
		if(this.paramData.type == "placeholder") defaultIcon = "placeholder";
		return this.paramData.icon ?? defaultIcon ?? "";
	 }

	public get classes():string[] {
		const res = ["paramitem"];
		if(this.noBackground === false) {
			res.push("card-item");
		}else{
			res.push("no-bg");
		}
		if(this.paramData.type == "boolean" && this.paramData.value !== true) res.push("unselected");
		if(this.paramData.type == "string" && this.paramData.value !== "") res.push("unselected");
		if(this.errorLocal !== false) res.push("error");
		else if(this.isMissingScope) res.push("error");
		if(this.longText) res.push("longText");
		if(this.label == '') res.push("noLabel");
		if(this.autoFade !== false) res.push("autoFade");
		if(this.childLevel > 0) res.push("child");
		if(this.icon) res.push("hasIcon");
		if(this.paramData.maxLength) res.push("maxLength");
		if(this.paramData.disabled || this.disabled == true) res.push("disabled");
		if(this.premiumLocked) res.push("cantUse");
		if(this.paramData.type == "time") res.push("time");
		if(this.paramData.type == "font") res.push("font");
		if(this.placeholdersAsPopout !== false) res.push("popoutMode")
		if(this.premiumOnlyLocal !== false && this.noBackground === false) res.push("premium");
		res.push("level_"+this.childLevel);
		return res;
	}

	public get label():string {
		if(!this.paramData) return "";
		let txt = this.paramData.label ?? "";

		let count = 0;
		let v = this.paramData.value as number | string;
		if(this.paramData.type == "number" || this.paramData.type == "integer" || this.paramData.type == "slider") {
			count = parseFloat(this.paramData.value as string) ?? 0;
			if(isNaN(count)) count = 0;
			v = count.toString();
		}else
		if(this.paramData.type == "time" || this.paramData.type == "duration") {
			v = Utils.formatDuration(parseFloat(v.toString()) * 1000);
		}
		if(this.paramData.labelKey) {
			txt += this.$t(this.paramData.labelKey, {VALUE:v}, count);
		}else{
			txt = txt.replace(/\{VALUE\}/gi, (v || 0).toString());
		}
		if(!txt) return "";
		//Puts anything that's between parenthesis inside <span> elements
		return txt.replace(/((\(|\{)[^)]+(\)|\}))/gi, "<span class='small'>$1</span>");
	}

	public get placeholder():string {
		if(!this.paramData) return "";
		let txt = this.paramData.placeholder ?? "";
		if(this.paramData.placeholderKey) {
			txt = this.$t(this.paramData.placeholderKey);
		}
		return txt;
	}

	public get tooltip():string {
		if(this.paramData.tooltip) return this.paramData.tooltip;
		if(this.paramData.tooltipKey) return this.$t(this.paramData.tooltipKey)
		return ""
	}

	public get showMaxLength():boolean {
		return !!this.paramData.maxLength
		&& ((this.paramData.value as string).length/this.paramData.maxLength > .8 || this.paramData.maxLength < 50);
	}

	public get textValue():string {
		if(this.paramData.type == "time") {
			//Convert number value in milliseconds to "hh:mm:ss" string
			const value = ((this.paramData.value as number) || 0);
			const h_ms = 3600;
			const m_ms = 60;
			const h = Math.floor(value / h_ms);
			const m = Math.floor((value - h * h_ms) / m_ms);
			const s = Math.floor((value - h * h_ms - m * m_ms));
			return Utils.toDigits(h)+":"+Utils.toDigits(m)+":"+Utils.toDigits(s);
		}else{
			return this.paramData.value as string;
		}
	}

	public set textValue(value:string) {
		if(this.paramData.allowedCharsRegex) {
			const prevValue = value;
			//Only keep allowed chars if a list is defined
			value = value.replace(new RegExp("[^"+this.paramData.allowedCharsRegex+"]", "gi"), "");
			if(value != prevValue) {
				//set to a new value so a change is detected by vue when modifying it aftewards
				this.paramData.value = "_____this_is_a_fake_value_you_SHOULD_R3aLLY_N0T_use_hehehehehe_____";
			}
		}
		if(this.paramData.type == "time") {
			//Convert string input value "hh:mm:ss" to a number value in milliseconds
			if(!/[0-9]{2}:[0-9]{2}:[0-9]{2}/gi.test(value)) {
				//This line forces the component to rerun the "textValue" getter which parses the duration back
				//to string even if the number hasn't changed. For exemple if field is set to "00:00:00" and user
				//pressed the DEL key on any of the 3 components, the parsed number value will remain "0" which
				//wouldn't trigger the "textValue" getter again and field would be like "00:--:00" instead
				//if "00:00:00". Forcing change of the field here to an invalid value will make sure that
				//setting the value back to the proper value will trigger appropriate watchers
				this.paramData.value = "";
				value = "00:00:00";
			}
			const [h,m,s] = value.split(":").map(v=>parseInt(v));
			this.paramData.value = (h * 3600 + m * 60 + s) || 0;
		}else{
			this.paramData.value = value;

			const input = this.$refs.input as HTMLInputElement;
			let selectStart = input.selectionStart || value.length;
			let selectEnd = input.selectionEnd;

			this.$nextTick().then(()=> {
				const newInput = this.$refs.input as HTMLInputElement;
				if(newInput == input) return;
				//In case there was a switch between a <input> and a <textarea>, set the carret
				//to the same place it was before the switch
				newInput.selectionStart = selectStart;
				newInput.selectionEnd = selectEnd;
			})
		}
	}

	public beforeUpdate(): void {
		// console.log("rerender");
	}

	public beforeMount(): void {
		this.autofocusLocal = this.autofocus;
		this.premiumOnlyLocal = this.premium !== false || this.paramData.premiumOnly === true;
		this.setErrorState(this.error || this.paramData.error === true);

		if(this.modelValue !== null
		&& this.modelValue !== undefined) {
			this.paramData.value = this.modelValue;
		}

		//If it's a boolean and modelValue is undefined, force it to false
		if(this.paramData.type == "boolean" && this.modelValue == undefined) {
			console.warn("PROBABLY AN ISSUE TO FIX WITH A PARAM ITEM:", this.modelValue, this.paramData.labelKey, this.paramData);
			this.paramData.value = false;
			this.$emit("update:modelValue", false);
		}

		//Makes sure value is non-empty and within min/max.
		//For a while some users emptied the field because i didn't block that
		//this kinda fixes these old bad behaviors.
		//also if min/max values are changed this will make sure the value
		//respects the new limits.
		if(this.paramData.type == "number" || this.paramData.type == "integer") {
			if(typeof this.paramData.value == 'number') {
				this.clampValue();
			}
		}

		if(this.paramData.type == "font") {
			this.paramData.value = this.modelValue;
			if ("queryLocalFonts" in window) {
				this.askForSystemFontAccess = false;
				try {
					navigator.permissions.query(
						//@ts-ignore
						{ name: "local-fonts" }
					).then(granted => {
						if(granted.state == "prompt") {
							// Ask for font access if not running in OBS as they doesn't support Font API
							this.askForSystemFontAccess = !Config.instance.OBS_DOCK_CONTEXT;
						}else
						if(granted.state == "granted") {
							this.grantSystemFontRead();
						}
						if(granted.state != "granted") {
							this.getLocalFonts();
						}
					}).catch(error => {
						console.log("FONT FAILLURE");
						console.log(error);

					});
				}catch(error) {
					console.log("FONT FAILLURE2");
					console.log(error);
				}

			}else{
				this.getLocalFonts();
			}
		}

		watch(()=>this.$store.auth.twitch.scopes, ()=>{
			this.isMissingScope = this.paramData.twitch_scopes !== undefined
				&& this.paramData.twitch_scopes.length > 0
				&& !TwitchUtils.hasScopes(this.paramData.twitch_scopes);
			this.setErrorState(this.error || this.isMissingScope);
		}, {immediate:true});
	}

	public mounted():void {
		watch(()=>this.modelValue, (value:string | number | boolean | string[])=>{
			if(value !== null
			&& value !== undefined) {
				this.paramData.value = value;
			}
		});

		watch(() => this.paramData.value, () => this.onEdit(), {deep:true});

		watch(() => this.paramData.error, ()=> this.setErrorState(this.paramData.error === true));

		watch(() => this.paramData.listValues, ()=> this.updateSelectedListValue());

		watch(() => this.paramData.children, () => this.buildChildren() );

		watch(() => this.error, ()=> this.setErrorState(this.error === true) );

		if(this.paramData.type == "number") {
			watch(() => this.paramData.max, () => this.clampValue() );
			watch(() => this.paramData.min, () => this.clampValue() );
		}

		this.buildChildren();

		if(this.paramData.listValues && this.paramData.listValues.length > 0 && this.paramData.multiple !== true) {
			//Check if the value is on the listValues.
			//If not, fallback to the first value.
			let found;
			for (let i = 0; i < this.paramData.listValues.length; i++) {
				const entry = this.paramData.listValues[i];
				if(entry.group) {
					const v = entry.group.find(v=>v.value === this.paramData.value);
					if(v) {
						found = v;
						break
					}
				}else if(entry.value === this.paramData.value) {
					found = entry;
					break;
				}
			}
			if(!found) {
				this.paramData.value = this.paramData.listValues[0].value;
			}
			this.updateSelectedListValue();
		}

		if(this.paramData.placeholderList && this.paramData.placeholderList.length > 0) {
			if(this.paramData.type == "string") {
				this.placeholderTarget = this.$el.querySelector("textarea,input");
			// }else{
				// throw new Error("For \"placeholderList\" to work, \"paramData\" type must be \"text\". Current type is \""+this.paramData.type+"\"");
			}
		}

		//Set this to true so we keep focus on the text field when it switches
		//between <input> and <textarea> depending on the text length
		//This won't affect first rendering, only subsequent ones
		this.autofocusLocal = true;

		//Force a model value update.
		//This is necessary for default values to be applied to the
		//v-model value on first render.
		if(this.modelValue != null && this.modelValue != this.paramData.value) this.onEdit();
	}

	/**
	 * Called when item is clicked.
	 * If parameter requires a specific scope that's not granted, the
	 * clicke event is blocked and user is asked to grant permission.
	 * @param event
	 */
	public clickItem(event:MouseEvent):void {
		if(this.paramData.twitch_scopes) {
			if(TwitchUtils.hasScopes(this.paramData.twitch_scopes)) return;
			this.paramData.value = false;
			this.setErrorState(false);
			event.stopPropagation();
			this.$store.auth.requestTwitchScopes(this.paramData.twitch_scopes);
		}
	}

	/**
	 * Called when value changes
	 */
	public onEdit():void {
		if(this.premiumLocked) return;

		this.updateSelectedListValue();

		if(this.isLocalUpdate) return;

		this.isLocalUpdate = true;
		if(Array.isArray(this.paramData.value) && this.paramData.type == "editablelist") {
			//Limite items sizes
			const maxLength = this.paramData.maxLength || 300;
			const list = (this.paramData.value as string[]);
			list.forEach((v,i)=> list[i] = v.substring(0, maxLength));

			//Limit number of items of the editablelist
			const maxItem = this.paramData.max ?? 999;
			if(list.length > maxItem) {
				this.paramData.value.splice(0, Math.max(0, list.length-maxItem));
			}
		}

		if(this.paramData.type == "editablelist") {
			const list = this.$refs.vueSelect as any;
			if(this.paramData.options && list.pushedTags) {
				//If there's a list of options, cleanup any custom options added that
				//is not the currently selected one
				for (let i = 0; i < list.pushedTags.length; i++) {
					const opt = list.pushedTags[i];
					if(opt == this.paramData.value as string) continue;
					if(this.paramData.options.includes(opt)) continue;
					list.pushedTags.splice(i, 1);
				}
			}

			if(list.dropdownOpen) {
				list.closeSearchOptions();
			}
		}else

		if(this.paramData.type == "imagelist") {
			if(this.paramData.value === null) this.paramData.value = "";
		}

		if((this.paramData.type != "number" && this.paramData.type != "integer") || this.paramData.value !== "") {
			const prevValue = this.modelValue;
			this.$emit("update:modelValue", this.paramData.value);
			this.$emit("change", prevValue, this.paramData.value);
			if(this.paramData.editCallback) {
				this.paramData.editCallback(this.paramData);
			}
		}

		this.buildChildren();

		this.$nextTick().then(()=>{
			this.isLocalUpdate = false;
		});
	}

	/**
	 * Create children
	 */
	private async buildChildren():Promise<void> {
		if(this.paramData.value === false){
			//Collapse children
			this.childrenExpanded = false;
			if(this.children.length > 0) {
				//Hide transition
				const childrenItems = this.$refs.param_child as ComponentPublicInstance[];
				if(childrenItems) {
					let divs:HTMLDivElement[] = childrenItems.map(v => v.$el) as HTMLDivElement[];
					gsap.killTweensOf(divs);
					gsap.to(divs, {overflow:"hidden", height:0, paddingTop:0, marginTop:0, paddingBottom:0, marginBottom:0, duration:0.25, stagger:0.025,
						onComplete:()=> {
							this.children = [];
						}});
				}
			}
			return;
		}

		const list = this.$store.params.$state;
		let children:TwitchatDataTypes.ParameterData<unknown, unknown, unknown>[] = [];
		for (const key in list) {
			const params = list[key as TwitchatDataTypes.ParameterCategory];
			for (const key2 in params) {
				if(params[key2].parent != undefined && params[key2].parent == this.paramData.id) {
					children.push(params[key2]);
				}
			}
		}

		if(this.paramData.children) {
			children = children.concat(this.paramData.children);
		}

		if(this.children == children) return;

		this.children = children;
		await this.$nextTick();

		if(children.length > 0 && !this.childrenExpanded && this.$refs.param_child){
			//Show transitions
			const childrenItems = this.$refs.param_child as ComponentPublicInstance[];
			let divs:HTMLDivElement[] = childrenItems.map(v => v.$el) as HTMLDivElement[];
			gsap.killTweensOf(divs);
			gsap.from(divs, {overflow:"hidden", height:0, paddingTop:0, marginTop:0, paddingBottom:0, marginBottom:0, duration:0.25, stagger:0.025, clearProps:"all"});
		}
		this.childrenExpanded = true;
	}

	public clampValue():void {
		if(this.paramData.value === ""
		&& (this.paramData.type == "number" || this.paramData.type == "integer")) {
			this.paramData.value = 0;
		}

		if(this.paramData.type == "integer") {
			this.paramData.value = Math.round(this.paramData.value as number);
		}

		if(this.paramData.max != undefined && this.paramData.value as number > this.paramData.max) this.paramData.value = this.paramData.max;
		if(this.paramData.min != undefined && this.paramData.value as number < this.paramData.min) this.paramData.value = this.paramData.min;

		// this.onEdit();
	}

	public insertPlaceholder(tag:string):void {
		if(this.paramData.type == "editablelist") {
			(this.paramData.value as string[]).push(tag);
		}else if(this.paramData.type == "number" || this.paramData.type == "integer") {
			this.paramData.value = tag;
		}else {
			// console.log(this.textValue, tag)
			// this.textValue += tag;
		}
		this.onEdit();
	}

	private setErrorState(state:boolean) {
		if(this.paramData.twitch_scopes && !TwitchUtils.hasScopes(this.paramData.twitch_scopes)) {
			this.errorLocal = true;
		}else{
			this.errorLocal = state;
		}
	}

	public async onShowItem(el:Element, done:()=>void):Promise<void> {
		gsap.from(el, {overflow:"hidden", height:0, duration:.2, marginTop:0, ease:"sine.out", clearProps:"all", onComplete:()=>{
			done();
		}});
	}

	public onHideItem(el:Element, done:()=>void):void {
		gsap.to(el, {overflow:"hidden", height:0, duration:.2, marginTop:0, ease:"sine.out", onComplete:()=>{
			done();
		}});
	}

	private updateSelectedListValue():void {
		if((this.paramData.type == "list" || this.paramData.type == "imagelist") && this.paramData.listValues) {
			this.paramData.selectedListValue = this.paramData.listValues.find(v=>v.value == this.paramData.value);
		}
	}

	/**
	 * Get local fonts
	 */
	public async getLocalFonts():Promise<void>{
		Utils.listAvailableFonts().then(result => {
			this.paramData.options = result.fonts.concat();
			if(this.paramData.options.indexOf(this.paramData.value as string) == -1) {
				this.paramData.options.push(this.paramData.value as string);
			}
			this.paramData.options = this.paramData.options.sort();
		});
	}

	/**
	 * Grant access to system fonts
	 */
	public async grantSystemFontRead():Promise<void>{
		Utils.listAvailableFonts(true).then(result => {
			this.paramData.options = result.fonts.sort();
			this.askForSystemFontAccess = result?.systemGranted !== true;
			if(!this.paramData.value) {
				this.paramData.value = "Inter";
			}
		});
	}
}
export default toNative(ParamItem);
</script>

<style scoped lang="less">
.paramitem{
	overflow: unset;
	position: relative;
	transition: padding .25s, opacity .2s;
	display: flex;
	flex-direction: column;
	justify-content: center;

	label {
		white-space: pre-line;
	}

	&:not(.disabled)>.content:hover::before {
		opacity: 1;
	}
	&:not(.disabled)>.content::before {
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
		input, select, textarea {
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
		.toggleButton, input, textarea, label {
			pointer-events: none;
		}
		label, .icon {
			opacity: .75;
		}
	}

	&.error {
		cursor: not-allowed;
		background-color: var(--color-alert-fader) !important;
		.errorMessage {
			font-size: .9em;
			margin-top: .5em;
			text-align: center;
		}
		label {
			cursor: unset !important;
		}
	}

	&.unselected.autoFade {
		.content {
			opacity: .5;
		}
	}

	&.maxLength {
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
		transition: background-color .1s;
		position: relative;

		textarea {
			width: 100%;
		}

		.holder {
			flex-grow: 1;
			display: flex;
			flex-direction: row;
			align-items: center;
			row-gap: .25em;
			&:has(input) {
				flex-wrap: wrap;
			}
		}

		.icon {
			width: 1em;
			height: 1em;
			align-self: flex-start;
			margin-right: .5em;
			flex-shrink: 0;
		}


		.helpIcon {
			width: 20px;
			margin-right: .25em;
		}

		.toggleButton {
			align-self: flex-start;
		}

		.toggle, .number, .text, .list, .browse, .color, .placeholder {
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
			&.number, &.text {
				.inputHolder {
					position: relative;
					flex-grow: 1;
					overflow: hidden;
					border-radius: var(--border-radius);
					.maxlength {
						font-size: .7em;
						position: absolute;
						right: 0;
						bottom: 0;
						transform: unset;
						pointer-events: none;
						background-color: var(--grayout);
						padding: .25em;
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
							width:1.5em;
							height: 100%;
							background-color: var(--color-text);
							color:var(--grayout);
							position: absolute;
							left: 0;
							padding: .25em;
						}
					}
				}
			}
			&.number {
				input {
					flex-basis: 80px;
				}

				label {
					margin-top: .4em;
				}
			}

			&.duration {
				input {
					flex-basis: 100px;
				}
			}
		}

		.toggle{
			flex-grow: 1;
		}

		:deep(.small) {
			font-size: .75em;
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
				background: linear-gradient(90deg, var(--color-dark-light) 50%, var(--color-dark-fadest) 50%);
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
					background: #04AA6D;
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
				width:auto;
				max-width:unset;
				text-align: left;
			}
			.browseBt {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
		}

		input, select, textarea, .listField {
			transition: background-color .25s;
			flex-basis: 300px;
			text-overflow: ellipsis;
			width: 100%;
		}

		&:has(.list, .number, .time) .paramIcon {
			margin-top: .4em;
		}

		img.paramIcon {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}

		.list {

			label {
				margin-top: .4em;
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
				margin-top: .4em;
			}
		}
	}

	&.child, :deep(.parameter-child) {
		margin-left: auto;
		margin-right: 0;
		margin-top: 5px;
		@padding:1.5em;
		width: calc(100% - @padding);
		position: relative;
		.holder {
			// font-size: .9em;
			&::before {
				position: absolute;
				left: -1em;
				top: .1em;
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
		&>.placeholders {
			margin-left:1.5em;
		}
	}

	&.popoutMode {
		position: relative;
		.placeholders{
			position: absolute;
			right: 0;
			// top: 2px;
			top: calc(50%);
			transform: translateY(-50%);
			height: calc(100% - 4px);
		}
		&:not(.no-bg) {
			.placeholders {
				height: calc(100% - 1em);
			}
		}
		input, .button {
			padding-right: 1.25em !important;
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
				opacity: .5;
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
		margin: .5em auto 0 auto;
	}

	&.font {
		.holder.list.editable  {
			flex-direction: row;
			.listField {
				flex-basis: 300px;
			}
		}
	}
}
</style>
