// mapid is the id of the div where the map will appear
var map = L
  .map('map')
  .setView([48.3069, 14.2858], 8);   // center position + zoom

// Add a tile to the map = a background. Comes from OpenStreetmap
L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    maxZoom: 15
    }).addTo(map);

// Add a svg layer to the map
L.svg().addTo(map);

d3.json("data/positions.json").then(data => {
    const markers = data
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

    // Select the svg area and add circles:
    const circles = d3.select("#map")
    .select("svg")
    .selectAll("myCircles")
    .data(markers)
    .enter()
    .append("circle")
        .attr("cx", data => map.latLngToLayerPoint([data.lat, data.long]).x)
        .attr("cy", data => map.latLngToLayerPoint([data.lat, data.long]).y)
        .attr("r", 30)
        .style("fill", data => colorScale(data.stayDuration))
        .attr("stroke", "red")
        .attr("stroke-width", 3)
        .attr("fill-opacity", .7)
}


// Function that update circle position if something change
function update() {
    const currentZoomLevel = map._zoom;
    d3.selectAll("circle")
        .attr("cx", data => map.latLngToLayerPoint([data.lat, data.long]).x)
        .attr("cy", data => map.latLngToLayerPoint([data.lat, data.long]).y)
        .attr("r", 4 * currentZoomLevel + 1);
}

// If the user change the map (zoom or drag), I update circle position:
map.on("moveend", update)