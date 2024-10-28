import express from 'express';
import ical from 'ical';
import fs from 'fs';
import cron from 'node-cron';
import axios from 'axios';
import crypto from 'crypto';
import path from 'path';

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

// Merge calendars endpoint
app.post('/merge', async (req, res) => {
    const { linkGroupName, calendars } = req.body;

    try {
        // Validate the input
        if (!linkGroupName || !calendars || !Array.isArray(calendars) || calendars.length === 0) {
            return res.status(400).json({ error: 'Invalid input. Please provide a linkGroupName and at least one calendar.' });
        }
        // Generate a unique identifier for this set of calendars
        const calendarId = crypto.randomBytes(16).toString('hex');

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
                    console.error(error);
                    return null;
                });
        });

        const results = await Promise.all(promises);
        // Filter out any failed requests
        const validResults = results.filter((result) => result !== null);

        // Parse calendar data
        const mergedCal = [];
        validResults.forEach((result) => {
            const calendar = ical.parseICS(result.data);
            Object.keys(calendar).forEach((key) => {
                const event = calendar[key];
                if (result.override) {
                    mergedCal.push({
                        start: event.start,
                        end: event.end,
                        summary: result.prefix,
                    });
                } else {
                    mergedCal.push({
                        start: event.start,
                        end: event.end,
                        summary: `${result.prefix} ${event.summary}`,
                    });
                }
            });
        });

        // Save merged calendar to .ics file with unique identifier
        const filename = `${calendarId}.ics`;
        let icalString = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;
        mergedCal.forEach((event) => {
            icalString += `BEGIN:VEVENT
DTSTART;VALUE=DATETIME:${event.start.toISOString().replace(/-|:|\.\d{3}/g, '')}
DTEND;VALUE=DATETIME:${event.end.toISOString().replace(/-|:|\.\d{3}/g, '')}
SUMMARY:${event.summary}
END:VEVENT
`;
        });
        icalString += `END:VCALENDAR`;
        fs.writeFileSync(`${MERGED_CALENDARS_DIR}/${filename}`, icalString);

        // Save the user input and generated ID in a separate JSON file
        saveCalendarData(calendarId, linkGroupName, calendars);

        res.json({ url: `${req.protocol}://${req.get('host')}/calendar/${calendarId}` });
    } catch (error) {
        console.error(error);
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

                // Parse calendar data
                const mergedCal = [];
                validResults.forEach((result) => {
                    const calendar = ical.parseICS(result.data);
                    Object.keys(calendar).forEach((key) => {
                        const event = calendar[key];
                        if (result.override) {
                            mergedCal.push({
                                start: event.start,
                                end: event.end,
                                summary: result.prefix,
                            });
                        } else {
                            mergedCal.push({
                                start: event.start,
                                end: event.end,
                                summary: `${result.prefix} ${event.summary}`,
                            });
                        }
                    });
                });

                //save merged calendar to file
                let icalString = `BEGIN:VCALENDAR
                VERSION:2.0
                CALSCALE:GREGORIAN
                METHOD:PUBLISH
                `;
                                mergedCal.forEach((event) => {
                                    icalString += `BEGIN:VEVENT
                DTSTART;VALUE=DATETIME:${event.start.toISOString().replace(/-|:|\.\d{3}/g, '')}
                DTEND;VALUE=DATETIME:${event.end.toISOString().replace(/-|:|\.\d{3}/g, '')}
                SUMMARY:${event.summary}
                END:VEVENT
                `;
                                });
                                icalString += `END:VCALENDAR`;
                                fs.writeFileSync(icsFilePath, icalString);
                
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

// Function to update the merged calendar
async function updateMergedCalendars(calendarId){
    try {
        // Load calendar data from the individual JSON file
        const calendarFile = `${MERGED_CALENDARS_DIR}/${calendarId}.json`;
        const calendarData = JSON.parse(fs.readFileSync(calendarFile, 'utf8'));

        // Fetch calendar data for each merged calendar
        const promises = calendarData.calendars.map((calendar) => {
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

    // Parse calendar data
    const mergedCal = [];
    validResults.forEach((result) => {
        const calendar = ical.parseICS(result.data);
        Object.keys(calendar).forEach((key) => {
            const event = calendar[key];
            if (result.override) {
                mergedCal.push({
                    start: event.start,
                    end: event.end,
                    summary: result.prefix,
                });
            } else {
                mergedCal.push({
                    start: event.start,
                    end: event.end,
                    summary: `${result.prefix} ${event.summary}`,
                });
            }
        });
    });

    // Save merged calendar to file
    const filename = `${calendarId}.ics`;
    let icalString = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;
    mergedCal.forEach((event) => {
        icalString += `BEGIN:VEVENT
DTSTART;VALUE=DATETIME:${event.start.toISOString().replace(/-|:|\.\d{3}/g, '')}
DTEND;VALUE=DATETIME:${event.end.toISOString().replace(/-|:|\.\d{3}/g, '')}
SUMMARY:${event.summary}
END:VEVENT
`;
    });
    icalString += `END:VCALENDAR`;
    
   // Store the merged calendar URL in a file
    fs.writeFileSync(`${MERGED_CALENDARS_DIR}/${filename}`, icalString);

    console.log(`Merged calendar updated: ${calendarId}`);

    }  catch (error) {
        console.error(error);
    }
}

// Endpoint to refresh the merged calendar
app.post('/refresh/:id', async (req, res) => {
    const calendarId = req.params.id;
    try {
        await updateMergedCalendars(calendarId);
        res.json({ message: `Merged calendar refreshed: ${calendarId}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: `Failed to refresh merged calendar: ${calendarId}` });
    }
});


// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});