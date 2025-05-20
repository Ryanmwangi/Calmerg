const form = document.getElementById('merge-form');
const calendars = document.getElementById('calendars');
const addCalendarButton = document.getElementById('add-calendar');
const result = document.getElementById('result');
const resultInfo = document.querySelector('.result-info');

// Search functionality elements
const searchBtn = document.getElementById('search-btn');
const calendarSearch = document.getElementById('calendar-search');
const searchResult = document.getElementById('search-result');

// Variable to track if we're editing an existing calendar
let isEditing = false;
let currentCalendarName = '';

// Variable to track the index of the calendar being added
let calendarIndex = 1;
let mergedUrl = '';

// Function to validate URL format
function isValidUrl(url) {
    const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/; // Regex for URL validation
    return urlPattern.test(url);
}

// Function to extract calendar name from URL or input
function extractCalendarName(input) {
    // If it's a URL, extract the last part of the path
    if (input.startsWith('http')) {
        try {
            // Remove trailing slash if present
            if (input.endsWith('/')) {
                input = input.slice(0, -1);
            }
            
            // Extract the last part of the path
            const url = new URL(input);
            const pathParts = url.pathname.split('/').filter(part => part.length > 0);
            
            // If there's a path part, use the last one
            if (pathParts.length > 0) {
                let lastPart = pathParts[pathParts.length - 1];
                
                // Remove .ics extension if present
                if (lastPart.endsWith('.ics')) {
                    lastPart = lastPart.slice(0, -4);
                }
                
                return lastPart;
            }
        } catch (e) {
            console.error('Error parsing URL:', e);
        }
    }
    
    // If not a URL or URL parsing failed, just return the input as is
    return input;
}

// Event listener for the search button
if (searchBtn) {
    searchBtn.addEventListener('click', searchCalendar);
    
    // Also search when pressing Enter in the search field
    if (calendarSearch) {
        calendarSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCalendar();
            }
        });
    }
}

// Function to search for a calendar
function searchCalendar() {
    let calendarName = calendarSearch.value.trim();
    if (!calendarName) {
        searchResult.innerHTML = '<div class="alert alert-warning">Please enter a calendar name</div>';
        return;
    }
    
    // Extract just the calendar name if a URL was entered
    calendarName = extractCalendarName(calendarName);
    
    searchResult.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
    
    // Check if calendar exists
    fetch(`/calendar-config/${calendarName}`)
        .then(response => response.json())
        .then(data => {
            if (data.exists) {
                searchResult.innerHTML = `<div class="alert alert-success">Calendar found!</div>`;
                loadCalendarConfig(data.config, calendarName);
            } else {
                searchResult.innerHTML = `<div class="alert alert-danger">Calendar not found</div>`;
            }
        })
        .catch(error => {
            console.error('Error searching for calendar:', error);
            searchResult.innerHTML = `<div class="alert alert-danger">Error searching for calendar</div>`;
        });
}

// Function to load calendar configuration for editing
function loadCalendarConfig(config, calendarName) {
    // Set editing mode
    isEditing = true;
    currentCalendarName = calendarName;
    
    // Update link group name
    document.getElementById('link-group-name').value = config.linkGroupName;
    
    // Clear existing calendars
    while (calendars.children.length > 0) {
        calendars.removeChild(calendars.lastChild);
    }
    
    // Reset calendar index
    calendarIndex = 0;
    
    // Add calendars from config
    config.calendars.forEach(calendar => {
        const newCalendar = document.createElement('div');
        newCalendar.className = 'calendar-entry';
        newCalendar.innerHTML = `
            <input type="url" id="url-${calendarIndex}" placeholder="https://example.com/calendar.ics" value="${calendar.url}">
            <input type="text" id="prefix-${calendarIndex}" placeholder="Event prefix" value="${calendar.prefix || ''}">
            <div class="checkbox-group">
              <input type="checkbox" id="override-${calendarIndex}" ${calendar.override ? 'checked' : ''}>
              <label for="override-${calendarIndex}">Override</label>
            </div>
            <button type="button" class="remove-btn" title="Remove calendar"></button>
        `;
        calendars.appendChild(newCalendar);
        calendarIndex++;
    });
    
    // Scroll to the form
    form.scrollIntoView({ behavior: 'smooth' });
}

// Event listener for adding new calendar
addCalendarButton.addEventListener('click', () => {
    const newCalendar = document.createElement('div');
    newCalendar.className = 'calendar-entry';
    newCalendar.innerHTML = `
        <input type="url" id="url-${calendarIndex}" placeholder="https://example.com/calendar.ics">
        <input type="text" id="prefix-${calendarIndex}" placeholder="Event prefix">
        <div class="checkbox-group">
          <input type="checkbox" id="override-${calendarIndex}">
          <label for="override-${calendarIndex}">Override</label>
        </div>
        <button type="button" class="remove-btn" title="Remove calendar"></button>
    `;
    calendars.appendChild(newCalendar);
    calendarIndex++;
});

// Event listener for form submission
form.addEventListener('submit', (event) => {
    event.preventDefault();
    const linkGroupName = document.getElementById('link-group-name').value;
    const calendarsData = [];
    let valid = true; // Flag to track URL validity
    
    for (let i = 0; i < calendarIndex; i++) {
        const prefix = document.getElementById(`prefix-${i}`);
        const override = document.getElementById(`override-${i}`);
        const url = document.getElementById(`url-${i}`);
        if (prefix && override && url && url.value) {
            // Validate the URL
            if (url.value.startsWith('http') && !isValidUrl(url.value)) {
                valid = false; // Set flag to false if any URL is invalid
                alert(`Invalid URL format for calendar ${i + 1}: ${url.value}`);
            } else {
                calendarsData.push({
                    prefix: prefix.value,
                    override: override.checked,
                    url: url.value
                });
            }
        }
    }
    
    if (valid) {
        // Determine if we're creating or updating
        const endpoint = isEditing ? `/calendar/${currentCalendarName}` : '/merge';
        const method = isEditing ? 'PUT' : 'POST';
        
        fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ linkGroupName, calendars: calendarsData })
        })
        .then((response) => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })        
        .then((data) => {
            mergedUrl = data.url;

            // Hide the info text when showing results
            if (resultInfo) {
                resultInfo.style.display = 'none';
            }
            
            if (isEditing) {
                result.innerHTML = `Updated calendar URL: <a href="${data.url}">${data.url}</a>`;
                
                // Update the search result
                if (searchResult) {
                    searchResult.innerHTML = `<div class="alert alert-success">Calendar updated successfully!</div>`;
                }
                
                // Reset editing state
                isEditing = false;
                currentCalendarName = '';
            } else {
                result.innerHTML = `Merged calendar URL: <a href="${data.url}">${data.url}</a>`;
            }
            
            console.log('Operation completed successfully!');
        })
        .catch((error) => {
            console.error('Error:', error);
            result.innerHTML = `Error: ${error.message || 'Unknown error'}`
        });
    }
});

// Event listener for removing a calendar entry
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-btn')) {
        const calendarEntry = event.target.closest('.calendar-entry');
        if (calendarEntry) {
            calendarEntry.remove();
        }
    }
});