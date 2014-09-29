// iD/controller/edit/NoSelection.js

define(['dojo/_base/declare',
		'iD/controller/ControllerState',
		'iD/controller/edit/SelectedWay',
		'iD/controller/edit/SelectedWayNode',
		'iD/controller/edit/SelectedPOINode',
		], function(declare){

// ----------------------------------------------------------------------
// ControllerState base class

declare("iD.controller.edit.NoSelection", [iD.controller.ControllerState], {

	constructor:function() {
	},
	
	processMouseEvent:function(event,entityUI) {
		this.inherited(arguments);
		if (!entityUI) { return this; }
		var entity=entityUI.entity;
		if (event.type=='click') {
			switch (entity.entityType) {
				case 'node':
					var ways=entity.parentWays();
					if (ways.length==0) { return new iD.controller.edit.SelectedPOINode(entity); }
					               else { return new iD.controller.edit.SelectedWayNode(entity,ways[0]); }
				case 'way':
					return new iD.controller.edit.SelectedWay(entityUI.entity);
			}
		}
		return this;
	},
	
});

// ----------------------------------------------------------------------
// End of module
});
