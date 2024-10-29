import request from 'supertest';
import express from 'express';
import icalGenerator from 'ical-generator';
import fs from 'fs';
import path from 'path';

const MERGED_CALENDARS_DIR = 'calendar';