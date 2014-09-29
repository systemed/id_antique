// iD/Controller.js

define(['dojo/_base/declare','iD/actions/UndoStack'], function(declare){

// ----------------------------------------------------------------------
// Controller base class

declare("iD.Controller", null, {
	state: null,			// current ControllerState
	map: null,				// current Map
	stepper: null,			// current StepPane
	undoStack: null,		// main undoStack
	
	constructor:function(_map) {
		this.map=_map;
		this.undoStack=new iD.actions.UndoStack();
	},

	setStepper:function(_stepper) {
		this.stepper=_stepper;
	},
	
	setState:function(newState) {
		if (newState==this.state) { return; }
		if (this.state) { this.state.exitState(newState); }
		newState.setController(this);
		this.state=newState;
		newState.enterState();
	},
	
	entityMouseEvent:function(event,entityUI) {
		if (!this.state) { return; }
		var newState=this.state.processMouseEvent(event,entityUI);
		this.setState(newState);
	},

});

// ----------------------------------------------------------------------
// End of module
});
