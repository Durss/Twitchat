<template class="cffdfdf">
	<div :class="classes">
		<div class="content">
			<img :src="getImage('assets/icons/'+paramData.icon)" v-if="paramData.icon" class="icon">

			<div v-if="paramData.type == 'toggle'" class="holder toggle"
			:aria-label="label+': '+(paramData.value? 'anabled' : 'disabled')"
			>
				<Button v-if="paramData.example"
					:icon="getImage('assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+getImage('assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'toggle'+key" v-if="label" v-html="label" @click="if(!paramData.noInput) paramData.value = !paramData.value;"></label>
				<ToggleButton :id="'toggle'+key" v-model="paramData.value" v-if="!paramData.noInput" />
			</div>
			
			<div v-if="paramData.type == 'number'" class="holder number">
				<Button v-if="paramData.example"
					:icon="getImage('assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+getImage('assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'number'+key" v-if="label" v-html="label"></label>
				<input ref="input" :id="'number'+key" type="number" v-model.number="paramData.value" :min="paramData.min" :max="paramData.max" :step="paramData.step" v-autofocus="autofocus" @blur="clampValue()" v-if="!paramData.noInput">
			</div>
			
			<div v-if="paramData.type == 'text' || paramData.type == 'password'" class="holder text">
				<Button v-if="paramData.example"
					:icon="getImage('assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+getImage('assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'text'+key" v-if="label" v-html="label"></label>
				<textarea ref="input" :name="paramData.fieldName" v-if="paramData.longText===true && !paramData.noInput" :id="'text'+key" v-model="textValue" :placeholder="paramData.placeholder" rows="2" v-autofocus="autofocus"></textarea>
				<input ref="input" :name="paramData.fieldName" v-if="paramData.longText!==true && !paramData.noInput" :id="'text'+key" :type="paramData.type" v-model="paramData.value" :placeholder="paramData.placeholder" v-autofocus="autofocus" :maxlength="paramData.maxLength? paramData.maxLength : 524288" autocomplete="new-password">
			</div>
			
			<div v-if="paramData.type == 'slider'" class="holder slider">
				<Button v-if="paramData.example"
					:icon="getImage('assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+getImage('assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'slider'+key">
					{{paramData.label}} <span>({{paramData.value}})</span>
				</label>
				<input ref="input" type="range" :min="paramData.min" :max="paramData.max" :step="paramData.step" :id="'slider'+key" v-model.number="paramData.value" v-autofocus="autofocus" v-if="!paramData.noInput">
			</div>
			
			<div v-if="paramData.type == 'list'" class="holder list">
				<Button v-if="paramData.example"
					:icon="getImage('assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+getImage('assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'list'+key">{{paramData.label}}</label>
				<select ref="input" v-model="paramData.value" :id="'list'+key" v-autofocus="autofocus" v-if="!paramData.noInput">
					<option v-for="a in paramData.listValues" :key="a.label" :value="a.value">{{a.label}}</option>
				</select>
			</div>
			
			<div v-if="paramData.type == 'browse'" class="holder browse">
				<Button v-if="paramData.example"
					:icon="getImage('assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+getImage('assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'browse'+key" v-if="label" v-html="label"></label>
				<input type="text" :name="paramData.fieldName" class="filePath" :id="'browse'+key" v-model="paramData.value" :placeholder="paramData.placeholder" v-if="!paramData.noInput">
				<!-- <Button v-model:file="paramData.value"
					class="browseBt"
					type="file"
					:accept="paramData.accept?paramData.accept:'*'"
					:icon="getImage('assets/icons/upload.svg')"
				/> -->
			</div>
		</div>

		<ParamItem v-for="(c, index) in children"
			class="child"
			ref="param_child"
			:key="'child_'+index+c.id"
			:paramData="c"
			:childLevel="childLevel+1" />
	</div>
</template>

<script lang="ts">
import store  from '@/store';
import type { ParameterCategory, ParameterData } from '@/store';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleButton from '../ToggleButton.vue';

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
	},
	components:{
		Button,
		ToggleButton,
	},
	emits: ["change", "update:modelValue"]
})
export default class ParamItem extends Vue {
	
	public error!:boolean;
	public autofocus!:boolean;
	public childLevel!:number;
	public paramData!:ParameterData;
	public modelValue!:string|boolean|number|string[];
	public key:string = Math.random().toString();
	public children:ParameterData[] = [];
	public inputField:HTMLTextAreaElement|HTMLInputElement|HTMLSelectElement|null = null;
	public getImage(path:string):string { return new URL(`/src/${path}`, import.meta.url).href; }

