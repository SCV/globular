"use strict";

/*
    A Display class for rendering diagrams.
    
    Members:
        - suppress : N, levels to supress
        - coordinates : Array, indices of the display positions
        - container: div to render 
        - control: div for controls
*/

var click_radius = 0.25;

// Constructor
function Display(container, diagram) {
    this.container = container;
    this.diagram = diagram;
    this.active = null;
    this.select_zone = null;
    this.suppress_input = null;
    this.coordinates = [];
    var self = this;
    $(container).mousedown(function(event) {
        self.mousedown(event)
    });
    $(container).mouseup(function(event) {
        self.mouseup(event)
    });
    $(container).mousemove(function(event) {
        self.mousemove(event)
    });
    this.create_controls();
}

Display.prototype.mousedown = function(event) {
    if (this.active == null) return;
    if (this.active.length == 0) return;
    var closest_zone = null;
    var shortest_sq_dist = Number.MAX_VALUE;
    var logical = this.pixelsToLogical(event);
    console.log("Detected click: " + JSON.stringify(logical));
    for (var i = 0; i < this.active.length; i++) {
        var zone = this.active[i];
        var dx = logical.x - zone.x;
        var dy = logical.y - zone.y;
        var sq_dist = dx * dx + dy * dy;
        if (sq_dist < shortest_sq_dist) {
            closest_zone = zone;
            shortest_sq_dist = sq_dist;
        }
        this.select_zone = closest_zone;
        this.select_logical = logical;
    }
    console.log("Detected mousedown: " + JSON.stringify(this.select_zone));
}

var min_drag = 0.25;
Display.prototype.mousemove = function(event) {
    
    if (!detectLeftButton(event)) {
        this.select_zone = null;
        return;
    }
    if (this.select_zone == null) return;
    var logical = this.pixelsToLogical(event);
    var dx = logical.x - this.select_logical.x;
    var dy = logical.y - this.select_logical.y;
    
    //console.log("distance = " + Math.sqrt(dx*dx+dy*dy));
    if (dx * dx + dy * dy < 0.3 * 0.3) return;
    
    var z = new Object(this.select_zone);
    this.select_zone = null;

    var position = this.diagram.getBoundaryCoordinate(z.logical);
    var data = {
        coordinates: position.coordinates,
        boundary_type: position.boundary_path.last(),
        boundary_depth: position.boundary_path.length
    };

    if (z.direction == 'horizontal') {
        if (Math.abs(dx) < 0.25) return;
        data.directions = [dx > 0 ? +1 : -1];
    }
    else if (z.direction == 'vertical') {
        if (Math.abs(dy) < 0.25) return;
        data.directions = [dy > 0 ? +1 : -1, dx > 0 ? +1 : -1];
    }

    gProject.drag_cell(data);
}

Display.prototype.mouseup = function(event) {
    this.select_zone = null;
}

Display.prototype.pixelsToLogical = function(event) {

    var this_width = $(this.container).width();
    var this_height = $(this.container).height();
    if (this_width == 0) return null;
    if (this_height == 0) return null;
    var b = $(this.container)[0].bounds;
    if (b === undefined) return;
    b.top_left = {};
    b.height = b.top - b.bottom;
    b.width = b.right - b.left;
    if (this_width / this_height < b.width / b.height) {
        // Picture is short and fat, touching the sides of the viewing area
        b.top_left.pix_x = 0;
        b.top_left.pix_y = (this_height - (b.height * this_width / b.width)) / 2;
        b.pix_width = this_width;
        b.pix_height = b.height * this_width / b.width;
    }
    else {
        // Picture is tall and thin, touching the top and bottom of the viewing area
        b.top_left.pix_x = (this_width - (b.width * this_height / b.height)) / 2;
        b.top_left.pix_y = 0;
        b.pix_width = b.width * this_height / b.height;
        b.pix_height = this_height;
    }
    var x = b.left + (event.offsetX - b.top_left.pix_x) * b.width / b.pix_width;
    var y = b.top - (event.offsetY - b.top_left.pix_y) * b.height / b.pix_height;
    return {
        x: x,
        y: y
    };
}

Display.prototype.has_controls = function() {
    return ($(this.container).children('div.control').length > 0);
}

// Make sure all the coordinates and suppressions make sense
Display.prototype.update_controls = function(boundary) {

    // If there's no diagram, nothing to do
    if (this.diagram == null) return;

    // If there are no controls, create them
    if (!this.has_controls()) this.create_controls();

    // Update the suppression input
    var new_suppress = this.suppress_input.val();
    new_suppress = Math.min(new_suppress, this.diagram.getDimension() - 1);
    if (new_suppress < 0) new_suppress = 0;
    this.suppress_input.val(new_suppress);

    // Update the slice controls
    this.update_slice_container(boundary);
}

