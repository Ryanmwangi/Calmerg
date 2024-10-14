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
    const { calendars } = req.body;

    try {
        //validate the input
        if (!calendars || !Array.isArray(calendars)) {
            return res.status(400).json({ error: 'Invalid input' });
        }
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


        // Save merged calendar to file
        const filename = `merged-${Date.now()}.ics`;
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

//calendarData object to store calendar data
let calendarData = {
    linkGroups: []
  };

// Function to add a new link group
function addLinkGroup(name) {
    const newLinkGroup = {
      name,
      links: []
    };
    calendarData.linkGroups.push(newLinkGroup);
    return newLinkGroup;
  }

// Function to add a new link to a link group
function addLinkToGroup(linkGroup, url, prefix, overrideSummary) {
    const newLink = {
      url,
      prefix,
      overrideSummary
    };
    linkGroup.links.push(newLink);
    return newLink;
  }
//adding the new link to the calendarData object
  app.post('/add-link', (req, res) => {
    const { linkGroupName, linkUrl, prefix, overrideSummary } = req.body;
    // Read the existing data from calendars.json
    const calendarsFile = 'calendars.json';
    let calendarsData = {};
    try {
        calendarsData = JSON.parse(fs.readFileSync(calendarsFile, 'utf8'));
    } catch (error) {
        console.error(error);
    }
    // Add the new link to the calendarData object
    let linkGroup = calendarData.linkGroups.find((group) => group.name === linkGroupName);
    if (!linkGroup) {
        linkGroup = {
          name: linkGroupName,
          links: []
        };
        calendarsData.linkGroups.push(linkGroup);
      }
      linkGroup.links.push({
        url: linkUrl,
        prefix,
        overrideSummary
      });
  // Write the updated data back to calendars.json
  fs.writeFileSync(calendarsFile, JSON.stringify(calendarsData, null, 2));
    res.json({ message: 'Link added successfully!' });
  });

// Function to update the merged calendar
async function updateMergedCalendar(){
    try {
        // Load calendars data from calendars.json file
        const calendarsFile = 'calendars.json';
        const calendars = JSON.parse(fs.readFileSync(calendarsFile, 'utf8'));
        
        // Fetch calendar data for each link group
        const promises = calendarsData.linkGroups.map((linkGroup) => {
            return Promise.all(linkGroup.links.map((link) => {
            return axios.get(link.url)
                .then((response) => {
                    return {
                        data: response.data,
                        prefix: link.prefix,
                        override: link.overrideSummary,
                    };
                })
                .catch((error) => {
                    console.error(error);
                    return null;
                });
        }));
        });

        const results = await Promise.all(promises);
        // Filter out any failed requests
        const validResults = results.flat().filter((result) => result !== null);

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
    const filename = `merged-${Date.now()}.ics`;
    let icalString = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;
    mergedCal.forEach((event) => {
        icalString += `BEGIN:VEVENT
DTSTART:${event.start}
DTEND:${event.end}
SUMMARY:${event.summary}
END:VEVENT
`;
    });
    icalString += `END:VCALENDAR`;
    
    fs.writeFileSync(filename, icalString);

   // Generate a unique URL for the merged calendar
   const mergedCalendarUrl = `http://localhost:3000/${filename}`;
  
   // Store the merged calendar URL in a file
   fs.writeFileSync('merged_calendar_url.txt', mergedCalendarUrl);

    console.log(`Merged calendar updated: ${mergedCalendarUrl}`);


    }  catch (error) {
        console.error(error);
    }
}

// Schedule a cron job to update the merged calendar every hour
cron.schedule('0 * * * *', () => {
    console.log('Updating merged calendar...');
    updateMergedCalendar();
});

// serve updated merged calendar to user
app.get('/merged-calendar', (req, res) => {
    const mergedCalendarUrlFile = 'merged_calendar_url.txt';
    const mergedCalendarUrl = fs.readFileSync(mergedCalendarUrlFile, 'utf8');
    res.redirect(mergedCalendarUrl);
  });

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
