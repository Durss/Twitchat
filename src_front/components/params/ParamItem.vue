<template>
	<div :class="classes" :data-tooltip="paramData.tooltip"
	@mouseenter="$emit('mouseenter', $event, paramData)"
	@mouseleave="$emit('mouseleave', $event, paramData)">
		<div class="content">
			<img :src="$image('icons/'+paramData.icon)" v-if="paramData.icon" class="icon">
			<img :src="paramData.iconURL" v-if="paramData.iconURL" class="icon">

			<div v-if="paramData.type == 'toggle'" class="holder toggle"
			:aria-label="label+': '+(paramData.value? 'anabled' : 'disabled')"
			>
				<img v-if="paramData.example" alt="help"
					src="@/assets/icons/help_purple.svg"
					:data-tooltip="'<img src='+$image('img/param_examples/'+paramData.example)+'>'"
					class="helpIcon"
				>
				
				<label :for="'toggle'+key"
					v-if="label"
					v-html="label"
					@click="if(!paramData.noInput) paramData.value = !paramData.value;"></label>
				
				<ToggleButton v-if="!paramData.noInput" class="toggleButton"
					v-model="paramData.value"
					:id="'toggle'+key"
					:clear="clearToggle" />
			</div>
			
			<div v-if="paramData.type == 'number'" class="holder number">
				<img v-if="paramData.example" alt="help"
					src="@/assets/icons/help_purple.svg"
					:data-tooltip="'<img src='+$image('img/param_examples/'+paramData.example)+'>'"
					class="helpIcon"
				>
				<label :for="'number'+key" v-if="label" v-html="label"></label>
				<input v-if="!paramData.noInput" ref="input"
					type="number"
					v-model.number="paramData.value"
					v-autofocus="autofocus"
					:id="'number'+key"
					:min="paramData.min"
					:max="paramData.max"
					:step="paramData.step"
					@blur="clampValue()">
			</div>
			
			<div v-if="paramData.type == 'text' || paramData.type == 'password'" class="holder text">
				<img v-if="paramData.example" alt="help"
					src="@/assets/icons/help_purple.svg"
					:data-tooltip="'<img src='+$image('img/param_examples/'+paramData.example)+'>'"
					class="helpIcon"
				>
				<label :for="'text'+key" v-if="label" v-html="label"></label>
				<textarea ref="input" v-if="paramData.longText===true && !paramData.noInput"
					v-model.lazy="textValue"
					rows="2"
					:id="'text'+key"
					:name="paramData.fieldName"
					:placeholder="paramData.placeholder"
					v-autofocus="autofocus"></textarea>
				<input ref="input" v-if="paramData.longText!==true && !paramData.noInput"
					v-model.lazy="paramData.value"
					v-autofocus="autofocus"
					:name="paramData.fieldName"
					:id="'text'+key"
					:type="paramData.type"
					:placeholder="paramData.placeholder"
					:maxlength="paramData.maxLength? paramData.maxLength : 524288"
					autocomplete="new-password">
			</div>
			
			<div v-if="paramData.type == 'slider'" class="holder slider">
				<img v-if="paramData.example" alt="help"
					src="@/assets/icons/help_purple.svg"
					:data-tooltip="'<img src='+$image('img/param_examples/'+paramData.example)+'>'"
					class="helpIcon"
				>
				<label :for="'slider'+key" v-html="label"></label>
				<input v-if="!paramData.noInput" ref="input" type="range"
					:min="paramData.min"
					:max="paramData.max"
					:step="paramData.step"
					:id="'slider'+key"
					v-model.number="paramData.value"
					v-autofocus="autofocus">
			</div>
			
			<div v-if="paramData.type == 'list'" class="holder list">
				<img v-if="paramData.example" alt="help"
					src="@/assets/icons/help_purple.svg"
					:data-tooltip="'<img src='+$image('img/param_examples/'+paramData.example)+'>'"
					class="helpIcon"
				>
				<label :for="'list'+key">{{paramData.label}}</label>
				<select v-if="!paramData.noInput" ref="input"
					:id="'list'+key"
					v-model="paramData.value"
					v-autofocus="autofocus">
					<option v-for="a in paramData.listValues" :key="a.label" :value="a.value">{{a.label}}</option>
				</select>
			</div>
			
			<div v-if="paramData.type == 'browse'" class="holder browse">
				<img v-if="paramData.example" alt="help"
					src="@/assets/icons/help_purple.svg"
					:data-tooltip="'<img src='+$image('img/param_examples/'+paramData.example)+'>'"
					class="helpIcon"
				>
				<label :for="'browse'+key" v-if="label" v-html="label"></label>
				<input v-if="!paramData.noInput" type="text"
					class="filePath"
					v-model="paramData.value"
					:name="paramData.fieldName"
					:id="'browse'+key"
					:placeholder="paramData.placeholder">
				<Button v-model:file="paramData.value"
					class="browseBt"
					type="file"
					:accept="paramData.accept?paramData.accept:'*'"
					:icon="$image('icons/upload.svg')"
				/>
			</div>
		</div>
		
		<PlaceholderSelector class="placeholders" v-if="placeholderTarget && paramData.placeholderList"
			:target="placeholderTarget"
			:placeholders="paramData.placeholderList"
			v-model="paramData.value"
		/>

		<ParamItem v-for="(c, index) in children"
			class="child"
			ref="param_child"
			:key="'child_'+index+c.id"
			:paramData="c"
			:clearToggle="clearToggle"
			:childLevel="childLevel+1" />

		<div class="child" ref="param_child_slot" v-if="showSlot && $slots.default">
			<slot></slot>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleButton from '../ToggleButton.vue';
