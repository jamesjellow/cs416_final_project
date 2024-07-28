let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');


const btnHandler = () => {
    window.location.href = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/slides.html');
}
function showSlide(n) {
    slides[currentSlide].style.display = "none";
    currentSlide = (n + slides.length) % slides.length;
    slides[currentSlide].style.display = "block";
    updateButtons();
}

function changeSlide(n) {
    if (currentSlide == 0 && n < 0) {
        window.location.href = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/index.html');
    } else {
        showSlide(currentSlide + n);
    }
}

function updateButtons() {
    nextBtn.disabled = (currentSlide === slides.length - 1);
}

showSlide(0);

// Utility functions
const parseCSVData = (data) => {
    return data.map(d => ({
        Year: +d.Year,
        Month: +d.Month,
        Dom_ASM: +d.Dom_ASM.replace(/,/g, ''),
        Int_ASM: +d.Int_ASM.replace(/,/g, ''),
        ASM: +d.ASM.replace(/,/g, ''),
        Dom_RPM: +d.Dom_RPM.replace(/,/g, ''),
        Int_RPM: +d.Int_RPM.replace(/,/g, ''),
        RPM: +d.RPM.replace(/,/g, ''),
        Dom_LF: +d.Dom_LF,
        Int_LF: +d.Int_LF,
        LF: +d.LF,
        Dom_Pax: +d.Dom_Pax.replace(/,/g, ''),
        Int_Pax: +d.Int_Pax.replace(/,/g, ''),
        Pax: +d.Pax.replace(/,/g, '')
    }));
};

const createSVG = (selector, width, height, margin) => {
    return d3.select(selector)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
};

const createScales = (width, height, data, xDomain, yDomain) => {
    const x = d3.scaleTime().range([0, width]).domain(xDomain(data));
    const y = d3.scaleLinear().range([height, 0]).domain(yDomain(data));
    return { x, y };
};

const createAxes = (svg, x, y, height, width, margin) => {
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    // Add axis labels
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Number of Passengers");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("text-anchor", "middle")
        .text("Year");
};

const createLine = (x, y, xValue, yValue) => {
    return d3.line()
        .x(d => x(xValue(d)))
        .y(d => y(yValue(d)));
};

const drawLine = (svg, data, line, color) => {
    svg.append("path")
        .data([data])
        .attr("class", "line")
        .attr("d", line)
        .style("fill", "none")
        .style("stroke", color)
        .style("stroke-width", "1.5px");
};

const createTooltip = () => {
    return d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("pointer-events", "none");
};

const createLegend = (svg, width, height, items) => {
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 100},${height / 2})`);

    legend.selectAll("rect")
        .data(items)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => d.color);

    legend.selectAll("text")
        .data(items)
        .enter()
        .append("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 20 + 9)
        .text(d => d.label);
};

// Chart 1: Air Traffic Trends
const createAirTrafficChart = (data, selector) => {
    const margin = {top: 20, right: 20, bottom: 50, left: 90};
    const width = 1100 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = createSVG(selector, width, height, margin);
    const parseDate = d3.timeParse("%Y-%m");

    data.forEach(d => {
        d.date = parseDate(d.Year + "-" + d.Month);
    });

    data.sort((a, b) => a.date - b.date);

    const { x, y } = createScales(width, height, data, 
        data => d3.extent(data, d => d.date),
        data => [0, d3.max(data, d => Math.max(d.Int_Pax, d.Dom_Pax, d.Pax))]
    );

    createAxes(svg, x, y, height, width, margin);

    const lineInternational = createLine(x, y, d => d.date, d => d.Int_Pax);
    const lineDomestic = createLine(x, y, d => d.date, d => d.Dom_Pax);
    const lineTotal = createLine(x, y, d => d.date, d => d.Pax);

    drawLine(svg, data, lineInternational, "steelblue");
    drawLine(svg, data, lineDomestic, "green");
    drawLine(svg, data, lineTotal, "red");

    const tooltip = createTooltip();

    const hoverGroupTotal = svg.append("g").attr("class", "hover-group-total");
    const hoverGroupDomestic = svg.append("g").attr("class", "hover-group-domestic");
    const hoverGroupInternational = svg.append("g").attr("class", "hover-group-international");

    const createHoverCircles = (group, yAccessor, color) => {
        group.selectAll(".hover-circle")
            .data(data)
            .enter().append("circle")
            .attr("class", "hover-circle")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(yAccessor(d)))
            .attr("r", 5)
            .style("fill", color)
            .style("opacity", 0.5)
            .style("pointer-events", "all");
    };

    createHoverCircles(hoverGroupTotal, d => d.Pax, "none");
    createHoverCircles(hoverGroupDomestic, d => d.Dom_Pax, "none");
    createHoverCircles(hoverGroupInternational, d => d.Int_Pax, "none");

    const handleMouseOver = (event, d, category) => {
        d3.select(event.target).style("opacity", 1);
        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        let value;
        if (category === "Total") {
            value = d.Pax;
        } else if (category === "Domestic") {
            value = d.Dom_Pax;
        } else if (category === "International") {
            value = d.Int_Pax;
        }
        tooltip.html(`Date: ${d3.timeFormat("%B %Y")(d.date)}<br/>
                    ${category}: ${d3.format(",")(value)}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    };

    const handleMouseOut = (event) => {
        d3.select(event.target).style("opacity", 0.5);
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    };

    const addHoverToGroup = (group, category) => {
        group.selectAll(".hover-circle")
            .on("mouseover", (event, d) => handleMouseOver(event, d, category))
            .on("mouseout", handleMouseOut);
    };

    addHoverToGroup(hoverGroupTotal, "Total");
    addHoverToGroup(hoverGroupDomestic, "Domestic");
    addHoverToGroup(hoverGroupInternational, "International");

    createLegend(svg, width, height, [
        {label: "International", color: "steelblue"},
        {label: "Domestic", color: "green"},
        {label: "Total", color: "red"}
    ]);

    const annotations = [
        {
            note: {
                label: "COVID-19 Pandemic",
                title: "March 2020",
                align: "middle",
                wrap: 200
            },
            data: { date: new Date(2020, 3), Pax: 3013899 },
            dy: -100,
            dx: -100,
            subject: { radius: 3 }
        },
        {
            note: {
                label: "Pre-Pandemic Peak",
                title: "July 2019",
                align: "middle",
                wrap: 200
            },
            data: { date: new Date(2019, 6, 1), Pax: 86925851 },
            dy: 0,
            dx: -200,
            subject: { radius: 4 }
        }
    ];

    const makeAnnotations = d3.annotation()
        .type(d3.annotationCalloutCircle)
        .accessors({
            x: d => x(d.date),
            y: d => y(d.Pax)
        })
        .annotations(annotations);

    svg.append("g")
        .attr("class", "annotation-group")
        .call(makeAnnotations);
};

