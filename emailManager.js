var fs          = require('fs'),
    _           = require('underscore'),
    d3          = require('d3'),
    jsdom       = require('jsdom'),
    htmlStub    = '<!DOCTYPE html><html><head><style>path{stroke: steelblue;stroke-width: 2;fill: none;}line {stroke: black;}text {font-family: Arial;font-size: 9pt;}</style></head><body><svg id="chart"></svg></body></html>',
    document    = jsdom.jsdom(htmlStub),
    window      = document.createWindow(),
    xmldom      = require('xmldom');

module.exports = {

    // processFileData: function () {
    //     var file = fs.readFileSync('./tradeLog.log', {encoding: 'utf8'}),
    //         arbs = _.rest(file.split('%')),
    //         obj;

    //     var result = {
    //         ltc: [],
    //         btc: [],
    //         x: []
    //     };

    //     _.each(arbs, function (arb) {
    //         obj = JSON.parse(arb);

    //         result.x.push(obj.timestamp);
    //         result.ltc.push(obj.totalBalances.ltc.toFixed(8));
    //         result.btc.push(obj.totalBalances.btc.toFixed(8));
    //     }, this);

    //     return result;
    // },

    // createChart: function () {
    //     var data = this.processFileData(),
    //         chartNode = window.document.querySelector('#chart');

    //     this.prepareChartData(chartNode, data.btc);

    //     var svgGraph = d3.select(chartNode)
    //         .attr('xmlns', 'http://www.w3.org/2000/svg');

    //     console.log(window.document.innerHTML);
    //     var svgXML = (new xmldom.XMLSerializer()).serializeToString(svgGraph[0][0]);

    //     fs.writeFileSync('html.html', window.document.innerHTML);
    //     fs.writeFileSync('graph.svg', svgXML);

    //     // this.sendMail(window.document.innerHTML);
    // },

    prepareChartData: function(svgNode, data) {
        var w = 400,
            h = 200,
            margin = 20,
            y = d3.scale.linear().domain([0, d3.max(data)]).range([0 + margin, h - margin]),
            x = d3.scale.linear().domain([0, data.length]).range([0 + margin, w - margin]);

        var parseDate = d3.time.format("%d-%b-%y").parse;

        var x = d3.time.scale()
            .range([0, w]);

        var y = d3.scale.linear()
            .range([h, 0]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        var svg = d3.select(svgNode)
                    .attr("width", w)
                    .attr("height", h);

        var g = svg.append('svg:g')
                   .attr("transform", "translate(0, 200)");

        var line = d3.svg.line()
            .x(function(d, i) { return x(i); })
            .y(function(d) { return -1 * y(d); })

        g.append("svg:path").attr("d", line(data));

        g.append("svg:line")
            .attr("x1", x(0))
            .attr("y1", -1 * y(0))
            .attr("x2", x(w))
            .attr("y2", -1 * y(0));
         
        g.append("svg:line")
            .attr("x1", x(0))
            .attr("y1", -1 * y(0))
            .attr("x2", x(0))
            .attr("y2", -1 * y(d3.max(data)));

        g.selectAll(".xLabel")
            .data(x.ticks(5))
            .enter().append("svg:text")
            .attr("class", "xLabel")
            .text(String)
            .attr("x", function(d) { return x(d) })
            .attr("y", 0)
            .attr("text-anchor", "middle");
         
        g.selectAll(".yLabel")
            .data(y.ticks(4))
            .enter().append("svg:text")
            .attr("class", "yLabel")
            .text(String)
            .attr("x", 0)
            .attr("y", function(d) { return -1 * y(d) })
            .attr("text-anchor", "right")
            .attr("dy", 4);

        g.selectAll(".xTicks")
            .data(x.ticks(5))
            .enter().append("svg:line")
            .attr("class", "xTicks")
            .attr("x1", function(d) { return x(d); })
            .attr("y1", -1 * y(0))
            .attr("x2", function(d) { return x(d); })
            .attr("y2", -1 * y(-0.3));
         
        g.selectAll(".yTicks")
            .data(y.ticks(4))
            .enter().append("svg:line")
            .attr("class", "yTicks")
            .attr("y1", function(d) { return -1 * y(d); })
            .attr("x1", x(-0.3))
            .attr("y2", function(d) { return -1 * y(d); })
            .attr("x2", x(0));
    }
}