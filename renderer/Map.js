// iD/renderer/Map.js
// at present this combines P2's Map and MapPaint functionality

define(['dojo/_base/declare','dojo/_base/array','dojo/_base/event','dojo/_base/lang',
        'dojo/dom-geometry',
        'dojox/gfx','dojox/gfx/matrix',
        'iD/Connection','iD/Entity','iD/renderer/EntityUI','iD/renderer/WayUI','iD/renderer/NodeUI'], 
       function(declare,array,Event,lang,domGeom,Gfx,Matrix){

// ----------------------------------------------------------------------
// Connection base class

declare("iD.renderer.Map", null, {

	MASTERSCALE: 5825.4222222222,
	scale: NaN,
	scalefactor: NaN,
	baselon: NaN,
	baselat: NaN,
	baselatp: NaN,

	div: '',				// <div> of this map
	surface: null,			// <div>.surface containing the rendering
	container: null,		// root-level group within the surface
	backdrop: null,			// coloured backdrop (MapCSS canvas element)
	conn: null,				// data store
	controller: null,		// UI controller
	nodeuis: {},			// graphic representations of data
	wayuis: {},				//  |

	dragging: false,		// current drag state
	dragged: false,			// was most recent click a drag?
	dragx: NaN,				// click co-ordinates at previously recorded drag event
	dragy: NaN,				//  |
	dragtime: NaN,			// timestamp of mouseup (compared to stop resulting click from firing)
	dragconnect: null,		// event listener for endDrag

	containerx: 0,			// screen co-ordinates of container
	containery: 0,			//  |
	centrelat: NaN,			// lat/long and bounding box of map
	centrelon: NaN,			//  |
	edgel: NaN,				//  |
	edger: NaN,				//  |
	edget: NaN,				//  |
	edgeb: NaN,				//  |
	
	layers: null,			// array-like object of Groups, one for each OSM layer
	minlayer: -5,			// minimum OSM layer supported
	maxlayer: 5,			// maximum OSM layer supported

	elastic: null,			// Group for drawing elastic band

	ruleset: null,			// map style
	
	// Constructor
	
	constructor:function(_lat,_lon,_scale,_divname,_conn) {
		// Initialise variables
		this.nodeuis={},
		this.wayuis={},
		this.div=document.getElementById(_divname);
		this.surface=Gfx.createSurface(_divname, 800, 400);
		this.backdrop=this.surface.createRect( { x:0, y:0, width: 800, height: 400 }).setFill(new dojo.Color([255,255,245,1]));
		this.container=this.surface.createGroup();
		this.conn=_conn;
		this.scale=_scale;
		this.baselon=_lon;
		this.baselat=_lat;
		this.baselatp=this.lat2latp(_lat);
		this.scalefactor=this.MASTERSCALE/Math.pow(2,13-_scale);
		this.updateCoords();

		// Initialise layers
		this.layers={};
		for (var l=this.minlayer; l<=this.maxlayer; l++) {
			var r=this.container.createGroup();
			this.layers[l]={
				root: r,
				fill: r.createGroup(),
				casing: r.createGroup(),
				stroke: r.createGroup(),
				text: r.createGroup(),
				hit: r.createGroup()
			};
		}

		// Create group for elastic band
		this.elastic = this.container.createGroup();

		// Make draggable
		this.backdrop.connect("onmousedown", lang.hitch(this,"startDrag"));
		this.surface.connect("onclick", lang.hitch(this,"clickSurface"));
		this.surface.connect("onmousemove", lang.hitch(this,"processMove"));
		this.surface.connect("onmousedown", lang.hitch(this,"mouseEvent"));
		this.surface.connect("onmouseup", lang.hitch(this,"mouseEvent"));
	},
	
	setController:function(_controller) {
		this.controller=_controller;
	},

	// Sprite and EntityUI handling

	sublayer:function(layer,groupType,sublayer) {
		// Sublayers are only implemented for stroke and fill
		var collection=this.layers[layer][groupType];
		switch (groupType) {
			case 'casing':
			case 'text':
			case 'hit':
				return collection;
		}
		// Find correct sublayer, inserting if necessary
		var insertAt=collection.children.length;
		for (var i=0; i<collection.children.length; i++) {
			var sub=collection.children[i];
			if (sub.sublayer==sublayer) { return sub; }
			else if (sub.sublayer>sublayer) {
				sub=collection.createGroup().moveToPosition(i);
				sub.sublayer=sublayer;
				return sub;
			}
		}
		sub=collection.createGroup().moveToFront();
		sub.sublayer=sublayer;
		return sub;
	},
	
	createUI:function(entity,stateClasses) {
		var id=entity.id;
		if (!stateClasses) { stateClasses=[]; }
		switch (entity.entityType) {
			case 'node':
				if (!this.nodeuis[id]) { this.nodeuis[id]=new iD.renderer.NodeUI(entity,this,stateClasses); }
				                  else { this.nodeuis[id].setStateClasses(stateClasses).redraw(); }
				return this.nodeuis[id];
			case 'way':
				if (!this.wayuis[id]) { this.wayuis[id]=new iD.renderer.WayUI(entity,this,stateClasses); }
				                 else { this.wayuis[id].setStateClasses(stateClasses).redraw(); }
				return this.wayuis[id];
		}
	},

	getUI:function(entity) {
		switch (entity.entityType) {
			case 'node': 	return this.nodeuis[entity.id];
			case 'way': 	return this.wayuis[entity.id];
		}
		return null;
	},
	
	refreshUI:function(entity) {
		switch (entity.entityType) {
			case 'node': 	if (this.nodeuis[entity.id]) { this.nodeuis[entity.id].redraw(); } break;
			case 'way': 	if (this.wayuis[entity.id] ) { this.wayuis[entity.id].redraw(); } break;
		}
	},

	// Elastic band redrawing
	
	clearElastic:function() {
		this.elastic.clear();
	},
	
	drawElastic:function(x1,y1,x2,y2) {
		this.elastic.clear();
		// **** Next line is SVG-specific
		this.elastic.rawNode.setAttribute("pointer-events","none");
		this.elastic.createPolyline( [{ x:x1, y:y1 }, { x:x2, y:y2 }] ).setStroke( {
			color: [0,0,0,1],
			style: 'Solid',
			width: 1 });
	},

	// Co-ordinate management, dragging and redraw

	startDrag:function(e) {
		Event.stop(e);
		this.dragging=true;
		this.dragged=false;
		this.dragx=this.dragy=NaN;
		this.dragconnect=this.backdrop.connect("onmouseup", lang.hitch(this,"endDrag"));
	},

	endDrag:function(e) {
		Event.stop(e);
		dojo.disconnect(this.dragconnect);
		this.dragging=false;
		this.dragtime=e.timeStamp;
		this.updateCoords();
	},

	processMove:function(e) {
		if (this.dragging) {
			if (this.dragx) {
				this.containerx+=(e.x-this.dragx);
				this.containery+=(e.y-this.dragy);
				this.container.setTransform([Matrix.translate(this.containerx,this.containery)]);
				this.dragged=true;
			}
			this.dragx=e.x;
			this.dragy=e.y;
		} else {
			this.controller.entityMouseEvent(e,null);
		}
	},
	
	mouseEvent:function(e) {
		this.controller.entityMouseEvent(e,null);
	},
	
	updateCoords:function(e) {
		this.centrelon=this.coord2lon(-this.containerx);
		this.centrelat=this.coord2lat(-this.containery);
		// calculate bbox
	},

	clickSurface:function(e) {
		if (this.dragged && e.timeStamp==this.dragtime) { return; }
// console.log("clickSurface");
		this.controller.entityMouseEvent(e,null);
	},

	draw:function() {
		// needs to at least look into what's inside the bbox!
		for (var id in this.conn.ways) {
			var way=this.conn.ways[id];
			if (!way.loaded) { continue; }
			this.createUI(way);
		}
		var pois=this.conn.getPOIs();
		for (var i in pois) {
			this.createUI(pois[i]);
		}
	},

	latp2coord:function(a) { return -(a-this.baselatp)*this.scalefactor; },
	coord2latp:function(a) { return a/-this.scalefactor+this.baselatp; },
	lon2coord:function(a)  { return (a-this.baselon)*this.scalefactor; },
	coord2lon:function(a)  { return a/this.scalefactor+this.baselon; },
	lat2latp:function(a)   { return 180/Math.PI * Math.log(Math.tan(Math.PI/4+a*(Math.PI/180)/2)); },
	latp2lat:function(a)   { return 180/Math.PI * (2 * Math.atan(Math.exp(a*Math.PI/180)) - Math.PI/2); },
	lat2coord:function(a)  { return -(this.lat2latp(a)-this.baselatp)*this.scalefactor; },
	coord2lat:function(a)  { return this.latp2lat(a/-this.scalefactor+this.baselatp); },

	// Turn event co-ordinates into map co-ordinates

	mouseX:function(e) { return e.clientX - domGeom.getMarginBox(this.div).l - this.containerx; },
	mouseY:function(e) { return e.clientY - domGeom.getMarginBox(this.div).t - this.containery; },

});

// ----------------------------------------------------------------------
// End of module
});
