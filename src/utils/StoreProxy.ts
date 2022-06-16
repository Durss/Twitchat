import type { Store } from 'vuex'

/**
* Created : 17/06/2022 
* This class only exists to solve a circular imports issue
*/
export default class StoreProxy {

	//eslint-disable-next-line
	public static store:Store<any>;

}