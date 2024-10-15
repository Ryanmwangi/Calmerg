const form = document.getElementById('merge-form');
        const calendars = document.getElementById('calendars');
        const addCalendarButton = document.getElementById('add-calendar');
        const result = document.getElementById('result');

        let calendarIndex = 1;

        addCalendarButton.addEventListener('click', () => {
            const newCalendar = document.createElement('div');
            newCalendar.className = 'calendar';
            newCalendar.innerHTML = `
                <input type="text" id="link-group-name-${calendarIndex}" placeholder="Link Group Name">
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
            const calendarsData = [];
            for (let i = 0; i < calendarIndex; i++) {
                const linkGroupName = document.getElementById(`link-group-name-${i}`).value;
                const prefix = document.getElementById(`prefix-${i}`).value;
                const override = document.getElementById(`override-${i}`).checked;
                const url = document.getElementById(`url-${i}`).value;
                calendarsData.push({ linkGroupName, prefix, override, url });
            }
            fetch('/merge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ calendars: calendarsData })
            })
            .then((response) => response.json())
            .then((data) => {
                result.innerHTML = `Merged calendar URL: <a href="${data.url}">${data.url}</a>`;
                console.log('Links added successfully!');
            })
            .catch((error) => {
                console.error(error);
                result.innerHTML = 'Error merging calendars';
            });
        });
        
        const refreshInterval = 60 * 60 * 1000; // 1 hour
        setInterval(() => {
            fetch('/merge')
                .then((response) => response.json())
                .then((data) => {
                    result.innerHTML = `Merged calendar URL: <a href="${data.url}">${data.url}</a>`;
                })
                .catch((error) => {
                    console.error(error);
                    result.innerHTML = 'Error merging calendars';
                });
        }, refreshInterval);
   