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
    const markers = data
    .sort((a, b) => a.minutesSpentInCluster - b.minutesSpentInCluster) //Sort to ensure the hotspot with the highest duration is drawn last 
    .map(item => {
        const firstPosition = item.positions[0];
        return {long: firstPosition.longitude, lat: firstPosition.latitude, stayDuration: item.minutesSpentInCluster };
    });

    addMarkersToMap(markers);
});

function addMarkersToMap(markers) {
    const colorScale = d3.scaleLinear()
        .domain([0, d3.max(markers.map(marker => marker.stayDuration))])
        .range(["pink", "red"]);

    /* Define the data for the circles */
    // The class must be added - see: https://stackoverflow.com/a/26576371
    const circleGroupData = svg.selectAll("g.circle")
        .data(markers);

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
    circleGroup.append("text")
        .attr("x", 0)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(data => `${data.stayDuration} min`);

    showOrHideCircleLabels();
}


// Function that update circle position if something change
function update() {
    d3.selectAll("g.circle")
        .attr("transform", data => `translate(${map.latLngToLayerPoint([data.lat, data.long]).x}, ${map.latLngToLayerPoint([data.lat, data.long]).y})`);

    d3.selectAll("circle")
        .attr("r", getCircleRadius());

    showOrHideCircleLabels();
}

function showOrHideCircleLabels() {
    if (getCurrentZoomLevel() < 13) {
        d3.selectAll("text").style("opacity", 0);
    } else {
        d3.selectAll("text").style("opacity", 1);
    }
}

function getCircleRadius() {
    return 4 * getCurrentZoomLevel() + 1;
}

function getCurrentZoomLevel() {
    return map._zoom;
}

// If the user change the map (zoom or drag), I update circle position:
map.on("moveend", update)