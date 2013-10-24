define(["d3", "BaseChart"], function(d3, BaseChart)
{
	var BarChart = BaseChart.extend({
		initialize: function(attributes, options)
		{
			var view = this;
			if(this.options.chartData)
				view.chartData = this.options.chartData;
			if(this.options.chartModel)
				view.chartModel = this.options.chartModel;
			if(this.options.fieldTypes)
				view.fieldTypes = this.options.fieldTypes;

			view.renderChart();
		},
		renderChart: function()
		{
			var view = this;
			var margin = {top: 20, right: 20, bottom: 30, left: 40},
			    width = this.$el.width() - margin.left - margin.right,
			    height = 500 - margin.top - margin.bottom;

			var x0 = d3.scale.ordinal()
			    .rangeRoundBands([0, width], .1);

			var x1 = d3.scale.ordinal();

			var y = d3.scale.linear()
			    .range([height, 0]);

			var color = d3.scale.ordinal()
			    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

			var xAxis = d3.svg.axis()
			    .scale(x0)
			    .orient("bottom");

			var yAxis = d3.svg.axis()
			    .scale(y)
			    .orient("left")
			    .tickFormat(d3.format(".2s"));

			var svg = d3.select(view.el).append("svg")
			    .attr("width", width + margin.left + margin.right)
			    .attr("height", height + margin.top + margin.bottom)
			  .append("g")
			    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			var data = view.chartData;
			var seriesValues = [];
			_.each(view.chartData, function(seriesCollection, xVal)
			{
				_.each(seriesCollection, function(singleSeriesVal, idx){
					if(seriesValues.indexOf(singleSeriesVal.series) == -1)
						seriesValues.push(singleSeriesVal.series);
				});
			});

			//get all xVals
			x0.domain(Object.keys(data));
			x1.domain(seriesValues).rangeRoundBands([0, x0.rangeBand()]);
			
			//Determine the maximum y value for axis scaling
			var yMax = 0;
			_.each(data, function(val, key){
				_.each(val, function(numericVal, idx){
					var currVal = parseFloat(numericVal.y);
					if(currVal > yMax)
						yMax = currVal;
				});
			});
			y.domain( [0, yMax] );

			//Append the xAxis
			svg.append("g")
			    .attr("class", "x axis")
			    .attr("transform", "translate(0," + height + ")")
			    .call(xAxis);

			//append the yAxis
			svg.append("g")
			    .attr("class", "y axis")
			    .call(yAxis)
			  .append("text")
			    .attr("transform", "rotate(-90)")
			    .attr("y", 6)
			    .attr("dy", ".71em")
			    .style("text-anchor", "end")
			    .text(view.chartModel.get("yAxisLabel"));

			//Format the data for building the bars
			var formattedData = [];
			_.each(data, function(val, key){
				var currObj = {};
				currObj[key] = val;
				formattedData.push(currObj);
			});

			//Generate elements for each bar group
			var xGroup = svg.selectAll(".state")
			    .data(formattedData)
			    .enter().append("g")
			    .attr("class", "g")
			    .attr("transform", function(d) { return "translate(" + x0(Object.keys(d)[0]) + ",0)"; });
			//Create individual bar elements
			xGroup.selectAll("rect")
			    .data(function(d) { 
			    	var returnObject;
			    	for(var prop in d)
			    		returnObject = d[prop];
			    	return returnObject; 
			    })
			    .enter().append("rect")
			    .attr("width", x1.rangeBand())
			    .attr("x", function(d) { return x1(d.series); })
			    .attr("y", function(d) { return y(parseFloat(d.y)); })
			    .attr("height", function(d) { return height - y(parseFloat(d.y)); })
			    .style("fill", function(d) { return color(d.series); });

			var legend = svg.selectAll(".legend")
			    .data(seriesValues.slice().reverse())
			    .enter().append("g")
			    .attr("class", "legend")
			    .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

			legend.append("rect")
			    .attr("x", width - 18)
			    .attr("width", 18)
			    .attr("height", 18)
			    .style("fill", color);

			legend.append("text")
			    .attr("x", width - 24)
			    .attr("y", 9)
			    .attr("dy", ".35em")
			    .style("text-anchor", "end")
			    .text(function(d) { return d; });
		}
	});
	return BarChart;
});