Display.prototype.update_sliders = function() {

}

Display.prototype.control_change = function() {
    this.update_controls();
    this.render();
}

// Create the control panel, only called in the constructor
Display.prototype.create_controls = function() {
    var c = $(this.container);

    // Remove any existing controls
    $(this.container).children('div.control').remove();

    // Choose popout mode if the display is small
    var popout = (c.width() < 100 || c.height() < 100);

    // Construct the main control div
    this.control = $('<div>')
        .addClass('control')
        .addClass(popout ? 'popout' : 'inline')
        .mousedown(function(e) {e.stopPropagation()})
        .mouseup(function(e) {e.stopPropagation()})
        .click(function(e) {e.stopPropagation()});
    this.container.append(this.control);

    // Construct the suppress control
    this.control.append(document.createTextNode('Suppress '));
    this.suppress_input =
        $('<input>')
        .attr('type', 'number')
        .addClass('control')
        .attr('min', 0)
        .val(0)
        .mouseover(function(){this.focus();});
    var self = this;
    this.suppress_input.on('input', function(event) {
        self.control_change(event)
    });
    this.control.append(this.suppress_input);

    // Construct the container for the slice controls
    this.slice_div = $('<div>').addClass('slice_container');
    this.slice_div.append(document.createTextNode('Slice '));
    this.control.append(this.slice_div);
    this.coordinates = [];
}

Display.prototype.update_slice_container = function(boundary) {

    // If the diagram is null, we shouldn't have any slice controls
    if (this.diagram == null) {
        for (var i = 0; i < this.coordinates.length; i++) {
            this.coordinates[i].remove();
        }
        this.coordinates = [];
        return;
    }

    // Calculate the desired number of slice controls
    var remaining_dimensions = this.diagram.getDimension() - $(this.suppress_input).val() - 2;
    if (remaining_dimensions < 0) remaining_dimensions = 0;

    // Remove any superfluous slice controls
    while (this.coordinates.length > remaining_dimensions) {
        this.coordinates.last().remove();
        this.coordinates.pop();
    }
    
    // If a particular boundary has been requested, make sure it is within view
    if (boundary != undefined) {
        if (boundary.boundary_depth == 0) {
            // do nothing
        } else {
            var slice_index = boundary.boundary_depth - 1;
            if (boundary.boundary_type == 't') {
                if (slice_index < this.coordinates.length) {
                    var current = this.coordinates[slice_index].val();
                    this.coordinates[slice_index].val(current + 1);
                }
            }
        }
    }

    // Add any additional slice controls with a dimension of zero
    var self = this;
    for (var i = this.coordinates.length; i < remaining_dimensions; i++) {
        this.coordinates[i] =
            $('<input>')
            .addClass('control')
            .addClass('slice')
            .attr('type', 'number')
            .attr('min', 0)
            .val(0)
            .on('input', function(event) {
                self.control_change(event)
            })
            .mouseover(function(){this.focus();});
        this.slice_div.append(this.coordinates[i]);
    }

    // Ensure the slice coordinates are valid
    var slice = this.diagram.copy();
    for (var i = 0; i < remaining_dimensions; i++) {
        var input = this.coordinates[i];
        input.val(Math.min(input.val(), slice.nCells.length));
        input.attr('max', slice.nCells.length);
        slice = slice.getSlice(input.val());
    }
}

// Attach the given diagram to the window, showing at least the specified boundary
Display.prototype.set_diagram = function(diagram, boundary) {
    this.diagram = diagram;
    if (this.diagram == null) {
        this.container.empty();
    }
    else {
        this.update_controls(boundary);
        this.render();
    }
}

Display.prototype.get_current_slice = function() {
    var coordinates = [];
    for (var i = 0; i < this.coordinates.length; i++) {
        coordinates.push(Number(this.coordinates[i].val()));
    }
    return coordinates;
}

Display.prototype.render = function() {

    // Slice the diagram appropriately
    var slice = this.diagram.copy();
    for (var i = 0; i < this.coordinates.length; i++) {
        slice = slice.getSlice(this.coordinates[i].val());
    }
    this.active = globular_render(this.container, slice, this.highlight, this.suppress_input.val());
    if (this.active == null) return;

    // Obtain slice coordinates with which to pad the active zone data
    var pad_coordinates = [];
    for (var i = 0; i < this.coordinates.length; i++) {
        pad_coordinates[i] = Number(this.coordinates[i].val());
    }
    
    // Pad active zone coordinates
    for (var i = 0; i < this.active.length; i++) {

        // Pad the boundary depth if it's a boundary coordinate
        if (this.active[i].boundary_depth > 0) {
            this.active[i].boundary_depth += this.coordinates.length;
        }
        
        // Pad the logical coordinates with the slider coordinates
        this.active[i].logical = pad_coordinates.concat(this.active[i].logical);
    }
}