import ICAL from './lib/ical.timezones.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

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
    calendarComponent.updatePropertyWithValue('version', '2.0');
    return calendarComponent;
}

// Add events to the calendar component
export function addEventsToCalendar(calendarComponent, results) {
    results.forEach((result) => {
        try {
            const parsed = ICAL.parse(result.data);
            const component = new ICAL.Component(parsed);

            component.getAllSubcomponents('vevent').forEach((event) => {
                const vevent = new ICAL.Event(event);
                const newEvent = new ICAL.Component('vevent');
                
                // Use ICAL.Time to handle dates correctly
                const startDate = vevent.startDate;
                const endDate = vevent.endDate;

                // Create new ICAL.Time objects for start and end dates
                const startTime = new ICAL.Time({
                    year: startDate.year,
                    month: startDate.month,
                    day: startDate.day,
                    hour: startDate.isDate ? null : startDate.hour,
                    minute: startDate.isDate ? null : startDate.minute,
                    second: startDate.isDate ? null : startDate.second,
                    zone: startDate.zone
                });
                startTime.isDate = startDate.isDate;

                const endTime = new ICAL.Time({
                    year: endDate.year,
                    month: endDate.month,
                    day: endDate.day,
                    hour: endDate.isDate ? null : endDate.hour,
                    minute: endDate.isDate ? null : endDate.minute,
                    second: endDate.isDate ? null : endDate.second,
                    zone: endDate.zone
                });
                endTime.isDate = endDate.isDate;
                
                // Retain the existing DTSTAMP from vevent
                const dtstampProperty = event.getFirstProperty('dtstamp');
                const dtstamp = dtstampProperty ? dtstampProperty.getFirstValue() : null;

                // Add properties to the new event
                newEvent.updatePropertyWithValue('uid', vevent.uid);
                if (dtstamp) {
                    newEvent.updatePropertyWithValue('dtstamp', dtstamp); // Retain the existing DTSTAMP
                } else {
                    console.warn('DTSTAMP not found in the original event.'); // Warn if DTSTAMP is missing
                }
                
                // Set the dtstart and dtend properties using ICAL.Time
                newEvent.updatePropertyWithValue('dtstart', startTime);
                newEvent.updatePropertyWithValue('dtend', endTime);
                newEvent.updatePropertyWithValue('summary', vevent.summary.trim());


                // Add the new event to the calendar component
                calendarComponent.addSubcomponent(newEvent);
            });

            // Log the added events for debugging
            console.log('Added events:', calendarComponent.toString());
        } catch (error) {
            console.error('Error processing calendar data:', error.message);
        }
    });
}

// Save calendar data to file
export function saveCalendarFile(filename, content) {
    const filePath = path.join(MERGED_CALENDARS_DIR, filename);
    console.log(`Saving calendar data to file: ${filePath}`);
    fs.writeFileSync(filePath, content);
    return filePath;
}
