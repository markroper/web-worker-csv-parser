define([], function(d3)
{
	var BaseChart = Backbone.View.extend({
		destroyView: function() {
	    	this.undelegateEvents();
	   		this.$el.removeData().unbind(); 
	    	//Remove view from DOM
	    	this.remove();  
	    	Backbone.View.prototype.remove.call(this);
	    }
	});
	return BaseChart;
});