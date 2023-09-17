export default interface IParameterContent {
	/**
	 * Called when "back" button is clicked.
	 * This is a hook to allow contents to override default back button
	 * behavior.
	 * The call must return true if the default behavior is overriden
	 * 
	 * @returns true if the call acted on the navigation
	 */
	onNavigateBack():boolean;
	/**
	 * Called if clicking on the menu button to open this section
	 * when already on it.
	 * Useful on the triggers, if editing a specific trigger, clicking
	 * on the "Triggers" menu entry will bring user back to the
	 * triggers list
	 */
	reload?():void;
}