// Chart 2: Heatmap
const createHeatmapChart = (data, selector) => {
    const margin = {top: 20, right: 20, bottom: 50, left: 90};
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = createSVG(selector, width, height, margin);

    const years = Array.from(new Set(data.map(d => d.Year)));
    const months = d3.range(1, 13);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(years)
        .padding(0.05);

    const y = d3.scaleBand()
        .range([height, 0])
        .domain(months)
        .padding(0.05);

    const colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateRdYlBu)
        .domain([d3.max(data, d => d.Pax), 0]);

    svg.selectAll()
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.Year))
        .attr("y", d => y(d.Month))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => colorScale(d.Pax));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => d3.timeFormat("%B")(new Date(2000, d - 1, 1))));

    const tooltip = createTooltip();

    svg.selectAll("rect")
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Year: ${d.Year}<br/>Month: ${d3.timeFormat("%B")(new Date(2000, d.Month - 1, 1))}<br/>Passengers: ${d3.format(",")(d.Pax)}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    const legendWidth = 300;
    const legendHeight = 20;
    const legendMargin = { top: 10, right: 10, bottom: 10, left: 10 };

    const legendSvg = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${(width - legendWidth) / 2},${height + margin.top + legendMargin.top})`);

    const legendScale = d3.scaleSequential()
        .interpolator(d3.interpolateRdYlBu)
        .domain([d3.max(data, d => d.Pax), 0]);

    const defs = legendSvg.append("defs");

    const linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient");

    linearGradient.selectAll("stop")
        .data(d3.range(0, 1.01, 0.01))
        .enter().append("stop")
        .attr("offset", d => d)
        .attr("stop-color", d => legendScale(d3.interpolate(0, d3.max(data, d => d.Pax))(d)));

    legendSvg.append("rect")
        .attr("x", legendMargin.left)
        .attr("y", legendMargin.top)
        .attr("width", legendWidth - legendMargin.left - legendMargin.right)
        .attr("height", legendHeight)
        .style("fill", "url(#linear-gradient)");

    const legendAxisScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Pax)])
        .range([0, legendWidth - legendMargin.left - legendMargin.right]);

    svg.append("text")
        .attr("x", (width - legendWidth) / 2 + legendMargin.left - 20)
        .attr("y", height + margin.top + legendMargin.top + legendHeight + 12)
        .attr("dy", "-0.3em")
        .attr("text-anchor", "middle")
        .style("fill", "#000")
        .style("font-size", "12px")
        .text("Cold");

    svg.append("text")
        .attr("x", (width + legendWidth) / 2 - legendMargin.right + 15)
        .attr("y", height + margin.top + legendMargin.top + legendHeight + 12)
        .attr("dy", "-0.3em")
        .attr("text-anchor", "middle")
        .style("fill", "#000")
        .style("font-size", "12px")
        .text("Hot");
};

// Chart 3: Stacked Bar Chart
const createStackedBarChart = (data, selector) => {
    const margin = {top: 20, right: 20, bottom: 50, left: 90};
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = createSVG(selector, width, height, margin);

    let currentMode = "Total";

    const modeText = svg.append("text")
        .attr("x", 10)
        .attr("y", -10)
        .attr("dy", "1em")
        .attr("class", "mode-text")
        .style("text-anchor", "start")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`Filter: ${currentMode}`);

    const tooltip = createTooltip();

    svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    svg.append("g").attr("class", "y-axis");

    // Add axis labels
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 10)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("ASM / RPM / LF");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom)
        .style("text-anchor", "middle")
        .text("Year");

    const x = d3.scaleBand().range([0, width]).padding(0.2);
    const y = d3.scaleLinear().range([height, 0]);
    const color = d3.scaleOrdinal().range(["#ff9999", "#66ff66", "#99ccff"]);

    const customTickFormat = (d) => {
        if (d >= 1e9) {
            return d3.format(".1f")(d / 1e9) + "B";
        } else if (d >= 1e6) {
            return d3.format(".1f")(d / 1e6) + "M";
        } else {
            return d;
        }
    };

    const updateChart = (filter) => {
        let filteredData;
        if (filter === 'total') {
            currentMode = "Total";
            filteredData = data.map(d => ({
                Year: d.Year,
                ASM: d.ASM,
                RPM: d.RPM,
                LF: d.LF
            }));
        } else if (filter === 'domestic') {
            currentMode = "Domestic";
            filteredData = data.map(d => ({
                Year: d.Year,
                ASM: d.Dom_ASM,
                RPM: d.Dom_RPM,
                LF: d.Dom_LF
            }));
        } else if (filter === 'international') {
            currentMode = "International";
            filteredData = data.map(d => ({
                Year: d.Year,
                ASM: d.Int_ASM,
                RPM: d.Int_RPM,
                LF: d.Int_LF
            }));
        }

        modeText.text(`Filter: ${currentMode}`);

        const groupedData = d3.group(filteredData, d => d.Year);
        const aggregatedData = Array.from(groupedData, ([key, values]) => ({
            Year: key,
            ASM: d3.sum(values, d => d.ASM),
            RPM: d3.sum(values, d => d.RPM),
            LF: d3.mean(values, d => d.LF)
        }));

        const finalData = aggregatedData.map(d => ({
            year: d.Year,
            ASM: d.ASM,
            RPM: d.RPM,
            LF: d.LF / 100 * (d.ASM + d.RPM) // Scale LF to fit within the chart
        }));

        x.domain(finalData.map(d => d.year));
        y.domain([0, d3.max(finalData, d => d.ASM + d.RPM + d.LF)]);

        const tickYears = finalData.map(d => d.year)
            .filter((v, i, a) => a.indexOf(v) === i && v % 5 === 3); // Show years 2003, 2008, 2013, etc.

        svg.select(".x-axis")
            .call(d3.axisBottom(x).tickValues(tickYears).tickFormat(d3.format("d")))
            .selectAll("text")
            .style("text-anchor", "end");

        svg.select(".y-axis").call(d3.axisLeft(y).ticks(10).tickFormat(customTickFormat));

        const keys = ["ASM", "RPM", "LF"];
        const stack = d3.stack().keys(keys);
        const stackedData = stack(finalData);

        const bars = svg.selectAll(".layer")
            .data(stackedData, d => d.key);

        bars.enter().append("g")
            .attr("class", "layer")
            .attr("fill", d => {
                if (d.key === 'ASM') return "#ff9999"; // Light red
                if (d.key === 'RPM') return "#66ff66"; // Light green
                if (d.key === 'LF') return "#99ccff"; // Light blue
            });

        bars.exit().remove();

        const layers = svg.selectAll(".layer")
            .data(stackedData, d => d.key);

        const rects = layers.selectAll("rect")
            .data(d => d);

        rects.enter().append("rect")
            .attr("x", d => x(d.data.year))
            .attr("width", x.bandwidth())
            .attr("y", d => y(0))
            .attr("height", 0)
            .merge(rects)
            .transition()
            .duration(750)
            .attr("x", d => x(d.data.year))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]));

        rects.exit().remove();

        svg.selectAll("rect")
            .on("mouseover", function(event, d) {
                const category = d3.select(this.parentNode).datum().key;
                let value;
                if (category === 'ASM') value = d3.format(",")(d.data.ASM);
                else if (category === 'RPM') value = d3.format(",")(d.data.RPM);
                else if (category === 'LF') value = d3.format(".2%")(d.data.LF / (d.data.ASM + d.data.RPM));

                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`Year: ${d.data.year}<br/>${category}: ${value}`)
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(500).style("opacity", 0);
            });
    };

    // Initial chart update
    updateChart('total');

    // Add event listeners for filter buttons
    d3.select("#totalBtn").on("click", () => updateChart('total'));
    d3.select("#domesticBtn").on("click", () => updateChart('domestic'));
    d3.select("#internationalBtn").on("click", () => updateChart('international'));
};

// Main function to load data and create charts
const createCharts = () => {
    d3.csv("https://raw.githubusercontent.com/jamesjellow/data/main/air_traffic.csv")
        .then(data => {
            const parsedData = parseCSVData(data);
            createAirTrafficChart(parsedData, "#chart1");
            createHeatmapChart(parsedData, "#chart2");
            createStackedBarChart(parsedData, "#chart3");
        });
};

// Initialize charts
createCharts();