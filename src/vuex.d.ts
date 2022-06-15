import type { ComponentCustomProperties } from 'vue'
import type { Store } from 'vuex'
import type { State } from "@/store/index";

declare module '@vue/runtime-core' {
	// provide typings for `$store`
	interface ComponentCustomProperties {
		$store: Store<State>,
		$image: (path:string) => string,
	}
}