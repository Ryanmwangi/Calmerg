import express from 'express';
import ical from 'ical';
import fs from 'fs';
import cron from 'node-cron';
import axios from 'axios';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const CALENDARS_FILE = 'calendars.json';
const MERGED_CALENDARS_DIR = 'merged_calendars';

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

        // Save merged calendar to file with unique identifier
        const filename = `${calendarId}.ics`;
        let icalString = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;
        mergedCal.forEach((event) => {
            icalString += `BEGIN:VEVENT
DTSTART;VALUE=DATE:${event.start.toISOString().split('T')[0].replace(/-/g, '')}
DTEND;VALUE=DATE:${ event.end.toISOString().split('T')[0].replace(/-/g, '')}
SUMMARY:${event.summary}
END:VEVENT
`;
        });
        icalString += `END:VCALENDAR`;
        fs.writeFileSync(`${MERGED_CALENDARS_DIR}/${filename}`, icalString);

        // Save the user input and generated ID in calendars.json file
        saveCalendarData(calendarId, linkGroupName, calendars);

        res.json({ url: `${req.protocol}://${req.get('host')}/calendar/${calendarId}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to merge calendars' });
    }
});

// Serve the merged calendar file
app.get('/calendar/:id', (req, res) => {
    const filename = `${req.params.id}.ics`;
    res.setHeader('Content-Type', 'text/calendar');
    res.sendFile(filename, { root: MERGED_CALENDARS_DIR });
});

//function to save CalendarData to calendars.json
function saveCalendarData(calendarId, linkGroupName, calendars) {
    let calendarsData = { mergedCalendars: [] };
    if (fs.existsSync(CALENDARS_FILE)) {
        try {
            const fileContent = fs.readFileSync(CALENDARS_FILE, 'utf8');
            if (fileContent) {
                calendarsData = JSON.parse(fileContent);
            }
        } catch (error) {
            console.error('Error reading calendars file:', error);
        }
    }
    // Ensure mergedCalendars array exists
    if (!calendarsData.mergedCalendars) {
        calendarsData.mergedCalendars = [];
    }

    calendarsData.mergedCalendars.push({
        id: calendarId,
        linkGroupName: linkGroupName,
        calendars: calendars
    });

    try {
        fs.writeFileSync(CALENDARS_FILE, JSON.stringify(calendarsData, null, 2));
    } catch (error) {
        console.error('Error writing to calendars file:', error);
    }
}

// Function to update the merged calendar
async function updateMergedCalendars(){
    try {
        // Load calendars data from calendars.json file
        const calendarsData = JSON.parse(fs.readFileSync(CALENDARS_FILE, 'utf8'));
        
        // Fetch calendar data for each merged calendar
        for (const mergedCalendar of calendarsData.mergedCalendars) {
            const promises = mergedCalendar.calendars.map((calendar) => {
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
    const filename = `${mergedCalendar.id}.ics`;
    let icalString = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;
    mergedCal.forEach((event) => {
        icalString += `BEGIN:VEVENT
DTSTART;VALUE=DATE:${event.start.toISOString().split('T')[0].replace(/-/g, '')}
DTEND;VALUE=DATE:${event.end.toISOString().split('T')[0].replace(/-/g, '')}
SUMMARY:${event.summary}
END:VEVENT
`;
    });
    icalString += `END:VCALENDAR`;
    
   // Store the merged calendar URL in a file
    fs.writeFileSync(`${MERGED_CALENDARS_DIR}/${filename}`, icalString);

    console.log(`Merged calendar updated: ${mergedCalendar.id}`);

}
    }  catch (error) {
        console.error(error);
    }
}

// Schedule a cron job to update the merged calendar every hour
cron.schedule('1 * * * *', () => {
    console.log('Updating merged calendar...');
    updateMergedCalendars();
});

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});