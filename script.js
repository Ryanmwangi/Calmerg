const form = document.getElementById('merge-form');
        const calendars = document.getElementById('calendars');
        const addCalendarButton = document.getElementById('add-calendar');
        const result = document.getElementById('result');

        let alendarIndex = 1;

        // Function to validate URL format
        function isValidUrl(url) {
            const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/; // Regex for URL validation
            return urlPattern.test(url);
        }

        addCalendarButton.addEventListener('click', () => {
            const newCalendar = document.createElement('div');
            newCalendar.className = 'calendar';
            newCalendar.innerHTML = `
                <input type="text" id="prefix-${calendarIndex}" placeholder="Prefix">
                <input type="checkbox" id="override-${calendarIndex}">
                <label for="override-${calendarIndex}">Override</label>
                <input type="url" id="url-${calendarIndex}" placeholder="Calendar URL">
            `;
            calendars.appendChild(newCalendar);
            calendarIndex++;
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const linkGroupName = document.getElementById('link-group-name').value;
            const calendarsData = [];
            let valid = true; // Flag to track URL validity
            
            for (let i = 0; i < calendarIndex; i++) {
                const prefix = document.getElementById(`prefix-${i}`);
                const override = document.getElementById(`override-${i}`);
                const url = document.getElementById(`url-${i}`);
                if (prefix && override && url) {
                    // Validate the URL
                    if (!isValidUrl(url.value)) {
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
            fetch('/merge', {
                method: 'POST',
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
                result.innerHTML = `Merged calendar URL: <a href="${data.url}">${data.url}</a>`;
                console.log('Links added successfully!');
            })
            .catch((error) => {
                console.error('Error:', error);
                result.innerHTML = `Error merging calendars: ${error.message || 'Unknown error'}`
            });
        });