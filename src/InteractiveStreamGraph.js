import React, { Component } from "react";
import * as d3 from "d3";

class InteractiveStreamGraph extends Component {
  constructor(props) {
    super(props);
    this.svgRef = React.createRef();
    this.tooltipRef = React.createRef();
  }

  componentDidMount() {
    this.createTooltip();
  }

  componentWillUnmount() {
    if (this.tooltipRef.current) {
      d3.select(this.tooltipRef.current).remove();
    }
  }

  componentDidUpdate() {
    const chartData = this.props.csvData;
    console.log("Rendering chart with data:", chartData);
    
    if (!chartData || chartData.length === 0) {
      return;
    }
    
    const llmModels = ["GPT-4", "Gemini", "PaLM-2", "Claude", "LLaMA-3.1"];
    
    const colors = { 
      "GPT-4": "#e41a1c", 
      "Gemini": "#377eb8", 
      "PaLM-2": "#4daf4a", 
      "Claude": "#984ea3", 
      "LLaMA-3.1": "#ff7f00" 
    };

    d3.select(this.svgRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 200, bottom: 40, left: 60 };
    const width = 1000;
    const height = 600;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(this.svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const chartGroup = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const sortedData = [...chartData].sort((a, b) => d3.ascending(a.Date, b.Date));

    const dates = sortedData.map(d => d.Date);
    const minDate = d3.min(dates);
    const maxDate = d3.max(dates);

    const stack = d3.stack()
      .keys(llmModels)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetSilhouette);

    const stackedData = stack(sortedData);

    const allValues = stackedData.flat().flat();
    const minValue = d3.min(allValues);
    const maxValue = d3.max(allValues);

    const xScale = d3.scaleTime()
      .domain([minDate, maxDate])
      .range([0, chartWidth]);

    const yScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .nice()
      .range([chartHeight, 0]);

    const area = d3.area()
      .x(d => xScale(d.data.Date))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveBasis);

