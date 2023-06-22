<template>
	<div :class="classes"
	@mouseenter="$emit('mouseenter', $event, paramData)"
	@mouseleave="$emit('mouseleave', $event, paramData)"
	@click.capture="clickItem($event)">
		<div class="content">
			<Icon :theme="paramData.iconTheme" :name="paramData.icon" v-if="paramData.icon" class="icon" />
			<img :src="paramData.iconURL" v-if="paramData.iconURL" class="icon">

			<div v-if="paramData.type == 'boolean'" class="holder toggle"
			:aria-label="label+': '+(paramData.value? 'anabled' : 'disabled')"
			>
				<Icon :theme="paramData.iconTheme" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$image('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>
				
				<label :for="'toggle'+key"
					v-if="label"
					v-html="label"
					v-tooltip="{content:tooltip, followCursor:'horizontal'}"
					@click="if(!paramData.noInput) paramData.value = !paramData.value;"></label>
				
				<ToggleButton v-if="!paramData.noInput" class="toggleButton"
					v-model="paramData.value"
					:secondary="secondary"
					:alert="alert || errorLocal"
					:id="'toggle'+key" />
			</div>
			
			<div v-if="paramData.type == 'number'" class="holder number">
				<Icon :theme="paramData.iconTheme" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$image('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'number'+key" v-if="label" v-html="label" v-tooltip="tooltip"></label>
				<input v-if="!paramData.noInput" ref="input"
					:tabindex="tabindex"
					type="number"
					v-model.number="paramData.value"
					v-autofocus="autofocus"
					:id="'number'+key"
					:min="paramData.min"
					:max="paramData.max"
					:step="paramData.step"
					@blur="clampValue()"
					@input="$emit('input')">
			</div>
			
			<div v-if="paramData.type == 'string' || paramData.type == 'password'" class="holder text">
				<Icon :theme="paramData.iconTheme" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$image('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'text'+key" v-if="label" v-html="label" v-tooltip="tooltip"></label>
				<div class="inputHolder">
					<textarea ref="input" v-if="paramData.longText===true && !paramData.noInput"
						:tabindex="tabindex"
						v-model="textValue"
						rows="3"
						:id="'text'+key"
						:name="paramData.fieldName"
						:placeholder="placeholder"
						v-autofocus="autofocus"
						@input="$emit('input')"></textarea>
					<input ref="input" v-if="paramData.longText!==true && !paramData.noInput"
						:tabindex="tabindex"
						v-model="textValue"
						v-autofocus="autofocus"
						:name="paramData.fieldName"
						:id="'text'+key"
						:type="paramData.type"
						:placeholder="placeholder"
						:maxlength="paramData.maxLength? paramData.maxLength : 524288"
						autocomplete="new-password"
						@input="$emit('input')">
					<div class="maxlength" v-if="paramData.maxLength">{{(paramData.value as string).length}}/{{paramData.maxLength}}</div>
				</div>
			</div>
			
			<div v-if="paramData.type == 'color'" class="holder color">
				<Icon :theme="paramData.iconTheme" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$image('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'text'+key" v-if="label" v-html="label" v-tooltip="tooltip"></label>
				<div class="inputHolder input-field" :style="{backgroundColor: paramData.value as string }">
					<input ref="input" v-if="!paramData.noInput"
						:tabindex="tabindex"
						v-model="textValue"
						v-autofocus="autofocus"
						:name="paramData.fieldName"
						:id="'text'+key"
						type="color"
						@input="$emit('input')">
				</div>
			</div>
			
			<div v-if="paramData.type == 'slider'" class="holder slider">
				<Icon :theme="paramData.iconTheme" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$image('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'slider'+key" v-html="label" v-tooltip="tooltip"></label>
				<Slider :min="paramData.min" :max="paramData.max" :step="paramData.step" v-model="paramData.value" :secondary="secondary" :alert="alert || errorLocal" />
			</div>
			
			<div v-if="paramData.type == 'list'" class="holder list">
				<Icon :theme="paramData.iconTheme" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$image('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'list'+key" v-html="label" v-tooltip="tooltip"></label>
				<select v-if="!paramData.noInput" ref="input"
					:id="'list'+key"
					v-model="paramData.value"
					v-autofocus="autofocus">
					<option v-for="a in paramData.listValues" :key="a.label? a.label : a.labelKey" :value="a.value">{{a.label? a.label : $t(a.labelKey!)}}</option>
				</select>
			</div>
			
			<div v-if="paramData.type == 'editablelist'" class="holder list editable">
				<Icon :theme="paramData.iconTheme" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$image('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>

				<label :for="'list'+key" v-html="label" v-tooltip="tooltip"></label>
				<vue-select class="listField" label="label"
					:id="'list'+key"
					ref="vueSelect"
					:placeholder="placeholder"
					v-model="paramData.value"
					:calculate-position="$placeDropdown"
					@search="onSearch()"
					@option:created="onCreateListItem()"
					@option:selected="onEdit()"
					@search:blur="submitListItem()"
					appendToBody
					taggable
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
				<button class="listSubmitBt"
				:secondary="secondary"
				:alert="alert || errorLocal"
				@click="submitListItem()" v-if="searching"
				><img src="@/assets/icons/checkmark.svg" alt="submit"></button>
			</div>
			
			<div v-if="paramData.type == 'browse'" class="holder browse">
				<Icon :theme="paramData.iconTheme" class="helpIcon" name="help" v-if="paramData.example"
					v-tooltip="{content:'<img src='+$image('img/param_examples/'+paramData.example)+'>', maxWidth:'none'}"
				/>
				
				<label :for="'browse'+key" v-if="label" v-tooltip="tooltip" v-html="label"></label>
				<input v-if="!paramData.noInput" type="text"
					class="filePath"
					v-model="paramData.value"
					:name="paramData.fieldName"
					:id="'browse'+key"
					:placeholder="placeholder">
				<Button v-model:file="paramData.value"
					class="browseBt"
					type="file"
					:secondary="secondary"
					:alert="alert || errorLocal"
					:accept="paramData.accept?paramData.accept:'*'"
					icon="upload"
				/>
			</div>
		</div>
		
		<PlaceholderSelector class="placeholders" v-if="paramData.placeholderList"
			:target="placeholderTarget"
			:placeholders="paramData.placeholderList"
			v-model="paramData.value"
			@insert="insertPlaceholder"
		/>

		<ParamItem v-for="(c, index) in children"
			class="child"
			ref="param_child"
			:key="'child_'+index+c.id"
			:paramData="c"
			:secondary="secondary"
			:alert="alert || errorLocal"
			noBackground
			:childLevel="childLevel+1" />

		<div class="child" ref="param_child_slot" v-if="$slots.default || $slots.child">
			<slot></slot>
			<slot name="child"></slot>
		</div>

		<div class="card-item alert errorMessage" v-if="(error && errorMessage) || paramData.errorMessage">{{ errorMessage.length > 0? errorMessage : paramData.errorMessage }}</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ToggleButton from '../ToggleButton.vue';
import PlaceholderSelector from './PlaceholderSelector.vue';
import Slider from '../Slider.vue';

@Component({
	name:"ParamItem",//This is needed so recursion works properly
	components:{
		Button,
		Slider,
		ToggleButton,
		PlaceholderSelector,
	},
	emits: ["change", "update:modelValue", "mouseenter", "mouseleave", "input"]
})
export default class ParamItem extends Vue {
	
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
	public noBackground!:boolean;

	@Prop({type:Boolean, default: false})
	public autoFade!:boolean;

	@Prop({type:Number, default: 0})
	public tabindex!:number;

	public searching:boolean = false;
	public key:string = Math.random().toString();
	public children:TwitchatDataTypes.ParameterData<unknown, unknown, unknown>[] = [];
	public placeholderTarget:HTMLTextAreaElement|HTMLInputElement|null = null;
	public errorLocal:boolean = false

	private file:unknown = {};
	private isLocalUpdate:boolean = false;
	private childrenExpanded:boolean = false;

	public get classes():string[] {
		const res = ["paramitem"];
		if(this.noBackground === false) {
			res.push("card-item");
			if(this.paramData.value === false) res.push("unselected");
		}else{
			res.push("no-bg");
		}
		if(this.errorLocal !== false) res.push("error");
		else if(this.paramData.twitch_scopes && !TwitchUtils.hasScopes(this.paramData.twitch_scopes)) res.push("error");
		if(this.paramData.longText) res.push("longText");
		if(this.label == '') res.push("noLabel");
		if(this.autoFade !== false) res.push("autoFade");
		if(this.childLevel > 0) res.push("child");
		if(this.paramData.icon) res.push("hasIcon");
		if(this.paramData.maxLength) res.push("maxLength");
		if(this.paramData.disabled || this.disabled == true) res.push("disabled");
		res.push("level_"+this.childLevel);
		return res;
	}

	public get label():string {
		if(!this.paramData) return "";
		let txt = this.paramData.label ?? "";
		
		let count = 0;
		if(this.paramData.labelKey) {
			let v = this.paramData.value;
			if(this.paramData.type == "number") {
				count = parseFloat(this.paramData.value as string) ?? 0;
				if(isNaN(count)) count = 0;
				v = count.toString();
			}else if(this.paramData.type == "slider") {
				count = this.paramData.value as number;
			}
			txt += this.$tc(this.paramData.labelKey, count, {VALUE:v});
		}
		
		if(!txt) return "";
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

	public get textValue():string {
		return this.paramData.value as string;
	}

	public set textValue(value:string) {
		if(this.paramData.allowedCharsRegex) {
			const prevValue = value;
			//Only keep allowed chars if a list is defined
			value = value.replace(new RegExp("[^"+this.paramData.allowedCharsRegex+"]", "gi"), "");
			if(value != prevValue) {
				//set to a new value so a change is detected by vue when modifying it aftewards
				this.paramData.value = "_____this_is_a_fake_value_you_should_not_use_hehehehehe_____";
			}
		}
		this.paramData.value = value;
	}

	public beforeUpdate(): void {
		// console.log("rerender");
	}

	public beforeMount(): void {
		this.setErrorState(this.error || this.paramData.error === true);
	}

	public mounted():void {
		if(this.modelValue !== null
		&& this.modelValue !== undefined) {
			this.paramData.value = this.modelValue;
		}
		watch(()=>this.modelValue, (value:string | number | boolean | string[])=>{
			if(value !== null
			&& value !== undefined) {
				this.paramData.value = value;
			}
		});
		
		watch(() => this.paramData.value, () => this.onEdit());
		
		watch(() => this.paramData.error, ()=> this.setErrorState(this.paramData.error === true));
		
		watch(() => this.error, ()=> this.setErrorState(this.error === true) );
		
		watch(() => this.paramData.children, () => this.buildChildren() );
		
		watch(() => this.file, () => console.log(this.file) );
		
		this.buildChildren();
		
		if(this.paramData.listValues && this.paramData.listValues.length > 0) {
			//Check if the value is on the listValues.
			//If not, fallback to the first value.
			if(!this.paramData.listValues.find(v=>v.value === this.paramData.value)) {
				this.paramData.value = this.paramData.listValues[0].value;
			}
		}

		if(this.paramData.placeholderList && this.paramData.placeholderList.length > 0) {
			if(this.paramData.type == "string") {
				this.placeholderTarget = this.$el.querySelector("textarea,input");
			// }else{
				// throw new Error("For \"placeholderList\" to work, \"paramData\" type must be \"text\". Current type is \""+this.paramData.type+"\"");
			}
		}
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
			this.$store("auth").requestTwitchScopes(this.paramData.twitch_scopes);
		}
	}

	/**
	 * Called when value changes
	 */
	public onEdit():void {
		if(this.isLocalUpdate) return;
		this.isLocalUpdate = true;
		if(Array.isArray(this.paramData.value) && this.paramData.type == "editablelist") {
			//Limit number of items of the editablelist
			const max = this.paramData.maxLength ?? this.paramData.max ?? Number.MAX_SAFE_INTEGER;
			if((this.paramData.value as string[]).length > max) {
				this.paramData.value = (this.paramData.value as string[]).slice(-max);
			}
		}

		if(this.paramData.type == "editablelist") {
			if(this.paramData.options) {
				//If there's a list of options, cleanup any custom options added that
				//is not the currently selected one
				const list = this.$refs.vueSelect as any;
				for (let i = 0; i < list.pushedTags.length; i++) {
					const opt = list.pushedTags[i];
					if(opt == this.paramData.value as string) continue;
					if(this.paramData.options.includes(opt)) continue;
					list.pushedTags.splice(i, 1);
				}
			}
			const list = this.$refs.vueSelect as any;
			if(list.dropdownOpen) {
				list.closeSearchOptions();
			}
		}

		if(this.paramData.save === true) {
			this.$store("params").updateParams();
		}
		this.$emit("update:modelValue", this.paramData.value);
		this.$emit("change");
		if(this.paramData.editCallback) {
			this.paramData.editCallback(this.paramData.value);
		}
		this.buildChildren();
		this.$nextTick().then(()=>{
			this.isLocalUpdate = false;
		})
	}

	/**
	 * vue-select component is lacking a "submit" button when "noDrop"
	 * option is enabled. User has to find out they have to hit "Enter"
	 * to create a new entry. This is far from ideal in terms of UX.
	 * 
	 * This method is called anytime somehting's written on the input
	 * to display a custom submit button if there's text
	 */
	public onSearch():void {
		this.searching = (this.$refs.vueSelect as any).search.length > 0;
	}

	/**
	 * Called when creating a new item on <vue-select> component
	 */
	public async onCreateListItem():Promise<void> {
		//This is a workaround an issue with vue-select that throws a "searching"
		//event after creating an item.
		//Without this frame delay the searching flag would be reset to "true"
		//right after setting it to false here.
		await this.$nextTick();
		this.searching = false;

		//Trim spaces around the values
		let list = Array.isArray(this.paramData.value)? this.paramData.value as string[] : this.paramData.options as string[];
		if(!list) list = [];
		for (let i = 0; i < list.length; i++) {
			list[i] = list[i].trim();
		}

		this.onEdit();
	}

	/**
	 * Called when custom submit button for the <vue-select> component
	 * is clicked.
	 * @see onSearch() for more details about why this hack
	 */
	public submitListItem():void {
		this.searching = false;
		(this.$refs.vueSelect as any).typeAheadSelect();
	}

	private async buildChildren():Promise<void> {
		if(this.paramData.value === false){
			this.childrenExpanded = false;
			if(this.children.length > 0 || this.$refs.param_child_slot) {
				//Hide transition
				let divs:HTMLDivElement[] = [];
				if(this.$refs.param_child_slot) {
					divs = [this.$refs.param_child_slot as HTMLDivElement];
				}else{
					const childrenItems = this.$refs.param_child as Vue[];
					divs = childrenItems.map(v => v.$el) as HTMLDivElement[];
				}
				gsap.to(divs, {overflow:"hidden", height:0, paddingTop:0, marginTop:0, paddingBottom:0, marginBottom:0, duration:0.25, stagger:0.05,
					onComplete:()=> {
						this.children = [];
					}});
			}
			return;
		}

		const list = this.$store("params").$state;
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

		if(children.length > 0 || this.$refs.param_child_slot){
			//Show transitions
			let divs:HTMLDivElement[] = [];
			if(this.$refs.param_child_slot) {
				divs = [this.$refs.param_child_slot as HTMLDivElement];
			}else{
				const childrenItems = this.$refs.param_child as Vue[];
				divs = childrenItems.map(v => v.$el) as HTMLDivElement[];
			}
			if(!this.childrenExpanded) {
				gsap.from(divs, {overflow:"hidden", height:0, paddingTop:0, marginTop:0, paddingBottom:0, marginBottom:0, duration:0.25, stagger:0.05, clearProps:"all"});
			}
		}
		this.childrenExpanded = true;
	}

	public clampValue():void {
		if(this.paramData.max != undefined && this.paramData.value as number > this.paramData.max) this.paramData.value = this.paramData.max;
		if(this.paramData.min != undefined && this.paramData.value as number < this.paramData.min) this.paramData.value = this.paramData.min;
	}

	public insertPlaceholder(tag:string):void {
		if(this.paramData.type == "editablelist") {
			(this.paramData.value as string[]).push(tag);
		}
	}

	private setErrorState(state:boolean) {
		if(this.paramData.twitch_scopes && !TwitchUtils.hasScopes(this.paramData.twitch_scopes)) {
			this.errorLocal = true;
		}else{
			this.errorLocal = state;
		}
	}
}
</script>

<style scoped lang="less">
.paramitem{
	overflow: unset;
	transition: padding .25s;
	position: relative;
	transition: opacity .2s;
	
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

	// &:not(.no-bg) {
	// 	transition: background-color .2s;
	// }

	&.longText {
		.content {
			.text {
				flex-grow: 1;
				display: flex;
				flex-direction: column;
				align-items: flex-start;
				.inputHolder {
					width: 100%;
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
		}
	}

	&.disabled:not(.error) {
		filter: grayscale();
		cursor: unset;
		.toggleButton, input, textarea, label {
			pointer-events: none;
		}
	}
	
	&.error {
		cursor: not-allowed;
		background-color: var(--color-alert-fadest) !important;
		.errorMessage {
			font-size: .9em;
			margin-top: .5em;
			text-align: center;
		}
		label {
			opacity: .5;
			cursor: unset !important;
		}
	}

	&.unselected.autoFade {
		opacity: .4;
		// background-color: var(--background-color-fadest);
		// background-color: var(--color-secondary-fadest);
	}

	&.maxLength {
		.content {
			.number, .text {
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
		}
		

		.helpIcon {
			@size: 20px;
			width: @size;
			margin-right: .25em;
		}

		.toggleButton {
			align-self: flex-start;
		}
		
		.toggle, .number, .text, .list, .browse, .color{
			flex-grow: 1;
			display: flex;
			flex-direction: row;
			label {
				flex-grow: 1;
				flex-basis: min-content;
				align-self: stretch;
				margin: 0;
				padding-right: 1em;
				line-height: 1.1em;
				cursor: pointer;
			}
			&.number, &.text {
				.inputHolder {
					position: relative;
					flex-grow: 1;
					.maxlength {
						font-size: .7em;
						position: absolute;
						right: .5em;
						bottom: .5em;
						transform: unset;
					}
					input {
						width: 100%;
						max-width: unset;
					}
				}
			}
			&.number {
				input {
					flex-basis: 80px;
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

		.list {

			label {
				flex-basis: unset;
			}

			.listField {
				:deep(.vs__dropdown-toggle) {
					width: 100%;
				}
			}
			
			.listSubmitBt {
				position: absolute;
				right: 10px;
				bottom: 7px;
				cursor: pointer;
				z-index: 1;
				img {
					height: 1em;
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

	&.level_1,
	&.level_2,
	&.level_3,
	&.level_4 {
		.child {
			width: 100%;
		}
	}

	&.child, .child {
		margin-left: auto;
		margin-right: 0;
		margin-top: 5px;
		@padding:1.5em;
		width: calc(100% - @padding);
		position: relative;
		:deep(.holder) {
			font-size: .9em;
			&::before {
				position: absolute;
				left: -1.5em;
				top: .2em;
				font-size: 1.1em;
				content: "⤷";
				display: block;
			}
		}
	}

	&.hasIcon {
		.placeholders {
			padding-left:1.5em;
		}
	}
}
</style>