	private file:unknown = {};


	public get classes():string[] {
		const res = ["paramitem"];
		if(this.error !== false) res.push("error");
		if(this.paramData.longText) res.push("longText");
		if(this.paramData.label == '') res.push("noLabel");
		res.push("level_"+this.childLevel);
		return res;
	}

	public get label():string {
		return this.paramData.label.replace(/(\([^)]+\))/gi, "<span class='small'>$1</span>");
	}

	public get textValue():string {
		return this.paramData.value as string;
	}

	public set textValue(value:string) {
		this.paramData.value = value;
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
				store.dispatch('updateParams');
			}
			this.$emit("change");
			this.$emit("update:modelValue", this.paramData.value);
			this.buildChildren();
		});
		watch(() => this.paramData.children, () => {
			this.buildChildren();
		});
		watch(() => this.file, () => {
			console.log(this.file);
		});
		this.buildChildren();
		
		this.inputField = this.$refs.input as HTMLTextAreaElement;
	}

	private async buildChildren():Promise<void> {
		if(this.paramData.value === false){
			if(this.children.length > 0) {
				//Hide transition
				const childrenItems = this.$refs.param_child as Vue[];
				const divs = childrenItems.map(v => v.$el);
				gsap.to(divs, {height:0, paddingTop:0, marginTop:0, duration:0.25, stagger:0.05,
						onComplete:()=> {
							this.children = [];
						}});
			}
			return;
		}
		const list = store.state.params;
		let children:ParameterData[] = [];
		for (const key in list) {
			const params = list[key as ParameterCategory];
			for (const key2 in params) {
				if(params[key2].parent != undefined && params[key2].parent == this.paramData.id) {
					children.push(params[key2]);
				}
			}
		}

		if(this.paramData.children) {
			children = children.concat(this.paramData.children);
		}
		
		this.children = children;

		if(children.length > 0){
			//Show transitions
			await this.$nextTick();
			const childrenItems = this.$refs.param_child as Vue[];
			const divs = childrenItems.map(v => v.$el);
			gsap.from(divs, {height:0, paddingTop:0, marginTop:0, duration:0.25, stagger:0.05, clearProps:"all"});
		}
	}

	public clampValue():void {
		if(this.paramData.max != undefined && this.paramData.value > this.paramData.max) this.paramData.value = this.paramData.max;
		if(this.paramData.min != undefined && this.paramData.value < this.paramData.min) this.paramData.value = this.paramData.min;
	}
}
</script>

<style scoped lang="less">
.paramitem{
	overflow-y: clip;

	&.error {
		// color:@mainColor_alert;
		// font-weight: bold;
		// background: fade(@mainColor_alert, 30%);
		// padding: .25em;
		// border-radius: 1em;

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
	
	&.longText {
		.content {
			.text {
				flex-grow: 1;
				display: flex;
				flex-direction: column;
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
		transition: background-color .1s;

		&:hover {
			background-color: fade(@mainColor_normal, 10%);
		}

		.icon {
			width: 1em;
			height: 1em;
			object-fit: contain;
			margin-right: 10px;
		}
		

		.helpBt {
			background: none;
			@size: 20px;
			width: @size;
			min-width: @size;
			height: @size;
			min-height: @size;
			padding: 0;
			margin: 0;
			margin-right: 10px;
			:deep(.icon) {
				width: 100%;
				height: 100%;
				max-width: 100%;
				max-height: 100%;
			}
		}
		
		.toggle, .number, .text, .list , .browse{
			flex-grow: 1;
			display: flex;
			flex-direction: row;
			label {
				flex-grow: 1;
				// text-align: right;
				margin: 0;
				margin-right: 20px;
				cursor: pointer;
			}
		}

		:deep(.small) {
			// display: block;
			font-size: .75em;
			font-style: italic;
		}
		.slider {
			flex-grow: 1;
			display: flex;
			flex-direction: column;
			&:not(.text)>label {
				text-align: center;
			}
		}

		textarea {
			// max-width: 100%;
			resize: vertical;
		}

		.browse {
			.filePath {
				width:auto;
				max-width:unset;
				text-align: left;
				// border-top-right-radius: 0;
				// border-bottom-right-radius: 0;
			}
			.browseBt {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
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
	}

	.child {
		margin-left: auto;
		margin-right: 0;
		margin-top: 5px;
		@padding:7%;
		width: calc(100% - @padding);
		position: relative;
		:deep(.holder) {
			&::before {
				position: absolute;
				left: -15px;
				content: "⤷";
				display: block;
				// margin-right: 5px;
			}
			label {
				font-size: .9em;
			}
		}
	}
}
</style>