import PlaceholderSelector from './PlaceholderSelector.vue';

@Options({
	name:"ParamItem",//This is needed so recursion works properly
	props:{
		paramData:Object,
		childLevel:{
			type:Number,
			default:0,
		},
		autofocus:{
			type:Boolean,
			default:false,
		},
		modelValue:{
			type:[String, Number, Boolean, Object, Array],
			default: null
		},
		error:{
			type:Boolean,
			default:false,
		},
		clearToggle:{
			type:Boolean,
			default:false,
		},
	},
	components:{
		Button,
		ToggleButton,
		PlaceholderSelector,
	},
	emits: ["change", "update:modelValue", "mouseenter", "mouseleave"]
})
export default class ParamItem extends Vue {
	
	public error!:boolean;
	public autofocus!:boolean;
	public clearToggle!:boolean;
	public childLevel!:number;
	public paramData!:TwitchatDataTypes.ParameterData;
	public modelValue!:string|boolean|number|string[];

	public key:string = Math.random().toString();
	public showSlot:boolean = false;
	public children:TwitchatDataTypes.ParameterData[] = [];
	public placeholderTarget:HTMLTextAreaElement|HTMLInputElement|null = null;

	private file:unknown = {};

	public get classes():string[] {
		const res = ["paramitem"];
		if(this.error !== false) res.push("error");
		if(this.clearToggle !== false) res.push("clear");
		if(this.paramData.longText) res.push("longText");
		if(this.paramData.label == '') res.push("noLabel");
		if(this.childLevel > 0) res.push("child");
		res.push("level_"+this.childLevel);
		return res;
	}

