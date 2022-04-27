<template class="cffdfdf">
	<div :class="classes">
		<div class="content">
			<img :src="require('@/assets/icons/'+paramData.icon)" v-if="paramData.icon" class="icon">

			<div v-if="paramData.type == 'toggle'" class="holder toggle">
				<Button v-if="paramData.example"
					:icon="require('@/assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+require('@/assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'toggle'+key" v-if="label" v-html="label" @click="paramData.value = !paramData.value;"></label>
				<ToggleButton :id="'toggle'+key" v-model="paramData.value" />
			</div>
			
			<div v-if="paramData.type == 'number'" class="holder number">
				<Button v-if="paramData.example"
					:icon="require('@/assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+require('@/assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'number'+key" v-if="label" v-html="label"></label>
				<input :id="'number'+key" type="number" v-model.number="paramData.value" :min="paramData.min" :max="paramData.max" :step="paramData.step" v-autofocus="autofocus" @blur="clampValue()">
			</div>
			
			<div v-if="paramData.type == 'text' || paramData.type == 'password'" class="holder text">
				<Button v-if="paramData.example"
					:icon="require('@/assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+require('@/assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'text'+key" v-if="label" v-html="label"></label>
				<textarea v-if="paramData.longText===true" :id="'text'+key" v-model="paramData.value" :placeholder="paramData.placeholder" rows="2" v-autofocus="autofocus"></textarea>
				<input v-if="paramData.longText!==true" :id="'text'+key" :type="paramData.type" v-model="paramData.value" :placeholder="paramData.placeholder" v-autofocus="autofocus" :maxlength="paramData.maxLength? paramData.maxLength : 524288">
			</div>
			
			<div v-if="paramData.type == 'slider'" class="holder slider">
				<Button v-if="paramData.example"
					:icon="require('@/assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+require('@/assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'slider'+key">
					{{paramData.label}} <span>({{paramData.value}})</span>
				</label>
				<input type="range" :min="paramData.min" :max="paramData.max" :step="paramData.step" :id="'slider'+key" v-model.number="paramData.value" v-autofocus="autofocus">
			</div>
			
			<div v-if="paramData.type == 'list'" class="holder list">
				<Button v-if="paramData.example"
					:icon="require('@/assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+require('@/assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'list'+key">{{paramData.label}}</label>
				<select v-model="paramData.value" :id="'list'+key" v-autofocus="autofocus">
					<option v-for="a in paramData.listValues" :key="a" :value="a.value">{{a.label}}</option>
				</select>
			</div>
			
			<div v-if="paramData.type == 'browse'" class="holder browse">
				<Button v-if="paramData.example"
					:icon="require('@/assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+require('@/assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'browse'+key" v-if="label" v-html="label"></label>
				<input type="text" class="filePath" :id="'browse'+key" v-model="paramData.value" :placeholder="paramData.placeholder">
				<!-- <Button v-model:file="paramData.value"
					class="browseBt"
					type="file"
					:accept="paramData.accept?paramData.accept:'*'"
					:icon="require('@/assets/icons/upload.svg')"
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
import store, { ParameterCategory, ParameterData } from '@/store';
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
	},
	components:{
		Button,
		ToggleButton,
	},
	emits: ["change"]
})
export default class ParamItem extends Vue {
	
	public paramData!:ParameterData;
	public childLevel!:number;
	public key:string = Math.random().toString();
	public children:ParameterData[] = [];

	private file:unknown = {};

	public get classes():string[] {
		const res = ["paramitem"];
		if(this.paramData.longText) res.push("longText");
		if(this.paramData.label == '') res.push("noLabel");
		res.push("level_"+this.childLevel);
		return res;
	}

	public get label():string {
		return this.paramData.label.replace(/(\([^)]+\))/gi, "<span class='small'>$1</span>");
	}

	public mounted():void {
		watch(() => this.paramData.value, () => {
			store.dispatch('updateParams');
			this.$emit("change");
			this.buildChildren();
		});
		watch(() => this.paramData.children, () => {
			this.buildChildren();
		});
		watch(() => this.file, () => {
			console.log(this.file);
		});
		this.buildChildren();
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