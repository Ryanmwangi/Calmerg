import express from 'express';
import ical from 'ical';
import fs from 'fs';
import cron from 'node-cron';
import axios from 'axios';

const app = express();
app.use(express.json());

let mergedCalendarUrl = '';

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '.' });
});

app.post('/merge', async (req, res) => {
    const { cal1Url, cal1Prefix, cal2Url, cal2Prefix } = req.body;

    try {
        // Fetch calendar data from URLs
        const cal1Data = await axios.get(cal1Url);
        const cal2Data = await axios.get(cal2Url);

        // Parse calendar data
        const cal1 = ical.parseICS(cal1Data.data);
        const cal2 = ical.parseICS(cal2Data.data);
        const mergedCal = [];

        // Merge calendars
        Object.keys(cal1).forEach((key) => {
            let event = cal1[key];
            mergedCal.push({
                start: event.start,
                end: event.end,
                summary: `${cal1Prefix} ${event.summary}`,
            });
        });

        Object.keys(cal2).forEach((key) => {
            let event = cal2[key];
            mergedCal.push({
                start: event.start,
                end: event.end,
                summary: `${cal2Prefix} ${event.summary}`,
            });
        });

        // Save merged calendar to file
        const filename = `merged-${Date.now()}.ics`;
        let icalString = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
`;
        mergedCal.forEach((event) => {
            icalString += `DTSTART:${event.start}
DTEND:${event.end}
SUMMARY:${event.summary}
END:VEVENT
`;
        });
        icalString += `END:VCALENDAR`;
        fs.writeFileSync(filename, icalString);

        // Generate a unique URL for the merged calendar
        const mergedCalendarUrl = `${req.protocol}://${req.get('host')}/${filename}`;

        res.json({ url: mergedCalendarUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to merge calendars' });
    }
});

// Serve the merged calendar file
app.get('/:filename', (req, res) => {
    const filename = req.params.filename;
    res.setHeader('Content-Type', 'text/calendar');
    res.sendFile(filename, { root: '.' });
});

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

// Schedule a cron job to update the merged calendar every hour
cron.schedule('0 * * * *', () => {
    console.log('Updating merged calendar...');
    // TO DO: implement the logic to update the merged calendar
});