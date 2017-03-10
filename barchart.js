
function Chart( options ) {

  var data = options.data;
  
  if (!data || !data.length) return;
  // Various formatters.
  var formatNumber = d3.format(".3g"),
      formatDate = options.grouped === 'month' ? d3.time.format("%b, %Y") : d3.time.format("%b %d, %Y");

  var charts = options.charts,
      yMax1, yMax2, w1, w2;

  // set value for date axis
  data.forEach(function(c){
    //c.x = Date.parse( c[options.x] );
    //c.x = c[options.x];
    c.x = formatDate( new Date (c[options.x]) );
  });
  //data.sort(function(a,b){ return b.x - a.x; }); //decreasing

  // find max/min values and add a space for nice view
  yMax1 = d3.max(data, function(d){ return d[charts[0].id[0]] ? d[charts[0].id[0]].value : 0 })*1.1; // 10% nice space
  yMax2 = d3.max(data, function(d){ return d[charts[0].id[1]] ? d[charts[0].id[1]].value : 0 });

  if (yMax1 < 5) yMax1 = 5;

/*
  charts.forEach(function(ch){
    
    var tmp = data.map( function(d){ return { x: d.x, value: +d[ch.id] }; });
    var max = d3.max(tmp, function(d){ return d.value });

    if (max > yMax) yMax = max;

    ch.data = tmp;

  }); */

  // clean container
  var container = d3.select(options.selector).html('');

  // define sizes and margins
  var margin = {top: 30, right: 50, bottom: 30, left: 150},
      width = options.width || container.style('width') || 1100,
      height = options.height || container.style('height') || 700;

      if (typeof width === 'string') width = +width.replace('px', '');
      if (!width || width === NaN || width < 100) width = 1100;
      width -= margin.left + margin.right;

      if (typeof height === 'string') height = +height.replace('px', '');
      if (!height || height === NaN || height < 100) height = width / 11 * 7;
      height -= margin.top + margin.bottom;

  w2 = width/(1 + yMax1/yMax2);
  w1 = width - w2;

 // x - y inverted, x - vertical, y - horizontal
 // define scale for date
 var x = d3.scale.ordinal()
      .rangeBands([height, 0], 0.2, 0)
      .domain(data.map(function(d){ return d.x }));            

   // suppose max 15 ticks on this axis   
  var density = Math.floor(x.domain().length/15);
      if (density < 1) density = 1;

  var xAxis = d3.svg.axis()
      .scale(x)
      .tickFormat( function(t, idx){
        return ( idx % density == 0) ?  t : ''
      } )
      .orient("left");

  // define 2 horizontal axises, one (left) from max to 0, second (right) from 0 to max
  var y = [];
      y[0] = d3.scale.linear()
      .range([w1, 0])
      .domain([0, yMax1]);

  var yAxis1 = d3.svg.axis()
      .scale(y[0])
      .tickFormat( function(t){ return (t % 10 == 0) ?  t : ''})      
      .orient("bottom");

      y[1] = d3.scale.linear()
      .range([0, w2])
      .domain([0, yMax2]);

  var yAxis2 = d3.svg.axis()
      .scale(y[1])
      .tickFormat( function(t){ return (t % 10 == 0) ?  t : ''})      
      .orient("bottom");      

  // create main SVG
  var svg = container.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .on("click", clearSelection )
      .on("mouseout", clearSelection )
      //.on("mouseover", function() { tooltip.style("display", "block"); })
      //.on("mouseout", function() { tooltip.style("display", "none"); })   
    .append("g")
      //.on("mousemove", mousemove)
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // add SVG group and create elements for each horizontal axis
  var svg1 = svg.append("g");
  var svg2 = svg.append("g").attr("transform", "translate(" + w1 + ",0)");

  svg1.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(yAxis1);

  svg2.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(yAxis2)
        .append("text")
        .attr("x", w2)
        .attr("y", -16)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(charts[0].title);

  // create vertical axis
  svg.append("g")
      .attr("class", "y axis")
      .call(xAxis)
     .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text('Day of Date');  

  // create 2 charts for each horizontal axis
  groupChart(svg1, charts[0], x, y[0], 0);
  groupChart(svg2, charts[0], x, y[1], 1);

  // init tooltip
  var tooltip = d3.select('#popup')
        .attr("class", "svgtooltip")
        .style("display", "none");
  tooltip.html('').append('table');

  var day = tooltip.select('table').append('tr');
      day.append('td')
            .text("date");
      day.append('td')
            .text(":");            

      day = day.append('td')
              .text("");

  var val = tooltip.select('table').selectAll('.popup-item')
              .data(charts[0].id)
            .enter().append('tr')
            .style('color', function(d, idx){ return charts[0].color[idx] })
            .attr('class', 'popup-item');

      val.append('td')
            .text(function(d){ return d });
            //.text("Tweetted:");
      val.append('td')
            .text(":");            

      val = val.append('td')
              .text("");

  var tooltipTimeout, tooltipPosition = 'r';              
    
  // if chart with right panel, draw it.
  if (options.side) options.side();

  // remove flickering on tooltip pop-up
  function clearSelection(){

    if (tooltipTimeout) window.clearTimeout(tooltipTimeout);

    tooltipTimeout = window.setTimeout(function(){ tooltip.style("display", "none"); }, 1000);

    //svg.selectAll(".entry").classed('entryselected', false);
  }

  // showing tooltip on mouse events
  function mouseenter(d) {

    if (!d) return;

    if (tooltipTimeout) window.clearTimeout(tooltipTimeout);

    var coord = d3.touch(svg[0][0]);
    if (!coord) coord = d3.mouse(svg[0][0]);
    else coord = coord[0];

    d3.event.stopImmediatePropagation();

    if (tooltipPosition === 'r' && coord[0] > width*0.6 ){
      tooltipPosition = 'l';
      tooltip.style("right", "inherit");
      tooltip.style("left", (margin.left + 100) + "px");
    }

    if (tooltipPosition === 'l' && coord[0] < width *0.4 ){
      tooltipPosition = 'r';
      tooltip.style("left", (width - 100) + "px");
      tooltip.style("right", "inherit");
    }

    tooltip.style("display", "block");

    //svg.selectAll(".entry").classed('entryselected', function(dd){ return dd.x === d.x });

    day.text( d.x );

    val.text(function(prop){ return d[prop] ? d[prop].value : "0" }); //.text( d.tweetted ); 
    //val2.text( d.retweetted );
  }
  function mouseclick(d){ 
    //mouseenter(d);
    svg.selectAll(".entry").classed('entryselected', function(dd){ return dd.x === d.x });
    //if (!d[charts[0].id[0]]) return;
    updateTable(d);
  }

  function updateTable(d){
    if (options.info) options.info.update(d);    
  }

  // draw chart
  function groupChart(svg, chart, x, y, idx){

    if(chart.type === 'doublebar') {
      var rects = svg.selectAll(".entry")
          .data(data) 
        .enter().append("g")
          .attr("class", "entry")          
          .on("mouseenter", mouseenter )
          .on("mouseout", function(d) { clearSelection })
          .attr("transform", function(d) { return "translate(0," + x(d.x) + ")"; });

      rects.append('rect')
          .attr("height", x.rangeBand() )
          .attr("x", function(d) { var v = d[chart.id[idx]] ? d[chart.id[idx]].value : 0; return idx ? 0 : y(v); })
          .attr("width", function(d) { var v = d[chart.id[idx]] ? d[chart.id[idx]].value : 0; return idx ? y(v) : w1 - y(v); })
          .on("click", mouseclick )
          .style("fill", chart.color[idx] );

      rects.append('rect')
          .attr("class", "entry-fill")
          .attr("height", x.rangeBand() )
          .attr("x", function(d) { var v = d[chart.id[idx]] ? d[chart.id[idx]].value : 0; return idx ? y(v) : 0 })
          .attr("width", function(d) { var v = d[chart.id[idx]] ? d[chart.id[idx]].value : 0; return idx ? w2 - y(v) : y(v); });  
    }        
  }
}
