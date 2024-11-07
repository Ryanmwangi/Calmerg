import express from 'express';
import ICAL from 'ical.js';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import icalGenerator from 'ical-generator';

const app = express();
app.use(express.json());

const MERGED_CALENDARS_DIR = path.join(process.cwd(), 'calendar');
console.log(`Merged calendars directory: ${MERGED_CALENDARS_DIR} under ${process.cwd()}`);

// Ensure the merged calendars directory exists
fs.mkdirSync(MERGED_CALENDARS_DIR, { recursive: true });

// Serve static files
app.get('/script.js', (req, res) => res.sendFile('script.js', { root: '.' }));
app.get('/', (req, res) => res.sendFile('index.html', { root: '.' }));

// Utility to sanitize filenames
const sanitizeFilename = (filename) => filename.replace(/[<>:"/\\|?* ]/g, '_');

// Fetch calendar data from URL or file
const fetchCalendarData = async (calendar) => {
    const isFilePath = !calendar.url.startsWith('http');
    try {
        if (isFilePath) {
            return {
                data: fs.readFileSync(path.resolve(calendar.url), 'utf-8'),
                ...calendar
            };
        } else {
            const response = await axios.get(calendar.url);
            return { data: response.data, ...calendar };
        }
    } catch (error) {
        console.error(`Error retrieving calendar from ${calendar.url}:`, error);
        throw error;
    }
};

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

        // Fetch calendar data from URLs or load from local files
        const promises = calendars.map((calendar) => {
            // Check if calendar URL is a file path or a URL
            const isFilePath = !calendar.url.startsWith('http');
            if (isFilePath) {
                try{
                    // Read calendar data from local file
                    const data = fs.readFileSync(path.resolve(calendar.url), 'utf-8');
                    return Promise.resolve({
                        data: data,
                        prefix: calendar.prefix,
                        override: calendar.override,
                    });
                } catch (error) {
                    console.error(`Error reading calendar file ${calendar.url}: ${error}`);
                    return Promise.reject(error)
                }
            } else {
                // Fetch calendar data from URL
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
            }
        });

        const results = await Promise.all(promises);
        // Create a new iCalendar instance
        const calendar = icalGenerator({ name: linkGroupName });

        // Parse calendar data
        results.forEach((result) => {
            const parsed = ICAL.parse(result.data);
            const component = new ICAL.Component(parsed);
            const events = component.getAllSubcomponents('vevent');

            events.forEach((event) => {
                const vevent = new ICAL.Event(event);
                const start = vevent.startDate.toJSDate();
                const end = vevent.endDate.toJSDate();
                const summary = result.override ? result.prefix : `${result.prefix} ${vevent.summary}`;

                if (vevent.startDate.isDate) {
                    calendar.createEvent({
                        start: start.toISOString().split('T')[0],
                        end: end.toISOString().split('T')[0],
                        summary: summary,
                        allDay: true,
                    });
                } else {
                    calendar.createEvent({
                        start: start,
                        end: end,
                        summary: summary,
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
                    const parsed = ICAL.parse(result.data);
                    const component = new ICAL.Component(parsed);
                    const events = component.getAllSubcomponents('vevent');

                    events.forEach((event) => {
                        const vevent = new ICAL.Event(event);
                        const start = vevent.startDate.toJSDate();
                        const end = vevent.endDate.toJSDate();
                        const summary = result.override ? result.prefix : `${result.prefix} ${vevent.summary}`;

                        if (vevent.startDate.isDate) {
                            calendar.createEvent({
                                start: start.toISOString().split('T')[0],
                                end: end.toISOString().split('T')[0],
                                summary: summary,
                                allDay: true,
                            });
                        } else {
                            calendar.createEvent({
                                start: start,
                                end: end,
                                summary: summary,
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

export default app;
