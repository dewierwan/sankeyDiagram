/* main.js */
//
// Set the dimensions and margins of the graph
const margin = {top: 50, right: 200, bottom: 20, left: 200};
const width = 1600 - margin.left - margin.right;
const height = 1000 - margin.top - margin.bottom;

// Column headers and colors
const columns = [
    "Initial Role",
    "Source",
    "Evaluation",
    "Decision",
    "Attendance",
    "Project Quality",
    "Final Role"
];

// Color scheme for columns
const columnColors = {
    1: "#2196F3", // Initial Role - Blue
    2: "#FF9800", // Source - Orange
    3: "#4CAF50", // Evaluation - Green
    4: "#F44336", // Decision - Red
    5: "#9C27B0", // Attendance - Purple
    6: "#795548", // Project Quality - Brown
    7: "#E91E63"  // Final Role - Pink
};

// Create the SVG container with accessibility attributes and click debugging
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("role", "img")
    .attr("aria-label", "Sankey diagram showing applicant flow through different stages")
    .on("click", function(event) {
        // Get click coordinates relative to SVG
        const point = d3.pointer(event);
        console.log("SVG Click coordinates:", {
            x: point[0] - margin.left,
            y: point[1] - margin.top
        });
    })
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Add title and description for accessibility
svg.append("title")
    .text("Course Flow Sankey Diagram");
svg.append("desc")
    .text("A visualization showing the flow of applicants through different stages including initial role, source, evaluation, decision, attendance, project quality, and final role.");

// Helper function to normalize values
function normalizeValue(value, type) {
    // Handle all falsy values consistently
    if (!value || value === 'TODO' || value.trim() === '') return 'Unknown';
    
    // Handle project quality special cases
    if (type === 'project_quality') {
        if (value === '2nd place') return 'High-quality';
        if (value.toLowerCase() === 'unknown') return 'Unknown';
    }
    
    return value;
}

// Helper function to add or update links
function addOrUpdateLink(links, source, target) {
    const existingLink = links.find(l => l.source === source && l.target === target);
    if (existingLink) {
        existingLink.value++;
    } else {
        links.push({source, target, value: 1});
    }
}

// Global variables for storing data and filters
let globalData = [];
let selectedNodes = new Map(); // Map to store selected nodes by column
let currentFilters = {
    course: 'all',
    iteration: 'all',
    role: 'all'
};

// Function to populate filter dropdowns
function populateFilters(data) {
    // Get unique values for course and iteration filters
    const courses = [...new Set(data.map(d => d.Course))].filter(Boolean);
    const iterations = [...new Set(data.map(d => d.Iteration))].filter(Boolean);
    
    // Get unique roles
    const roles = [...new Set(data.map(d => d.Role))].filter(Boolean).sort();

    // Populate course dropdown
    const courseSelect = document.getElementById('courseFilter');
    courseSelect.innerHTML = '<option value="all">All Courses</option>';
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        courseSelect.appendChild(option);
    });

    // Populate iteration dropdown
    const iterationSelect = document.getElementById('iterationFilter');
    iterationSelect.innerHTML = '<option value="all">All Iterations</option>';
    iterations.forEach(iteration => {
        const option = document.createElement('option');
        option.value = iteration;
        option.textContent = iteration;
        iterationSelect.appendChild(option);
    });

    // Populate role dropdown
    const roleSelect = document.getElementById('roleFilter');
    roleSelect.innerHTML = '<option value="all">All Roles</option>';
    roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        roleSelect.appendChild(option);
    });
}

// Function to update filter options based on selection
function updateFilterOptions(data) {
    const courseSelect = document.getElementById('courseFilter');
    const iterationSelect = document.getElementById('iterationFilter');

    if (currentFilters.iteration !== 'all') {
        // If iteration is selected, filter course options
        const selectedIteration = data.find(d => d.Iteration === currentFilters.iteration);
        if (selectedIteration) {
            courseSelect.value = selectedIteration.Course;
            courseSelect.disabled = true;
            currentFilters.course = selectedIteration.Course;
        }
    } else if (currentFilters.course !== 'all') {
        // If course is selected, filter iteration options
        iterationSelect.innerHTML = '<option value="all">All Iterations</option>';
        const filteredIterations = [...new Set(
            data
                .filter(d => d.Course === currentFilters.course)
                .map(d => d.Iteration)
        )].filter(Boolean);
        
        filteredIterations.forEach(iteration => {
            const option = document.createElement('option');
            option.value = iteration;
            option.textContent = iteration;
            iterationSelect.appendChild(option);
        });
    } else {
        // Reset both dropdowns
        courseSelect.disabled = false;
        populateFilters(data);
    }
}

