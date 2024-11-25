import ICAL from './lib/ical.timezones.js'
import fs from 'fs'
import path from 'path'
import axios from 'axios'

export const MERGED_CALENDARS_DIR = path.join(process.cwd(), 'calendar');

// Ensure the merged calendars directory exists
fs.mkdirSync(MERGED_CALENDARS_DIR, { recursive: true });

// Utility to sanitize filenames
export const sanitizeFilename = (filename) => filename.replace(/[<>:"/\\|?* ]/g, '_');

// Fetch calendar data from URL or file
export async function fetchCalendarData(calendar) {
    const isFilePath = !calendar.url.startsWith('http');
    try {
        if (isFilePath) {
            return { data: fs.readFileSync(path.resolve(calendar.url), 'utf-8'), ...calendar };
        } else {
            const response = await axios.get(calendar.url);
            return { data: response.data, ...calendar };
        }
    } catch (error) {
        throw new Error(`Error retrieving calendar from ${calendar.url}: ${error.message}`);
    }
}

// Create a top-level VCALENDAR component
export function createCalendarComponent(name) {
    const calendarComponent = new ICAL.Component(['vcalendar', [], []]);
    calendarComponent.updatePropertyWithValue('name', name);
    calendarComponent.updatePropertyWithValue('prodid', '-//CalMerge//Calendar Merger 1.0//EN');
    calendarComponent.updatePropertyWithValue('version', '2.0');
    calendarComponent.updatePropertyWithValue('calscale', 'GREGORIAN');
    return calendarComponent;
}

// Add events to the calendar component
export function addEventsToCalendar(newCalendar, calendars, overrideFlag = false) {
    let defaultTimeZone = null; // To store the first found X-WR-TIMEZONE
    
    calendars.forEach((calendarRaw) => {
        try {
            const calendar = new ICAL.Component(ICAL.parse(calendarRaw.data));
            
            // Extract METHOD from the parsed data (if available)
            const method = calendar.getFirstPropertyValue('method');
            if (method) {
                console.log(`Extracted METHOD: ${method}`);
                // Only add the METHOD property once
                if (!newCalendar.getFirstPropertyValue('method')) {
                    newCalendar.updatePropertyWithValue('method', method.toUpperCase());
                }
            }
            // Extract X-WR-TIMEZONE if available
            const wrTimeZone = calendar.getFirstPropertyValue('x-wr-timezone');
            if (wrTimeZone) {
                console.log(`Extracted X-WR-TIMEZONE: ${wrTimeZone}`);
                // Set it as the default if not already set
                if (!defaultTimeZone) {
                    defaultTimeZone = wrTimeZone;
                    if (!newCalendar.getFirstPropertyValue('x-wr-timezone')) {
                        newCalendar.updatePropertyWithValue('x-wr-timezone', defaultTimeZone);
                    }
                }
            }

            // Extract and add VTIMEZONE components
            const timezones = calendar.getAllSubcomponents('vtimezone');
            timezones.forEach((timezone) => {
                const tzid = timezone.getFirstPropertyValue('tzid');
                if (!newCalendar.getFirstSubcomponent((comp) => comp.name === 'vtimezone' && comp.getFirstPropertyValue('tzid') === tzid)) {
                    newCalendar.addSubcomponent(timezone);
                }
            });

            // Process VEVENT components
            calendar.getAllSubcomponents('vevent').forEach((vevent) => {
                const event = new ICAL.Event(vevent);
                const newEvent = new ICAL.Event();

                newEvent.uid = event.uid;
                newEvent.startDate = event.startDate
                newEvent.endDate = event.endDate

                const dtstamp = vevent.getFirstPropertyValue('dtstamp');
                if (dtstamp) newEvent.component.updatePropertyWithValue('dtstamp', dtstamp);

                if (overrideFlag) {
                    newEvent.summary = 'Busy'
                } else {
                    newEvent.summary = event.summary;
                    if (event.location) newEvent.location = event.location;
                }

                const rrule = vevent.getFirstPropertyValue('rrule');
                if (rrule) newEvent.component.updatePropertyWithValue('rrule', rrule);

                // Add the VEVENT to the calendar
                newCalendar.addSubcomponent(newEvent.component);
            });
        } catch (error) {
            console.error(`Error processing calendar:`, calendarRaw, error);
        }
    });
}

// Save calendar data to file
export function saveCalendarFile(filename, content) {
    const normalizedContent = content.replace(/\r?\n/g, '\r\n').trimEnd(); // Normalize to CRLF
    const filePath = path.join(MERGED_CALENDARS_DIR, filename);
    console.log(`Saving calendar data to file: ${filePath}`);
    fs.writeFileSync(filePath, normalizedContent);
    return filePath;
}
