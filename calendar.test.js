import request from 'supertest';
import express from 'express';
import icalGenerator from 'ical-generator';
import fs from 'fs';
import path from 'path';
import app from './server';

const MERGED_CALENDARS_DIR = 'testCalendars';
let server;

describe('Calendar Merging API', () => {
    beforeAll(async () => {
        // Start the server
        server = app.listen(0, () => {
            console.log(`Server started on port 3000`);
        });
        // Ensure the merged calendars directory exists
        if (!fs.existsSync(MERGED_CALENDARS_DIR)) {
            fs.mkdirSync(MERGED_CALENDARS_DIR);
        }
    });

    afterAll( async () => {
        // Clean up the merged calendars directory after tests
        fs.rmdirSync(MERGED_CALENDARS_DIR, { recursive: true });
    });

    test('Merge date-based calendar', async () => {
        const response = await request(app)
            .post('/merge')
            .send({
                linkGroupName: 'Date Based Calendar',
                calendars: [
                    {
                        url: 'https://www.schulferien.org/media/ical/deutschland/ferien_bayern_2023.ics?k=PsL0S2B9rScFMn5PAxtf4OVQjMkWZsqqkK13zEJ0FCW5Q-2xQejfLJYaTN4EdYUsQHLDDbGVnVl93ms7en5vMUISjZ3H9Esu88Vp2ndnL5Q',
                        prefix: 'Date Event',
                        override: false,
                    },
                ],
            });
        expect(response.status).toBe(200);
        expect(response.body.url).toMatch(/calendar\/Date_Based_Calendar/);

        // Check if the file was created
        const filePath = path.join(MERGED_CALENDARS_DIR, 'Date_Based_Calendar.ics');
        expect(fs.existsSync(filePath)).toBe(true);
    });

    test('Merge time-based calendar', async () => {
        const response = await request(app)
            .post('/merge')
            .send({
                linkGroupName: 'Time Based Calendar',
                calendars: [
                    {
                        url: 'https://www.calendarlabs.com/ical-calendar/ics/65/San_Francisco_Public_Holidays.ics',
                        prefix: 'Time Event',
                        override: false,
                    },
                ],
            });

        expect(response.status).toBe(200);
        expect(response.body.url).toMatch(/calendar\/Time_Based_Calendar/);
        
        // Check if the file was created
        const filePath = path.join(MERGED_CALENDARS_DIR, 'Time_Based_Calendar.ics');
        expect(fs.existsSync(filePath)).toBe(true);
    });

    test('Merge calendar without prefix', async () => {
        const response = await request(app)
            .post('/merge')
            .send({
                linkGroupName: 'No Prefix Calendar',
                calendars: [
                    {
                        url: 'https://www.calendarlabs.com/ical-calendar/ics/65/San_Francisco_Public_Holidays.ics',
                        prefix: '',
                        override: false,
                    },
                ],
            });

        expect(response.status).toBe(200);
        expect(response.body.url).toMatch(/calendar\/No_Prefix_Calendar/);
        
        // Check if the file was created
        const filePath = path.join(MERGED_CALENDARS_DIR, 'No_Prefix_Calendar.ics');
        expect(fs.existsSync(filePath)).toBe(true);
    });
    
    test('Merge calendar with override', async () => {
        const response = await request(app)
            .post('/merge')
            .send({
                linkGroupName: 'Override Calendar',
                calendars: [
                    {
                        url: 'https://www.calendarlabs.com/ical-calendar/ics/65/San_Francisco_Public_Holidays.ics',
                        prefix: 'Override Event',
                        override: true,
                    },
                ],
            });

        expect(response.status).toBe(200);
        expect(response.body.url).toMatch(/calendar\/Override_Calendar/);
        
        // Check if the file was created
        const filePath = path.join(MERGED_CALENDARS_DIR, 'Override_Calendar.ics');
        expect(fs.existsSync(filePath)).toBe(true);
    });

});