    const paths = chartGroup.selectAll(".stream")
      .data(stackedData)
      .enter()
      .append("path")
      .attr("class", d => `stream stream-${d.key}`)
      .attr("d", area)
      .attr("fill", d => colors[d.key])
      .attr("opacity", 0.7)
      .attr("stroke", d => d3.rgb(colors[d.key]).darker(0.3))
      .attr("stroke-width", 1.5)
      .on("mouseover", (event, d) => {
        this.handleMouseOver(event, d, sortedData, colors, xScale, yScale, chartWidth, chartHeight);
      })
      .on("mousemove", (event) => {
        this.handleMouseMove(event);
      })
      .on("mouseout", () => {
        this.handleMouseOut();
      });

    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat("%b %Y"));

    chartGroup.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "middle")
      .attr("dx", "0")
      .attr("dy", "10");

    chartGroup.append("text")
      .attr("class", "axis-label")
      .attr("transform", `translate(${chartWidth / 2}, ${chartHeight + 35})`)
      .style("text-anchor", "middle")
      .text("Time");

    const yAxis = d3.axisLeft(yScale);

    chartGroup.append("g")
      .attr("class", "y-axis")
      .call(yAxis);

    chartGroup.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -chartHeight / 2)
      .style("text-anchor", "middle")
      .text("Hashtag Usage Count");

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${chartWidth + margin.left + 20}, ${margin.top})`);

    const legendItems = legend.selectAll(".legend-item")
      .data(llmModels)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    legendItems.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", d => colors[d])
      .attr("stroke", d => d3.rgb(colors[d]).darker(0.3))
      .attr("stroke-width", 1);

    legendItems.append("text")
      .attr("x", 25)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .style("font-size", "14px")
      .text(d => d);
  }

  createTooltip() {
    d3.select("body").selectAll(".tooltip").remove();
    
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "2px solid #333")
      .style("border-radius", "6px")
      .style("padding", "15px")
      .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
      .style("pointer-events", "none")
      .style("z-index", "1000");
    
    this.tooltipRef.current = tooltip.node();
  }

  handleMouseOver(event, d, sortedData, colors, xScale, yScale, chartWidth, chartHeight) {

    if (!this.tooltipRef.current) {
      this.createTooltip();
    }
    
    const tooltip = d3.select(this.tooltipRef.current);
    const modelName = d.key;
    const modelColor = colors[modelName];

    const modelData = sortedData.map(row => ({
      date: row.Date,
      value: row[modelName]
    }));

    const maxValue = d3.max(modelData, d => d.value);

    const tooltipWidth = 350;
    const tooltipHeight = 220;
    const miniChartWidth = tooltipWidth - 40;
    const miniChartHeight = tooltipHeight - 60;
    const miniMargin = { top: 30, right: 10, bottom: 30, left: 40 };

    tooltip.html("");

    tooltip.append("div")
      .style("font-weight", "bold")
      .style("font-size", "16px")
      .style("margin-bottom", "10px")
      .text(modelName);

    const miniSvg = tooltip.append("svg")
      .attr("width", tooltipWidth)
      .attr("height", tooltipHeight);

    const miniChartGroup = miniSvg.append("g")
      .attr("transform", `translate(${miniMargin.left},${miniMargin.top})`);

    const miniXScale = d3.scaleBand()
      .domain(modelData.map(d => d.date))
      .range([0, miniChartWidth])
      .padding(0.1);

    const miniYScale = d3.scaleLinear()
      .domain([0, maxValue])
      .nice()
      .range([miniChartHeight, 0]);

    miniChartGroup.selectAll(".mini-bar")
      .data(modelData)
      .enter()
      .append("rect")
      .attr("class", "mini-bar")
      .attr("x", d => miniXScale(d.date))
      .attr("y", d => miniYScale(d.value))
      .attr("width", miniXScale.bandwidth())
      .attr("height", d => miniChartHeight - miniYScale(d.value))
      .attr("fill", modelColor);

    const miniXAxis = d3.axisBottom(miniXScale)
      .tickFormat(d3.timeFormat("%b"));

    miniChartGroup.append("g")
      .attr("class", "mini-x-axis")
      .attr("transform", `translate(0,${miniChartHeight})`)
      .call(miniXAxis)
      .selectAll("text")
      .style("font-size", "10px")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.5em");

    const miniYAxis = d3.axisLeft(miniYScale)
      .ticks(5);

    miniChartGroup.append("g")
      .attr("class", "mini-y-axis")
      .call(miniYAxis)
      .selectAll("text")
      .style("font-size", "10px");

    tooltip.style("opacity", 1);
  }

  handleMouseMove(event) {
    const tooltip = d3.select(this.tooltipRef.current);
    
    const mouseX = event.clientX || event.pageX;
    const mouseY = event.clientY || event.pageY;

    const tooltipNode = tooltip.node();
    const tooltipWidth = tooltipNode ? tooltipNode.offsetWidth : 350;
    const tooltipHeight = tooltipNode ? tooltipNode.offsetHeight : 220;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let x = mouseX + 15;
    let y = mouseY + 15;

    if (x + tooltipWidth > windowWidth) {
      x = mouseX - tooltipWidth - 15;
    }
    if (y + tooltipHeight > windowHeight) {
      y = mouseY - tooltipHeight - 15;
    }

    x = Math.max(10, Math.min(x, windowWidth - tooltipWidth - 10));
    y = Math.max(10, Math.min(y, windowHeight - tooltipHeight - 10));

    tooltip
      .style("left", `${x}px`)
      .style("top", `${y}px`);
  }

  handleMouseOut() {
    const tooltip = d3.select(this.tooltipRef.current);
    tooltip.style("opacity", 0);
  }

  render() {
    const chartData = this.props.csvData;
    
    if (!chartData || chartData.length === 0) {
      return null;
    }

    return (
      <div style={{ marginTop: '100px' }}>
        <svg ref={this.svgRef} className="svg_parent"></svg>
      </div>
    );
  }
}

export default InteractiveStreamGraph;
