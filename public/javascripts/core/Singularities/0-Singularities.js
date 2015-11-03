"use strict";

/*global Diagram*/

/* Core functions for each singularity
Diagram.prototype.interchangerAllowed(type, key)
Diagram.prototype.rewriteCutData(type, key)
Diagram.prototype.rewritePasteData(type, key)
Diagram.prototype.expand(type, height, n, m)
Diagram.prototype.interpretDrag(drag)
Diagram.prototype.getInterchangerCoordinates(type, key)
Diagram.prototype.getInterchangerBoundingBox(type, key)
Diagram.prototype.getInverseKey(type, key)
*/

var SingularityFamilies = {};
var SingularityData = {};

function RegisterSingularityFamily(data) {
    for (var index in data.members) {
        if (!data.members.hasOwnProperty(index)) continue;
        SingularityFamilies[data.members[index]] = data.family;
    }
    SingularityData[data.family] = {
        dimension: data.dimension
        /*
        ,
        rewriteAllowed: eval("rewriteAllowed_" + data.family),
        rewriteCutData: eval("rewriteCutData_", + data.family),
        rewritePasteData: eval("rewritePasteData_" + data.family),
        interpretDrag: eval("interpret_drag_" + data.family)
        */
    };
}


Diagram.prototype.interchangerAllowed = function(type, key) {
    return SingularityData[SingularityFamilies[type]].rewriteAllowed(type, key);
}

Diagram.prototype.rewriteCutData = function(type, key) {
    return SingularityData[SingularityFamilies[type]].rewriteCutData(type, key);
}

Diagram.prototype.rewritePasteData = function(type, key) {
    return SingularityData[SingularityFamilies[type]].rewritePasteData(type, key);
}

Diagram.prototype.expand = function(type, start, n, m) {
    return SingularityData[SingularityFamilies[type]].expand(type, start, n, m);
}


Diagram.prototype.interpretDrag = function(drag) {
    
    // See what options we have
    var options = [];
    for (var family in SingularityData) {
        if (!SingularityData.hasOwnProperty(family)) continue;
        var data = SingularityData[family];
        
        // Don't bother testing if the dimension of the diagram is too low for this singularity type
        if (this.getDimension() < data.dimension - 1) continue;
        
        // See if this family can interpret the drag
        var r = ((this.interpretDrag[family]).bind(this))(drag);
        
        // If so, add it to the list of options
        if (r != null) options.push(r);
    }
    
    if (options.length == 0) return null;
    
    // For now, just do the first option that's returned. We should really pop
    // up a selection box for the user if there's more than one choice.
    return options;
}

