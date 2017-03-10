//treemap.js

function Treemap(options){

	// initialize data vars
	var data = options.data;
	var tree = options.tree;
	if (!tree) return;

	// clean parent container
	var svg = d3.select(options.selector).html('');

	// set sizes and magrins
	var margin = {top: 30, right: 50, bottom: 30, left: 50},
      width = options.width || svg.style('width') || 1100,
      height = options.height || svg.style('height') || 700;

      if (typeof width === 'string') width = +width.replace('px', '');
      if (!width || width === NaN) width = 1100;
      width -= margin.left + margin.right;

      if (typeof height === 'string') height = +height.replace('px', '');
      if (!height || height === NaN) height = width / 11 * 7;
      height -= margin.top + margin.bottom;

	var formatNumber = d3.format(",d"),
	    transitioning;

	// set x,y scales. Non-linear in order to better visibility of small channels
	var x = d3.scale.pow()
		.exponent(1.5)
	    .domain([0, width])
	    .range([0, width]);

	var y = d3.scale.pow()
		.exponent(2.3)
	    .domain([0, height])
	    .range([0, height]);

	// define treemap parameters
	var treemap = d3.layout.treemap()
	    .children(function(d, depth) { return depth ? null : d._children; })
	    .sort(function(a, b) { return a.value - b.value; })
	    .ratio(height / width  * (1 + Math.sqrt(5)))
	    .round(false);

	// style container and prepare working container
	svg = svg 
      .style("width", (width + margin.left + margin.right) + 'px')
      .style("height", (height + margin.top + margin.bottom) + 'px')
	  .append("div")
	  	.style("width", width + "px")
	    .style("transform", "translate(" + margin.left + "px," + margin.top + "px)");

	// create and style top navigator
	var grandparent = svg.append("div")
	    .attr("class", "grandparent");

	grandparent.append("div")
	    .style("width", width + 'px')
	    .style("height", margin.top + 'px')
		.append("p");

	draw(tree);

	// drawing function
	function draw(root) {

	  initialize(root);
	  accumulate(root);
	  layout(root);
	  display(root);

	  function initialize(root) {
	    root.x = root.y = 0;
	    root.dx = width;
	    root.dy = height;
	    root.depth = 0;
	  }

	  // Aggregate the values for internal nodes. This is normally done by the
	  // treemap layout, but not here because of our custom implementation.
	  // We also take a snapshot of the original children (_children) to avoid
	  // the children being overwritten when when layout is computed.
	  function accumulate(d) {
	    return (d._children = d.children)
	        ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
	        : d.value;
	  }

	  // Compute the treemap layout recursively such that each group of siblings
	  // uses the same size (1×1) rather than the dimensions of the parent cell.
	  // This optimizes the layout for the current zoom state. Note that a wrapper
	  // object is created for the parent node for each group of siblings so that
	  // the parent’s dimensions are not discarded as we recurse. Since each group
	  // of sibling was laid out in 1×1, we must rescale to fit using absolute
	  // coordinates. This lets us use a viewport to zoom.
	  function layout(d) {
	    if (d._children) {
	      treemap.nodes({_children: d._children});
	      d._children.forEach(function(c) {
	        c.x = d.x + c.x * d.dx;
	        c.y = d.y + c.y * d.dy;
	        c.dx *= d.dx;
	        c.dy *= d.dy;
	        c.parent = d;
	        layout(c);
	      });
	    }
	  }

	  function display(d) {

	  	//remove item info div
		d3.select('.itemtable').remove();

		// update navigator
	    grandparent
	        .datum(d.parent)
	        .on("click", transition)
	      .select("p")
	        .text(name(d));

	    var g1 = svg.insert("div", ".grandparent")
	        .datum(d)
	        .attr("class", "depth")
	        .style("transform", "translate(0px," + margin.top + "px)");

	    // update a map view
	    var g = g1.selectAll("div")
	        .data(d._children)
	      .enter().append("div");

	    g.filter(function(d) { return d._children; })
	        .classed("children", true)
	        .on("click", transition);

	    g.filter(function(d) { return !d._children; })
	        .classed("nochildren", true)
	        .on("click", showBarChart);

	    g.selectAll(".child")
	        .data(function(d) { return d._children || [d]; })
	      .enter().append("div")
	        .attr("class", "child")
	        .call(rect);

	    var gt = g.append("div")
	        .attr("class", "parent")
	        .call(rect);
	    gt.append("p")
	    	.text(function(d) { return d.name; });
	    gt.append("p")
	        .html(function(d) {
	        	// create T, R, NUM filelds for channels only
	        	if (!d.tw && !d.retw) return '';
	        	return '<span> T:  ' + (d.tw || '0') + 
	        		( (d.depth === 1 && d.zerotweets) ? '*' : '' ) +
	        		'</span><br><span> RT:  ' + (d.retw || '0') + '</span>' + 
	        		( (d.depth === 1 && d._children) ? ('<br><span> NUM:  ' + d._children.length + '</span>') : '' );
	        });

	    // define transitioning effect
	    function transition(d) {

	    	// wait until previous transition ends
	     	if (transitioning || !d) return;	      
	      	transitioning = true;

	      // set new root and redraw
	      var g2 = display(d),
	          t1 = g1.transition().duration(750),
	          t2 = g2.transition().duration(750);

	      // Update the domain only after entering new elements.
	      x.domain([d.x, d.x + d.dx]);
	      y.domain([d.y, d.y + d.dy]);

	      // Draw child nodes on top of parent nodes.
	      svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

	      // Fade-in entering text.
	      g2.selectAll("p").style("opacity", 0);

	      // Transition to the new view.
	      t1.selectAll("p")
	      	.style("opacity", 0);

	      t2.selectAll("p")
	      	.style("opacity", 1);

	      t1.selectAll("div").call(rect);
	      t2.selectAll("div").call(rect);

	      // Remove the old node when the transition is finished.
	      t1.remove().each("end", function() {

	        transitioning = false;

	      });

	    }

	    return g;
	  }

	  // setting rectangle size routine
	  function rect(rect) {
	    rect.style("left", function(d) { return x(d.x) + 'px'; })
	        .style("top", function(d) { return y(d.y) + 'px'; })
	        .style("width", function(d) { return (x(d.x + d.dx) - x(d.x)) + 'px'; })
	        .style("height", function(d) { return (y(d.y + d.dy) - y(d.y)) + 'px'; });
	  }

	  // complile a name for navigator
	  function name(d) {
	    return d.parent
	        ? name(d.parent) + "." + d.name
	        : d.name;
	  }

	  // find current deep in a tree
	  function deepLevel(d){
	  	var deep = 0;

	  	if (!d) return deep;

	  	var parent = d.parent;

	  	while (parent){
	  		deep++;
	  		parent = parent.parent;
	  	}
	  	return deep;
	  }

	  // draw channel's barchart and table with clicked item data
	  function showBarChart(d){

	      	createChart(data, [d.parent.name], ".depth", width, 
		      	new Table({
							data: d,
							selector: svg,
							width : width*0.3
						})
			);
	  }
	}

}

