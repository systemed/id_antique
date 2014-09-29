// iD/renderer/EntityUI.js
// EntityUI classes for iD
// multipolygon support - http://mail.dojotoolkit.org/pipermail/dojo-interest/2011-January/052042.html
// support 'interactive'
// line decoration, dots etc.
// fill images
// opacity

define(['dojo/_base/declare','dojo/_base/lang','iD/Entity','iD/renderer/Map'], function(declare,lang){

// ----------------------------------------------------------------------
// EntityUI base class

declare("iD.renderer.EntityUI", null, {
	entity:null,				// Entity this represents
	map:null,					// the Map object containing this
	layer:0,					// OSM layer
	sprites:null,				// array of sprites created for this EntityUI
	styleList:null,				// current StyleList
	stateClasses:null,			// list of stateClass tags to apply
	constructor:function(_entity,_map,_stateClasses) {
		this.entity=_entity;
		this.map=_map;
		this.stateClasses=_stateClasses.slice();
		this.sprites=[];
	},
	getConnection:function() {
		return this.map.conn;
	},
	targetGroup:function(groupType,sublayer) {
		return this.map.sublayer(this.layer,groupType,sublayer);
	},
	recordSprite:function(sprite) {
		if (this.sprites.indexOf(sprite)==-1) { this.sprites.push(sprite); }
		return sprite;
	},
	removeSprites:function() {
		for (var i=0; i<this.sprites.length; i++) {
			this.sprites[i].removeShape();
		}
		this.sprites=[];
	},
	refreshStyleList:function(tags) {
		if (!this.styleList || !this.styleList.isValidAt(this.map.scale)) { 
			this.styleList=this.map.ruleset.getStyles(this.entity,tags,this.map.scale);
		}
		this.layer=this.styleList.layerOverride();
		if (isNaN(this.layer)) {
			this.layer=0;
			if (tags['layer']) { this.layer=Number(tags['layer']); }
		}

		// Iterate through each subpart, drawing any styles on that layer
		var drawn=false;
		for (i=0; i<this.styleList.subparts.length; i++) {
			var subpart=this.styleList.subparts[i];
		}
	},
	getEnhancedTags:function() {
		// Clone entity tags
		var tags=lang.clone(this.entity.tags);
		// Apply stateClasses (hover, selected, hoverway, selectedway)
		for (var i in this.stateClasses) {
			tags[':'+this.stateClasses[i]]='yes';
		}
		// todo - Add any common 'special-case' tags, e.g. :hasTags
		return tags;
	},
	setStateClasses:function(_stateClasses) {
		if (this.stateClasses.join(',')!=_stateClasses.join(',')) {
			for (var i in _stateClasses) {
				this.setStateClass(_stateClasses[i]);
			}
			this.invalidateStyleList();
		}
		return this;
	},
	setStateClass:function(sc) {
		if (this.stateClasses.indexOf(sc)==-1) {
			this.stateClasses.push(sc);
			this.invalidateStyleList();
		}
		return this;
	},
	resetStateClass:function(sc) {
		if (this.stateClasses.indexOf(sc)>-1) {
			this.stateClasses.splice(this.stateClasses.indexOf(sc),1);
			this.invalidateStyleList();
		}
		return this;
	},
	hasStateClass:function(sc) {
		return this.stateClasses.indexOf(sc)>-1;
	},
	invalidateStyleList:function() {
		this.styleList=null;
	},
	entityMouseEvent:function(event) {
//if (event.type=='mouseout' || event.type=='mouseover') return;
		this.map.controller.entityMouseEvent(event, event.gfxTarget.source);
		if (event.type=='click') { event.stopPropagation(); }
	},
});

// ----------------------------------------------------------------------
// End of module
});