// Function to filter data based on current selections
function filterData(data) {
    return data.filter(row => {
        const courseMatch = currentFilters.course === 'all' || row.Course === currentFilters.course;
        const iterationMatch = currentFilters.iteration === 'all' || row.Iteration === currentFilters.iteration;
        const roleMatch = currentFilters.role === 'all' || row.Role === currentFilters.role;
        return courseMatch && iterationMatch && roleMatch;
    });
}

// Function to update the visualization
function updateVisualization(filteredData) {
    // Clear existing visualization
    svg.selectAll("*").remove();

    // Initialize nodes array with ordered values (most positive at top, Unknown at bottom)
    const nodes = [
        // Column 1: Initial Role
        {node: 0, name: "Yes", column: 1},
        {node: 1, name: "No", column: 1},
        {node: 2, name: "Unknown", column: 1},
        
        // Column 2: Source (ordered by effectiveness based on data patterns)
        {node: 4, name: "Referral", column: 2},
        {node: 9, name: "Organic Search", column: 2},
        {node: 3, name: "Organic Social Media", column: 2},
        {node: 7, name: "Mailing List", column: 2},
        {node: 10, name: "Communities", column: 2},
        {node: 11, name: "Blogs", column: 2},
        {node: 12, name: "Job Board", column: 2},
        {node: 6, name: "Ads", column: 2},
        {node: 5, name: "Other", column: 2},
        {node: 8, name: "Unknown", column: 2},
        
        // Column 3: Evaluation
        {node: 13, name: "Strong yes", column: 3},
        {node: 14, name: "Weak yes", column: 3},
        {node: 15, name: "Neutral", column: 3},
        {node: 16, name: "Weak no", column: 3},
        {node: 17, name: "Strong no", column: 3},
        {node: 34, name: "Unknown", column: 3},
        
        // Column 4: Decision
        {node: 18, name: "Accept", column: 4},
        {node: 20, name: "Withdrew", column: 4},
        {node: 19, name: "Reject", column: 4},
        
        // Column 5: Attendance
        {node: 21, name: "100%", column: 5},
        {node: 22, name: "75-99%", column: 5},
        {node: 23, name: "50-75%", column: 5},
        {node: 24, name: "25-50%", column: 5},
        {node: 25, name: "0-25%", column: 5},
        {node: 26, name: "0%", column: 5},
        
        // Column 6: Project Quality
        {node: 27, name: "High-quality", column: 6},
        {node: 28, name: "Med-quality", column: 6},
        {node: 29, name: "Low-quality", column: 6},
        {node: 30, name: "DNF", column: 6},
        {node: 35, name: "unknown", column: 6},
        
        // Column 7: Final Role
        {node: 31, name: "Yes", column: 7},
        {node: 32, name: "No", column: 7},
        {node: 33, name: "Unknown", column: 7}
    ];

    // Create a mapping of node names to indices
    const nodeMap = {};
    nodes.forEach((node, index) => {
        nodeMap[`${node.column}-${node.name}`] = index;
    });

    // Initialize links array
    const links = [];
    
    // Process the data to create links
    filteredData.forEach(row => {
        // Column 1 to 2 (Initial Role to Source)
        const initialRole = normalizeValue(row['High impact job before?']);
        const source = normalizeValue(row['Source']);
        if (initialRole && source) {
            const sourceNode = nodeMap[`1-${initialRole}`];
            const targetNode = nodeMap[`2-${source}`];
            if (sourceNode !== undefined && targetNode !== undefined) {
                addOrUpdateLink(links, sourceNode, targetNode);
            }
        }

        // Column 2 to 3 (Source to Evaluation)
        const evaluation = normalizeValue(row['Evaluation']);
        if (source && evaluation) {
            const sourceNode = nodeMap[`2-${source}`];
            const targetNode = nodeMap[`3-${evaluation}`];
            if (sourceNode !== undefined && targetNode !== undefined) {
                addOrUpdateLink(links, sourceNode, targetNode);
            }
        }

        // Column 3 to 4 (Evaluation to Decision)
        const decision = normalizeValue(row['Decision']);
        if (evaluation && decision) {
            const sourceNode = nodeMap[`3-${evaluation}`];
            const targetNode = nodeMap[`4-${decision}`];
            if (sourceNode !== undefined && targetNode !== undefined) {
                addOrUpdateLink(links, sourceNode, targetNode);
            }
        }

        // Column 4 to 5 (Decision to Attendance)
        let attendance = null;
        if (decision === 'Accept') {
            attendance = normalizeValue(row['Attendance']);
            if (attendance) {
                const sourceNode = nodeMap[`4-${decision}`];
                const targetNode = nodeMap[`5-${attendance}`];
                if (sourceNode !== undefined && targetNode !== undefined) {
                    addOrUpdateLink(links, sourceNode, targetNode);
                }
            }
        }

        // Column 5 to 6 (Attendance to Project Quality)
        let projectQuality = row['Project quality'];
        if (decision === 'Reject' && !projectQuality) {
            projectQuality = 'Unknown';
        }
        projectQuality = normalizeValue(projectQuality, 'project_quality');
        if (attendance && projectQuality) {
            const sourceNode = nodeMap[`5-${attendance}`];
            const targetNode = nodeMap[`6-${projectQuality}`];
            if (sourceNode !== undefined && targetNode !== undefined) {
                addOrUpdateLink(links, sourceNode, targetNode);
            }
        }

        // Column 6 to 7 (Project Quality to Final Role)
        const finalRole = normalizeValue(row['High impact job after?']);
        if (projectQuality && finalRole) {
            const sourceNode = nodeMap[`6-${projectQuality}`];
            const targetNode = nodeMap[`7-${finalRole}`];
            if (sourceNode !== undefined && targetNode !== undefined) {
                addOrUpdateLink(links, sourceNode, targetNode);
            }
        }
    });

    // Create the Sankey data object
    const data = {nodes, links};

    // Set up the Sankey generator with increased iterations and node padding to reduce overlap
    const sankey = d3.sankey()
        .nodeWidth(25)
        .nodePadding(30)
        .nodeAlign(d3.sankeyLeft)
        .extent([[0, 40], [width, height - 10]])
        .nodeSort(null)
        .iterations(64);

    // Generate the Sankey diagram
    const {nodes: sankeyNodes, links: sankeyLinks} = sankey(data);

    // Add column headers
    svg.append("g")
        .attr("aria-label", "Column headers")
        .selectAll("text")
        .data(columns)
        .join("text")
        .attr("x", (d, i) => (width / (columns.length - 1)) * i)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .style("fill", (d, i) => columnColors[i + 1])
        .text(d => d);

    // Add the links
    const link = svg.append("g")
        .attr("aria-label", "Flow connections")
        .selectAll("path")
        .data(sankeyLinks)
        .join("path")
        .attr("class", "link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", d => Math.max(1, d.width))
        .style("opacity", 1);

    // Add the nodes
    const node = svg.append("g")
        .attr("aria-label", "Flow nodes")
        .selectAll("g")
        .data(sankeyNodes)
        .join("g")
        .attr("class", "node");

    // Add node rectangles
    node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => Math.max(d.y1 - d.y0, 1))
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => {
            const columnNodes = selectedNodes.get(d.column);
            return columnNodes && columnNodes.has(d.name) 
                ? d3.color(columnColors[d.column]).brighter(0.5) 
                : columnColors[d.column];
        })
        .attr("stroke", d => {
            const columnNodes = selectedNodes.get(d.column);
            return columnNodes && columnNodes.has(d.name) ? "#000" : "#fff";
        })
        .attr("stroke-width", d => {
            const columnNodes = selectedNodes.get(d.column);
            return columnNodes && columnNodes.has(d.name) ? 2 : 1;
        })
        .style("filter", "drop-shadow(2px 2px 2px rgba(0,0,0,0.1))")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            // Show node info on hover
            d3.select(this)
                .attr("stroke", "#000")
                .attr("stroke-width", "3")
                .style("filter", "drop-shadow(3px 3px 3px rgba(0,0,0,0.2))");
                
            // Log hover info
            console.log("Hovering Node:", {
                name: d.name,
                column: columns[d.column - 1],
                value: d.value,
                position: {
                    center: {
                        x: Math.round((d.x0 + d.x1) / 2),
                        y: Math.round((d.y0 + d.y1) / 2)
                    }
                }
            });
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("stroke", d => {
                    const columnNodes = selectedNodes.get(d.column);
                    return columnNodes && columnNodes.has(d.name) ? "#000" : "#fff";
                })
                .attr("stroke-width", d => {
                    const columnNodes = selectedNodes.get(d.column);
                    return columnNodes && columnNodes.has(d.name) ? 2 : 1;
                })
                .style("filter", "drop-shadow(2px 2px 2px rgba(0,0,0,0.1))");
        })
        .on("click", function(event, d) {
            // Log detailed node information
            console.log("Clicked Node Details:", {
                name: d.name,
                column: columns[d.column - 1],
                value: d.value,
                coordinates: {
                    center: {
                        x: Math.round((d.x0 + d.x1) / 2),
                        y: Math.round((d.y0 + d.y1) / 2)
                    },
                    bounds: {
                        x0: Math.round(d.x0),
                        x1: Math.round(d.x1),
                        y0: Math.round(d.y0),
                        y1: Math.round(d.y1)
                    }
                }
            });

            // Toggle node selection
            const columnNodes = selectedNodes.get(d.column) || new Set();
            
            if (columnNodes.has(d.name)) {
                console.log("Deselecting node:", d.name);
                columnNodes.delete(d.name);
                if (columnNodes.size === 0) {
                    selectedNodes.delete(d.column);
                } else {
                    selectedNodes.set(d.column, columnNodes);
                }
            } else {
                console.log("Selecting node:", d.name);
                columnNodes.add(d.name);
                selectedNodes.set(d.column, columnNodes);
            }

            // Map column names to CSV column headers
            const columnMapping = {
                "Initial Role": "High impact job before?",
                "Source": "Source",
                "Evaluation": "Evaluation",
                "Decision": "Decision",
                "Attendance": "Attendance",
                "Project Quality": "Project quality",
                "Final Role": "High impact job after?"
            };

            // Get base filtered data
            let filteredData = filterData(globalData);
            
            // If there are selected nodes, filter the data
            if (selectedNodes.size > 0) {
                filteredData = filteredData.filter(row => {
                    // Check each column that has selections
                    return Array.from(selectedNodes.entries()).every(([column, nodes]) => {
                        const columnName = columns[column - 1];
                        const csvColumn = columnMapping[columnName];
                        const value = normalizeValue(row[csvColumn], csvColumn === "Project quality" ? "project_quality" : undefined);
                        // Row must match any selected node in this column
                        return nodes.has(value);
                    });
                });
            }
            
            // Update visualization with filtered data
            updateVisualization(filteredData);
        });

    // Add node labels
    node.append("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.value === 0 ? "" : `${d.name} (${d.value})`)
        .style("font-size", "13px")
        .style("font-weight", "500")
        .style("fill", "#333")
        .style("text-shadow", "0 1px 0 #fff, 1px 0 0 #fff, -1px 0 0 #fff, 0 -1px 0 #fff");

    // Add hover effects with gradients
    const gradient = svg.append("defs")
        .selectAll("linearGradient")
        .data(sankeyLinks)
        .join("linearGradient")
        .attr("id", (d, i) => `gradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", d => d.source.x1)
        .attr("x2", d => d.target.x0);

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d => columnColors[d.source.column]);

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d => columnColors[d.target.column]);

    link
        .style("stroke", (d, i) => `url(#gradient-${i})`)
        .style("stroke-opacity", 0.4)
        .on("mouseover", function() {
            d3.select(this)
                .style("stroke-opacity", 0.8)
                .style("stroke-width", d => Math.max(2, d.width))
                .style("transition", "all 0.2s ease");
        })
        .on("mouseout", function() {
            d3.select(this)
                .style("stroke-opacity", 0.4)
                .style("stroke-width", d => Math.max(1, d.width))
                .style("transition", "all 0.2s ease");
        });
}

// Load and process the CSV data with error handling
d3.csv("./data.csv")
    .then(function(csvData) {
        if (!csvData || !csvData.length) {
            throw new Error("No data found in CSV file");
        }

        globalData = csvData;
        populateFilters(csvData);
        updateVisualization(csvData);

        // Set up event listeners for filters
        document.getElementById('courseFilter').addEventListener('change', function(e) {
            currentFilters.course = e.target.value;
            selectedNodes.clear();
            updateFilterOptions(globalData);
            updateVisualization(filterData(globalData));
        });

        document.getElementById('iterationFilter').addEventListener('change', function(e) {
            currentFilters.iteration = e.target.value;
            selectedNodes.clear();
            updateFilterOptions(globalData);
            updateVisualization(filterData(globalData));
        });

        document.getElementById('resetFilters').addEventListener('click', function() {
            // Reset all filters and selections
            currentFilters = {
                course: 'all',
                iteration: 'all',
                role: 'all'
            };
            selectedNodes = new Map();
            
            // Reset select elements
            document.getElementById('courseFilter').value = 'all';
            document.getElementById('courseFilter').disabled = false;
            document.getElementById('iterationFilter').value = 'all';
            document.getElementById('roleFilter').value = 'all';
            
            // Repopulate dropdowns and update visualization
            populateFilters(globalData);
            updateVisualization(globalData);
        });

        document.getElementById('roleFilter').addEventListener('change', function(e) {
            currentFilters.role = e.target.value;
            selectedNodes.clear();
            updateVisualization(filterData(globalData));
        });
    })
    .catch(error => {
        console.error("Error loading or processing data:", error);
        d3.select("#chart")
            .append("p")
            .attr("class", "error-message")
            .style("color", "red")
            .text("Error loading or processing data. Please check the console for details.");
    });