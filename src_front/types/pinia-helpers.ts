import type { PiniaCustomProperties, StateTree, _StoreWithGetters, _StoreWithState } from "pinia";
import type { UnwrapRef } from "vue";

/**
 * Consumer-facing type for a Pinia store assigned to StoreProxy.
 * Mirrors what `useXxxStore()` returns: state + getters + actions + Pinia internals.
 */
export type StoreInstance<S, G, A> = S & G & A & { $state: S; $reset: () => void };

/**
 * Adapts a "values" interface (e.g. `{ voiceBotConfigured: boolean }`) to the
 * function shape Pinia expects in `getters` (`(state) => value` or `() => value`).
 * Apply with `satisfies StoreGetters<IGettersInterface, IStateInterface>` so each
 * getter implementation is checked against the consumer-facing type.
 */
export type StoreGetters<G, S extends StateTree> = {
	[K in keyof G]: ((state: UnwrapRef<S>) => G[K]) | (() => G[K]);
} & ThisType<UnwrapRef<S> & G>;

/**
 * Enforces the actions interface and provides the correct `this` binding so
 * actions can read state, getters, call other actions, and use `$state`/`$reset`.
 * Apply with `satisfies StoreActions<"id", IStateInterface, IGettersInterface, IActionsInterface>`.
 */
export type StoreActions<Id extends string, S extends StateTree, G, A> = A &
	ThisType<
		A &
			UnwrapRef<S> &
			G &
			_StoreWithState<Id, S, G, A> &
			_StoreWithGetters<G> &
			PiniaCustomProperties
	>;
