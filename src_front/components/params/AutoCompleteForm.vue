<template>
	<div :class="classes">
		<div class="formHolder">
			<label :for="key">{{title}}</label>
			<div class="inputHolder">
				<Icon name="loader" class="loader" v-if="loading" />
				<input :id="key" type="text"
					@keyup="onSearchChange()" @focus="onFocus()"
					v-model="search"
					:disabled="!canSelect"
					:placeholder="$t('global.search_placeholder')"
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
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["search", "update:modelValue"]
})
class AutoCompleteForm extends Vue {

	@Prop({
			type:String,
			default:"",
		})
	public title!:string;
	@Prop({
			type:String,
			default:"",
		})
	public idKey!:string;
	@Prop({
			type:Number,
			default:250,
		})
	public delay!:number;
	@Prop({
			type:Number,
			default:10,
		})
	public maxItems!:number;
	@Prop({
			type:[Object],
			default:"",
		})
	public modelValue!:unknown[];
	@Prop({
			type:Number,
			default:20,
		})
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

		this.searchTimeout = window.setTimeout(()=> {
			this.$emit("search", this.search, this.searchResult);
		}, this.delay);
	}

	public onFocus():void {
		if(this.prevItems.length > 0) {
			this.items = this.prevItems;
		}
	}

	public selectItem(item:unknown, index:number):void {
		let list = this.modelValue.slice();
		if(list.length == this.maxItems) list = list.splice(0, this.maxItems-1);
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
export default toNative(AutoCompleteForm);
</script>

<style scoped lang="less">
.autocompleteform{
	.formHolder {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		label {
			flex-grow: 1;
			align-self: center;
		}
		.inputHolder {
			position: relative;
			width: auto;
			flex-basis: 300px;
			.loader {
				height: 1em;
				width: 1em;
				position: absolute;
				left: 5px;
				top: 50%;
				transform: translateY(-50%);
			}
			
			input {
				width: 100%;
			}
		}
	}

	&.loading {
		.formHolder {
			.inputHolder {
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
		&:not(.selected) {
			background-color: rgba(0, 0, 0, .3);
		}
		&.selected {
			padding-left: 0;
			padding-right: 0;
		}
	}
}
</style>