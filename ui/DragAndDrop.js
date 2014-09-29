// iD/ui/DragAndDrop.js

/*
	Singleton-like class for POI drag and drop.
	Could potentially be a ControllerState.
*/


define(['dojo/_base/declare','dojo/_base/lang','dojo/dom-geometry','dojo/dnd/Target'], function(declare,lang,domGeom){

// ----------------------------------------------------------------------
// DragAndDrop class

declare("iD.ui.DragAndDrop", null, {

	mapdiv:null,
	map:null,
	divname:"",
	dragmove:null,
	dragx:NaN,
	dragy:NaN,

	constructor:function(_divname,_map) {
		this.divname=_divname;
		this.mapdiv=new dojo.dnd.Target(_divname, { accept: ['dndIcon'] });
		dojo.connect(this.mapdiv,"onDndStart",lang.hitch(this,this.start ));
		dojo.connect(this.mapdiv,"onDrop"    ,lang.hitch(this,this.create));
		this.map=_map;
	},

	start:function(source,nodes,copy) {
		this.dragmove=dojo.connect(this.mapdiv,"onMouseMove",lang.hitch(this,this.update));
	},

	update:function(event) {
		this.dragx=event.pageX;
		this.dragy=event.pageY;
	},

	create:function(source,nodes,copy) {
		dojo.disconnect(this.dragmove);
		var margins=domGeom.getMarginBox(document.getElementById(this.divname));
		var lon=this.map.coord2lon(this.dragx-margins.l);
		var lat=this.map.coord2lat(this.dragy-margins.t);
		var tags=this.parseKeyValues(nodes[0].getAttribute('tags'));

		var action=new iD.actions.CreatePOIAction(this.map.conn,tags,lat,lon);
		this.controller.undoStack.addAction(action);
		var node=action.getNode();
		this.map.createUI(node);
		
		dijit.byId('addPOI').closeDropDown();
		this.map.controller.setState(new iD.controller.edit.SelectedPOINode(node));
	},

	parseKeyValues:function(string) {
		var pairs=string.split(';');
		var tags={};
		for (var i in pairs) {
			var kv=pairs[i].split('=');
			tags[kv[0]]=kv[1];
		}
		return tags;
	},

});

// ----------------------------------------------------------------------
// End of module
});