	public get label():string {
		if(!this.paramData) return "";
		let txt = this.paramData.label;
		if(txt.indexOf("{VALUE}") > -1) {
			if(this.paramData.value || this.paramData.value === 0) {
				txt = txt.replace(/\{VALUE\}/gi, this.paramData.value.toString());
			}else{
				txt = txt.replace(/\{VALUE\}/gi, "x");
			}
		}
		return txt.replace(/(\([^)]+\))/gi, "<span class='small'>$1</span>");
	}

	public get textValue():string {
		return this.paramData.value as string;
	}

	public set textValue(value:string) {
		this.paramData.value = value;
	}

	public beforeUpdate(): void {
		// console.log("rerender");
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
		
		watch(() => this.paramData.value, () => {
			if(this.paramData.save === true) {
				this.$store("params").updateParams()
			}
			this.$emit("update:modelValue", this.paramData.value);
			this.$emit("change");
			if(this.paramData.editCallback) {
				this.paramData.editCallback(this.paramData.value);
			}
			this.buildChildren();
		});
		
		watch(() => this.paramData.children, () => {
			this.buildChildren();
		});
		
		watch(() => this.file, () => {
			console.log(this.file);
		});
		
		this.buildChildren();
		
		if(this.paramData.listValues && this.paramData.listValues.length > 0) {
			//Check if the value is on the listValues.
			//If not, fallback to the first value.
			if(!this.paramData.listValues.find(v=>v.value === this.paramData.value)) {
				this.paramData.value = this.paramData.listValues[0].value;
			}
		}

		if(this.paramData.placeholderList && this.paramData.placeholderList.length > 0) {
			if(this.paramData.type != "text") {
				throw new Error("For \"placeholderList\" to work, \"paramData\" type must be \"text\". Current type is \""+this.paramData.type+"\"");
			}
			this.placeholderTarget = this.$el.querySelector("textarea,input");
		}
	}

	private async buildChildren():Promise<void> {
		if(this.paramData.value === false){
			if(this.children.length > 0 || this.$refs.param_child_slot) {
				//Hide transition
				let divs:HTMLDivElement[] = [];
				if(this.$refs.param_child_slot) {
					divs = [this.$refs.param_child_slot as HTMLDivElement];
				}else{
					const childrenItems = this.$refs.param_child as Vue[];
					divs = childrenItems.map(v => v.$el);
				}
				gsap.to(divs, {height:0, paddingTop:0, marginTop:0, duration:0.25, stagger:0.05,
						onComplete:()=> {
							this.showSlot = false;
							this.children = [];
						}});
			}
			return;
		}

		const list = this.$store("params").$state;
		let children:TwitchatDataTypes.ParameterData[] = [];
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
		
		if(this.showSlot || this.children == children) return;
		
		this.children = children;
		this.showSlot = true;
		await this.$nextTick();

		if(children.length > 0 || this.$refs.param_child_slot){
			//Show transitions
			let divs:HTMLDivElement[] = [];
			if(this.$refs.param_child_slot) {
				divs = [this.$refs.param_child_slot as HTMLDivElement];
			}else{
				const childrenItems = this.$refs.param_child as Vue[];
				divs = childrenItems.map(v => v.$el);
			}
			gsap.from(divs, {height:0, paddingTop:0, marginTop:0, duration:0.25, stagger:0.05, clearProps:"all"});
		}
	}

	public clampValue():void {
		if(this.paramData.max != undefined && this.paramData.value as number > this.paramData.max) this.paramData.value = this.paramData.max;
		if(this.paramData.min != undefined && this.paramData.value as number < this.paramData.min) this.paramData.value = this.paramData.min;
	}
}
</script>

<style scoped lang="less">
.paramitem{
	overflow-y: clip;
	border-left: 0 solid transparent;
	transition: border-left .25s, padding-left .25s;

	&.error {
		border-left: .25em solid @mainColor_alert;
		border-bottom: 1px solid @mainColor_alert;
		padding-left: .25em;

		input, select, textarea{
			color:@mainColor_light;
			background-color: fade(@mainColor_alert, 50%);
			border-color: @mainColor_alert;
			&::placeholder {
				color:fade(@mainColor_light, 50%);
			}
		}
	}

	&.clear {
		textarea {
			color: @mainColor_light;
			border-color: @mainColor_light;
			background: fade(@mainColor_light, 20%);
			&::-webkit-scrollbar-thumb {
				background-color: @mainColor_light;
			}
		}
	}
	
	&.longText {
		.content {
			.text {
				flex-grow: 1;
				display: flex;
				flex-direction: column;
				align-items: flex-start;
				textarea {
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
	
	.content {
		display: flex;
		flex-direction: row;
		align-items: baseline;
		transition: background-color .1s;

		&:hover {
			background-color: fade(@mainColor_normal, 10%);
		}
		textarea {
			width: 100%;
		}

		.holder {
			flex-grow: 1;
			display: flex;
			flex-direction: row;
			align-items: center;
			&:has(input) {
				flex-wrap: wrap;
			}
		}

		.icon {
			width: 1em;
			height: 1em;
			object-fit: contain;
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
		
		.toggle, .number, .text, .list , .browse{
			flex-grow: 1;
			display: flex;
			flex-direction: row;
			label {
				flex-grow: 1;
				margin: 0;
				padding-right: 1em;
				line-height: 1.1em;
				cursor: pointer;
			}

		}

		:deep(.small) {
			font-size: .75em;
			font-style: italic;
		}
		.slider {
			flex-grow: 1;
			display: flex;
			flex-direction: column;
			input {
				flex-basis: unset;
			}
			&:not(.text)>label {
				text-align: center;
			}
		}

		input {
			width: 100%;
		}

		textarea {
			resize: vertical;
			margin-top: .25em;
			flex-grow: 1;
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

		select {
			max-width: 250px;
		}

		input, select, textarea{
			transition: background-color .25s;
			flex-basis: 300px;
		}

	}

	&.level_1,
	&.level_2,
	&.level_3,
	&.level_4 {
		.child {
			@padding:15px;
			width: calc(100% - @padding);
		}
		.placeholders {
			padding-left: 0;
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
				left: -1em;
				font-size: 1.1em;
				content: "⤷";
				display: block;
			}
		}
	}
}
</style>