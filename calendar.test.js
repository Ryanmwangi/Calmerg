import request from 'supertest';
import express from 'express';
import icalGenerator from 'ical-generator';
import fs from 'fs';
import path from 'path';

const MERGED_CALENDARS_DIR = 'calendar';

describe('Calendar Merging API', () => {
    beforeAll(() => {
        // Ensure the merged calendars directory exists
        if (!fs.existsSync(MERGED_CALENDARS_DIR)) {
            fs.mkdirSync(MERGED_CALENDARS_DIR);
        }
    });
    afterAll(() => {
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
    })

});