function createChart(data, chnls, selector, width, itemInfo){

	if (!selector) selector = '#chart'

  var startDate, oldStartDate, endDate, oldEndDate, currChnls = chnls, currentItems;

  var noZeros = true;

  // use date pickers if present
  var $datePickers = jQuery('.inputs.input-group.date');

  // init crossfilter and dimentions
  var crossdata = crossfilter(data),
    date = crossdata.dimension(function(d) { return d.date; }),
    channel = crossdata.dimension(function(d) { return d.channel_id; }),
    item = crossdata.dimension(function(d) { return d.Item_Id; }),
    tweet = crossdata.dimension(function(d) { return d.Category; });

    // redraw chart on dates range change
  $datePickers.on('changeDate', function(e){
	
  	if (this.id === 'date-from-input') startDate = e.date ? e.date.getTime() : undefined;
  	if (this.id === 'date-to-input') endDate = e.date ? e.date.getTime() : undefined;
	
  	if ( startDate && startDate !== oldStartDate){
  		oldStartDate = startDate;
  		update();
  	}
  	if ( endDate && endDate !== oldEndDate){
  		oldEndDate = endDate;
  		update();
  	}
  });

	update(currChnls);

  	return {
  		
  		update: update
  	}

  	// update data selection and redraw a chart
    function update( chnls, items ){ 

    	// filter channels and items dimentions by given lists
    	if (arguments.length) {
	    	if (chnls && chnls.length) {
	    		channel.filterFunction( function(d){ return chnls.find( function(ch){ return d === ch; }) });
	    	} else channel.filterAll();

	    	if (items && items.length) {
	    		item.filterFunction( function(d){ return items.find( function(i){ return d === i; } ) });
	    	} else item.filterAll();
    	}

    	// filter and count tweets
		//tweet.filterAll();
	    tweet.filterFunction( function(d){ return d === '1'});

	  	//var dates = date.group(d3.time.day);
	  	//var tweetted = dates.all().map(function(d){ return { date: d.key.getTime(), name: 'tweetted', value: d.value } });

	  	var tweetted = date.top(Infinity).reduce( function(tot, item){
	  		//console.log(item, item.date);
	  		itemdate = item.date.getTime();
	  		var obj = tot.find( function(d){ return d.date === itemdate });
	        if (!obj) {

	          	obj = { date: itemdate, name: 'tweetted', items: [item] };
	          	tot.push(obj);
	        } else obj.items.push(item);
	        return tot;
	  	}, []);

	  	//if (tweetted.length) tweetted.forEach(function(d){ d.date = d.date.getTime()});

	  	// filter and count retweets
	  	//tweet.filterAll();
	  	tweet.filterFunction( function(d){ return d === ''});

	  	dates = date.group(d3.time.day);
	  	var retweetted = dates.all().map(function(d){ return { date: d.key.getTime(), name: 'retweetted', value: d.value } });

	  	// merge into one array
	  	var output =  merge(tweetted, retweetted);

	  	output.sort(function(a,b){ return a.date - b.date; }); //decreasing  	
	  	/*
	  	if ( startDate || endDate ){
    		date.filterFunction( function(d){ 
    			//console.log((!startDate || d.getTime() >= startDate) && (!endDate || d.getTime() <= endDate) );
    			return (!startDate || d.getTime() >= startDate) && (!endDate || d.getTime() <= endDate) 
    		});
    	} else date.filterAll(); */

    	// remove empty entries if noZeros option is set
    	if (!noZeros){
		  	// clean ends from zero data
		  	var v = output[0], len = output.length;
		  	while (v && (!v.tweetted && !v.retweetted && len || (!arguments.length && v.date < startDate) )){
		  		output.shift();
		  		v = output[0];
		  		len--;
		  	}
		  	if (len){
			  	v = output[len - 1];
				while ( v && (len && !v.tweetted && !v.retweetted || (!arguments.length && v.date > endDate) )){
			  		output.pop();
			  		len--;
			  		if ( len ) v = output[len - 1];
			  	}
		  	}
    	}

		//if (arguments.length) updateDateBounds(output[0].date, output[ output.length - 1].date);

		// reserve space for item info div
		if (itemInfo) width *= 0.7;

		// draw chart
	  	Chart({
	        data: output,
	        x: 'date',        // property name for common x-coord
	        selector: selector, // CSS selector of parent container     
	        width: width,
	        info: itemInfo,
	        charts: [{
	                  title: 'tweetted/retweetted',
	                  id: ['tweetted', 'retweetted'],
	                  color: ['red', 'blue'],
	                  type: 'doublebar'
	                }]
	  	});
	}  	

	// update datepickers for min/max date to pick
  	function updateDateBounds(start, end){ 
  		startDate = start;
  		endDate = end;
  		$datePickers.datepicker('destroy');
		$datePickers.show().datepicker({
		    startDate: new Date(startDate),
		    endDate: new Date(endDate),
		    clearBtn: true
		});//
		$datePickers.each(function(){ 
			if (this.id === 'date-from-input') jQuery(this).datepicker('update', new Date(startDate));
  			if (this.id === 'date-to-input') jQuery(this).datepicker('update', new Date(endDate)); 
		 });
  	}

  	// merging 2 arrays of objects
  function merge(){ 
    var result = [];
    for (var arr=0; arr < arguments.length; arr++) {

      arguments[arr].forEach(function(a){ 

        var obj = result.find( function(d){ return d.date == a.date })
        if (!obj) {

        	if ( noZeros && !a.value && !a.items ) return;

          	obj = { date: a.date };
          	result.push(obj);
        }
        if (a.items) {
        	a.value = a.items.length;
        	//obj[a.name] = a;
        }
        obj[a.name] = a;
        //else obj[a.name] = a.value;
      });
    }
    return result;
  }
}

