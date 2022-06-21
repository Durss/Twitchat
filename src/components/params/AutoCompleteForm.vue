<template>
	<div :class="classes">
		<div class="form">
			<label :for="key">{{title}}</label>
			<div class="input">
				<img :src="$image('loader/loader_dark.svg')" alt="loading" class="loader" v-if="loading">
				<input :id="key" type="text"
					@keyup="onSearchChange()" @focus="onFocus()"
					v-model="search"
					:disabled="!canSelect"
					placeholder="search..."
				>
			</div>
		</div>

		<div class="items autocomplete" v-if="items?.length > 0">
			<span v-for="(item, index) in items" :key="'autocomplete_'+index" @click.capture="selectItem(item, index)">
				<slot :item="item" :index="index" />
			</span>
		</div>

		<div class="items selected" v-if="modelValue?.length > 0">
			<span v-for="(item, index) in modelValue" :key="'selected_'+index" @click.capture="removeItem(index)">
				<slot :item="item" :index="index" />
			</span>
		</div>
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		modelValue:{
			type:[Object],
			default:"",
		},
		title:{
			type:String,
			default:"",
		},
		idKey:{
			type:String,
			default:"",
		},
		delay:{
			type:Number,
			default:250,
		},
		maxItems:{
			type:Number,
			default:10,
		},
		maxAutocompleteItems:{
			type:Number,
			default:20,
		},
	},
	components:{},
	emits:["search", "update:modelValue"]
})
export default class AutoCompleteForm extends Vue {

	public title!:string;
	public idKey!:string;
	public delay!:number;
	public maxItems!:number;
	public modelValue!:unknown[];
	public maxAutocompleteItems!:number;

	public loading:boolean = false;
	public key:string = Math.random().toString();
	public search:string = "";
	public searchTimeout:number = -1;
	public items:unknown[] = [];
	
	private prevItems:unknown[] = [];

	public get classes():string[] {
		const res = ["autocompleteform"];
		if(this.loading) res.push("loading");
		return res;
	}

	public get canSelect():boolean {
		return this.modelValue.length < this.maxItems;
	}

	public async mounted():Promise<void> {
		watch(()=>this.modelValue, ()=> {
			console.log(this.modelValue.length);
			if(this.modelValue.length == this.maxItems) {
				this.search = "";
			}
		})
	}

	public onSearchChange():void {
		this.loading = true;
		clearTimeout(this.searchTimeout);

		if(this.search.length < 2) {
			this.searchResult([]);
			return;
		}

		this.searchTimeout = setTimeout(()=> {
			this.$emit("search", this.search, this.searchResult);
		}, this.delay);
	}

	public onFocus():void {
		if(this.prevItems.length > 0) {
			this.items = this.prevItems;
		}
	}

	public selectItem(item:unknown, index:number):void {
		const list = this.modelValue.slice();
		list.push(item);
		this.$emit("update:modelValue", list);
		this.items = [];
		this.prevItems.splice(index, 1);
	}

	public removeItem(index:number):void {
		const list = this.modelValue.slice();
		list.splice(index, 1)
		this.$emit("update:modelValue", list);
	}

	private searchResult(data:unknown[]):void {
		if(this.idKey) {
			data = data.filter(item => {
				return this.modelValue.findIndex((v:unknown) => {
					//@ts-ignore
					return v[this.idKey] == item[this.idKey]
				}) == -1;
			});
		}
		data = data.slice(0, this.maxAutocompleteItems);
		this.items = data;
		this.prevItems = data;
		this.loading = false;
	}

}
</script>

<style scoped lang="less">
.autocompleteform{
	.form {
		display: flex;
		flex-direction: row;
		label {
			flex-grow: 1;
		}
		.input {
			position: relative;
			.loader {
				height: 1em;
				width: 1em;
				position: absolute;
				left: 5px;
				top: 50%;
				transform: translateY(-50%);
			}
		}
	}

	&.loading {
		.form {
			.input {
				input {
					padding-left: calc(1em + 10px);
				}
			}
		}
	}

	.items {
		padding: .5em;
		max-height: 112px;
		overflow: auto;
		border-radius: .5em;
		margin-bottom: .25em;
		// &.selected {
		// 	text-align: center;
		// }
		&:not(.selected) {
			background-color: fade(@mainColor_normal, 15%);
		}
		&.selected {
			padding-left: 0;
			padding-right: 0;
		}
	}
}
</style>