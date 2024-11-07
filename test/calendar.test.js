import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';

const CALENDARS_DIR = path.join(__dirname, 'calendar')
const TEST_CALENDARS_DIR = path.join(__dirname, 'test_calendars');
const EXPECTED_OUTPUTS_DIR = path.join(__dirname, 'expected_outputs');

let server;
process.chdir(__dirname)
console.log(process.cwd());
const app = require('../server').default;

describe('Calendar Merging API', () => {
    beforeAll(async () => {
        // Start the server
        server = app.listen(0);
    });

    afterAll(async () => {
        // Ensure the server is closed before cleanup
        await new Promise(resolve => server.close(resolve));

        // Optional: Add a delay to ensure all handles are released
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    const loadCalendarFile = (filename) => {
        return path.join(TEST_CALENDARS_DIR, filename);
    };

    const loadExpectedOutput = (filename) => {
        return fs.readFileSync(path.join(EXPECTED_OUTPUTS_DIR, filename), 'utf8');
    };

    test('Merge date-based calendar', async () => {
        const response = await request(server)
            .post('/merge')
            .send({
                linkGroupName: 'Date Based Calendar',
                calendars: [
                    {
                        url: loadCalendarFile('ferien_bayern_2023.ics'),
                        prefix: 'Ferien_Bayern_2023',
                        override: false,
                    },
                    {
                        url: loadCalendarFile('US_Holidays.ics'),
                        prefix: 'US_holidays',
                        override: false,
                    },
                ],
            });
        expect(response.status).toBe(200);
        expect(response.body.url).toMatch(new RegExp(`calendar/Date_Based_Calendar`));

        // Check if the file was created in the test directory
        const filePath = path.join(CALENDARS_DIR, 'Date_Based_Calendar.ics');
        console.log('Checking if file exists at:', filePath);
        expect(fs.existsSync(filePath)).toBe(true);

        // // Load expected output and compare
        // const expectedOutput = loadExpectedOutput('Date_Based_Calendar.ics');
        // const actualOutput = fs.readFileSync(filePath, 'utf8');
        // // expect(actualOutput).toBe(expectedOutput);
    });

    test('Merge time-based calendar', async () => {
        const response = await request(server)
            .post('/merge')
            .send({
                linkGroupName: 'Time Based Calendar',
                calendars: [
                    {
                        url: loadCalendarFile('other_work.ics'),
                        prefix: 'other_work',
                        override: false,
                    },
                    {
                        url: loadCalendarFile('work.ics'),
                        prefix: 'work',
                        override: false,
                    },
                ],
            });

        expect(response.status).toBe(200);
        expect(response.body.url).toMatch(/calendar\/Time_Based_Calendar/);
        
        // Check if the file was created in the test directory
        const filePath = path.join(CALENDARS_DIR, 'Time_Based_Calendar.ics');
        expect(fs.existsSync(filePath)).toBe(true);

        // // Load expected output and compare
        // const expectedOutput = loadExpectedOutput('Time_Based_Calendar.ics');
        // const actualOutput = fs.readFileSync (filePath, 'utf8');
        // // expect(actualOutput).toBe(expectedOutput);
    });

    test('Merge calendar without prefix', async () => {
        const response = await request(server)
            .post('/merge')
            .send({
                linkGroupName: 'No Prefix Calendar',
                calendars: [
                    {
                        url: loadCalendarFile('San_Francisco_Public_Holidays.ics'),
                        prefix: '',
                        override: false,
                    },
                ],
            });

        expect(response.status).toBe(200);
        expect(response.body.url).toMatch(/calendar\/No_Prefix_Calendar/);
        
        // Check if the file was created in the test directory
        const filePath = path.join(CALENDARS_DIR, 'No_Prefix_Calendar.ics');
        expect(fs.existsSync(filePath)).toBe(true);

        // // Load expected output and compare
        // const expectedOutput = loadExpectedOutput('No_Prefix_Calendar.ics');
        // const actualOutput = fs.readFileSync(filePath, 'utf8');
        // // expect(actualOutput).toBe(expectedOutput);
    });
    
    test('Merge calendar with override', async () => {
        const response = await request(server)
            .post('/merge')
            .send({
                linkGroupName: 'Override Calendar',
                calendars: [
                    {
                        url: loadCalendarFile('San_Francisco_Public_Holidays.ics'),
                        prefix: 'Override Event',
                        override: true,
                    },
                ],
            });

        expect(response.status).toBe(200);
        expect(response.body.url).toMatch(/calendar\/Override_Calendar/);
        
        // Check if the file was created in the test directory
        const filePath = path.join(CALENDARS_DIR, 'Override_Calendar.ics');
        expect(fs.existsSync(filePath)).toBe(true);

        // // Load expected output and compare
        // const expectedOutput = loadExpectedOutput('Override_Calendar.ics');
        // const actualOutput = fs.readFileSync(filePath, 'utf8');
        // // expect(actualOutput).toBe(expectedOutput);
    });

});