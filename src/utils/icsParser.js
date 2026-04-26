import React from 'react';

export const parseICS = (icsContent) => {
    const events = [];
    const lines = icsContent.split(/\r?\n/);
    let currentEvent = null;

    lines.forEach((line) => {
        if (line.startsWith('BEGIN:VEVENT')) {
            currentEvent = {
                id: Date.now().toString() + Math.random(),
                title: 'Untitled',
                day: 'Monday',
                start_time: '08:00',
                end_time: '09:00',
                room: 'TBD',
            };
        } else if (line.startsWith('END:VEVENT')) {
            if (currentEvent) events.push(currentEvent);
            currentEvent = null;
        } else if (currentEvent) {
            if (line.startsWith('SUMMARY:')) currentEvent.title = line.split(':')[1];
            else if (line.startsWith('LOCATION:')) currentEvent.room = line.split(':')[1];
            else if (line.startsWith('DTSTART:')) {
                const time = line.split(':')[1].substring(9, 13);
                currentEvent.start_time = `${time.substring(0, 2)}:${time.substring(2)}`;
            } else if (line.startsWith('DTEND:')) {
                const time = line.split(':')[1].substring(9, 13);
                currentEvent.end_time = `${time.substring(0, 2)}:${time.substring(2)}`;
            }
        }
    });
    return events;
};
