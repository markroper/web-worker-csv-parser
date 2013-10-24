define(["d3", "BaseChart"], function(d3, BaseChart)
{
	var StockChart = BaseChart.extend({
		initialize: function(attributes, options)
		{
			_.bindAll(this, 'brushed');
			var view = this;
			if(this.options.chartData)
				view.chartData = this.options.chartData;
			if(this.options.chartModel)
				view.chartModel = this.options.chartModel;
			if(this.options.fieldTypes)
				view.fieldTypes = this.options.fieldTypes;
			
			view.margin = {top: 10, right: 10, bottom: 100, left: 40};
				view.margin2 = {top: 430, right: 10, bottom: 20, left: 40};
				view.width = this.$el.width() - view.margin.left - view.margin.right;
				view.height = 500 - view.margin.top - view.margin.bottom;
				view.height2 = 500 - view.margin2.top - view.margin2.bottom;

			view.x = d3.time.scale().range([0, view.width]);
				view.x2 = d3.time.scale().range([0, view.width]);
				view.y = d3.scale.linear().range([view.height, 0]);
				view.y2 = d3.scale.linear().range([view.height2, 0]);

			view.xAxis = d3.svg.axis().scale(view.x).orient("bottom");
				view.xAxis2 = d3.svg.axis().scale(view.x2).orient("bottom");
				view.yAxis = d3.svg.axis().scale(view.y).orient("left");

			view.brush = d3.svg.brush()
				.x(view.x2)
				.on("brush", view.brushed);

			view.area = d3.svg.area()
				.interpolate("monotone")
				.x(function(d) { 
					return view.x(d.date); 
				})
				.y0(view.height)
				.y1(function(d) { 
					return view.y(d.price); 
				});

			view.area2 = d3.svg.area()
				.interpolate("monotone")
				.x(function(d) { return view.x2(d.date); })
				.y0(view.height2)
				.y1(function(d) { return view.y2(d.price); });

			view.svg = d3.select(view.el).append("svg")
				.attr("width", view.width + view.margin.left + view.margin.right)
				.attr("height", view.height + view.margin.top + view.margin.bottom);

			view.svg.append("defs").append("clipPath")
				.attr("id", "clip")
			  .append("rect")
				.attr("width", view.width)
				.attr("height", view.height);

			view.focus = view.svg.append("g")
				.attr("transform", "translate(" + view.margin.left + "," + view.margin.top + ")");

			view.context = view.svg.append("g")
				.attr("transform", "translate(" + view.margin2.left + "," + view.margin2.top + ")");
		
			view.renderChart();
		},
		renderChart: function()
		{
			var view = this;
			if(view.chartModel.get("xAxisType") !== FIELDTYPES.DATE || view.chartModel.get("yAxisType") !== FIELDTYPES.NUMERIC)
			{
				console.log("ERROR: xAxis field must be a date and xAxis field must be numeric, how did you get past validation?");
				return;
			}
			var chartData = view.chartData;
			var newChartData = [];
			var xIndex = view.chartModel.get("xAxisColumn");
			var yIndex = view.chartModel.get("yAxisColumn");
			_.each(chartData, function(val, idx)
			{
				if(idx != 0)
				{
					var floatVal = parseFloat(val[yIndex]);
					if(floatVal != "NaN" && floatVal)
						newChartData.push( { "date": Date.parse(val[xIndex]), "price": floatVal } );
				}
			});
			chartData = newChartData;
			view.x.domain(d3.extent(chartData.map(function(d) { return d.date; })));
			view.y.domain([0, d3.max(chartData.map(function(d) { return d.price; }))]);
			view.x2.domain(view.x.domain());
			view.y2.domain(view.y.domain());

			view.focus.append("path")
				.datum(chartData)
				.attr("clip-path", "url(#clip)")
				.attr("d", view.area);

			view.focus.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + view.height + ")")
				.call(view.xAxis);

			view.focus.append("g")
				.attr("class", "y axis")
				.call(view.yAxis);

			view.context.append("path")
				.datum(chartData)
				.attr("d", view.area2);

			view.context.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + view.height2 + ")")
				.call(view.xAxis2);

			view.context.append("g")
				.attr("class", "x brush")
				.call(view.brush)
				.selectAll("rect")
				.attr("y", -6)
				.attr("height", view.height2 + 7);
			
			//Append chart title				
			view.svg.append("text")
				.attr("x", (view.width / 2))             
				.attr("y", view.margin.top + 10)
				.attr("text-anchor", "middle")  
				.style("font-size", "16px") 
				.text(view.chartModel.get("title"));
		},
		brushed: function() 
		{
			var view = this;
			view.x.domain(view.brush.empty() ? view.x2.domain() : view.brush.extent());
			view.focus.select("path").attr("d", view.area);
			view.focus.select(".x.axis").call(view.xAxis);
		}
	});
	return StockChart;	
});
