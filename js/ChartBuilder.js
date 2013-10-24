define(["jquery", "backbone", "marionette", "jqueryui", "FileParsingWorker"], function(a){
	var FIELDTYPES = { STRING:3, NUMERIC:2, DATE:1 };
	var Chrt = { Models:{}, Views:{}, Inputs:{} };
	/*
	The app, its regions, & event handlers
	*/
	Chrt.App = new Backbone.Marionette.Application();
	Chrt.App.addRegions({
		sidebar: "#sidebarRegion",
		palette: "#paletteRegion",
		navBar: "#navRegion"
	});
	//When the user has successfully loaded a CSV, show the column sidebar and gallery:
	Chrt.App.vent.on("columns:new", function(payload){
		//Initialize & show the sidebar column view
		Chrt.App.columnCollection = new Chrt.Models.AllColumns(payload)
		Chrt.App.sidebarView = new Chrt.Views.SidebarContainer({
			collection: Chrt.App.columnCollection
		});
		Chrt.App.sidebar.reset();
		Chrt.App.sidebar.show(Chrt.App.sidebarView);
		
		//Initialize & show the gallery view
		if(!Chrt.App.chartTypes)
		{
			//TODO: @mroper move this somewhere...
			Chrt.App.chartTypes = new Chrt.Models.Gallery(
				[{ "type":"Stock", "title":"Zoomable Stock Chart", "constraints":{ "requiredAttrs":["xAxisColumn","yAxisColumn"], "axisFieldTypes":{ "xAxisType": FIELDTYPES.DATE, "yAxisType":FIELDTYPES.NUMERIC }}},
				 { "type":"Pie", "title":"Pie Chart", "constraints":{ "requiredAttrs":["xAxisColumn","yAxisColumn"], "axisFieldTypes":{ "yAxisType":FIELDTYPES.NUMERIC }}},
				 { "type":"Bar", "title":"Bar Chart", "constraints":{ "requiredAttrs":["xAxisColumn","yAxisColumn", "seriesColumn"], "axisFieldTypes":{ "yAxisType":FIELDTYPES.NUMERIC }}},
				 { "type":"HexBin", "title":"Hexagonal Binning Chart", "constraints":{ "requiredAttrs":["xAxisColumn","yAxisColumn"], "axisFieldTypes":{ "xAxisType": FIELDTYPES.DATE, "yAxisType":FIELDTYPES.NUMERIC }}}]
			);
		}
		if(!Chrt.App.galleryView)
		{
			Chrt.App.galleryView = new Chrt.Views.Gallery({
				collection: Chrt.App.chartTypes
			});
		}
		Chrt.App.palette.reset();
		Chrt.App.palette.show(Chrt.App.galleryView);
	});
	//When the user has selected a chart type, show the builder palette
	Chrt.App.vent.on("gallery:chartSelected", function(selectedChartType)
	{
		console.log("Chart type selected with type= " + selectedChartType.get("type"));
		
		var paletteType = selectedChartType.get("type") + "BuilderPalette";
		if(Chrt.Views[paletteType])
			var paletteView = new Chrt.Views[paletteType]({ model: selectedChartType });
		else
			console.log(paletteType + " view is not defined :(");
		Chrt.App.palette.reset();
		Chrt.App.palette.show(paletteView);
	});
	/*
	Define the models
	*/
	Chrt.Models.SheetColumn = Backbone.Model.extend({});
	Chrt.Models.AllColumns = Backbone.Collection.extend({
		model: Chrt.Models.SheetColumn
	});

	Chrt.Models.GalleryChart = Backbone.Model.extend({});
	Chrt.Models.Gallery = Backbone.Collection.extend({
		model: Chrt.Models.GalleryChart
	});
	/*
	The views
	*/
	//Sidebar Views
	Chrt.Views.SidebarColumn = Backbone.Marionette.ItemView.extend({
		template: "#sidebarColumn",
		tagName: "li",
		className:"ColumnValue",
		initialize:function()
		{
			var type = this.model.get("type");
			if(type == FIELDTYPES.DATE)
				type = "Date";
			else if( type == FIELDTYPES.NUMERIC)
				type="Numeric";
			else if(type == FIELDTYPES.STRING)
				type ="String";
			else
				type = null;
			
			if(type)
				this.$el.addClass(type);
		}
	});
	Chrt.Views.SidebarContainer = Backbone.Marionette.CompositeView.extend({
		template: "#sidebarContainer",
		tagName: "div",
		itemView: Chrt.Views.SidebarColumn,
		itemViewContainer: ".ColumnList",
		id:"columnsView",
		className:"SolidBorder",
		initialize:function()
		{
			//When the region has shown the view, bind draggable and droppable
			Chrt.App.sidebar.on("show", function(view)
			{
				var columns = view.$(".ColumnValue");
				columns.draggable({
					opacity: 1.0,
					helper: "clone",
					revert: "invalid",
					revertDuration: 300,
					addClasses: false,
					distance: 5
				});
			});
		}
	});
	//Thumbnail Gallery Views
	Chrt.Views.GalleryThumbnail = Backbone.Marionette.ItemView.extend({
		template:"#chartGalleryItem",
		model: Chrt.Models.GalleryChart,
		className:"ThumbnailContainer SolidBorder",
		events:{
			"click":"_itemSelected"
		},
		_itemSelected: function(event)
		{
			var view = this;
			Chrt.App.vent.trigger("gallery:chartSelected", view.model );
		}
	});
	Chrt.Views.Gallery = Backbone.Marionette.CompositeView.extend({
		template:"#chartGalleryContainer",
		itemView: Chrt.Views.GalleryThumbnail,
		tagName:"div",
		id: "galleryView",
		itemViewContainer: ".ChartContainer"
	});
	//Builder Palette views
	/*
	PaletteBuilder should do aggregation, chart types just render, and are given their required JSON.

	raw data,	
	{
		xAxisField:"",
		xAxisGrouping:"", //default is null: string offers equal value.  date offers day, week, month, quarter, year, numeric offers equal val, .1, 1, 10, 100, 1000, 10000?
		yAxisField:"", //numeric
		yAxisAggFunction:"", //default is sum.  Alternatives include average, max, min, std-dev, count-of-rows
		seriesField:"", //any data type, default to null
		seriesGrouping:"" //defaults to same value....
	}	*/

	axisGroupings = {
		EQUALVALUE: 1,
		DAY:2,
		WEEK:3,
		MONTH:4,
		QUARTER:5,
		YEAR:6,
		TENTH: 7,
		TENS: 8,
		HUNDREDS: 9,
		THOUSANDS: 10
	}
	aggregateFunctions ={
		SUM: 1,
		AVERAGE: 2,
		ROWCOUNT: 3,
		MAX: 4,
		MIN: 5,
		STDDEV: 6
	}

	Chrt.Views.BasePalette = Backbone.Marionette.Layout.extend({
		regions: {
			chartRegion: ".ChartBody"
		},
		tagName: "div",
		id: "paletteView",
		initialize: function()
		{
			var view = this;
			//When the App region has shown the view, bind droppables
			Chrt.App.palette.on("show", function(view){ 
				if(view._bindDroppable)
					view._bindDroppable(); 
			});
		},
		_buildChart: function()
		{
			var view = this;
			if(!Chrt.App.chartData)
				return;	
			
			//TODO: @mroper implement data aggregator on the builder palette view.
			//view.App.chartData 
			var aggregatedData;
			if(view.model.get("seriesColumn") || view.model.get("seriesColumn") == 0)//TODO: @mroper add support for aggregating when grouping is selected
				aggregatedData = this._aggregateData(Chrt.App.chartData);	
			console.log(aggregatedData);
			//Module load the appropriate chart renderer:
			require([view.model.get("type") + "Chart"], function(chartView)
			{
				Chrt.App.vent.trigger("palette:chartRendered", view.model.get("type"));
				view.$(".ChartBody").removeClass("SolidBorder");
				//Deallocate existing views
				if(view.chartView)
				{
					view.chartView.destroyView();
					view.chartRegion.reset();
					view.$(".ChartContainer > .YAxis").after("<div class='ChartBody'></div>");
				}
				view.chartView = new chartView({
					el: view.$(".ChartBody"), //Element in which to render
					chartData: ((aggregatedData)? aggregatedData : Chrt.App.chartData),//The array containing every value in the CSV
					chartModel: view.model, //The valid chart model
					fieldTypes: FIELDTYPES //The field type enumerated type
				});
				view.chartRegion.attachView(view.chartView);
			}, function(err)
			{
				console.log("requireJS module loading error: " + err);
				$("#instructions").text("Chart type " + view.model.get("type") + " not available :(");
			});
		},
		_isChartModelValid: function()
		{
			var view = this;
			if(!view.model.get("constraints"))
				return false;

			var isValid = true;
			var constraints = view.model.get("constraints");
			_.each(constraints.requiredAttrs, function(el, idx){
				if(!view.model.get(el) && view.model.get(el) != 0)
					isValid = false;
			});
			_.each(constraints.axisFieldTypes, function(val, key){
				if(view.model.get(key) !== val)
					isValid = false;
			});
			return isValid;
		},
		_bindDroppable: function()
		{
			//Override this method in the subclasses
			var view = this;
			//Y Axis Droppable
			var yAxis = view.$(".YAxis");
			var constraints = view.model.get("constraints");
			var yAxisFieldType;
			if(constraints && constraints.axisFieldTypes && constraints.axisFieldTypes.yAxisType)
				yAxisFieldType = constraints.axisFieldTypes.yAxisType;
			yAxisFieldType = view._getFieldTypeClass(yAxisFieldType);
			yAxis.droppable({
				accept: yAxisFieldType,
				activeClass:"HighlightDroppable",
				hoverClass:"HoverDroppable",
				drop: function(event, ui)
				{
					var $currEl = $(ui.draggable[0]);
					var $elChild = $currEl.children(":first");
					var fieldLabel = $currEl.text();
					$(this).empty().append($( "<h1>" + fieldLabel + "</h1>"));
					view.model.set("yAxisLabel", fieldLabel);
					view.model.set("yAxisColumn", parseInt($elChild.attr("data-id")));
					view.model.set("yAxisType", parseInt($elChild.attr("data-type")));
					if(view._isChartModelValid(view.chartModel))
						view._buildChart();
				}
			});
			//X Axis Droppable
			var xAxis = view.$(".XAxis");
			var xAxisFieldType;
			if(constraints && constraints.axisFieldTypes && constraints.axisFieldTypes.xAxisType)
				xAxisFieldType = constraints.axisFieldTypes.xAxisType;
			xAxisFieldType = view._getFieldTypeClass(xAxisFieldType);
			xAxis.droppable({
				accept: xAxisFieldType,
				activeClass:"HighlightDroppable",
				hoverClass:"HoverDroppable",
				drop: function(event, ui)
				{
					var $currEl = $(ui.draggable[0]);
					var $elChild = $currEl.children(":first");
					var fieldLabel = $currEl.text();
					$(this).empty().append($( "<h1>" + fieldLabel + "</h1>"));
					view.model.set("xAxisLabel", fieldLabel);
					view.model.set("xAxisColumn", parseInt($elChild.attr("data-id")));
					view.model.set("xAxisType", parseInt($elChild.attr("data-type")));
					if(view._isChartModelValid())
						view._buildChart();
				}
			});
		},
		_getFieldTypeClass: function(fieldTypeID)
		{
			var fieldTypeString;
			if(fieldTypeID == FIELDTYPES.DATE)
				fieldTypeString = ".Date";
			else if(fieldTypeID == FIELDTYPES.NUMERIC)
				fieldTypeString = ".Numeric";
			else if(fieldTypeID == FIELDTYPES.STRING)
				fieldTypeString = ".String";
			else
				fieldTypeString = ".ColumnValue";
			return fieldTypeString;
		},
		_aggregateData: function(rawData)
		{
			var view = this;
			var SERIESKEY = "series";
			var YKEY = "y";
			var YCOUNTKEY = "yCount";
			var YAGGKEY = "yAgg";
			var aggregateData={};
			var xColumnIndex = view.model.get("xAxisColumn");
			var yColumnIndex = view.model.get("yAxisColumn");
			var seriesColumnIndex = view.model.get("seriesColumn");
			var yAggFunction = aggregateFunctions.SUM;
			if(view.model.get("yAxisAggFunction"))
				yAggFunction = view.model.get("yAxisAggFunction");

			_.each(rawData, function(datarow, idx){
				if(idx == 0)
					return;
				var xVal = datarow[xColumnIndex];
				var yVal = datarow[yColumnIndex]; 
				var newObj = {};
				newObj[YKEY] = yVal;
				newObj[YCOUNTKEY] = 1;
				newObj[YAGGKEY] = yAggFunction;
				
				//If there is not an aggregate entry for the current row's xval, create one
				if(!aggregateData[xVal])
				{
					//There is no entry for this xVal, so add it.
					if(seriesColumnIndex || seriesColumnIndex == 0)
						newObj[SERIESKEY] = datarow[seriesColumnIndex];
					aggregateData[xVal] = [];
					aggregateData[xVal].push(newObj);
				}
				else
				{
					//There is an entry for the row xval, update the xval!
					if(seriesColumnIndex || seriesColumnIndex == 0)
					{
						//check if there is a series entry for our current series value
						var seriesVal = datarow[seriesColumnIndex];
						var seriesIndex;
						_.each(aggregateData[xVal], function(eachVal, idx){
							if(eachVal[seriesColumnIndex] == seriesVal)
								seriesIndex = idx;
						});
						//if there is no entry for the series, xval
						if(aggregateData[xVal][seriesIndex])
						{
							aggregateData[xVal][seriesIndex][YKEY] += yVal;
							aggregateData[xVal][seriesIndex][YCOUNTKEY]++;
						}
						else
						{
							newObj[SERIESKEY] = seriesVal;
							aggregateData[xVal].push(newObj);
						}
					}
					else
					{

						newObj[SERIESKEY] = seriesVal;
						aggregateData[xVal] = newObj;
					}
				}
			});
			return aggregateData;
		}
	});

	Chrt.Views.StockBuilderPalette = Chrt.Views.BasePalette.extend({
		template: "#paletteContents",
		_bindDroppable: function()
		{
			Chrt.Views.BasePalette.prototype._bindDroppable.apply(this);
		}
	});
	Chrt.Views.BarBuilderPalette = Chrt.Views.BasePalette.extend({
		template:"#barPaletteContents",
		_bindDroppable:function()
		{
			//Super class binds the defaults, X & Y droppables
			Chrt.Views.BasePalette.prototype._bindDroppable.apply(this);
			//Override this method in the subclasses
			var view = this;
			//Y Axis Droppable
			var series = view.$(".Series");
			var constraints = view.model.get("constraints");
			var seriesFieldType;
			if(constraints && constraints.axisFieldTypes && constraints.axisFieldTypes.seriesType)
				seriesFieldType = constraints.axisFieldTypes.seriesType;
			seriesFieldType = view._getFieldTypeClass(seriesFieldType);
			series.droppable({
				accept: seriesFieldType,
				activeClass:"HighlightDroppable",
				hoverClass:"HoverDroppable",
				drop: function(event, ui)
				{
					var $currEl = $(ui.draggable[0]);
					var $elChild = $currEl.children(":first");
					var fieldLabel = $currEl.text();
					$(this).empty().append($( "<h1>" + fieldLabel + "</h1>"));
					view.model.set("seriesLabel", fieldLabel);
					view.model.set("seriesColumn", parseInt($elChild.attr("data-id")));
					view.model.set("seriesType", parseInt($elChild.attr("data-type")));
					if(view._isChartModelValid(view.chartModel))
						view._buildChart();
				}
			});
		}
	});
	//Navigation panel view
	Chrt.Views.NavContainer = Backbone.Marionette.ItemView.extend({
		template:"#navContents",
		tagName:"div",
		id:"navView",
		initialize: function()
		{
			var view = this;
			//When a new sheet is loaded, display instructions
			Chrt.App.vent.on("columns:new", function(payload){ 
				view.$("#instructions").text("Click on a chart type."); 
			});
			Chrt.App.vent.on("gallery:chartSelected", function(chartModel){ 
				view.$("#instructions").text("Drag & drop columns to build chart.") 
			});
			Chrt.App.vent.on("palette:chartRendered", function(){
				view.$("#instructions").text("Thats it for now!");
			});
		},
		events:{
			"change #files":"_handleNewFile"
		},
		//Parses a newly uploaded file 
		_handleNewFile: function(event)
		{
			var view = this;
			var files = event.target.files; 
			//Initialize a web worker thread to read in the file and parse it into an array
			var worker = new Worker("FileParsingWorker.js");	
			worker.addEventListener("message", function(e)
			{
				view.fieldTypes = e.data.fieldTypes;
				console.log(view.fieldTypes);
				if(e.data.csvData)
				{
					var endTime = (new Date()).getTime();
					var total = endTime - startTime;
					console.log("Got array back from the worker thread! Operation took: " + total.toString());
					Chrt.App.chartData = e.data.csvData;
					var columnCollection = view._constructColumns(Chrt.App.chartData, view.fieldTypes);
					Chrt.App.vent.trigger("columns:new", columnCollection );
				}
				else
				{
					console.log("ERROR: Worker thread returned null!");
				}
			});
			//START TIMER
			var startTime = (new Date()).getTime();
			worker.postMessage(files);
		},
		/* Uses the first row in the array representing the .CSV to determine column name and 
		the fieldTypes array to determine column field type.  Builds the Backbone Collection & Models */
		_constructColumns: function(chartData, fieldTypes)
		{
			if(!chartData || !fieldTypes)
			{
				console.log("ERROR: cannot construct collection without chartData and fieldTypes!");
				return;
			}
			var columns = [];
			for(var i = 0; i < fieldTypes.length; i++)
			{
				var col = {};
				col.name = chartData[0][i];
				col.type = fieldTypes[i];
				col.index = i;
				columns.push(col);
			}
			return columns;
		},
	});
	/*
	App initializer
	*/
	Chrt.App.addInitializer(function(options){
		var navView = new Chrt.Views.NavContainer({});
		Chrt.App.navBar.show(navView);
	});
	return Chrt;
});