// create a table with item/channel info
function Table( options ){  //console.log('Table options', options);

	// find data source
	var channel = options.data;
  	if (!channel) return;

  	var container = options.selector;

  	// set sizes and margins
  	  var margin = {top: 30, right: 0, bottom: 30, left: 0},
      width = options.width || container.style('width') || 1100,
      height = options.height || container.style('height') || 700;

      if (typeof width === 'string') width = +width.replace('px', '');
      if (!width || width === NaN || width < 100) width = 1100;
      width -= margin.left + margin.right;

      if (typeof height === 'string') height = +height.replace('px', '');
      if (!height || height === NaN || height < 100) height = width / 11 * 7;
      height -= margin.top + margin.bottom;

      // create working container
    var tbl = container.append("div")
      .style({
      			"width": width + margin.left + margin.right + 'px',
      			"height": height + margin.top + margin.bottom + 'px',
      			"top": margin.top + 'px'
      		})
      .attr("class", "itemtable");

    function update(data){ 
      // fill data
      	tbl.html('');
		tbl.append('h2').text( 'Channel details:');
	    tbl.append('p').text( channel.name);
	    tbl.append('p').text( 'Twitted: ' + channel.tw);
	    tbl.append('p').html( 'ReTwitted: ' + channel.retw + '<br>');

	    if (!data) return;

		tbl.append('p').text( 'Date: ' + data.x);

		if (!data.tweetted) return;
		tbl.append('h3').text( 'Twitted Items:');

		// create a list of item names with links (if exist) to tweets
	    if (data.tweetted.items && data.tweetted.items.length) data.tweetted.items.forEach(function(item){
	    	//var href = item.Tweet_Id ? ( 'https://twitter.com/Twitter/status/'+ item.Tweet_Id ) : '';
	    	var href = item.Twitter_link ? item.Twitter_link : '';
	    	tbl.append('a')
	    		.attr({
	    			'target': '_blanc',
	    			'href' : href
	    		})
	    		.html( item.Item_Id + '<br>');
	    });

    }

    update();

    return { update: update };
}
