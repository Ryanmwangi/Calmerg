import express from 'express';
import ical from 'ical';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import icalGenerator from 'ical-generator';

const app = express();
app.use(express.json());

const MERGED_CALENDARS_DIR = 'calendar';

// Ensure the merged calendars directory exists
if (!fs.existsSync(MERGED_CALENDARS_DIR)) {
    fs.mkdirSync(MERGED_CALENDARS_DIR);
}

app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile('script.js', { root: '.' });
});

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '.' });
});

// Function to sanitize the linkGroupName for use as a filename
function sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?* ]/g, '_'); // Replace invalid characters with underscores
}

// Merge calendars endpoint
app.post('/merge', async (req, res) => {
    const { linkGroupName, calendars } = req.body;

    try {
        // Validate the input
        if (!linkGroupName || !calendars || !Array.isArray(calendars) || calendars.length === 0) {
            return res.status(400).json({ error: 'Invalid input. Please provide a linkGroupName and at least one calendar.' });
        }

        // Sanitize the linkGroupName to create a valid filename
        const sanitizedLinkGroupName = sanitizeFilename(linkGroupName);
        const filename = `${sanitizedLinkGroupName}.ics`;

        // Fetch calendar data from URLs
        const promises = calendars.map((calendar) => {
            return axios.get(calendar.url)
                .then((response) => {
                    return {
                        data: response.data,
                        prefix: calendar.prefix,
                        override: calendar.override,
                    };
                })
                .catch((error) => {
                    console.error(`Error fetching calendar from ${calendar.url}:`, error);
                    return null;
                });
        });

        const results = await Promise.all(promises);
        // Filter out any failed requests
        const validResults = results.filter((result) => result !== null);

        // Create a new iCalendar instance
        const calendar = icalGenerator({ name: linkGroupName });

        // Parse calendar data
        validResults.forEach((result) => {
            const parsedCalendar = ical.parseICS(result.data);
            Object.keys(parsedCalendar).forEach((key) => {
                const event = parsedCalendar[key];
                const start = new Date(event.start);
                const end = new Date(event.end);
                const summary = result.override ? result.prefix : `${result.prefix} ${event.summary}`;

                // Check if the event is date-based or time-based
                const startString = typeof event.start === 'string' ? event.start : start.toISOString();
                const endString = typeof event.end === 'string' ? event.end : end.toISOString();

                if (startString.includes('T')) {
                    // Time-based event
                    calendar.createEvent({
                        start: start,
                        end: end,
                        summary: summary,
                    });
                } else {
                    // Date-based event
                    calendar.createEvent({
                        start: startString.split('T')[0], // Use only the date part
                        end: endString.split('T')[0],     // Use only the date part
                        summary: summary,
                        allDay: true, // Mark as an all-day event
                    });
                }
            });
        });

        
        // Save the calendar to a file
        const filePath = `${MERGED_CALENDARS_DIR}/${filename}`;
        fs.writeFileSync(filePath, calendar.toString());
        console.log(`Calendar saved to ${filePath}`);

        // Save the user input and sanitizedLinkGroupName in a separate JSON file
        saveCalendarData(sanitizedLinkGroupName, linkGroupName, calendars);

        res.json({ url: `${req.protocol}://${req.get('host')}/calendar/${sanitizedLinkGroupName}` });
    } catch (error) {
        console.error('Error merging calendars:', error);
        res.status(500).json({ error: 'Failed to merge calendars' });
    }
});

// Serve the merged calendar file and refresh if older than an hour
app.get('/calendar/:name', async (req, res) => {
    const calendarName = req.params.name;
    const icsFilePath = path.resolve(MERGED_CALENDARS_DIR, `${calendarName}.ics`);
    const jsonFilePath = path.resolve(MERGED_CALENDARS_DIR, `${calendarName}.json`);

    try {
        // Check if the .ics file exists
        if (fs.existsSync(icsFilePath)) {
            const stats = fs.statSync(icsFilePath);
            const lastModified = new Date(stats.mtime);
            const now = new Date();
            // Check if the file is older than one hour
            if (now - lastModified > 60 * 60 * 1000) {
                console .log('Refreshing calendar data...');

                // Read the JSON file to get the source URL and other details
                const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
                const { calendars } = jsonData;

                // Fetch calendar data for each merged calendar
                const promises = calendars.map((calendar) => {
                    return axios.get(calendar.url)
                        .then((response) => {
                            return {
                                data: response.data,
                                prefix: calendar.prefix,
                                override: calendar.override,
                            };
                        })
                        .catch((error) => {
                            console.error(error);
                            return null;
                        });
                });

                const results = await Promise.all(promises);
                // Filter out any failed requests
                const validResults = results.filter((result) => result !== null);

                // Create a new iCalendar instance
                const calendar = icalGenerator({ name: calendarName });

                // Parse calendar data
                validResults.forEach((result) => {
                    const parsedCalendar = ical.parseICS(result.data);
                    Object.keys(parsedCalendar).forEach((key) => {
                        const event = parsedCalendar[key];
                        const start = new Date(event.start);
                        const end = new Date(event.end);
                        const summary = result.override ? result.prefix : `${result.prefix} ${event.summary}`;

                       // Check if the event is date-based or time-based
                       const startString = typeof event.start === 'string' ? event.start : start.toISOString();
                       const endString = typeof event.end === 'string' ? event.end : end.toISOString();

                       if (startString.includes('T')) {
                           // Time-based event
                           calendar.createEvent({
                               start: start,
                               end: end,
                               summary: summary,
                           });
                       } else {
                           // Date-based event
                           calendar.createEvent({
                               start: startString.split('T')[0], // Use only the date part
                               end: endString.split('T')[0],     // Use only the date part
                               summary: summary,
                               allDay: true, // Mark as an all-day event
                           });
                       }
                    });
                });

                // Save the calendar to a file
                fs.writeFileSync(icsFilePath, calendar.toString());
                
                console.log('Calendar data refreshed.');
            }
        } else {
            return res.status(404).json({ error: 'Calendar not found.' });
        }

        // Return the contents of the .ics file
        res.setHeader('Content-Type', 'text/calendar');
        res.sendFile(icsFilePath);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve calendar data.' });
    }
});


//function to save calendar data to seperate .json files
function saveCalendarData(calendarId, linkGroupName, calendars) {
    const calendarFile = `${MERGED_CALENDARS_DIR}/${calendarId}.json`;
    const calendarData = {
        id: calendarId,
        linkGroupName: linkGroupName,
        calendars: calendars
    };

    try {
        fs.writeFileSync(calendarFile, JSON.stringify(calendarData, null, 2));
    } catch (error) {
        console.error('Error writing to calendar file:', error);
    }
}

// Start the server
const port = 3000;
app.listen(port, () => {
    if (process.env.NODE_ENV !== 'test') {
        console.log(`Server started on port ${port}`);
    }
});

export default app;