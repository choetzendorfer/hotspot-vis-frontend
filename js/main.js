const DETAIL_ZOOM_LEVEL = 13;

// mapid is the id of the div where the map will appear
var map = L
  .map('map')
  .setView([48.3069, 14.2858], 8);   // center position + zoom

// Add a tile to the map = a background. Comes from OpenStreetmap
L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    maxZoom: 17
    }).addTo(map);

// Add a svg layer to the map
L.svg().addTo(map);

const svg = d3.select("#map").select("svg");

d3.json("data/positions.json").then(data => {
    const visualizationData = data
    .sort((a, b) => a.minutesSpentInCluster - b.minutesSpentInCluster) //Sort to ensure the hotspot with the highest duration is drawn last 
    .map(item => {
        const firstPosition = item.positions[0];
        const timeStatistics = item.timeStatistics.map(entry => {
            return {
                date: new Date(entry.date).toDateString(),
                stayDurationInMinutes: entry.stayDurationInMinutes
            };
        })
        .slice(0, 7); // TODO: REMOVE AGAIN - we are limiting to 7 entries/days now
        return {
            long: firstPosition.longitude, 
            lat: firstPosition.latitude, 
            stayDuration: item.minutesSpentInCluster, 
            timeStatistics: timeStatistics,
            dominantActivityLevel: item.dominantActivityLevel,
        };
    });

    addHotspotCirclesToMap(visualizationData);
    createTimeDistributionChart(visualizationData);
});

function addHotspotCirclesToMap(data) {
    const colorScale = d3.scaleLinear()
        .domain([0, d3.max(data.map(marker => marker.stayDuration))])
        .range(["pink", "red"]);

    /* Define the data for the circles */
    // The class must be added - see: https://stackoverflow.com/a/26576371
    const circleGroupData = svg.selectAll("g.circle")
        .data(data);

    /*Create and place the "blocks" containing the circle and the text */  
    const circleGroup = circleGroupData.enter()
        .append("g")
        // The class must be added - see: https://stackoverflow.com/a/26576371
        .attr("class", "circle")
        .attr("transform", data => `translate(${map.latLngToLayerPoint([data.lat, data.long]).x}, ${map.latLngToLayerPoint([data.lat, data.long]).y})`);

    /*Create the circle for each block */
    circleGroup.append("circle")
        .attr("r", getCircleRadius())
        .attr("stroke","black")
        .attr("fill", data => colorScale(data.stayDuration))
        .attr("fill-opacity", .8);

    /* Create the text for each block */
    const text = circleGroup.append("text")
        .attr("x", 0)
        .attr("text-anchor", "middle")
        .attr("opacity", 0);

    text.append("tspan")
        .attr("class", "duration-title")
        .attr("x", 0)
        .attr("dy", "-0.9em")
        .text(data => `~${data.stayDuration} min`);

    text.append("tspan")
        .attr("x", 0)
        .attr("dy", "1.35em")
        .text("Stay duration");

    /* Create the image for activity level for each block */
    circleGroup.append("image")
        .attr("class", "activity-image")
        .attr("xlink:href", data => {
            if (data.dominantActivityLevel == 0) {
                return "../assets/rest.png";
            } else if (data.dominantActivityLevel == 1) {
                return "../assets/low-activity.png";
            } else {
                return "../assets/active.png";
            }
        })
        .attr("x", -16)
        .attr("y", "1.9em")
        .attr("opacity", 0)
        .attr("width", 32)
        .attr("height", 32);
}

function createTimeDistributionChart(data) {
    const radius = getCircleRadius();
    const colorScale = d3.scaleOrdinal(['#4daf4a','#377eb8','#ff7f00','#984ea3','#e41a1c']);

    const arc = d3.arc()
        .innerRadius(radius * 1.7)
        .outerRadius(radius * 2.5);

    var outerArc = d3.arc()
        .innerRadius(radius * 2.9)
        .outerRadius(radius * 2.9)

    const pie = d3.pie().value(data => data.stayDurationInMinutes);

    const pies = svg.selectAll(".pie")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "pie")
        .attr("opacity", 0)
        .attr("transform", data => `translate(${map.latLngToLayerPoint([data.lat, data.long]).x}, ${map.latLngToLayerPoint([data.lat, data.long]).y})`);

    pies.selectAll(".slice")
        .data(data => pie(data.timeStatistics))
        .enter()
        .append("path")
        .attr("class", "slice")
        .attr("d", arc)
        .attr("stroke", "black")
        .attr("stroke-width", 0.7)
        .style("fill", (d, i) => colorScale(d.data.stayDurationInMinutes));

    pies.selectAll(".pie-chart-label-line")
        .data(data => pie(data.timeStatistics))
        .enter()
        .append('polyline')
        .attr("class", "pie-chart-label-line")
        .attr("stroke", "black")
        .style("fill", "none")
        .attr("stroke-width", 1)
        .attr('points', function(d) {
            var posA = arc.centroid(d) // line insertion in the slice
            var posB = outerArc.centroid(d) // line break: we use the other arc generator that has been built only for that
            var posC = outerArc.centroid(d); // Label position = almost the same as posB
            var midangle = d.startAngle + (d.endAngle - d.startAngle) / 2 // we need the angle to see if the X position will be at the extreme right or extreme left
            posC[0] = radius * 2.95 * (midangle < Math.PI ? 1 : -1); // multiply by 1 or -1 to put it on the right or on the left
            return [posA, posB, posC]
        });

    pies.selectAll(".pie-chart-label")
        .data(data => pie(data.timeStatistics))
        .enter()
        .append("text")
        .attr("class", "pie-chart-label")
        .text( function(d) { return d.data.date } )
        .attr('transform', function(d) {
            var pos = outerArc.centroid(d);
            var midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            pos[0] = radius * 2.99 * (midangle < Math.PI ? 1 : -1);
            return 'translate(' + pos + ')';
        })
        .style('text-anchor', function(d) {
            var midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            return (midangle < Math.PI ? 'start' : 'end')
        });
}


// Function that update circle position if something change
function update() {
    updatePositionsAndSizes();

    if (getCurrentZoomLevel() > DETAIL_ZOOM_LEVEL) {
        // Show details
        showDetails();
    } else {
        // Hide details
        hideDetails();
    }
}

function showDetails() {
    d3.selectAll("text").transition(500).style("opacity", 1);
    d3.selectAll(".pie").transition(500).style("opacity", 1);
    d3.selectAll(".activity-image").transition(500).style("opacity", 1);
}

function hideDetails() {
    d3.selectAll("text").style("opacity", 0);
    d3.selectAll(".pie").style("opacity", 0);
    d3.selectAll(".activity-image").style("opacity", 0);
}

function updatePositionsAndSizes() {
    // Hotspot circle positions
    d3.selectAll("g.circle")
        .attr("transform", data => `translate(${map.latLngToLayerPoint([data.lat, data.long]).x}, ${map.latLngToLayerPoint([data.lat, data.long]).y})`);

    d3.selectAll("circle")
        .attr("r", getCircleRadius());

    // Time distribution positions
    d3.selectAll(".pie")
    .attr("transform", data => `translate(${map.latLngToLayerPoint([data.lat, data.long]).x}, ${map.latLngToLayerPoint([data.lat, data.long]).y})`);
}

function getCircleRadius() {
    return 4 * getCurrentZoomLevel() + 1;
}

function getCurrentZoomLevel() {
    return map._zoom;
}

// If the user change the map (zoom or drag), I update circle position:
map.on("moveend", update);