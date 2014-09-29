// iD/actions/CreatePOIAction.js

define(['dojo/_base/declare','dojo/_base/lang','iD/actions/UndoableAction'], function(declare,lang){

// ----------------------------------------------------------------------
// CreatePOIAction class

declare("iD.actions.CreatePOIAction", [iD.actions.CompositeUndoableAction], {

	newNode: null,
	tags: null,
	lat: NaN,
	lon: NaN,
	connection: null,

	constructor:function(connection,tags,lat,lon) {
		this.setName("Create POI");
		this.connection = connection;
		this.tags = tags;
		this.lat = lat;
		this.lon = lon;
	},

	doAction:function() {
		if (this.newNode==null) {
			this.newNode=this.connection.createNode(this.tags,this.lat,this.lon,lang.hitch(this,this.push));
		}
		this.inherited(arguments);
		this.connection.registerPOI(this.newNode);
		return this.SUCCESS;
	},

	undoAction:function() {
		this.inherited(arguments);
		this.connection.unregisterPOI(this.newNode);
		return this.SUCCESS;
	},

	getNode:function() {
		return this.newNode;
	},

});

// ----------------------------------------------------------------------
// End of module
});
