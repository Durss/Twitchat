import { ComponentCustomProperties } from 'vue'
import { Store } from 'vuex'
import { State } from "@/store/index";

declare module '@vue/runtime-core' {
	// provide typings for `$store`
	interface ComponentCustomProperties {
		$store: Store<State>
	}
}